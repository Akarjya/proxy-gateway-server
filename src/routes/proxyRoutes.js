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
      
      // Get original target URL for ad script spoofing
      const targetUrl = new URL(config.target.url);
      const originalOrigin = targetUrl.origin;
      const originalHref = config.target.url;
      
      // Inject Service Worker registration and fallback interceptors
      // SW will handle external requests (including ads) through /relay
      // Fallback interceptors handle requests before SW activates
      // Also inject URL spoofing for Google Ads compatibility
      const proxyInterceptScript = `
<script>
(function() {
  'use strict';
  
  // ========================================
  // GOOGLE ADS URL SPOOFING
  // ========================================
  // Google Ads checks window.location to verify domain authorization
  // We need to make ad scripts see the original target URL
  // This runs BEFORE any other scripts to intercept ad URL detection
  
  var ORIGINAL_URL = '${originalHref}';
  var ORIGINAL_ORIGIN = '${originalOrigin}';
  var ORIGINAL_HOSTNAME = '${targetUrl.hostname}';
  var ORIGINAL_PATHNAME = '${targetUrl.pathname}';
  
  // Store original location methods
  var realLocation = window.location;
  
  // Create a location-like object for ads
  var spoofedLocation = {
    href: ORIGINAL_URL,
    origin: ORIGINAL_ORIGIN,
    hostname: ORIGINAL_HOSTNAME,
    host: ORIGINAL_HOSTNAME,
    pathname: ORIGINAL_PATHNAME || '/',
    protocol: 'https:',
    port: '',
    search: realLocation.search,
    hash: realLocation.hash,
    ancestorOrigins: realLocation.ancestorOrigins,
    assign: function(url) { realLocation.assign(url); },
    replace: function(url) { realLocation.replace(url); },
    reload: function() { realLocation.reload(); },
    toString: function() { return ORIGINAL_URL; }
  };
  
  // Intercept googletag and adsbygoogle initialization
  // These scripts read location early, so we patch their URL detection
  
  // Method 1: Override encodeURIComponent for URL parameters
  var originalEncodeURI = window.encodeURIComponent;
  window.encodeURIComponent = function(str) {
    if (typeof str === 'string') {
      // Replace proxy URL with original URL in ad request parameters
      str = str.replace(/https?:\\/\\/[^/]*\\/browse/g, ORIGINAL_ORIGIN);
      str = str.replace(new RegExp(realLocation.origin, 'g'), ORIGINAL_ORIGIN);
      str = str.replace(new RegExp(realLocation.hostname, 'g'), ORIGINAL_HOSTNAME);
    }
    return originalEncodeURI(str);
  };
  
  // Method 2: Patch URL constructor to fix ad URLs
  var OriginalURL = window.URL;
  window.URL = function(url, base) {
    // If constructing URL from current location, use original
    if (url === realLocation.href || url === realLocation.origin) {
      url = url.replace(realLocation.origin, ORIGINAL_ORIGIN);
    }
    if (base === realLocation.href || base === realLocation.origin) {
      base = base.replace(realLocation.origin, ORIGINAL_ORIGIN);
    }
    return new OriginalURL(url, base);
  };
  window.URL.prototype = OriginalURL.prototype;
  window.URL.createObjectURL = OriginalURL.createObjectURL;
  window.URL.revokeObjectURL = OriginalURL.revokeObjectURL;
  
  // Method 3: Override document.URL and document.documentURI
  try {
    Object.defineProperty(document, 'URL', {
      get: function() { return ORIGINAL_URL; },
      configurable: true
    });
    Object.defineProperty(document, 'documentURI', {
      get: function() { return ORIGINAL_URL; },
      configurable: true
    });
  } catch(e) {
    console.log('[Proxy] Could not override document.URL');
  }
  
  // Method 4: Create a getter trap for common ad script patterns
  // Ad scripts often do: var url = location.href || document.location.href
  // We intercept String() calls on location
  var originalToString = Location.prototype.toString;
  Location.prototype.toString = function() {
    // Check if this is being called from an ad context
    var stack = new Error().stack || '';
    if (stack.includes('googlesyndication') || 
        stack.includes('doubleclick') || 
        stack.includes('googleads') ||
        stack.includes('adsbygoogle')) {
      return ORIGINAL_URL;
    }
    return originalToString.call(this);
  };
  
  // Method 5: Intercept iframe creation for ad containers
  var originalCreateElement = document.createElement;
  document.createElement = function(tagName) {
    var element = originalCreateElement.call(document, tagName);
    if (tagName.toLowerCase() === 'iframe') {
      // For ad iframes, try to set referrer policy
      setTimeout(function() {
        try {
          if (element.contentWindow && element.src && 
              (element.src.includes('googlesyndication') || 
               element.src.includes('doubleclick'))) {
            // Ad iframe detected
            console.log('[Proxy] Ad iframe detected');
          }
        } catch(e) {}
      }, 100);
    }
    return element;
  };
  
  // Method 6: Intercept postMessage for ad verification
  var originalPostMessage = window.postMessage;
  window.postMessage = function(message, targetOrigin, transfer) {
    // Modify messages that contain our proxy URL
    if (typeof message === 'string' && message.includes(realLocation.origin)) {
      message = message.replace(new RegExp(realLocation.origin, 'g'), ORIGINAL_ORIGIN);
    } else if (typeof message === 'object' && message !== null) {
      try {
        var msgStr = JSON.stringify(message);
        if (msgStr.includes(realLocation.origin)) {
          msgStr = msgStr.replace(new RegExp(realLocation.origin, 'g'), ORIGINAL_ORIGIN);
          message = JSON.parse(msgStr);
        }
      } catch(e) {}
    }
    return originalPostMessage.call(this, message, targetOrigin, transfer);
  };
  
  console.log('[Proxy] Ad URL spoofing initialized for:', ORIGINAL_URL);
  
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
        
        // Send original URL to Service Worker for ad URL modification
        function sendOriginalUrl(sw) {
          if (sw) {
            sw.postMessage({ type: 'SET_ORIGINAL_URL', url: ORIGINAL_URL });
            console.log('[Proxy] Sent original URL to Service Worker');
          }
        }
        
        // Send to active SW
        if (navigator.serviceWorker.controller) {
          sendOriginalUrl(navigator.serviceWorker.controller);
        }
        
        // If there's a waiting SW, activate it and send URL
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          sendOriginalUrl(registration.waiting);
        }
        
        // Listen for updates
        registration.addEventListener('updatefound', function() {
          console.log('[Proxy] Service Worker update found');
          if (registration.installing) {
            registration.installing.addEventListener('statechange', function() {
              if (this.state === 'activated') {
                sendOriginalUrl(this);
              }
            });
          }
        });
      })
      .catch(function(error) {
        console.warn('[Proxy] Service Worker registration failed:', error);
        console.log('[Proxy] Falling back to fetch/XHR interceptors');
      });
    
    // Handle SW controller change - send original URL to new controller
    navigator.serviceWorker.addEventListener('controllerchange', function() {
      console.log('[Proxy] Service Worker controller changed');
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'SET_ORIGINAL_URL', url: ORIGINAL_URL });
      }
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
  
  // ========================================
  // NAVIGATION INTERCEPTION (IP LEAK PROTECTION)
  // ========================================
  // This section ensures ALL external navigation (including ad clicks)
  // goes through our proxy to protect user's real IP
  
  // Helper: Check if URL is external
  function isExternalUrl(url) {
    if (!url || url.startsWith('#') || url.startsWith('javascript:') || url.startsWith('mailto:') || url.startsWith('tel:')) {
      return false;
    }
    if (url.startsWith('/browse') || url.startsWith('/external') || url.startsWith('/navigate') || url.startsWith('/relay')) {
      return false;
    }
    if (url.startsWith('http')) {
      try {
        var urlObj = new (window._OriginalURL || URL)(url);
        return urlObj.hostname !== location.hostname;
      } catch(e) {
        return false;
      }
    }
    return false;
  }
  
  // Helper: Check if URL is a Google ad or tracking URL
  function isAdUrl(url) {
    if (!url) return false;
    try {
      var urlObj = new (window._OriginalURL || URL)(url);
      var hostname = urlObj.hostname.toLowerCase();
      var pathname = urlObj.pathname.toLowerCase();
      
      // Google ad domains
      var adDomains = [
        'googleads.g.doubleclick.net',
        'ad.doubleclick.net',
        'doubleclick.net',
        'googleadservices.com',
        'googlesyndication.com',
        'adservice.google',
        'googleads.com'
      ];
      
      for (var i = 0; i < adDomains.length; i++) {
        if (hostname.includes(adDomains[i])) return true;
      }
      
      // Check path patterns
      if (pathname.includes('/aclk') || pathname.includes('/pagead') || pathname.includes('/adclick')) {
        return true;
      }
      
      return false;
    } catch(e) {
      return false;
    }
  }
  
  // Helper: Route URL through proxy
  function proxyNavigate(url) {
    if (url.startsWith('/browse') || url.startsWith('/external') || url.startsWith('/navigate')) {
      return url;
    }
    return '/navigate?url=' + encodeURIComponent(url);
  }
  
  // 1. Intercept ALL link clicks (including dynamically created ones)
  document.addEventListener('click', function(e) {
    var target = e.target;
    
    // Find the closest anchor element (handle nested elements in ads)
    while (target && target.tagName !== 'A') {
      target = target.parentElement;
    }
    
    if (target && target.href) {
      var href = target.href;
      
      // Priority 1: Handle ad URLs immediately
      if (isAdUrl(href)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        console.log('[Proxy] Intercepted AD click:', href.substring(0, 80));
        
        // For ad URLs, navigate immediately to prevent any other handlers
        window.location.href = proxyNavigate(href);
        return false;
      }
      
      // Priority 2: Handle other external links
      if (isExternalUrl(href)) {
        e.preventDefault();
        e.stopPropagation();
        console.log('[Proxy] Intercepted external link click:', href.substring(0, 80));
        
        // Route through proxy navigate
        window.location.href = proxyNavigate(href);
        return false;
      }
    }
  }, true); // Use capture phase to catch before other handlers
  
  // 1b. Additional listener at window level to catch bubbling ad clicks
  window.addEventListener('click', function(e) {
    var target = e.target;
    while (target && target.tagName !== 'A') {
      target = target.parentElement;
    }
    
    if (target && target.href && isAdUrl(target.href)) {
      e.preventDefault();
      e.stopPropagation();
      console.log('[Proxy] Window-level ad click intercept:', target.href.substring(0, 60));
      window.location.href = proxyNavigate(target.href);
      return false;
    }
  }, false);
  
  // 2. Intercept window.open (for popup links, ad clicks)
  var _originalWindowOpen = window.open;
  window.open = function(url, name, features) {
    if (url && isExternalUrl(url)) {
      console.log('[Proxy] Intercepted window.open:', url);
      url = proxyNavigate(url);
    }
    return _originalWindowOpen.call(this, url, name, features);
  };
  
  // 3. Intercept location assignments
  // Store original location descriptor
  var locationDescriptor = Object.getOwnPropertyDescriptor(window, 'location');
  
  // Intercept location.href assignment
  if (window.history && window.history.pushState) {
    // Use history API to detect navigation attempts
    var _originalPushState = history.pushState;
    var _originalReplaceState = history.replaceState;
    
    history.pushState = function(state, title, url) {
      if (url && isExternalUrl(url)) {
        console.log('[Proxy] Intercepted pushState:', url);
        url = proxyNavigate(url);
      }
      return _originalPushState.call(this, state, title, url);
    };
    
    history.replaceState = function(state, title, url) {
      if (url && isExternalUrl(url)) {
        console.log('[Proxy] Intercepted replaceState:', url);
        url = proxyNavigate(url);
      }
      return _originalReplaceState.call(this, state, title, url);
    };
  }
  
  // 4. Intercept form submissions to external URLs
  document.addEventListener('submit', function(e) {
    var form = e.target;
    if (form && form.action && isExternalUrl(form.action)) {
      e.preventDefault();
      console.log('[Proxy] Intercepted form submission:', form.action);
      
      // Create new action through proxy
      var proxyAction = proxyNavigate(form.action);
      
      // Clone form data and submit
      if (form.method && form.method.toLowerCase() === 'post') {
        // For POST, redirect to navigate with form data
        var formData = new FormData(form);
        var params = new URLSearchParams(formData);
        
        // Create a temporary form pointing to navigate
        var tempForm = document.createElement('form');
        tempForm.method = 'POST';
        tempForm.action = '/navigate?url=' + encodeURIComponent(form.action);
        tempForm.style.display = 'none';
        
        // Copy form inputs
        for (var pair of formData.entries()) {
          var input = document.createElement('input');
          input.type = 'hidden';
          input.name = pair[0];
          input.value = pair[1];
          tempForm.appendChild(input);
        }
        
        document.body.appendChild(tempForm);
        tempForm.submit();
      } else {
        // For GET, just redirect with query params
        window.location.href = proxyAction;
      }
    }
  }, true);
  
  // 5. Use Navigation API if available (modern browsers)
  if ('navigation' in window) {
    navigation.addEventListener('navigate', function(e) {
      var url = e.destination.url;
      if (isExternalUrl(url)) {
        e.preventDefault();
        console.log('[Proxy] Navigation API intercepted:', url);
        window.location.href = proxyNavigate(url);
      }
    });
  }
  
  // 6. Catch unload and warn about leaving proxy
  window.addEventListener('beforeunload', function(e) {
    // Check if navigating to external URL
    // Note: Modern browsers restrict what we can do here
    console.log('[Proxy] Page unload event triggered');
  });
  
  // 7. Monitor for dynamic iframe creation (ad iframes)
  // When an ad iframe tries to navigate the top window, we intercept
  var _origIframeSetter = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'src');
  if (_origIframeSetter && _origIframeSetter.set) {
    Object.defineProperty(HTMLIFrameElement.prototype, 'src', {
      set: function(value) {
        // Log iframe src changes
        if (value && (value.includes('googlesyndication') || value.includes('doubleclick'))) {
          console.log('[Proxy] Ad iframe src set:', value.substring(0, 60));
        }
        return _origIframeSetter.set.call(this, value);
      },
      get: _origIframeSetter.get
    });
  }
  
  console.log('[Proxy] Navigation interception active - All external links will go through proxy');
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

