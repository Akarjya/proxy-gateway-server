/**
 * Service Worker - Proxy Relay
 * Intercepts ALL external network requests and routes them through SOCKS5 proxy
 * 
 * This ensures that ALL external traffic (including ads, analytics, external scripts)
 * goes through the proxy server and destination sees PROXY IP
 * 
 * Same-domain requests are NOT intercepted (they're served directly by Express)
 * 
 * VERSION: Update this when making changes to force SW update
 */

const SW_VERSION = '3.0.0';
const RELAY_ENDPOINT = '/relay';

// Paths that should NOT be relayed (our own server paths)
const BYPASS_PATTERNS = [
  // Server routes
  /^\/relay/,
  /^\/browse/,
  /^\/external/,
  /^\/navigate/,
  /^\/content/,
  /^\/proceed/,
  /^\/reset/,
  /^\/loader/,
  /^\/api\//,
  
  // Static assets
  /^\/sw\.js/,
  /^\/css\//,
  /^\/js\//,
  /^\/images\//,
  /^\/favicon/,
  /^\/ads\.txt/,
  
  // Test endpoints
  /^\/test-ip/,
  /^\/test-http/,
  /^\/sw-test/,
  
  // Content pages (served by Express)
  /^\/$/,
  /^\/post\//,
  /^\/about/,
  /^\/contact/,
  /^\/privacy/,
];

// Log with prefix for easy filtering
function log(...args) {
  console.log('[SW v' + SW_VERSION + ']', ...args);
}

function logError(...args) {
  console.error('[SW Error]', ...args);
}

/**
 * Install event - called when SW is first installed
 */
self.addEventListener('install', (event) => {
  log('Installing Service Worker v' + SW_VERSION);
  
  // Skip waiting to activate immediately - CRITICAL for loader to work
  event.waitUntil(
    self.skipWaiting().then(() => {
      log('skipWaiting completed');
    })
  );
});

/**
 * Activate event - called when SW becomes active
 */
self.addEventListener('activate', (event) => {
  log('Activating Service Worker v' + SW_VERSION);
  
  // Take control of all pages immediately (don't wait for refresh)
  // This is CRITICAL - allows loader to detect SW is ready
  event.waitUntil(
    self.clients.claim().then(() => {
      log('clients.claim() completed - SW now controlling all pages');
      
      // Notify all clients that SW is now active
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_ACTIVATED',
            version: SW_VERSION
          });
        });
      });
    })
  );
});

/**
 * Check if a URL should bypass the relay
 */
function shouldBypass(url) {
  let urlObj;
  try {
    urlObj = new URL(url, self.location.origin);
  } catch (e) {
    return true; // Invalid URL, bypass
  }
  
  // Same origin requests check against bypass patterns
  if (urlObj.origin === self.location.origin) {
    for (const pattern of BYPASS_PATTERNS) {
      if (pattern.test(urlObj.pathname)) {
        return true;
      }
    }
    // Same origin but not in bypass list - still bypass
    // (these are our content pages, served directly)
    return true;
  }
  
  // Data URLs, blob URLs - bypass
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    return true;
  }
  
  // Chrome extension URLs - bypass
  if (url.startsWith('chrome-extension:') || url.startsWith('moz-extension:')) {
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
 * Relay a request through our proxy server
 */
async function relayRequest(request) {
  let originalUrl = request.url;
  
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
      'X-SW-Version': SW_VERSION,
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
  
  // IMPORTANT: Check for navigation requests to external URLs
  // This catches ad clicks that navigate to advertiser pages
  if (request.mode === 'navigate' && isExternalUrl(url)) {
    log('Intercepted navigation to external URL:', url.substring(0, 80));
    
    // Redirect navigation to go through /navigate endpoint
    const navigateUrl = new URL('/navigate', self.location.origin);
    navigateUrl.searchParams.set('url', url);
    
    event.respondWith(
      Response.redirect(navigateUrl.href, 302)
    );
    return;
  }
  
  // Check if it's an external URL that needs relaying
  if (isExternalUrl(url)) {
    // Intercept and relay through our proxy
    event.respondWith(
      relayRequest(request).catch((error) => {
        logError('Relay failed for:', url.substring(0, 60), error.message);
        
        // Return error response - DO NOT fallback to direct fetch
        // Direct fetch would expose user's real IP!
        return new Response(JSON.stringify({
          error: 'Proxy relay failed',
          message: error.message
        }), {
          status: 503,
          statusText: 'Service Unavailable',
          headers: {
            'Content-Type': 'application/json'
          }
        });
      })
    );
  }
  // For same-origin requests that aren't bypassed,
  // let them go through normally (they'll hit our Express routes)
});

/**
 * Message event - handle messages from pages
 */
self.addEventListener('message', (event) => {
  log('Received message:', event.data?.type);
  
  if (event.data && event.data.type === 'GET_VERSION') {
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ version: SW_VERSION });
    }
  }
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    log('Received SKIP_WAITING message, calling skipWaiting()');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLAIM_CLIENTS') {
    log('Received CLAIM_CLIENTS message, calling clients.claim()');
    self.clients.claim().then(() => {
      log('clients.claim() completed from message');
      // Notify the requesting client
      if (event.source) {
        event.source.postMessage({
          type: 'CLIENTS_CLAIMED',
          version: SW_VERSION
        });
      }
    });
  }
  
  if (event.data && event.data.type === 'GET_STATUS') {
    // Respond with SW status
    const response = {
      type: 'SW_STATUS',
      version: SW_VERSION,
      controlling: true,
      timestamp: Date.now()
    };
    
    if (event.source) {
      event.source.postMessage(response);
    }
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage(response);
    }
  }
  
  if (event.data && event.data.type === 'PING') {
    // Simple ping-pong for connectivity check
    if (event.source) {
      event.source.postMessage({ type: 'PONG', version: SW_VERSION });
    }
  }
  
  if (event.data && event.data.type === 'SET_ORIGINAL_URL') {
    // Store original URL for ad URL spoofing
    log('Received original URL:', event.data.url);
  }
});

log('Service Worker script loaded v' + SW_VERSION);
