/**
 * Navigate Routes
 * Handles navigation to external URLs through proxy
 * This ensures ALL external links (including ad clicks) go through SOCKS5 proxy
 * 
 * When user clicks any external link (including ads), they're routed here
 * which fetches the page through proxy, keeping user's IP hidden
 */

const express = require('express');
const router = express.Router();
const proxyService = require('../services/proxyService');
const rewriteService = require('../services/rewriteService');
const logger = require('../utils/logger');
const { generateProxySessionId } = require('../utils/sessionIdGenerator');

/**
 * Ensure session has proxy ID
 */
const ensureProxySession = (req, res, next) => {
  if (!req.session.proxySessionId) {
    req.session.proxySessionId = generateProxySessionId();
    req.session.isActive = true;
    logger.info('Created new proxy session for navigation', {
      proxySessionId: req.session.proxySessionId
    });
  }
  next();
};

/**
 * GET /navigate?url=<encoded_url>
 * Navigate to any external URL through proxy
 * Used for ad clicks, external links, etc.
 */
router.get('/navigate', ensureProxySession, async (req, res) => {
  const targetUrl = req.query.url;
  
  if (!targetUrl) {
    return res.status(400).render('error', {
      title: 'Navigation Error',
      message: 'No URL provided'
    });
  }

  // Decode URL if double-encoded
  let decodedUrl = targetUrl;
  try {
    // Handle double encoding
    if (decodedUrl.includes('%')) {
      decodedUrl = decodeURIComponent(decodedUrl);
    }
  } catch (e) {
    // Use as-is if decoding fails
  }

  // Validate URL
  let parsedUrl;
  try {
    parsedUrl = new URL(decodedUrl);
  } catch (e) {
    return res.status(400).render('error', {
      title: 'Navigation Error',
      message: 'Invalid URL provided'
    });
  }

  // Security: Block internal/localhost URLs
  const hostname = parsedUrl.hostname.toLowerCase();
  if (hostname === 'localhost' || 
      hostname === '127.0.0.1' || 
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.')) {
    return res.status(403).render('error', {
      title: 'Navigation Blocked',
      message: 'Cannot navigate to internal addresses'
    });
  }

  logger.info('Navigation request', {
    targetUrl: decodedUrl,
    proxySessionId: req.session.proxySessionId
  });

  try {
    // Fetch the external page through SOCKS5 proxy
    const response = await proxyService.fetchWithRetry(
      decodedUrl,
      req.session,
      {
        method: 'GET',
        headers: {
          'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        }
      }
    );

    const contentType = response.contentType || '';

    // Handle HTML responses - rewrite links to stay in proxy
    if (contentType.includes('text/html')) {
      let html = Buffer.isBuffer(response.data) 
        ? response.data.toString('utf-8') 
        : response.data;

      // Rewrite all URLs in the external page to go through our proxy
      html = rewriteExternalHtml(html, decodedUrl);
      
      res.type('text/html; charset=utf-8').send(html);
    } 
    // Handle redirects - follow through proxy
    else if (response.status >= 300 && response.status < 400 && response.headers.location) {
      const redirectUrl = new URL(response.headers.location, decodedUrl).href;
      return res.redirect('/navigate?url=' + encodeURIComponent(redirectUrl));
    }
    // Other content types
    else {
      res.type(contentType || 'application/octet-stream').send(response.data);
    }

  } catch (error) {
    logger.error('Navigation failed', {
      url: decodedUrl,
      error: error.message
    });

    res.status(502).render('error', {
      title: 'Navigation Error',
      message: 'Failed to load the page. Please try again.'
    });
  }
});

/**
 * POST /navigate
 * Handle form submissions to external URLs
 */
router.post('/navigate', ensureProxySession, async (req, res) => {
  const targetUrl = req.query.url || req.body.url;
  
  if (!targetUrl) {
    return res.status(400).json({ error: 'No URL provided' });
  }

  let decodedUrl = targetUrl;
  try {
    if (decodedUrl.includes('%')) {
      decodedUrl = decodeURIComponent(decodedUrl);
    }
  } catch (e) {}

  logger.info('Navigation POST request', {
    targetUrl: decodedUrl,
    proxySessionId: req.session.proxySessionId
  });

  try {
    const response = await proxyService.fetchWithRetry(
      decodedUrl,
      req.session,
      {
        method: 'POST',
        headers: {
          'Content-Type': req.headers['content-type'] || 'application/x-www-form-urlencoded',
        },
        body: req.body
      }
    );

    const contentType = response.contentType || '';

    if (contentType.includes('text/html')) {
      let html = Buffer.isBuffer(response.data) 
        ? response.data.toString('utf-8') 
        : response.data;
      html = rewriteExternalHtml(html, decodedUrl);
      res.type('text/html; charset=utf-8').send(html);
    } else {
      res.type(contentType || 'application/octet-stream').send(response.data);
    }

  } catch (error) {
    logger.error('Navigation POST failed', { url: decodedUrl, error: error.message });
    res.status(502).json({ error: 'Navigation failed' });
  }
});

/**
 * Rewrite HTML from external sites to keep navigation within proxy
 * @param {string} html - HTML content
 * @param {string} baseUrl - Base URL of the external page
 * @returns {string} Rewritten HTML
 */
function rewriteExternalHtml(html, baseUrl) {
  const cheerio = require('cheerio');
  const $ = cheerio.load(html, { decodeEntities: false });
  
  const baseOrigin = new URL(baseUrl).origin;

  // Rewrite all links to go through /navigate
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (href && !href.startsWith('#') && !href.startsWith('javascript:') && !href.startsWith('mailto:')) {
      try {
        const absoluteUrl = new URL(href, baseUrl).href;
        $(el).attr('href', '/navigate?url=' + encodeURIComponent(absoluteUrl));
        // Remove target="_blank" to keep in same window
        $(el).removeAttr('target');
      } catch (e) {}
    }
  });

  // Rewrite form actions
  $('form[action]').each((_, el) => {
    const action = $(el).attr('action');
    if (action) {
      try {
        const absoluteUrl = new URL(action, baseUrl).href;
        $(el).attr('action', '/navigate?url=' + encodeURIComponent(absoluteUrl));
      } catch (e) {}
    }
  });

  // Rewrite images, scripts, stylesheets to go through /external
  $('img[src], script[src], link[href]').each((_, el) => {
    const attr = $(el).attr('src') || $(el).attr('href');
    if (attr && !attr.startsWith('data:')) {
      try {
        const absoluteUrl = new URL(attr, baseUrl).href;
        if ($(el).attr('src')) {
          $(el).attr('src', '/external/' + encodeURIComponent(absoluteUrl));
        } else {
          $(el).attr('href', '/external/' + encodeURIComponent(absoluteUrl));
        }
      } catch (e) {}
    }
  });

  // Inject navigation interceptor script
  const interceptScript = `
<script>
(function() {
  'use strict';
  
  // Intercept all link clicks
  document.addEventListener('click', function(e) {
    var target = e.target.closest('a');
    if (target && target.href) {
      var href = target.href;
      // If it's an external link not already going through navigate
      if (href.startsWith('http') && !href.includes('/navigate?') && !href.includes('/external/') && !href.includes('/browse')) {
        e.preventDefault();
        window.location.href = '/navigate?url=' + encodeURIComponent(href);
      }
    }
  }, true);
  
  // Intercept window.open
  var originalOpen = window.open;
  window.open = function(url, name, features) {
    if (url && url.startsWith('http')) {
      url = '/navigate?url=' + encodeURIComponent(url);
    }
    return originalOpen.call(this, url, name, features);
  };
  
  // Intercept form submissions
  document.addEventListener('submit', function(e) {
    var form = e.target;
    if (form.action && form.action.startsWith('http') && !form.action.includes('/navigate?')) {
      e.preventDefault();
      form.action = '/navigate?url=' + encodeURIComponent(form.action);
      form.submit();
    }
  }, true);
  
  console.log('[Proxy] External page navigation interceptors active');
})();
</script>`;

  // Inject before </body>
  if ($.html().includes('</body>')) {
    $('body').append(interceptScript);
  } else {
    return $.html() + interceptScript;
  }

  return $.html();
}

module.exports = router;

