/**
 * Service Worker - Proxy Relay
 * Intercepts ALL network requests and routes them through SOCKS5 proxy
 * 
 * This ensures that ALL traffic (including ads, analytics, external scripts)
 * goes through the proxy server and destination sees PROXY IP
 */

const SW_VERSION = '3.2.0'; // Added iframe internal fetch/XHR interceptors
const RELAY_ENDPOINT = '/relay';

// Domains that should NOT be relayed (our own proxy server)
const BYPASS_PATTERNS = [
  // Our own server paths - these are already proxied or server-side
  /^\/relay/,
  /^\/browse/,
  /^\/external/,
  /^\/navigate/,
  /^\/sw\.js/,
  /^\/css\//,
  /^\/js\//,
  /^\/test-ip/,
  /^\/test-http/,
  /^\/proceed/,
  /^\/reset/,
  /^\/loader/,
  /^\/landing/,
  /^\/api\//,
  /^\/favicon/,
];

// Log with prefix for easy filtering
function log(...args) {
  console.log('[SW]', ...args);
}

function logError(...args) {
  console.error('[SW Error]', ...args);
}

/**
 * Install event - called when SW is first installed
 */
self.addEventListener('install', (event) => {
  log('Installing Service Worker v' + SW_VERSION);
  
  // Skip waiting to activate immediately
  event.waitUntil(self.skipWaiting());
});

/**
 * Activate event - called when SW becomes active
 */
self.addEventListener('activate', (event) => {
  log('Service Worker activated v' + SW_VERSION);
  
  // Take control of all pages immediately (don't wait for refresh)
  event.waitUntil(self.clients.claim());
});

/**
 * Check if a URL should bypass the relay
 */
function shouldBypass(url) {
  // Parse the URL
  let urlObj;
  try {
    urlObj = new URL(url, self.location.origin);
  } catch (e) {
    return true; // Invalid URL, bypass
  }
  
  // Same origin requests to our bypass paths
  if (urlObj.origin === self.location.origin) {
    for (const pattern of BYPASS_PATTERNS) {
      if (pattern.test(urlObj.pathname)) {
        return true;
      }
    }
  }
  
  // Data URLs, blob URLs - bypass
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    return true;
  }
  
  // Chrome extension URLs - bypass
  if (url.startsWith('chrome-extension:')) {
    return true;
  }
  
  return false;
}

/**
 * Check if URL is a Google ad or tracking URL
 */
function isAdUrl(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const pathname = urlObj.pathname.toLowerCase();
    
    // Complete list of Google ad/tracking domains
    const adDomains = [
      'googleads.g.doubleclick.net',
      'ad.doubleclick.net',
      'doubleclick.net',
      'googleadservices.com',
      'googlesyndication.com',
      'pagead2.googlesyndication.com',
      'tpc.googlesyndication.com',
      'www.googletagservices.com',
      'securepubads.g.doubleclick.net',
      'google.com/aclk',
      'google.com/url',
      'adservice.google',
      'googleads.com',
      'adtrafficquality.google',
      'ep1.adtrafficquality.google',
      'ep2.adtrafficquality.google',
      'fundingchoicesmessages.google.com',
      'www.google.com/recaptcha',
      'www.gstatic.com/recaptcha'
    ];
    
    // Check if hostname matches any ad domain
    for (const domain of adDomains) {
      if (domain.includes('/')) {
        const [domainPart, pathPart] = domain.split('/');
        if (hostname.includes(domainPart) && pathname.includes('/' + pathPart)) {
          return true;
        }
      } else if (hostname.includes(domain)) {
        return true;
      }
    }
    
    // Check for ad click patterns in path
    if (pathname.includes('/aclk') || 
        pathname.includes('/pagead') ||
        pathname.includes('/adclick') ||
        pathname.includes('/click') ||
        pathname.includes('/sodar')) {
      return true;
    }
    
    return false;
  } catch (e) {
    return false;
  }
}

/**
 * Determine if URL is external (not our server)
 */
function isExternalUrl(url) {
  try {
    const urlObj = new URL(url, self.location.origin);
    return urlObj.origin !== self.location.origin;
  } catch (e) {
    return false;
  }
}

/**
 * Make absolute URL from potentially relative URL
 */
function makeAbsoluteUrl(url, baseUrl) {
  try {
    // If already absolute, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // Protocol-relative URL
    if (url.startsWith('//')) {
      return 'https:' + url;
    }
    
    // Relative URL - make absolute using base
    return new URL(url, baseUrl).href;
  } catch (e) {
    return url;
  }
}

