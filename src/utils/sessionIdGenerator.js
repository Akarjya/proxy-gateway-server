/**
 * Session ID Generator
 * Generates unique session IDs for sticky proxy sessions
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Generate a unique session ID for proxy sticky sessions
 * Format: 8 character alphanumeric string
 * @returns {string} Unique session ID
 */
function generateProxySessionId() {
  // Generate UUID and take first 8 characters (alphanumeric only)
  return uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();
}

/**
 * Generate a random string of specified length
 * @param {number} length - Desired length
 * @returns {string} Random alphanumeric string
 */
function generateRandomString(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

module.exports = {
  generateProxySessionId,
  generateRandomString
};

