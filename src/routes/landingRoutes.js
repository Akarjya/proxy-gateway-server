/**
 * Landing Page Routes
 * Handles the initial landing page and proceed action
 */

const express = require('express');
const router = express.Router();
const { generateProxySessionId } = require('../utils/sessionIdGenerator');
const logger = require('../utils/logger');

/**
 * GET /
 * Display landing page with proceed button
 */
router.get('/', (req, res) => {
  // If already has valid session, redirect to browse
  if (req.session.proxySessionId && req.session.isActive) {
    return res.redirect('/browse');
  }

  res.render('landing', {
    title: 'Welcome'
  });
});

/**
 * POST /proceed
 * Initialize proxy session and redirect to browse
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

    logger.info('New proxy session initialized', { 
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
 * Reset session and return to landing page
 */
router.get('/reset', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      logger.error('Failed to destroy session', { error: err.message });
    }
    res.redirect('/');
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

