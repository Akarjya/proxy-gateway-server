/**
 * Service Worker - Proxy Relay
 * Intercepts ALL network requests and routes them through SOCKS5 proxy
 * 
 * This ensures that ALL traffic (including ads, analytics, external scripts)
 * goes through the proxy server and destination sees PROXY IP
 */

const SW_VERSION = '1.0.0';
const RELAY_ENDPOINT = '/relay';

// Domains that should NOT be relayed (our own proxy server)
const BYPASS_PATTERNS = [
  // Our own server paths
  /^\/relay/,
  /^\/browse/,
  /^\/external/,
  /^\/sw\.js/,
  /^\/css\//,
  /^\/js\//,
  /^\/test-ip/,
  /^\/test-http/,
  /^\/proceed/,
  /^\/reset/,
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
 * Relay a request through our proxy server
 */
async function relayRequest(request) {
  const originalUrl = request.url;
  
  // Build relay URL
  const relayUrl = new URL(RELAY_ENDPOINT, self.location.origin);
  relayUrl.searchParams.set('url', originalUrl);
  
  // Collect headers to forward
  const headersToForward = {};
  const headerNames = ['accept', 'accept-language', 'content-type', 'referer', 'origin'];
  
  for (const name of headerNames) {
    const value = request.headers.get(name);
    if (value) {
      headersToForward[name] = value;
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
  
  // Check if it's an external URL that needs relaying
  if (isExternalUrl(url)) {
    // Intercept and relay through our proxy
    event.respondWith(
      relayRequest(request).catch((error) => {
        logError('Relay failed for:', url, error.message);
        
        // Fallback: try direct fetch (will use user's real IP)
        // This ensures the page doesn't break completely
        return fetch(request).catch(() => {
          // If even direct fetch fails, return error response
          return new Response('Resource unavailable', {
            status: 503,
            statusText: 'Service Unavailable',
          });
        });
      })
    );
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
});

