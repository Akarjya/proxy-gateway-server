/**
 * Proxy Routes
 * Handles all proxied content requests
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const config = require('../config/config');
const proxyService = require('../services/proxyService');
const rewriteService = require('../services/rewriteService');
const cookieService = require('../services/cookieService');
const logger = require('../utils/logger');

/**
 * MIME type mapping for common file extensions
 * Used as fallback when server returns wrong Content-Type
 */
const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.pdf': 'application/pdf',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8'
};

/**
 * Get correct MIME type - prioritize extension over response header
 * This fixes issues where server returns HTML error page for CSS/JS files
 */
function getCorrectMimeType(urlPath, responseContentType, acceptHeader = '') {
  // Extract extension from URL (remove query strings)
  const cleanPath = urlPath.split('?')[0];
  const ext = path.extname(cleanPath).toLowerCase();
  
  // If we have a known extension, use it (more reliable)
  if (ext && MIME_TYPES[ext]) {
    // Check if response looks like an error page (HTML for CSS/JS)
    const isHtmlResponse = responseContentType && responseContentType.includes('text/html');
    const expectedNonHtml = ['.css', '.js', '.mjs', '.json', '.woff', '.woff2', '.ttf', '.otf'].includes(ext);
    
    if (expectedNonHtml && isHtmlResponse) {
      logger.warn('Detected HTML response for non-HTML file, using extension MIME type', {
        path: urlPath,
        ext,
        responseType: responseContentType
      });
    }
    
    return MIME_TYPES[ext];
  }
  
  // Check Accept header for URLs without extensions (dynamic CSS/JS)
  if (acceptHeader) {
    if (acceptHeader.includes('text/css')) {
      return 'text/css; charset=utf-8';
    }
    if (acceptHeader.includes('application/javascript') || acceptHeader.includes('text/javascript')) {
      return 'application/javascript; charset=utf-8';
    }
    if (acceptHeader.includes('font/') || acceptHeader.includes('application/font')) {
      // Try to match specific font type
      if (acceptHeader.includes('woff2')) return 'font/woff2';
      if (acceptHeader.includes('woff')) return 'font/woff';
      if (acceptHeader.includes('ttf')) return 'font/ttf';
      return 'font/woff2';
    }
  }
  
  // Check URL patterns for WordPress/CMS dynamic URLs
  const lowerPath = cleanPath.toLowerCase();
  if (lowerPath.includes('css') || lowerPath.includes('style') || lowerPath.includes('stylesheet')) {
    // Likely a CSS file
    if (!responseContentType || responseContentType.includes('text/html')) {
      logger.debug('Inferring CSS from URL pattern', { path: cleanPath });
      return 'text/css; charset=utf-8';
    }
  }
  if (lowerPath.includes('.js') || lowerPath.includes('script') || lowerPath.includes('/js/')) {
    // Likely a JS file
    if (!responseContentType || responseContentType.includes('text/html')) {
      logger.debug('Inferring JavaScript from URL pattern', { path: cleanPath });
      return 'application/javascript; charset=utf-8';
    }
  }
  
  // Fall back to response content-type
  return responseContentType || 'application/octet-stream';
}

/**
 * Check if response data looks like an HTML error page
 */
function isHtmlErrorPage(data, contentType) {
  if (!contentType || !contentType.includes('text/html')) {
    return false;
  }
  
  const content = Buffer.isBuffer(data) ? data.toString('utf-8').slice(0, 500).toLowerCase() : String(data).slice(0, 500).toLowerCase();
  
  // Check for common error page indicators
  return content.includes('<!doctype') || 
         content.includes('<html') ||
         content.includes('404') ||
         content.includes('not found') ||
         content.includes('error');
}

/**
 * Middleware to check for valid proxy session
 */
const requireProxySession = (req, res, next) => {
  if (!req.session.proxySessionId || !req.session.isActive) {
    logger.warn('No valid proxy session', { path: req.path });
    return res.redirect('/');
  }
  next();
};

// Apply session check to all proxy routes
router.use(requireProxySession);

/**
 * OPTIONS handler for CORS preflight requests
 */
router.options('/external/:encodedUrl', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Max-Age', '86400');
  res.sendStatus(204);
});

router.options('/browse*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Max-Age', '86400');
  res.sendStatus(204);
});

/**
 * GET /browse/*
 * Proxy requests to target site
 */
