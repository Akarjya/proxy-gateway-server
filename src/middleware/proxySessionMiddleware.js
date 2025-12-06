/**
 * Proxy Session Middleware
 * Ensures users have an active proxy session before accessing protected routes
 * This is CRITICAL for IP protection - without this, real IP could leak
 */

const logger = require('../utils/logger');

/**
 * Middleware to check for active proxy session
 * Redirects to /loader if session is not active
 * 
 * @param {Object} options - Configuration options
 * @param {boolean} options.requireSW - Whether to require SW activation (default: false)
 * @param {string[]} options.excludePaths - Paths to exclude from check
 */
const requireProxySession = (options = {}) => {
  const { requireSW = false, excludePaths = [] } = options;

  return (req, res, next) => {
    // Skip check for excluded paths
    if (excludePaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    // Check if session has been activated (went through loader)
    if (!req.session.proxySessionId || !req.session.isActive) {
      logger.info('Redirecting to loader - no active proxy session', {
        path: req.path,
        ip: req.ip
      });

      // Save original URL for redirect after loader
      const returnUrl = req.originalUrl || req.url;
      const encodedUrl = encodeURIComponent(returnUrl);

      // Redirect to loader with return URL
      return res.redirect(`/loader?returnUrl=${encodedUrl}`);
    }

    // Check if SW has been confirmed active (optional, more strict)
    if (requireSW && !req.session.swConfirmed) {
      logger.info('Redirecting to loader - SW not confirmed', {
        path: req.path,
        proxySessionId: req.session.proxySessionId
      });

      const returnUrl = req.originalUrl || req.url;
      const encodedUrl = encodeURIComponent(returnUrl);

      return res.redirect(`/loader?returnUrl=${encodedUrl}`);
    }

    // Session is active, proceed
    next();
  };
};

/**
 * API endpoint to confirm SW is active
 * Called by loader.js after SW is controlling
 */
const confirmSWActive = (req, res) => {
  if (!req.session.proxySessionId) {
    return res.status(400).json({ 
      success: false, 
      error: 'No proxy session' 
    });
  }

  req.session.swConfirmed = true;
  req.session.swConfirmedAt = Date.now();

  logger.info('SW activation confirmed', {
    proxySessionId: req.session.proxySessionId
  });

  res.json({ 
    success: true, 
    message: 'SW activation confirmed' 
  });
};

/**
 * API endpoint to check session status
 * Can be called by client to verify session is valid
 */
const checkSessionStatus = (req, res) => {
  const isActive = !!(req.session.proxySessionId && req.session.isActive);
  const swConfirmed = !!req.session.swConfirmed;

  res.json({
    isActive,
    swConfirmed,
    proxySessionId: req.session.proxySessionId ? 
      req.session.proxySessionId.substring(0, 4) + '****' : null,
    message: isActive ? 
      (swConfirmed ? 'Session active with SW' : 'Session active, SW pending') : 
      'Session not active'
  });
};

module.exports = {
  requireProxySession,
  confirmSWActive,
  checkSessionStatus
};

