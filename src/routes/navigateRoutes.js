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
 * Check if URL is an ad tracking URL that needs special handling
 * @param {string} url - URL to check
 * @returns {boolean}
 */
function isAdTrackingUrl(url) {
  const adDomains = [
    // Google Ad Domains - comprehensive list
    'googleads.g.doubleclick.net',
    'ad.doubleclick.net',
    'pagead2.googlesyndication.com',
    'googleadservices.com',
    'googlesyndication.com',
    'doubleclick.net',
    'adservice.google',
    'google.com/aclk',
    'google.com/pagead',
    'googleadservices.com',
    'googleads.com',
    'google.com/url',  // Google URL redirect
    'gstatic.com',
    'adtrafficquality.google',
    // Other ad networks
    'adsrvr.org',
    'adnxs.com',
    'bing.com/aclick',
    'facebook.com/tr',
    'analytics.twitter.com',
    'taboola.com',
    'outbrain.com',
    'criteo.com',
    'amazon-adsystem.com'
  ];
  
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    const pathname = new URL(url).pathname.toLowerCase();
    
    // Check domain matches
    const domainMatch = adDomains.some(domain => {
      if (domain.includes('/')) {
        // Check hostname + path pattern
        const [domainPart, pathPart] = domain.split('/');
        return hostname.includes(domainPart) && pathname.includes('/' + pathPart);
      }
      return hostname.includes(domain);
    });
    
    // Also check for common ad URL patterns
    const isAdPattern = pathname.includes('/aclk') || 
                       pathname.includes('/pagead') ||
                       pathname.includes('/adclick') ||
                       pathname.includes('/click') ||
                       hostname.includes('click.') ||
                       hostname.includes('track.');
    
    return domainMatch || isAdPattern;
  } catch {
    return false;
  }
}

/**
 * Check if HTML content is a Google "Redirect Notice" page
 * @param {string} html - HTML content to check
 * @returns {boolean}
 */
function isGoogleRedirectNotice(html) {
  if (!html || typeof html !== 'string') return false;
  
  const lowerHtml = html.toLowerCase();
  return (
    lowerHtml.includes('redirect notice') ||
    lowerHtml.includes('the previous page is sending you to') ||
    lowerHtml.includes('return to the previous page') ||
    (lowerHtml.includes('google') && lowerHtml.includes('redirect'))
  );
}

/**
 * Extract destination URL from Google Redirect Notice HTML
 * @param {string} html - HTML content
 * @returns {string|null} Extracted URL or null
 */
