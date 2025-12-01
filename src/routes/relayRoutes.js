/**
 * Relay Routes
 * Handles Service Worker relay requests
 * ALL requests are fetched through SOCKS5 proxy
 * 
 * This is the key component that ensures external requests
 * (including ads, analytics, scripts) go through proxy
 */

const express = require('express');
const router = express.Router();
const proxyService = require('../services/proxyService');
const logger = require('../utils/logger');
const { generateProxySessionId } = require('../utils/sessionIdGenerator');

/**
 * Ensure session has proxy ID
 */
const ensureProxySession = (req, res, next) => {
  if (!req.session.proxySessionId) {
    req.session.proxySessionId = generateProxySessionId();
    req.session.isActive = true;
    logger.info('Created new proxy session for relay', {
      proxySessionId: req.session.proxySessionId
    });
  }
  next();
};

/**
 * CORS headers for relay responses
 */
const setCorsHeaders = (res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Expose-Headers', 'X-Original-Content-Type, X-Original-Cache-Control, X-Proxy-IP');
};

/**
 * OPTIONS /relay - CORS preflight
 */
router.options('/relay', (req, res) => {
  setCorsHeaders(res);
  res.header('Access-Control-Max-Age', '86400');
  res.sendStatus(204);
});

/**
 * POST /relay - Main relay endpoint for Service Worker
 * 
 * Body: {
 *   url: string,       // Target URL to fetch
 *   method: string,    // HTTP method
 *   headers: object,   // Headers to forward
 *   body: string|null  // Request body (for POST, etc.)
 * }
 */
router.post('/relay', ensureProxySession, async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Get target URL from query or body
    const targetUrl = req.query.url || req.body?.url;
    
    if (!targetUrl) {
      logger.warn('Relay request missing URL');
      return res.status(400).json({ error: 'URL parameter required' });
    }
    
    // Validate URL
    let parsedUrl;
    try {
      parsedUrl = new URL(targetUrl);
    } catch (e) {
      logger.warn('Relay request invalid URL', { url: targetUrl });
      return res.status(400).json({ error: 'Invalid URL' });
    }
    
    // Security check: don't relay to localhost/internal IPs
    const hostname = parsedUrl.hostname.toLowerCase();
    if (hostname === 'localhost' || 
        hostname === '127.0.0.1' || 
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.')) {
      logger.warn('Relay blocked internal URL', { url: targetUrl });
      return res.status(403).json({ error: 'Cannot relay to internal addresses' });
    }
    
    // Get request details from body
    const { method = 'GET', headers = {}, body } = req.body || {};
    
    logger.debug('Relay request', {
      targetUrl: targetUrl.substring(0, 100),
      method,
      proxySessionId: req.session.proxySessionId
    });
    
    // Build headers for proxy request
    const proxyHeaders = {
      'User-Agent': headers['user-agent'] || 
                    req.headers['user-agent'] || 
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': headers['accept'] || '*/*',
      'Accept-Language': headers['accept-language'] || 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
    };
    
    // Forward important headers
    if (headers['referer']) {
      proxyHeaders['Referer'] = headers['referer'];
    }
    if (headers['origin']) {
      proxyHeaders['Origin'] = headers['origin'];
    }
    if (headers['content-type']) {
      proxyHeaders['Content-Type'] = headers['content-type'];
    }
    
    // Fetch through SOCKS5 proxy
    const response = await proxyService.fetchWithRetry(
      targetUrl,
      req.session,
      {
        method: method,
        headers: proxyHeaders,
        body: body || undefined
      }
    );
    
    const duration = Date.now() - startTime;
    
    logger.debug('Relay response', {
      targetUrl: targetUrl.substring(0, 60),
      status: response.status,
      contentType: response.contentType?.substring(0, 50),
      duration: duration + 'ms'
    });
    
    // Set CORS headers
    setCorsHeaders(res);
    
    // Pass original content type in header (SW will use this)
    if (response.contentType) {
      res.header('X-Original-Content-Type', response.contentType);
    }
    
    // Pass cache control if present
    const cacheControl = response.headers['cache-control'];
    if (cacheControl) {
      res.header('X-Original-Cache-Control', cacheControl);
    }
    
    // Set response content type
    res.type(response.contentType || 'application/octet-stream');
    res.status(response.status || 200);
    
    // Send response data
    res.send(response.data);
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Relay request failed', {
      url: req.query.url || req.body?.url,
      error: error.message,
      duration: duration + 'ms'
    });
    
    setCorsHeaders(res);
    res.status(502).json({
      error: 'Relay failed',
      message: error.message
    });
  }
});

/**
 * GET /relay - Simple GET relay (alternative to POST)
 */
router.get('/relay', ensureProxySession, async (req, res) => {
  const targetUrl = req.query.url;
  
  if (!targetUrl) {
    return res.status(400).json({ error: 'URL parameter required' });
  }
  
  // Validate URL
  try {
    new URL(targetUrl);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid URL' });
  }
  
  logger.debug('Relay GET request', {
    targetUrl: targetUrl.substring(0, 100),
    proxySessionId: req.session.proxySessionId
  });
  
  try {
    const response = await proxyService.fetchWithRetry(
      targetUrl,
      req.session,
      { method: 'GET' }
    );
    
    setCorsHeaders(res);
    
    if (response.contentType) {
      res.header('X-Original-Content-Type', response.contentType);
    }
    
    res.type(response.contentType || 'application/octet-stream');
    res.status(response.status || 200);
    res.send(response.data);
    
  } catch (error) {
    logger.error('Relay GET failed', { url: targetUrl, error: error.message });
    setCorsHeaders(res);
    res.status(502).json({ error: 'Relay failed' });
  }
});

/**
 * GET /relay/test - Test relay endpoint
 */
router.get('/relay/test', ensureProxySession, async (req, res) => {
  try {
    // Test by fetching IP through relay
    const response = await proxyService.fetchWithRetry(
      'https://api.ipify.org?format=json',
      req.session,
      { method: 'GET' }
    );
    
    const data = JSON.parse(response.data.toString());
    
    res.json({
      success: true,
      message: 'Relay is working',
      proxyIp: data.ip,
      proxySessionId: req.session.proxySessionId
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      proxySessionId: req.session.proxySessionId
    });
  }
});

module.exports = router;

