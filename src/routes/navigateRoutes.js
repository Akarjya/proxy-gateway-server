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
const config = require('../config/config');
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
 * Check if URL is an ad tracking URL that needs special handling
 * @param {string} url - URL to check
 * @returns {boolean}
 */
function isAdTrackingUrl(url) {
  const adDomains = [
    'googleads.g.doubleclick.net',
    'ad.doubleclick.net',
    'pagead2.googlesyndication.com',
    'googleadservices.com',
    'googlesyndication.com',
    'doubleclick.net',
    'adservice.google',
    'adsrvr.org',
    'adnxs.com',
    'bing.com/aclick',
    'facebook.com/tr',
    'analytics.twitter.com',
    // Additional ad/tracking domains
    'google.com/aclk',
    'google.com/url',
    'google.co.in/aclk',
    'google.co.in/url',
    'clickserve.dartsearch.net',
    'googleads.com',
    'g.doubleclick.net',
    'ad.atdmt.com',
    'adclick.g.doubleclick.net',
    'www.googleadservices.com',
    'adtrafficquality.google'
  ];
  
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    const fullUrl = url.toLowerCase();
    
    // Check hostname
    if (adDomains.some(domain => hostname.includes(domain))) {
      return true;
    }
    
    // Also check URL patterns (for redirects like google.com/url?...)
    const adPatterns = [
      '/aclk?',
      '/pagead/',
      '/aclk/',
      'adurl=',
      '/searchads/',
      '/ad_click'
    ];
    
    return adPatterns.some(pattern => fullUrl.includes(pattern));
  } catch {
    return false;
  }
}

/**
 * Check if HTML content is Google's "Redirect Notice" page
 * @param {string} html - HTML content
 * @returns {boolean}
 */
function isGoogleRedirectNotice(html) {
  if (!html || typeof html !== 'string') return false;
  
  const lowerHtml = html.toLowerCase();
  return (
    (lowerHtml.includes('redirect notice') || 
     lowerHtml.includes('redirect-notice') ||
     lowerHtml.includes('the previous page is sending you to')) &&
    (lowerHtml.includes('doubleclick') || 
     lowerHtml.includes('google') ||
     lowerHtml.includes('return to the previous page'))
  );
}

/**
 * Extract the actual destination URL from Google's Redirect Notice page
 * @param {string} html - HTML content of redirect notice page
 * @returns {string|null} Extracted URL or null
 */
function extractRedirectNoticeUrl(html) {
  if (!html) return null;
  
  const cheerio = require('cheerio');
  const $ = cheerio.load(html);
  
  // Method 1: Look for link in the page text that mentions the destination
  // Google's redirect notice shows: "The previous page is sending you to <a href="...">URL</a>"
  const links = $('a[href]');
  
  for (let i = 0; i < links.length; i++) {
    const href = $(links[i]).attr('href');
    if (href && href.startsWith('http') && 
        !href.includes('google.com/support') &&
        !href.includes('javascript:')) {
      // Skip "return to previous page" links
      const text = $(links[i]).text().toLowerCase();
      if (!text.includes('return') && !text.includes('previous')) {
        logger.info('Extracted destination from Redirect Notice', { url: href.substring(0, 100) });
        return href;
      }
    }
  }
  
  // Method 2: Try to find URL in meta refresh
  const metaRefresh = $('meta[http-equiv="refresh"]').attr('content');
  if (metaRefresh) {
    const match = metaRefresh.match(/url=(.+)/i);
    if (match) {
      return match[1].trim();
    }
  }
  
  // Method 3: Look for URL patterns in the raw HTML
  const urlPatterns = [
    /https?:\/\/[^\s"'<>]+doubleclick\.net[^\s"'<>]*/gi,
    /https?:\/\/[^\s"'<>]+googleads[^\s"'<>]*/gi,
    /href="(https?:\/\/[^"]+)"/gi
  ];
  
  for (const pattern of urlPatterns) {
    const matches = html.match(pattern);
    if (matches) {
      for (const match of matches) {
        // Clean up the match
        let url = match.replace(/^href="/, '').replace(/"$/, '');
        if (url.startsWith('http') && 
            !url.includes('google.com/support') &&
            !url.includes('/intl/')) {
          return url;
        }
      }
    }
  }
  
  return null;
}

/**
 * Follow all redirects server-side through proxy
 * This prevents "Redirect Notice" from appearing for ad clicks
 * Handles both HTTP 3xx redirects AND Google's "Redirect Notice" HTML pages
 * @param {string} startUrl - Starting URL
 * @param {Object} session - Express session
 * @param {Object} headers - Request headers
 * @param {number} maxRedirects - Maximum redirects to follow
 * @returns {Promise<Object>} Final response after all redirects
 */