router.get('/browse*', async (req, res) => {
  try {
    // Extract path after /browse
    let targetPath = req.path.replace('/browse', '') || '/';
    
    // Preserve query string
    if (req.query && Object.keys(req.query).length > 0) {
      const queryString = new URLSearchParams(req.query).toString();
      targetPath += '?' + queryString;
    }

    // Build full target URL
    const targetUrl = config.target.url + targetPath;

    // Set CORS headers
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    logger.info('Proxying request', { 
      targetUrl,
      proxySessionId: req.session.proxySessionId 
    });

    // Get stored cookies for target site
    const cookies = cookieService.buildCookieHeader(req.session);

    // Fetch through proxy with retry
    const response = await proxyService.fetchWithRetry(
      targetUrl,
      req.session,
      {
        method: 'GET',
        cookies,
        headers: {
          'Referer': config.target.url
        }
      }
    );

    // Store any cookies from response
    cookieService.storeCookiesFromResponse(response.headers, req.session);

    // Get correct MIME type (prioritize extension over response header)
    const acceptHeader = req.headers['accept'] || '';
    const correctMimeType = getCorrectMimeType(targetPath, response.contentType, acceptHeader);
    const responseContentType = response.contentType || '';

    // Check if we got an HTML error page for a non-HTML resource
    const cleanPath = targetPath.split('?')[0].toLowerCase();
    const hasNonHtmlExt = ['.css', '.js', '.mjs', '.json', '.woff', '.woff2'].some(ext => cleanPath.endsWith(ext));
    const urlLooksLikeCssJs = cleanPath.includes('css') || cleanPath.includes('/js/') || cleanPath.includes('style');
    const acceptExpectsNonHtml = acceptHeader.includes('text/css') || acceptHeader.includes('javascript');
    const expectedNonHtml = hasNonHtmlExt || urlLooksLikeCssJs || acceptExpectsNonHtml;
    
    if (expectedNonHtml && isHtmlErrorPage(response.data, responseContentType)) {
      logger.warn('Got HTML error page for resource, returning empty', { targetPath, acceptHeader });
      // Return empty content with correct MIME type instead of HTML error
      res.type(correctMimeType).send('');
      return;
    }

    // Handle different content types based on CORRECTED mime type
    if (correctMimeType.includes('text/css')) {
      // CSS file - rewrite URLs in CSS
      const cssContent = Buffer.isBuffer(response.data) ? response.data.toString('utf-8') : response.data;
      
      // If we expected CSS but got HTML, return empty CSS
      if (responseContentType.includes('text/html') && cssContent.includes('<html')) {
        logger.warn('Expected CSS but got HTML, returning empty CSS', { targetPath });
        res.type('text/css; charset=utf-8').send('/* Resource unavailable */');
        return;
      }
      
      const rewrittenCss = rewriteService.rewriteCss(cssContent, config.target.url);
      res.type('text/css; charset=utf-8').send(rewrittenCss);

    } else if (correctMimeType.includes('javascript')) {
      // JavaScript file
      const jsContent = Buffer.isBuffer(response.data) ? response.data.toString('utf-8') : response.data;
      
      // If we expected JS but got HTML, return empty JS
      if (responseContentType.includes('text/html') && jsContent.includes('<html')) {
        logger.warn('Expected JS but got HTML, returning empty JS', { targetPath });
        res.type('application/javascript; charset=utf-8').send('/* Resource unavailable */');
        return;
      }
      
      res.type('application/javascript; charset=utf-8').send(response.data);

    } else if (correctMimeType.includes('text/html')) {
      // Rewrite HTML and inject Service Worker + fallback CORS bypass
      let rewrittenHtml = rewriteService.rewriteHtml(response.data, config.target.url);
      
      // Inject Service Worker registration and fallback interceptors
      // SW will handle external requests (including ads) through /relay
      // Fallback interceptors handle requests before SW activates
      const proxyInterceptScript = `
<script>
(function() {
  'use strict';
  
  // ========================================
  // SERVICE WORKER REGISTRATION
  // ========================================
  // Service Worker intercepts ALL external requests (including ads)
  // and routes them through our SOCKS5 proxy via /relay endpoint
  
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(function(registration) {
        console.log('[Proxy] Service Worker registered successfully');
        console.log('[Proxy] Scope:', registration.scope);
        
        // If there's a waiting SW, activate it
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        
        // Listen for updates
        registration.addEventListener('updatefound', function() {
          console.log('[Proxy] Service Worker update found');
        });
      })
      .catch(function(error) {
        console.warn('[Proxy] Service Worker registration failed:', error);
        console.log('[Proxy] Falling back to fetch/XHR interceptors');
      });
    
    // Handle SW controller change
    navigator.serviceWorker.addEventListener('controllerchange', function() {
      console.log('[Proxy] Service Worker controller changed');
    });
  } else {
    console.warn('[Proxy] Service Workers not supported, using fallback');
  }
  
  // ========================================
  // FALLBACK: FETCH/XHR INTERCEPTORS
  // ========================================
  // These handle requests before Service Worker activates
  // and for same-origin requests that SW doesn't intercept
  
  var originalFetch = window.fetch;
  window.fetch = function(url, options) {
    var absoluteUrl = url;
    if (typeof url === 'string') {
      // Same-origin relative URLs -> /browse
      if (url.startsWith('/') && !url.startsWith('/browse') && !url.startsWith('/external') && !url.startsWith('/relay')) {
        absoluteUrl = '/browse' + url;
      }
      // External URLs -> /external (fallback if SW not active)
      else if (url.startsWith('http') && !url.includes(location.host)) {
        // Check if SW is active - if so, let SW handle it
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
          // SW is active, let original fetch go through (SW will intercept)
          return originalFetch.call(this, url, options);
        }
        // SW not active, use /external fallback
        absoluteUrl = '/external/' + encodeURIComponent(url);
      }
    }
    return originalFetch.call(this, absoluteUrl, options);
  };
  
  var originalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    var absoluteUrl = url;
    if (typeof url === 'string') {
      if (url.startsWith('/') && !url.startsWith('/browse') && !url.startsWith('/external') && !url.startsWith('/relay')) {
        absoluteUrl = '/browse' + url;
      }
      else if (url.startsWith('http') && !url.includes(location.host)) {
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
          return originalXHROpen.apply(this, arguments);
        }
        absoluteUrl = '/external/' + encodeURIComponent(url);
      }
    }
    return originalXHROpen.call(this, method, absoluteUrl, arguments[2], arguments[3], arguments[4]);
  };
  
  console.log('[Proxy] Interceptors initialized');
})();
</script>`;
      
      // Inject after <head> tag
      rewrittenHtml = rewrittenHtml.replace(/<head[^>]*>/i, '$&' + proxyInterceptScript);
      
      res.type('text/html; charset=utf-8').send(rewrittenHtml);

    } else {
      // Pass through other content types (images, fonts, etc.)
      res.type(correctMimeType).send(response.data);
    }

  } catch (error) {
    logger.error('Proxy request failed', { 
      path: req.path, 
      error: error.message 
    });

    // For non-HTML resources, return empty instead of error page
    const ext = path.extname(req.path.split('?')[0]).toLowerCase();
    if (ext && ext !== '.html' && ext !== '.htm') {
      const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
      res.type(mimeType).status(404).send('');
      return;
    }

    res.status(502).render('error', {
      title: 'Proxy Error',
      message: 'Unable to load the requested page. Please try again.'
    });
  }
});

