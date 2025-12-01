/**
 * Simple Logger Utility
 */

const logger = {
  info: (message, data = {}) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, Object.keys(data).length ? data : '');
  },

  error: (message, error = {}) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error);
  },

  warn: (message, data = {}) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, Object.keys(data).length ? data : '');
  },

  debug: (message, data = {}) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`, Object.keys(data).length ? data : '');
    }
  }
};

module.exports = logger;

