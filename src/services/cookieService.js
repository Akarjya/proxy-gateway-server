/**
 * Cookie Service
 * Handles cookie storage and mapping between target site and our proxy
 */

const config = require('../config/config');
const logger = require('../utils/logger');

class CookieService {
  /**
   * Extract cookies from response headers and store in session
   * @param {Object} responseHeaders - Response headers from target
   * @param {Object} session - Express session object
   */
  storeCookiesFromResponse(responseHeaders, session) {
    const setCookieHeaders = responseHeaders['set-cookie'];
    
    if (!setCookieHeaders) return;

    // Initialize cookie storage in session
    if (!session.targetCookies) {
      session.targetCookies = {};
    }

    const cookies = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];

    cookies.forEach(cookieStr => {
      try {
        const parsed = this.parseCookie(cookieStr);
        if (parsed) {
          session.targetCookies[parsed.name] = parsed.value;
          logger.debug('Stored cookie', { name: parsed.name });
        }
      } catch (error) {
        logger.warn('Failed to parse cookie', { cookie: cookieStr, error: error.message });
      }
    });
  }

  /**
   * Parse a Set-Cookie header string
   * @param {string} cookieStr - Cookie string
   * @returns {Object|null} Parsed cookie with name and value
   */
  parseCookie(cookieStr) {
    const parts = cookieStr.split(';');
    const [nameValue] = parts;
    
    if (!nameValue) return null;

    const [name, ...valueParts] = nameValue.split('=');
    const value = valueParts.join('='); // Handle values with = in them

    if (!name) return null;

    return {
      name: name.trim(),
      value: value ? value.trim() : ''
    };
  }

  /**
   * Build Cookie header from stored cookies
   * @param {Object} session - Express session object
   * @returns {string} Cookie header value
   */
  buildCookieHeader(session) {
    if (!session.targetCookies || Object.keys(session.targetCookies).length === 0) {
      return '';
    }

    return Object.entries(session.targetCookies)
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }

  /**
   * Clear all stored cookies for a session
   * @param {Object} session - Express session object
   */
  clearCookies(session) {
    session.targetCookies = {};
    logger.debug('Cleared session cookies');
  }
}

module.exports = new CookieService();

