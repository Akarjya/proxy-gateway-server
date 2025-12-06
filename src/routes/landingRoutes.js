/**
 * Landing/Loader Routes
 * Serves the loader page that activates the Service Worker
 * After SW activation, redirects to homepage or original destination
 * 
 * CRITICAL: This is the entry point that activates proxy protection
 * Without going through here, user's real IP would be exposed
 */

const express = require('express');
const router = express.Router();
const { generateProxySessionId } = require('../utils/sessionIdGenerator');
const logger = require('../utils/logger');
const { confirmSWActive, checkSessionStatus } = require('../middleware/proxySessionMiddleware');

/**
 * GET /loader - Loader page (SW activation)
 * This is the entry point that activates Service Worker
 * 
 * Query params:
 * - returnUrl: URL to redirect to after SW activation (optional)
 */
router.get('/loader', (req, res) => {
  // Get return URL from query param
  const returnUrl = req.query.returnUrl || '/';
  
  // Decode URL if needed
  let decodedReturnUrl = '/';
  try {
    decodedReturnUrl = decodeURIComponent(returnUrl);
    // Security: Only allow same-origin redirects
    if (decodedReturnUrl.startsWith('http') || decodedReturnUrl.includes('//')) {
      decodedReturnUrl = '/';
    }
  } catch (e) {
    decodedReturnUrl = '/';
  }

  // Initialize proxy session
  if (!req.session.proxySessionId) {
    req.session.proxySessionId = generateProxySessionId();
    req.session.isActive = true;
    req.session.startTime = Date.now();
    req.session.swConfirmed = false; // Will be set true when SW confirms activation
    
    logger.info('New proxy session initialized at loader', { 
      proxySessionId: req.session.proxySessionId,
      returnUrl: decodedReturnUrl,
      userAgent: req.headers['user-agent']?.substring(0, 50),
      ip: req.ip
    });
  } else {
    logger.info('Existing proxy session at loader', {
      proxySessionId: req.session.proxySessionId,
      returnUrl: decodedReturnUrl
    });
  }

  res.render('loader', {
    title: 'Loading... | atolf.xyz',
    returnUrl: decodedReturnUrl,
    proxySessionId: req.session.proxySessionId
  });
});

/**
 * POST /api/sw-confirm - Confirm Service Worker activation
 * Called by loader.js when SW is controlling the page
 */
router.post('/api/sw-confirm', confirmSWActive);

/**
 * GET /api/session-status - Check session status
 * Can be called by client to verify session state
 */
router.get('/api/session-status', checkSessionStatus);

/**
 * GET /reset - Reset session and return to loader
 */
router.get('/reset', (req, res) => {
  const proxySessionId = req.session.proxySessionId;
  
  req.session.destroy((err) => {
    if (err) {
      logger.error('Failed to destroy session', { error: err.message });
    } else {
      logger.info('Session destroyed', { proxySessionId });
    }
    res.redirect('/loader');
  });
});

/**
 * GET /sw-test - Service Worker test page (for debugging)
 */
router.get('/sw-test', (req, res) => {
  if (!req.session.proxySessionId) {
    req.session.proxySessionId = generateProxySessionId();
    req.session.isActive = true;
  }
  
  res.render('sw-test', {
    title: 'Service Worker Test'
  });
});

/**
 * Legacy routes - redirect to new structure
 * (for old URLs that might be bookmarked)
 */
router.get('/content', (req, res) => {
  res.redirect('/');
});

router.post('/proceed', (req, res) => {
  res.redirect('/');
});

module.exports = router;
