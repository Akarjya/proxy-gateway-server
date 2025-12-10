/**
 * Configuration Manager
 * Centralizes all configuration and makes it easy to change target URL
 * 
 * IMPORTANT: Set TARGET_URL in environment variables (Render Dashboard)
 * to change the target website. No code changes needed!
 */

require('dotenv').config();

// Validate required environment variable in production
if (process.env.NODE_ENV === 'production' && !process.env.TARGET_URL) {
  console.warn('⚠️  WARNING: TARGET_URL environment variable not set! Using fallback.');
}

const config = {
  // Server settings
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
    sessionSecret: process.env.SESSION_SECRET || 'change-this-secret'
  },

  // Target website - SET VIA ENVIRONMENT VARIABLE (TARGET_URL)
  // Fallback is only for local development
  target: {
    url: process.env.TARGET_URL || 'https://testt.atolf.xyz/',
    // Extract base domain for cookie handling
    get domain() {
      try {
        return new URL(this.url).hostname;
      } catch {
        return 'testt.atolf.xyz';
      }
    }
  },

  // 922proxy settings
  proxy: {
    host: process.env.PROXY_HOST || 'na.proxys5.net',
    port: parseInt(process.env.PROXY_PORT) || 6200,
    usernameBase: process.env.PROXY_USERNAME_BASE || 'Ashish-zone-custom-region-US',
    password: process.env.PROXY_PASSWORD || 'Maahdev333',
    sessionTime: parseInt(process.env.PROXY_SESSION_TIME) || 120,
    apiKey: process.env.PROXY_API_KEY || '',

    /**
     * Build complete proxy username with session ID for sticky IP
     * @param {string} sessionId - Unique session identifier
     * @returns {string} Complete proxy username
     */
    buildUsername(sessionId) {
      return `${this.usernameBase}-sessid-${sessionId}-sessTime-${this.sessionTime}`;
    },

    /**
     * Get full proxy URL for socks-proxy-agent
     * @param {string} sessionId - Unique session identifier
     * @param {boolean} dnsThruProxy - Whether to resolve DNS through proxy
     * @returns {string} Full SOCKS5 proxy URL
     */
    getProxyUrl(sessionId, dnsThruProxy = true) {
      const username = this.buildUsername(sessionId);
      // socks5h means DNS resolution through proxy (recommended for privacy)
      const protocol = dnsThruProxy ? 'socks5h' : 'socks5';
      return `${protocol}://${username}:${this.password}@${this.host}:${this.port}`;
    }
  }
};

module.exports = config;

