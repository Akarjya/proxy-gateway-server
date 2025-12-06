/**
 * Service Worker Check Script
 * 
 * This is a FALLBACK check for pages that might have bypassed server-side validation.
 * The primary protection is server-side (requireProxySession middleware).
 * 
 * This script:
 * 1. Checks if SW is controlling the page
 * 2. If not, redirects to /loader with current URL as returnUrl
 * 3. Handles edge cases like SW being unregistered
 * 
 * Should be included on ALL content pages (except loader)
 */

(function() {
  'use strict';
  
  const DEBUG = false; // Set to true for verbose logging
  
  function log(...args) {
    if (DEBUG) {
      console.log('[SW-Check]', ...args);
    }
  }
  
  // Skip if on loader page
  if (window.location.pathname === '/loader') {
    log('On loader page, skipping check');
    return;
  }
  
  // Skip if on API routes
  if (window.location.pathname.startsWith('/api/')) {
    log('On API route, skipping check');
    return;
  }
  
  // Skip if on reset route
  if (window.location.pathname === '/reset') {
    log('On reset page, skipping check');
    return;
  }
  
  // Check if coming from loader (give SW a moment to claim)
  const fromLoader = sessionStorage.getItem('fromLoader');
  const swActivated = sessionStorage.getItem('swActivated');
  const swActivatedAt = sessionStorage.getItem('swActivatedAt');
  
  if (fromLoader === 'true') {
    // Clear the flag
    sessionStorage.removeItem('fromLoader');
    log('Coming from loader, fromLoader flag was set');
    
    // If SW was recently activated, give it a bit more time
    if (swActivated === 'true' && swActivatedAt) {
      const activatedTime = parseInt(swActivatedAt);
      const elapsed = Date.now() - activatedTime;
      
      if (elapsed < 5000) {
        log('SW was activated', elapsed, 'ms ago, waiting for claim...');
        
        // Wait a bit longer for SW to claim
        setTimeout(checkSWStatus, 500);
        return;
      }
    }
    
    // SW should be controlling now, but verify
    setTimeout(checkSWStatus, 200);
    return;
  }
  
  // Immediate check for SW
  checkSWStatus();
  
  /**
   * Check if Service Worker is properly set up
   */
  function checkSWStatus() {
    log('Checking SW status...');
    
    // Check if Service Workers are supported
    if (!('serviceWorker' in navigator)) {
      log('Service Workers not supported');
      // Can't do much without SW support - let page load but log warning
      console.warn('[SW-Check] Service Workers not supported in this browser. Proxy protection may not work.');
      return;
    }
    
    // Check if SW is controlling
    if (navigator.serviceWorker.controller) {
      log('SW is controlling, all good');
      console.log('[SW-Check] ✓ Service Worker is active and protecting your connection');
      
      // Verify SW is responsive
      verifySWResponsive();
      return;
    }
    
    log('SW not controlling, checking registration...');
    
    // SW not controlling - check if it's registered but not claiming
    navigator.serviceWorker.getRegistration('/').then(registration => {
      if (registration && registration.active) {
        log('SW is registered and active, but not controlling. Requesting claim...');
        
        // SW exists but isn't controlling - send claim message
        registration.active.postMessage({ type: 'CLAIM_CLIENTS' });
        
        // Wait for controller change
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          log('Controller changed, SW now controlling');
          console.log('[SW-Check] ✓ Service Worker is now active');
        }, { once: true });
        
        // Give it some time, then redirect if still not controlling
        setTimeout(() => {
          if (!navigator.serviceWorker.controller) {
            log('Still no controller after claim attempt, redirecting to loader');
            redirectToLoader();
          }
        }, 1000);
        
      } else if (registration && (registration.installing || registration.waiting)) {
        log('SW is installing/waiting, waiting for activation...');
        
        // SW is being installed - wait for it
        const sw = registration.installing || registration.waiting;
        sw.addEventListener('statechange', () => {
          if (sw.state === 'activated') {
            sw.postMessage({ type: 'CLAIM_CLIENTS' });
          }
        });
        
        // Also listen for controller change
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          log('Controller changed after install');
        }, { once: true });
        
        // Give it time, then check again
        setTimeout(() => {
          if (!navigator.serviceWorker.controller) {
            log('SW still not controlling after wait, redirecting');
            redirectToLoader();
          }
        }, 3000);
        
      } else {
        // No SW registration at all - definitely need to go to loader
        log('No SW registration found, redirecting to loader');
        redirectToLoader();
      }
    }).catch(error => {
      log('Error checking SW registration:', error);
      // On error, be safe and redirect to loader
      redirectToLoader();
    });
  }
  
  /**
   * Verify SW is responsive (not frozen/broken)
   */
  function verifySWResponsive() {
    if (!navigator.serviceWorker.controller) return;
    
    // Create a message channel for response
    const channel = new MessageChannel();
    let responded = false;
    
    channel.port1.onmessage = (event) => {
      responded = true;
      if (event.data && event.data.type === 'PONG') {
        log('SW responded to ping, version:', event.data.version);
      }
    };
    
    // Send ping
    navigator.serviceWorker.controller.postMessage({ type: 'PING' }, [channel.port2]);
    
    // Check for response
    setTimeout(() => {
      if (!responded) {
        log('SW did not respond to ping, may be frozen');
        // SW might be frozen - try to wake it up or redirect
        // Don't immediately redirect, as the page might still work
        console.warn('[SW-Check] Service Worker did not respond. It may be restarting.');
      }
    }, 2000);
  }
  
  /**
   * Redirect to loader page
   */
  function redirectToLoader() {
    console.log('[SW-Check] Redirecting to loader to activate proxy protection...');
    
    // Save the current URL for redirect after loader
    const currentUrl = window.location.href;
    const returnPath = window.location.pathname + window.location.search + window.location.hash;
    
    // Save in sessionStorage as backup
    sessionStorage.setItem('redirectAfterLoader', returnPath);
    
    // Build loader URL with returnUrl param
    const loaderUrl = '/loader?returnUrl=' + encodeURIComponent(returnPath);
    
    // Redirect
    window.location.href = loaderUrl;
  }
  
  /**
   * Listen for SW activation events
   */
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      log('Service Worker controller changed');
    });
    
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'SW_ACTIVATED') {
        log('Received SW_ACTIVATED message, version:', event.data.version);
        console.log('[SW-Check] ✓ Service Worker v' + event.data.version + ' activated');
      }
    });
  }
  
})();