function extractRedirectDestination(html) {
  if (!html) return null;
  
  const cheerio = require('cheerio');
  const $ = cheerio.load(html);
  
  // Method 1: Look for the main link in redirect notice
  // Google format: "The previous page is sending you to <a href="...">URL</a>"
  const links = $('a[href]');
  
  for (let i = 0; i < links.length; i++) {
    const href = $(links[i]).attr('href');
    if (href && href.startsWith('http') && 
        !href.includes('google.com') && 
        !href.includes('doubleclick.net') &&
        !href.includes('googlesyndication.com')) {
      logger.debug('Found redirect destination from link', { href: href.substring(0, 100) });
      return href;
    }
  }
  
  // Method 2: Look for URL in redirect URL parameter
  // Sometimes the page has URL as parameter that auto-redirects
  const htmlStr = html.toString();
  
  // Check for meta refresh redirect
  const metaRefreshMatch = htmlStr.match(/content=["']?\d+;\s*url=([^"'\s>]+)/i);
  if (metaRefreshMatch && metaRefreshMatch[1]) {
    const url = metaRefreshMatch[1].replace(/['"]/g, '');
    if (url.startsWith('http')) {
      logger.debug('Found redirect destination from meta refresh', { url: url.substring(0, 100) });
      return url;
    }
  }
  
  // Method 3: Look for JavaScript redirect
  const jsRedirectMatch = htmlStr.match(/(?:window\.)?location(?:\.href)?\s*=\s*["']([^"']+)["']/i);
  if (jsRedirectMatch && jsRedirectMatch[1] && jsRedirectMatch[1].startsWith('http')) {
    logger.debug('Found redirect destination from JS', { url: jsRedirectMatch[1].substring(0, 100) });
    return jsRedirectMatch[1];
  }
  
  // Method 4: Parse URL from "continue to" type links
  const continueLink = $('a').filter((_, el) => {
    const text = $(el).text().toLowerCase();
    return text.includes('continue') || text.includes('proceed') || text.includes('click here');
  }).first().attr('href');
  
  if (continueLink && continueLink.startsWith('http')) {
    logger.debug('Found redirect destination from continue link', { url: continueLink.substring(0, 100) });
    return continueLink;
  }
  
  // Method 5: Look for any external URL in the page that looks like destination
  const urlPattern = /https?:\/\/(?!(?:www\.)?google|doubleclick|googlesyndication)[^\s"'<>]+/gi;
  const matches = htmlStr.match(urlPattern);
  if (matches && matches.length > 0) {
    // Return the first non-Google URL found
    for (const url of matches) {
      if (!url.includes('google') && !url.includes('doubleclick') && !url.includes('gstatic')) {
        logger.debug('Found redirect destination from URL pattern', { url: url.substring(0, 100) });
        return url;
      }
    }
  }
  
  return null;
}

/**
 * Follow all redirects server-side through proxy
 * This prevents "Redirect Notice" from appearing for ad clicks
 * Handles both HTTP redirects (301, 302, etc.) AND HTML-based redirect pages
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
    
    // Check for HTTP redirect (301, 302, 303, 307, 308)
    if (response.status >= 300 && response.status < 400 && response.headers.location) {
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
    
    // Check for HTML-based redirect (like Google's "Redirect Notice")
    const contentType = response.contentType || '';
    if (contentType.includes('text/html') && response.status === 200) {
      const html = Buffer.isBuffer(response.data) 
        ? response.data.toString('utf-8') 
        : response.data;
      
      // Check if this is a redirect notice page
      if (isGoogleRedirectNotice(html)) {
        logger.info('Detected Google Redirect Notice page, extracting destination', {
          currentUrl: currentUrl.substring(0, 80)
        });
        
        const destinationUrl = extractRedirectDestination(html);
        
        if (destinationUrl) {
          logger.info('Extracted destination URL from redirect notice', {
            destination: destinationUrl.substring(0, 100)
          });
          
          try {
            currentUrl = new URL(destinationUrl, currentUrl).href;
          } catch {
            currentUrl = destinationUrl;
          }
          
          redirectCount++;
          continue;
        } else {
          // Could not extract destination, log warning and return the page
          logger.warn('Could not extract destination from redirect notice, returning page as-is', {
            currentUrl: currentUrl.substring(0, 80)
          });
        }
      }
      
      // Check for meta refresh redirect in any HTML page
      const metaRefreshMatch = html.match(/<meta[^>]*http-equiv=["']?refresh["']?[^>]*content=["']?\d+;\s*url=([^"'\s>]+)/i);
      if (metaRefreshMatch && metaRefreshMatch[1]) {
        const metaUrl = metaRefreshMatch[1].replace(/['"]/g, '');
        if (metaUrl && metaUrl.startsWith('http')) {
          logger.info('Detected meta refresh redirect', { to: metaUrl.substring(0, 100) });
          currentUrl = metaUrl;
          redirectCount++;
          continue;
        }
      }
      
      // Check for JavaScript immediate redirect
      const jsRedirectMatch = html.match(/(?:window\.)?location(?:\.href)?\s*=\s*["']([^"']+)["']/);
      if (jsRedirectMatch && jsRedirectMatch[1] && jsRedirectMatch[1].startsWith('http')) {
        // Only follow if it's an immediate redirect (not in onclick, etc.)
        if (!html.includes('onclick') || html.indexOf(jsRedirectMatch[0]) < html.indexOf('onclick')) {
          logger.info('Detected JavaScript redirect', { to: jsRedirectMatch[1].substring(0, 100) });
          currentUrl = jsRedirectMatch[1];
          redirectCount++;
          continue;
        }
      }
    }
    
    // Not a redirect - return the response
    logger.debug('No more redirects, returning final response', {
      finalUrl: currentUrl.substring(0, 100),
      status: response.status,
      contentType: contentType.substring(0, 50)
    });
    
    return { response, finalUrl: currentUrl };
  }
  
  // Max redirects reached - try to fetch the final URL anyway
  logger.warn('Max redirects reached', { 
    startUrl: startUrl.substring(0, 80), 
    finalUrl: currentUrl.substring(0, 80), 
    redirectCount 
  });
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

  logger.info('Navigation request', {
    targetUrl: decodedUrl,
    isAdUrl: isAdTrackingUrl(decodedUrl),
    proxySessionId: req.session.proxySessionId
  });

  const requestHeaders = {
    'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
  };

  try {
    let response, finalUrl;
    
    // For ad tracking URLs, follow ALL redirects server-side
    // This prevents Google's "Redirect Notice" from appearing
    // Also follow redirects for any URL that contains typical ad/tracking patterns
    const shouldFollowServerSide = isAdTrackingUrl(decodedUrl) || 
                                   decodedUrl.includes('click') ||
                                   decodedUrl.includes('redirect') ||
                                   decodedUrl.includes('track');
    
    if (shouldFollowServerSide) {
      logger.info('URL requires server-side redirect following', { 
        url: decodedUrl.substring(0, 100),
        isAdUrl: isAdTrackingUrl(decodedUrl)
      });
      const result = await followRedirectsServerSide(decodedUrl, req.session, requestHeaders);
      response = result.response;
      finalUrl = result.finalUrl;
    } else {
      // For regular URLs, fetch and check if we got a redirect notice anyway
      response = await proxyService.fetchWithRetry(
        decodedUrl,
        req.session,
        {
          method: 'GET',
          headers: requestHeaders,
          followRedirects: false // Check each response manually
        }
      );
      finalUrl = decodedUrl;
      
      // Even for non-ad URLs, check if we got a redirect notice
      const contentType = response.contentType || '';
      if (contentType.includes('text/html') && response.status === 200) {
        const html = Buffer.isBuffer(response.data) 
          ? response.data.toString('utf-8') 
          : response.data;
        
        if (isGoogleRedirectNotice(html)) {
          logger.info('Got redirect notice for non-ad URL, following redirects', {
            url: decodedUrl.substring(0, 80)
          });
          const result = await followRedirectsServerSide(decodedUrl, req.session, requestHeaders);
          response = result.response;
          finalUrl = result.finalUrl;
        }
      }
      
      // Handle HTTP redirects for non-ad URLs
      if (response.status >= 300 && response.status < 400 && response.headers.location) {
        const result = await followRedirectsServerSide(decodedUrl, req.session, requestHeaders);
        response = result.response;
        finalUrl = result.finalUrl;
      }
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