/**
 * Get the original target URL from storage or default
 * This is used to replace proxy URLs in ad requests
 */
function getOriginalTargetUrl() {
  // This will be set by the page when it loads
  return self.ORIGINAL_TARGET_URL || 'https://dating.atolf.xyz/';
}

/**
 * Modify URL for ad requests to use original domain
 * This helps Google ads verify the correct domain
 */
function modifyAdRequestUrl(url) {
  try {
    const urlObj = new URL(url);
    
    // Check if this is a Google ad request
    const isAdRequest = urlObj.hostname.includes('googlesyndication') ||
                        urlObj.hostname.includes('doubleclick') ||
                        urlObj.hostname.includes('googleads') ||
                        urlObj.hostname.includes('adtrafficquality');
    
    if (isAdRequest) {
      // Replace proxy URL with original URL in query parameters
      const proxyOrigin = self.location.origin;
      const originalUrl = getOriginalTargetUrl();
      const originalOrigin = new URL(originalUrl).origin;
      
      // Modify the URL parameter that Google uses for domain verification
      let modifiedSearch = urlObj.search;
      
      // Replace encoded proxy URLs
      modifiedSearch = modifiedSearch.replace(
        new RegExp(encodeURIComponent(proxyOrigin + '/browse'), 'g'),
        encodeURIComponent(originalUrl)
      );
      modifiedSearch = modifiedSearch.replace(
        new RegExp(encodeURIComponent(proxyOrigin), 'g'),
        encodeURIComponent(originalOrigin)
      );
      
      // Replace non-encoded proxy URLs
      modifiedSearch = modifiedSearch.replace(
        new RegExp(proxyOrigin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/browse', 'g'),
        originalUrl
      );
      modifiedSearch = modifiedSearch.replace(
        new RegExp(proxyOrigin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        originalOrigin
      );
      
      urlObj.search = modifiedSearch;
      
      log('Modified ad URL:', url.substring(0, 60), '->', urlObj.href.substring(0, 60));
      return urlObj.href;
    }
  } catch (e) {
    logError('Failed to modify ad URL:', e.message);
  }
  
  return url;
}

/**
 * Relay a request through our proxy server
 */
async function relayRequest(request) {
  let originalUrl = request.url;
  
  // Modify ad request URLs to use original domain
  originalUrl = modifyAdRequestUrl(originalUrl);
  
  // Build relay URL
  const relayUrl = new URL(RELAY_ENDPOINT, self.location.origin);
  relayUrl.searchParams.set('url', originalUrl);
  
  // Collect headers to forward
  const headersToForward = {};
  const headerNames = ['accept', 'accept-language', 'content-type', 'referer', 'origin'];
  
  for (const name of headerNames) {
    const value = request.headers.get(name);
    if (value) {
      // Modify referer to use original URL for ad requests
      if (name === 'referer') {
        const proxyOrigin = self.location.origin;
        const originalTargetUrl = getOriginalTargetUrl();
        const originalOrigin = new URL(originalTargetUrl).origin;
        headersToForward[name] = value.replace(proxyOrigin + '/browse', originalTargetUrl)
                                       .replace(proxyOrigin, originalOrigin);
      } else {
        headersToForward[name] = value;
      }
    }
  }
  
  // Get request body if present
  let requestBody = null;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
      requestBody = await request.clone().text();
    } catch (e) {
      // Body might not be available, that's okay
    }
  }
  
  // Make relay request
  const relayOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-SW-Relay': 'true',
      'X-Original-Method': request.method,
    },
    body: JSON.stringify({
      url: originalUrl,
      method: request.method,
      headers: headersToForward,
      body: requestBody,
    }),
    // Important: include credentials for session
    credentials: 'same-origin',
  };
  
  log('Relaying:', originalUrl.substring(0, 80) + (originalUrl.length > 80 ? '...' : ''));
  
  const relayResponse = await fetch(relayUrl.href, relayOptions);
  
  if (!relayResponse.ok) {
    throw new Error(`Relay failed: ${relayResponse.status}`);
  }
  
  // Get the response data
  const responseData = await relayResponse.arrayBuffer();
  
  // Build response headers
  const responseHeaders = new Headers();
  
  // Get original content type from relay response
  const originalContentType = relayResponse.headers.get('X-Original-Content-Type');
  if (originalContentType) {
    responseHeaders.set('Content-Type', originalContentType);
  } else {
    const contentType = relayResponse.headers.get('Content-Type');
    if (contentType) {
      responseHeaders.set('Content-Type', contentType);
    }
  }
  
  // Copy cache headers if present
  const cacheControl = relayResponse.headers.get('X-Original-Cache-Control');
  if (cacheControl) {
    responseHeaders.set('Cache-Control', cacheControl);
  }
  
  // Allow cross-origin for resources
  responseHeaders.set('Access-Control-Allow-Origin', '*');
  
  // Return the proxied response
  return new Response(responseData, {
    status: relayResponse.status,
    statusText: 'OK',
    headers: responseHeaders,
  });
}