async function followRedirectsServerSide(startUrl, session, headers, maxRedirects = 20) {
  let currentUrl = startUrl;
  let redirectCount = 0;
  
  while (redirectCount < maxRedirects) {
    logger.debug('Following redirect chain', { 
      currentUrl: currentUrl.substring(0, 100), 
      redirectCount,
      proxySessionId: session.proxySessionId 
    });
    
    const response = await proxyService.fetchWithRetry(
      currentUrl,
      session,
      {
        method: 'GET',
        headers,
        followRedirects: false // Disable axios auto-redirects so we can track them
      }
    );
    
    // Check if it's an HTTP redirect (3xx)
    if (response.status >= 300 && response.status < 400 && response.headers.location) {
      // It's a redirect - get the new URL
      const redirectUrl = response.headers.location;
      try {
        currentUrl = new URL(redirectUrl, currentUrl).href;
      } catch {
        currentUrl = redirectUrl;
      }
      
      redirectCount++;
      logger.debug('HTTP redirect detected', { 
        status: response.status,
        to: currentUrl.substring(0, 100)
      });
      continue;
    }
    
    // Check for Google's "Redirect Notice" HTML page (HTTP 200 but contains redirect)
    if (response.status === 200 && response.contentType && response.contentType.includes('text/html')) {
      const htmlContent = Buffer.isBuffer(response.data) 
        ? response.data.toString('utf-8') 
        : String(response.data);
      
      if (isGoogleRedirectNotice(htmlContent)) {
        logger.info('Google Redirect Notice detected, extracting destination URL');
        
        const extractedUrl = extractRedirectNoticeUrl(htmlContent);
        
        if (extractedUrl) {
          try {
            currentUrl = new URL(extractedUrl, currentUrl).href;
          } catch {
            currentUrl = extractedUrl;
          }
          
          redirectCount++;
          logger.info('Extracted URL from Redirect Notice', { 
            extractedUrl: currentUrl.substring(0, 100) 
          });
          continue;
        } else {
          logger.warn('Could not extract URL from Redirect Notice, returning as-is');
          return { response, finalUrl: currentUrl };
        }
      }
    }
    
    // No more redirects - return the response
    logger.debug('Final destination reached', { 
      finalUrl: currentUrl.substring(0, 100),
      status: response.status,
      contentType: response.contentType?.substring(0, 50)
    });
    return { response, finalUrl: currentUrl };
  }
  
  // Max redirects reached - try to fetch the final URL anyway
  logger.warn('Max redirects reached', { startUrl: startUrl.substring(0, 60), finalUrl: currentUrl.substring(0, 60), redirectCount });
  const finalResponse = await proxyService.fetchWithRetry(currentUrl, session, { method: 'GET', headers });
  return { response: finalResponse, finalUrl: currentUrl };
}

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

  const isAdUrl = isAdTrackingUrl(decodedUrl);
  
  logger.info('Navigation request', {
    targetUrl: decodedUrl.substring(0, 100),
    isAdUrl,
    proxySessionId: req.session.proxySessionId
  });

  // For ad URLs, use the original target site as referrer to avoid Redirect Notice
  // Google checks referrer to verify ad clicks are from authorized sites
  const originalTargetUrl = config.target.url;
  const referer = isAdUrl ? originalTargetUrl : req.headers['referer'] || originalTargetUrl;
  
  const requestHeaders = {
    'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Referer': referer,
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': isAdUrl ? 'cross-site' : 'same-origin',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
  };

  try {
    let response, finalUrl;
    
    // For ad tracking URLs, follow ALL redirects server-side
    // This prevents Google's "Redirect Notice" from appearing
    if (isAdUrl) {
      logger.info('Ad URL detected - following redirects server-side', { url: decodedUrl.substring(0, 80) });
      const result = await followRedirectsServerSide(decodedUrl, req.session, requestHeaders);
      response = result.response;
      finalUrl = result.finalUrl;
      logger.info('Ad redirect chain complete', { finalUrl: finalUrl.substring(0, 80) });
    } else {
      // For regular URLs, let axios handle redirects normally
      response = await proxyService.fetchWithRetry(
        decodedUrl,
        req.session,
        {
          method: 'GET',
          headers: requestHeaders
        }
      );
      finalUrl = decodedUrl;
    }

    const contentType = response.contentType || '';

    // Handle HTML responses - rewrite links to stay in proxy
    if (contentType.includes('text/html')) {
      let html = Buffer.isBuffer(response.data) 
        ? response.data.toString('utf-8') 
        : response.data;

      // Rewrite all URLs in the external page to go through our proxy
      html = rewriteExternalHtml(html, finalUrl);
      
      res.type('text/html; charset=utf-8').send(html);
    } 
    // Handle any remaining redirects (shouldn't happen for ad URLs now)
    else if (response.status >= 300 && response.status < 400 && response.headers.location) {
      // For non-ad URLs that still have redirects, follow them server-side too
      logger.info('Following remaining redirect server-side', { 
        from: finalUrl, 
        to: response.headers.location 
      });
      const result = await followRedirectsServerSide(
        new URL(response.headers.location, finalUrl).href, 
        req.session, 
        requestHeaders
      );
      
      const finalContentType = result.response.contentType || '';
      if (finalContentType.includes('text/html')) {
        let html = Buffer.isBuffer(result.response.data) 
          ? result.response.data.toString('utf-8') 
          : result.response.data;
        html = rewriteExternalHtml(html, result.finalUrl);
        res.type('text/html; charset=utf-8').send(html);
      } else {
        res.type(finalContentType || 'application/octet-stream').send(result.response.data);
      }
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

