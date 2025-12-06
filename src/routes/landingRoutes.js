/**
 * Landing/Loader Routes
 * Serves the loader page that activates the Service Worker
 * After SW activation, redirects to homepage
 */

const express = require('express');
const router = express.Router();
const { generateProxySessionId } = require('../utils/sessionIdGenerator');
const logger = require('../utils/logger');

/**
 * GET /loader - Loader page (SW activation)
 * This is the entry point that activates Service Worker
 */
router.get('/loader', (req, res) => {
  // Initialize proxy session
  if (!req.session.proxySessionId) {
    req.session.proxySessionId = generateProxySessionId();
    req.session.isActive = true;
    req.session.startTime = Date.now();
    
    logger.info('New proxy session initialized at loader', { 
      proxySessionId: req.session.proxySessionId,
      userAgent: req.headers['user-agent']?.substring(0, 50),
      ip: req.ip
    });
  }

  res.render('loader', {
    title: 'Loading... | atolf.xyz'
  });
});

/**
 * GET /reset - Reset session and return to loader
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
 */
router.get('/content', (req, res) => {
  res.redirect('/');
});

router.post('/proceed', (req, res) => {
  res.redirect('/');
});

router.get('/browse', (req, res) => {
  res.redirect('/');
});

router.get('/browse/*', (req, res) => {
  res.redirect('/');
});

module.exports = router;