/**
 * Fetch event - intercept ALL network requests
 */
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = request.url;
  
  // Check if should bypass
  if (shouldBypass(url)) {
    // Let it through normally
    return;
  }
  
  // CRITICAL: Check for top-level navigation requests to external URLs
  const isTopNavigation = request.mode === 'navigate' || request.destination === 'document';
  
  if (isTopNavigation && isExternalUrl(url)) {
    log('🚨 Intercepted TOP-LEVEL navigation:', url.substring(0, 80));
    
    // Redirect navigation to go through /navigate endpoint
    const navigateUrl = new URL('/navigate', self.location.origin);
    navigateUrl.searchParams.set('url', url);
    
    event.respondWith(
      Response.redirect(navigateUrl.href, 302)
    );
    return;
  }
  
  // CRITICAL FIX: Handle iframe/subframe navigation through /external endpoint
  // This catches Google Ads iframes that load external content
  const isIframeNavigation = request.destination === 'iframe' || request.destination === 'subframe';
  
  if (isIframeNavigation && isExternalUrl(url)) {
    log('🚨 Intercepted IFRAME navigation:', url.substring(0, 80));
    log('   Destination:', request.destination, 'Mode:', request.mode);
    
    // Route iframe through /external endpoint
    const externalUrl = '/external/' + encodeURIComponent(url);
    
    event.respondWith(
      fetch(externalUrl, {
        credentials: 'same-origin',
        headers: {
          'X-SW-Iframe': 'true',
          'X-SW-Version': SW_VERSION,
        }
      }).catch((error) => {
        logError('Iframe proxy failed:', url.substring(0, 60), error.message);
        // Return empty HTML for failed iframe (don't break the page)
        return new Response('', {
          status: 200,
          statusText: 'OK',
          headers: { 'Content-Type': 'text/html' }
        });
      })
    );
    return;
  }
  
  // SPECIAL: For ad URLs in any mode, relay through proxy
  if (isExternalUrl(url) && isAdUrl(url)) {
    log('🎯 Intercepted AD request:', url.substring(0, 80));
    
    // Relay the request through our proxy
    event.respondWith(
      relayRequest(request).catch((error) => {
        logError('Ad relay failed:', url.substring(0, 60), error.message);
        // Return empty response - NEVER fall back to direct fetch (IP leak!)
        return new Response('', {
          status: 204,
          statusText: 'No Content',
        });
      })
    );
    return;
  }
  
  // Check if it's an external URL that needs relaying
  if (isExternalUrl(url)) {
    log('🔄 Relaying external:', url.substring(0, 80));
    
    // Intercept and relay through our proxy
    // CRITICAL: NO fallback to direct fetch - that would leak real IP!
    event.respondWith(
      relayRequest(request).catch((error) => {
        logError('Relay failed:', url.substring(0, 60), error.message);
        
        // Return appropriate empty response based on request type
        // NEVER use direct fetch - that exposes real IP!
        const destination = request.destination;
        
        if (destination === 'script') {
          return new Response('/* Proxy unavailable */', {
            status: 200,
            headers: { 'Content-Type': 'application/javascript' }
          });
        } else if (destination === 'style') {
          return new Response('/* Proxy unavailable */', {
            status: 200,
            headers: { 'Content-Type': 'text/css' }
          });
        } else if (destination === 'image') {
          // Return 1x1 transparent pixel
          return new Response('', {
            status: 200,
            headers: { 'Content-Type': 'image/gif' }
          });
        } else {
          return new Response('', {
            status: 204,
            statusText: 'Proxy Unavailable'
          });
        }
      })
    );
    return;
  }
  // For same-origin requests that aren't bypassed,
  // let them go through normally (they'll hit our proxy routes)
});

/**
 * Message event - handle messages from pages
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: SW_VERSION });
  }
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Receive original target URL from page for ad URL modification
  if (event.data && event.data.type === 'SET_ORIGINAL_URL') {
    self.ORIGINAL_TARGET_URL = event.data.url;
    log('Original target URL set:', self.ORIGINAL_TARGET_URL);
  }
});

