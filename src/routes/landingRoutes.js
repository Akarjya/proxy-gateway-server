/**
 * Landing Page Routes
 * Handles the initial landing page, loader, and session initialization
 */

const express = require('express');
const router = express.Router();
const { generateProxySessionId } = require('../utils/sessionIdGenerator');
const logger = require('../utils/logger');

/**
 * GET /
 * Display loader page (auto-redirect flow)
 * If session already exists, redirect directly to browse
 */
router.get('/', (req, res) => {
  // If already has valid session, redirect to browse
  if (req.session.proxySessionId && req.session.isActive) {
    return res.redirect('/browse');
  }

  // Show loader page which will auto-initialize session
  res.redirect('/loader');
});

/**
 * GET /loader
 * Display loading page with auto session initialization
 */
router.get('/loader', (req, res) => {
  // If already has valid session, redirect to browse
  if (req.session.proxySessionId && req.session.isActive) {
    return res.redirect('/browse');
  }

  // Get return URL from query or default to /browse
  let returnUrl = req.query.returnUrl || '/browse';
  
  // Validate returnUrl to prevent XSS - only allow relative URLs starting with /
  // Must start with single /, not contain protocol, and not have double slashes at start
  if (typeof returnUrl !== 'string' || 
      !returnUrl.startsWith('/') || 
      returnUrl.startsWith('//') || 
      returnUrl.includes(':')) {
    returnUrl = '/browse';
  }

  res.render('loader', {
    title: 'Loading...',
    returnUrl: returnUrl
  });
});

/**
 * POST /api/init-session
 * API endpoint for background session initialization
 * Called by loader page via AJAX
 */
router.post('/api/init-session', (req, res) => {
  try {
    // Check if session already exists
    if (req.session.proxySessionId && req.session.isActive) {
      logger.info('Session already exists', { 
        proxySessionId: req.session.proxySessionId 
      });
      return res.json({
        success: true,
        message: 'Session already active',
        proxySessionId: req.session.proxySessionId
      });
    }

    // Generate unique proxy session ID for sticky IP
    const proxySessionId = generateProxySessionId();

    // Store in session
    req.session.proxySessionId = proxySessionId;
    req.session.isActive = true;
    req.session.startTime = Date.now();
    req.session.targetCookies = {};

    logger.info('New proxy session initialized via API', { 
      proxySessionId,
      userAgent: req.headers['user-agent'],
      ip: req.ip
    });

    // Return success
    res.json({
      success: true,
      message: 'Session initialized',
      proxySessionId: proxySessionId
    });

  } catch (error) {
    logger.error('Failed to initialize session via API', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to initialize session',
      error: error.message
    });
  }
});

/**
 * GET /api/session-status
 * Check if session is active
 */
router.get('/api/session-status', (req, res) => {
  res.json({
    active: !!(req.session.proxySessionId && req.session.isActive),
    proxySessionId: req.session.proxySessionId || null
  });
});

/**
 * POST /proceed
 * Legacy endpoint - Initialize proxy session and redirect to browse
 * Kept for backward compatibility
 */
router.post('/proceed', (req, res) => {
  try {
    // Generate unique proxy session ID for sticky IP
    const proxySessionId = generateProxySessionId();

    // Store in session
    req.session.proxySessionId = proxySessionId;
    req.session.isActive = true;
    req.session.startTime = Date.now();
    req.session.targetCookies = {};

    logger.info('New proxy session initialized (legacy)', { 
      proxySessionId,
      userAgent: req.headers['user-agent'],
      ip: req.ip
    });

    // Redirect to proxied content
    res.redirect('/browse');

  } catch (error) {
    logger.error('Failed to initialize session', { error: error.message });
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to initialize session. Please try again.'
    });
  }
});

/**
 * GET /reset
 * Reset session and return to loader page
 */
router.get('/reset', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      logger.error('Failed to destroy session', { error: err.message });
    }
    res.redirect('/loader');
  });
});

/**
 * GET /landing
 * Show original landing page (optional - for those who want manual button)
 */
router.get('/landing', (req, res) => {
  // If already has valid session, redirect to browse
  if (req.session.proxySessionId && req.session.isActive) {
    return res.redirect('/browse');
  }

  res.render('landing', {
    title: 'Welcome'
  });
});

/**
 * GET /sw-test
 * Service Worker test page
 */
router.get('/sw-test', (req, res) => {
  // Initialize session if needed
  if (!req.session.proxySessionId) {
    req.session.proxySessionId = generateProxySessionId();
    req.session.isActive = true;
  }
  
  res.render('sw-test', {
    title: 'Service Worker Test'
  });
});

module.exports = router;

