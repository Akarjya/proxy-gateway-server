/**
 * Service Worker Check Script
 * Redirects to /loader if SW is not active
 * Should be included on ALL pages (except loader)
 */

(function() {
  'use strict';
  
  // Skip if on loader page
  if (window.location.pathname === '/loader') {
    return;
  }
  
  // Skip check if already coming from loader (prevent infinite loop)
  if (sessionStorage.getItem('fromLoader') === 'true') {
    sessionStorage.removeItem('fromLoader');
    console.log('[SW-Check] Coming from loader, skipping redirect');
    return;
  }
  
  // Check if Service Worker is supported and controlling
  if ('serviceWorker' in navigator) {
    if (!navigator.serviceWorker.controller) {
      // SW not controlling, save current URL and redirect to loader
      console.log('[SW-Check] No SW controller, redirecting to loader...');
      
      // Save the intended destination
      sessionStorage.setItem('redirectAfterLoader', window.location.href);
      
      // Redirect to loader
      window.location.href = '/loader';
      return;
    } else {
      console.log('[SW-Check] SW is controlling, proceeding normally');
    }
  } else {
    console.log('[SW-Check] Service Worker not supported');
  }
})();

