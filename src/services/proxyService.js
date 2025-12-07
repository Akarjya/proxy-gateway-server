/**
 * Proxy Service
 * Handles all proxy-related operations including fetching content through proxy
 * Uses proxy-chain for better HTTPS/TLS support
 */

const axios = require('axios');
const { SocksProxyAgent } = require('socks-proxy-agent');
const ProxyChain = require('proxy-chain');
const config = require('../config/config');
const logger = require('../utils/logger');
const { generateProxySessionId } = require('../utils/sessionIdGenerator');

// Store for anonymous proxy URLs per session
const proxyUrlCache = new Map();

class ProxyService {
  constructor() {
    this.localProxyServer = null;
    this.localProxyPort = null;
  }

  /**
   * Get SOCKS5 proxy URL for a session
   * @param {string} proxySessionId - Unique proxy session ID
   * @returns {string} SOCKS5 proxy URL
   */
  getSocksProxyUrl(proxySessionId) {
    const username = config.proxy.buildUsername(proxySessionId);
    return `socks5://${username}:${config.proxy.password}@${config.proxy.host}:${config.proxy.port}`;
  }

  /**
   * Convert SOCKS5 to anonymous HTTP proxy using proxy-chain
   * This handles TLS/HTTPS much better
   * @param {string} proxySessionId - Unique proxy session ID
   * @returns {Promise<string>} Anonymous local proxy URL
   */
  async getAnonymousProxyUrl(proxySessionId) {
    // Check cache first
    if (proxyUrlCache.has(proxySessionId)) {
      return proxyUrlCache.get(proxySessionId);
    }

    const socksUrl = this.getSocksProxyUrl(proxySessionId);
    logger.debug('Creating anonymous proxy', { 
      socksUrl: socksUrl.replace(config.proxy.password, '***') 
    });

    try {
      // proxy-chain converts SOCKS5 to HTTP proxy
      const anonymousUrl = await ProxyChain.anonymizeProxy(socksUrl);
      proxyUrlCache.set(proxySessionId, anonymousUrl);
      
      logger.info('Anonymous proxy created', { 
        proxySessionId, 
        anonymousUrl 
      });
      
      return anonymousUrl;
    } catch (error) {
      logger.error('Failed to create anonymous proxy', { error: error.message });
      throw error;
    }
  }

  /**
   * Close anonymous proxy for a session
   * @param {string} proxySessionId - Proxy session ID
   */
  async closeAnonymousProxy(proxySessionId) {
    const anonymousUrl = proxyUrlCache.get(proxySessionId);
    if (anonymousUrl) {
      try {
        await ProxyChain.closeAnonymizedProxy(anonymousUrl, true);
        proxyUrlCache.delete(proxySessionId);
        logger.debug('Closed anonymous proxy', { proxySessionId });
      } catch (error) {
        logger.warn('Failed to close anonymous proxy', { error: error.message });
      }
    }
  }

  /**
   * Create a SOCKS5 proxy agent for the given session
   * @param {string} proxySessionId - Unique proxy session ID
   * @returns {SocksProxyAgent} Configured proxy agent
   */
  createProxyAgent(proxySessionId) {
    const socksUrl = this.getSocksProxyUrl(proxySessionId);
    logger.debug('Creating SOCKS proxy agent', { 
      proxyUrl: socksUrl.replace(config.proxy.password, '***') 
    });
    
    return new SocksProxyAgent(socksUrl, {
      timeout: 60000
    });
  }