/**
 * POST /browse/*
 * Handle POST requests to target site (forms, etc.)
 */
router.post('/browse*', async (req, res) => {
  try {
    // Set CORS headers
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    let targetPath = req.path.replace('/browse', '') || '/';
    
    // Preserve query string for POST requests
    if (req.query && Object.keys(req.query).length > 0) {
      const queryString = new URLSearchParams(req.query).toString();
      targetPath += '?' + queryString;
    }
    
    const targetUrl = config.target.url + targetPath;

    logger.info('Proxying POST request', { targetUrl });

    const cookies = cookieService.buildCookieHeader(req.session);

    const response = await proxyService.fetchWithRetry(
      targetUrl,
      req.session,
      {
        method: 'POST',
        cookies,
        body: req.body,
        headers: {
          'Content-Type': req.headers['content-type'] || 'application/x-www-form-urlencoded',
          'Referer': config.target.url
        }
      }
    );

    cookieService.storeCookiesFromResponse(response.headers, req.session);

    const correctMimeType = getCorrectMimeType(targetPath, response.contentType);

    if (correctMimeType.includes('text/html')) {
      const rewrittenHtml = rewriteService.rewriteHtml(response.data, config.target.url);
      res.type('text/html; charset=utf-8').send(rewrittenHtml);
    } else if (correctMimeType.includes('application/json')) {
      res.type('application/json; charset=utf-8').send(response.data);
    } else {
      res.type(correctMimeType).send(response.data);
    }

  } catch (error) {
    logger.error('POST proxy failed', { error: error.message });
    res.status(502).render('error', {
      title: 'Proxy Error',
      message: 'Form submission failed. Please try again.'
    });
  }
});

/**
 * POST /external/:encodedUrl
 * Handle POST requests to external APIs
 */
router.post('/external/:encodedUrl', async (req, res) => {
  try {
    const targetUrl = decodeURIComponent(req.params.encodedUrl);

    logger.debug('Proxying external POST request', { targetUrl });

    // Set CORS headers
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    const response = await proxyService.fetchWithRetry(
      targetUrl,
      req.session,
      {
        method: 'POST',
        body: req.body,
        headers: {
          'Content-Type': req.headers['content-type'] || 'application/json'
        }
      }
    );

    const correctMimeType = getCorrectMimeType(targetUrl, response.contentType);
    res.type(correctMimeType).send(response.data);

  } catch (error) {
    logger.error('External POST failed', { error: error.message });
    res.status(502).json({ error: 'External request failed' });
  }
});

/**
 * GET /external/*
 * Proxy external resources (CDNs, third-party assets)
 */
router.get('/external/:encodedUrl', async (req, res) => {
  try {
    const targetUrl = decodeURIComponent(req.params.encodedUrl);

    logger.debug('Proxying external resource', { targetUrl });

    // Set CORS headers to allow cross-origin requests
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    const response = await proxyService.fetchWithRetry(
      targetUrl,
      req.session,
      { method: 'GET' }
    );

    // Get URL path for MIME type detection
    let urlPath = targetUrl;
    try {
      urlPath = new URL(targetUrl).pathname;
    } catch (e) {
      // Use full URL if parsing fails
    }

    // Get correct MIME type (prioritize extension over response header)
    const correctMimeType = getCorrectMimeType(urlPath, response.contentType);
    const responseContentType = response.contentType || '';

    // Check if we got an HTML error page for a non-HTML resource
    const expectedNonHtml = ['.css', '.js', '.mjs', '.json', '.woff', '.woff2', '.ttf', '.otf', '.eot'].some(ext => 
      urlPath.split('?')[0].toLowerCase().endsWith(ext)
    );
    
    if (expectedNonHtml && isHtmlErrorPage(response.data, responseContentType)) {
      logger.warn('Got HTML error page for external resource, returning empty', { targetUrl });
      res.type(correctMimeType).send('');
      return;
    }

    // For CSS, rewrite URLs
    if (correctMimeType.includes('text/css')) {
      // External CSS might reference relative URLs, handle them
      const rewrittenCss = rewriteService.rewriteCss(response.data, targetUrl);
      res.type('text/css; charset=utf-8').send(rewrittenCss);
    } else if (correctMimeType.includes('javascript')) {
      res.type('application/javascript; charset=utf-8').send(response.data);
    } else if (correctMimeType.includes('font/')) {
      // Font files - ensure correct headers
      res.type(correctMimeType).send(response.data);
    } else {
      res.type(correctMimeType).send(response.data);
    }

  } catch (error) {
    logger.error('External resource fetch failed', { 
      url: req.params.encodedUrl,
      error: error.message 
    });
    
    // Try to determine MIME type from URL for empty fallback
    let urlPath = '';
    try {
      urlPath = decodeURIComponent(req.params.encodedUrl);
      urlPath = new URL(urlPath).pathname;
    } catch (e) {
      urlPath = req.params.encodedUrl;
    }
    
    const ext = path.extname(urlPath.split('?')[0]).toLowerCase();
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
    
    // Return empty with correct MIME type instead of HTML error
    res.type(mimeType).status(404).send('');
  }
});

/**
 * GET /test-ip
 * Test endpoint to verify proxy IP (for debugging)
 */
router.get('/test-ip', async (req, res) => {
  try {
    // Try HTTP first (simpler, no TLS)
    const response = await proxyService.fetchWithRetry(
      'http://api.ipify.org?format=json',
      req.session
    );
    
    const data = JSON.parse(response.data.toString());
    res.json({
      proxyIp: data.ip,
      proxySessionId: req.session.proxySessionId,
      message: 'This is the IP that target websites will see'
    });
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      proxySessionId: req.session.proxySessionId
    });
  }
});

/**
 * GET /test-http
 * Test endpoint with HTTP only (no TLS) for debugging
 */
router.get('/test-http', async (req, res) => {
  try {
    const response = await proxyService.fetchWithRetry(
      'http://httpbin.org/ip',
      req.session
    );
    
    const data = JSON.parse(response.data.toString());
    res.json({
      origin: data.origin,
      proxySessionId: req.session.proxySessionId,
      message: 'HTTP test successful'
    });
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      proxySessionId: req.session.proxySessionId
    });
  }
});

module.exports = router;