  /**
   * Fetch URL through proxy using proxy-chain (better HTTPS support)
   * @param {string} url - URL to fetch
   * @param {string} proxySessionId - Proxy session ID for sticky IP
   * @param {Object} options - Additional options (headers, cookies, etc.)
   * @returns {Promise<Object>} Response object with data, headers, status
   */
  async fetchThroughProxy(url, proxySessionId, options = {}) {
    const isHttps = url.startsWith('https://');
    
    let agent;
    
    if (isHttps) {
      // For HTTPS, use proxy-chain anonymous proxy (HTTP CONNECT tunnel)
      try {
        const anonymousProxyUrl = await this.getAnonymousProxyUrl(proxySessionId);
        const { HttpsProxyAgent } = require('https-proxy-agent');
        agent = new HttpsProxyAgent(anonymousProxyUrl);
      } catch (error) {
        // Fallback to direct SOCKS5 agent
        logger.warn('Falling back to direct SOCKS5 agent', { error: error.message });
        agent = this.createProxyAgent(proxySessionId);
      }
    } else {
      // For HTTP, use direct SOCKS5 agent
      agent = this.createProxyAgent(proxySessionId);
    }

    const axiosConfig = {
      url,
      method: options.method || 'GET',
      httpAgent: agent,
      httpsAgent: agent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        ...options.headers
      },
      timeout: 60000,
      // Disable automatic redirects so we can handle them manually in navigateRoutes
      // This is needed for ad URLs where we must follow redirects server-side
      maxRedirects: options.followRedirects === false ? 0 : 20,
      validateStatus: (status) => status < 500,
      responseType: 'arraybuffer',
      decompress: true,
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    };

    // Add cookies if provided
    if (options.cookies) {
      axiosConfig.headers['Cookie'] = options.cookies;
    }

    // Add request body for POST requests
    if (options.body) {
      axiosConfig.data = options.body;
    }

    try {
      logger.info('Fetching through proxy', { url, proxySessionId, isHttps });
      const response = await axios(axiosConfig);

      return {
        success: true,
        status: response.status,
        headers: response.headers,
        data: response.data,
        contentType: response.headers['content-type'] || 'text/html'
      };
    } catch (error) {
      logger.error('Proxy fetch failed', { 
        url, 
        error: error.message, 
        code: error.code,
        isHttps
      });
      throw error;
    }
  }

  /**
   * Fetch with retry logic - tries new proxy session on failure
   * @param {string} url - URL to fetch
   * @param {Object} session - Express session object
   * @param {Object} options - Additional options
   * @param {number} maxRetries - Maximum retry attempts
   * @returns {Promise<Object>} Response object
   */
  async fetchWithRetry(url, session, options = {}, maxRetries = 3) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.fetchThroughProxy(url, session.proxySessionId, options);
        return response;
      } catch (error) {
        lastError = error;
        logger.warn(`Proxy attempt ${attempt} failed`, { url, error: error.message });

        // Close the old proxy before creating new one
        await this.closeAnonymousProxy(session.proxySessionId);

        // If not last attempt, generate new proxy session ID (new IP)
        if (attempt < maxRetries) {
          const newSessionId = generateProxySessionId();
          logger.info('Generating new proxy session', { 
            oldSessionId: session.proxySessionId, 
            newSessionId 
          });
          session.proxySessionId = newSessionId;
          
          // Wait a bit before retry
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    // All retries failed
    throw new Error(`All ${maxRetries} proxy attempts failed: ${lastError.message}`);
  }

  /**
   * Test proxy connection by fetching IP
   * @param {string} proxySessionId - Proxy session ID
   * @returns {Promise<Object>} Proxy info
   */
  async testProxyConnection(proxySessionId) {
    // Try HTTPS first using proxy-chain
    try {
      const response = await this.fetchThroughProxy(
        'https://api.ipify.org?format=json',
        proxySessionId
      );
      const data = JSON.parse(response.data.toString());
      return {
        ip: data.ip,
        protocol: 'https',
        success: true
      };
    } catch (httpsError) {
      logger.warn('HTTPS test failed, trying HTTP', { error: httpsError.message });
      
      // Try HTTP as fallback
      try {
        const response = await this.fetchThroughProxy(
          'http://api.ipify.org?format=json',
          proxySessionId
        );
        const data = JSON.parse(response.data.toString());
        return {
          ip: data.ip,
          protocol: 'http',
          success: true
        };
      } catch (httpError) {
        logger.error('Both HTTP and HTTPS tests failed', { 
          httpsError: httpsError.message,
          httpError: httpError.message
        });
        throw httpError;
      }
    }
  }
}

module.exports = new ProxyService();
