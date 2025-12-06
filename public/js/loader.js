/**
 * Loader Script - Service Worker Activation Handler
 * 
 * This script handles:
 * 1. Service Worker registration and activation
 * 2. Countdown timer display
 * 3. Progress animation
 * 4. Redirect to content ONLY when SW is ready
 * 
 * IMPORTANT: We do NOT proceed without SW active!
 * This would expose user's real IP which defeats the purpose of the proxy.
 * If SW fails, user must retry - we show error with retry option.
 * 
 * MAX WAIT TIME: 15 seconds (increased from 5 for reliability)
 * Extended retries: 3 attempts
 */

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    MAX_WAIT_TIME: 15000,       // 15 seconds max wait per attempt
    CONTENT_URL: '/',           // Default redirect (overridden by returnUrl)
    SW_PATH: '/sw.js',          // Service Worker path
    CHECK_INTERVAL: 100,        // How often to check SW status (ms)
    COUNTDOWN_START: 15,        // Countdown starts from
    MAX_RETRIES: 3,             // Maximum retry attempts
    SW_CONFIRM_URL: '/api/sw-confirm', // Endpoint to confirm SW activation
  };

  // Get return URL from data attribute or default
  const loaderContainer = document.querySelector('.loader-container');
  let returnUrl = loaderContainer?.dataset?.returnUrl || CONFIG.CONTENT_URL;
  if (returnUrl === '' || returnUrl === 'undefined') {
    returnUrl = CONFIG.CONTENT_URL;
  }
  
  // Also check sessionStorage for saved URL (fallback)
  const savedUrl = sessionStorage.getItem('redirectAfterLoader');
  if (savedUrl && savedUrl !== '/loader') {
    returnUrl = savedUrl;
  }

  // State
  let countdownValue = CONFIG.COUNTDOWN_START;
  let startTime = Date.now();
  let swReady = false;
  let countdownInterval = null;
  let progressInterval = null;
  let retryCount = 0;
  let isRetrying = false;

  // DOM Elements
  const elements = {
    countdownText: document.getElementById('countdown-text'),
    countdownNumber: document.getElementById('countdown-number'),
    countdownCircle: document.getElementById('countdown-circle'),
    progressFill: document.getElementById('progress-fill'),
    statusText: document.getElementById('status-text'),
    step1: document.getElementById('step-1'),
    step2: document.getElementById('step-2'),
    step3: document.getElementById('step-3'),
    loaderCard: document.querySelector('.loader-card'),
    retryContainer: document.getElementById('retry-container'),
    retryButton: document.getElementById('retry-button'),
    errorMessage: document.getElementById('error-message'),
  };

  // Status Messages (Hindi + Hinglish)
  const STATUS_MESSAGES = {
    connecting: '🔒 Secure connection establish ho rahi hai...',
    registering: '⚡ Service activate ho raha hai...',
    activating: '🚀 Almost ready! Bas kuch seconds...',
    loading: '👤 Premium profiles load ho rahe hain...',
    ready: '✅ Tayaar! Aapko redirect kar rahe hain...',
    error: '⚠️ Connection problem. Please retry karo.',
    retrying: '🔄 Retry kar rahe hain... Attempt ${count}/${max}',
    swFailed: '❌ Service activation failed. Retry karein.',
    swNotSupported: '⚠️ Aapka browser support nahi karta. Different browser try karein.',
  };

  /**
   * Update countdown display
   */
  function updateCountdown(value) {
    if (elements.countdownText) {
      elements.countdownText.textContent = value;
    }
    if (elements.countdownNumber) {
      elements.countdownNumber.textContent = value;
    }
    
    // Update countdown circle (stroke-dashoffset)
    if (elements.countdownCircle) {
      const circumference = 2 * Math.PI * 45; // radius = 45
      const offset = circumference * (1 - (value / CONFIG.COUNTDOWN_START));
      elements.countdownCircle.style.strokeDashoffset = offset;
      elements.countdownCircle.style.stroke = '#ff2d55';
    }
  }

  /**
   * Update progress bar
   */
  function updateProgress(percent) {
    if (elements.progressFill) {
      elements.progressFill.style.width = percent + '%';
    }
  }

  /**
   * Update status message
   */
  function updateStatus(key, params = {}) {
    if (elements.statusText && STATUS_MESSAGES[key]) {
      let message = STATUS_MESSAGES[key];
      // Replace placeholders
      Object.keys(params).forEach(k => {
        message = message.replace('${' + k + '}', params[k]);
      });
      elements.statusText.textContent = message;
    }
  }

  /**
   * Mark step as active
   */
  function activateStep(stepNum) {
    // Mark previous steps as completed
    for (let i = 1; i < stepNum; i++) {
      const prevStep = elements['step' + i];
      if (prevStep) {
        prevStep.classList.remove('active');
        prevStep.classList.add('completed');
      }
    }
    
    // Mark current step as active
    const currentStep = elements['step' + stepNum];
    if (currentStep) {
      currentStep.classList.add('active');
    }
  }

  /**
   * Show success state
   */
  function showSuccess() {
    if (elements.loaderCard) {
      elements.loaderCard.classList.add('success', 'ready-animation');
    }
    if (elements.countdownNumber) {
      elements.countdownNumber.textContent = '✓';
      elements.countdownNumber.style.fontSize = '28px';
    }
    updateStatus('ready');
    activateStep(3);
    for (let i = 1; i <= 3; i++) {
      const step = elements['step' + i];
      if (step) {
        step.classList.remove('active');
        step.classList.add('completed');
      }
    }
    
    // Hide retry container if visible
    if (elements.retryContainer) {
      elements.retryContainer.style.display = 'none';
    }
  }

  /**
   * Show error state with retry option
   */
  function showError(message) {
    // Stop countdown
    if (countdownInterval) clearInterval(countdownInterval);
    if (progressInterval) clearInterval(progressInterval);
    
    // Update UI to error state
    if (elements.loaderCard) {
      elements.loaderCard.classList.add('error');
    }
    if (elements.countdownNumber) {
      elements.countdownNumber.textContent = '!';
      elements.countdownNumber.style.color = '#ff6b6b';
    }
    
    updateStatus('error');
    
    // Show retry container
    if (elements.retryContainer) {
      elements.retryContainer.style.display = 'block';
    }
    if (elements.errorMessage) {
      elements.errorMessage.textContent = message || STATUS_MESSAGES.swFailed;
    }
    
    console.error('[Loader] Error:', message);
  }

  /**
   * Confirm SW activation with server
   */
  async function confirmSWWithServer() {
    try {
      const response = await fetch(CONFIG.SW_CONFIRM_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'same-origin'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('[Loader] SW confirmation response:', data);
        return data.success;
      }
    } catch (error) {
      console.warn('[Loader] Failed to confirm SW with server:', error);
    }
    return false;
  }

  /**
   * Redirect to content page (or original destination)
   */
  async function goToContent() {
    console.log('[Loader] Preparing to redirect...');
    
    // Confirm SW activation with server
    await confirmSWWithServer();
    
    // Set flag so pages know we came from loader
    sessionStorage.setItem('fromLoader', 'true');
    sessionStorage.setItem('swActivated', 'true');
    sessionStorage.setItem('swActivatedAt', Date.now().toString());
    
    // Clear saved redirect URL
    sessionStorage.removeItem('redirectAfterLoader');
    
    console.log('[Loader] Redirecting to:', returnUrl);
    window.location.href = returnUrl;
  }

  /**
   * Check if Service Worker is controlling
   */
  function isSWControlling() {
    return navigator.serviceWorker && navigator.serviceWorker.controller;
  }

  /**
   * Check if SW is registered and active
   */
  async function isSWActiveAndReady() {
    if (!('serviceWorker' in navigator)) {
      return false;
    }
    
    try {
      const registration = await navigator.serviceWorker.getRegistration('/');
      if (registration && registration.active) {
        // SW is registered and active
        // Check if it's controlling
        if (navigator.serviceWorker.controller) {
          return true;
        }
        // SW is active but not controlling - trigger claim
        registration.active.postMessage({ type: 'CLAIM_CLIENTS' });
        return false; // Will become true after claim
      }
    } catch (e) {
      console.warn('[Loader] Error checking SW status:', e);
    }
    return false;
  }

  /**
   * Register and wait for Service Worker
   */
  async function initServiceWorker() {
    // Check if SW is already controlling (return visit)
    if (isSWControlling()) {
      console.log('[Loader] SW already controlling, redirecting immediately');
      swReady = true;
      updateProgress(100);
      showSuccess();
      setTimeout(goToContent, 500); // Small delay for visual feedback
      return;
    }

    // Check SW support
    if (!('serviceWorker' in navigator)) {
      console.error('[Loader] Service Workers not supported');
      showError(STATUS_MESSAGES.swNotSupported);
      return;
    }

    try {
      updateStatus('registering');
      activateStep(1);
      updateProgress(20);

      // Unregister any existing SW first to ensure fresh registration
      const existingRegistrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of existingRegistrations) {
        if (reg.scope.includes(window.location.origin)) {
          console.log('[Loader] Unregistering existing SW:', reg.scope);
          // Don't unregister, just update
        }
      }

      // Register Service Worker
      console.log('[Loader] Registering Service Worker...');
      const registration = await navigator.serviceWorker.register(CONFIG.SW_PATH, {
        scope: '/',
        updateViaCache: 'none' // Always check for updates
      });

      console.log('[Loader] SW registered:', registration.scope);
      updateProgress(40);
      activateStep(2);
      updateStatus('activating');

      // Handle different SW states
      const sw = registration.installing || registration.waiting || registration.active;
      
      if (sw) {
        // Send message to skip waiting and claim
        sw.postMessage({ type: 'SKIP_WAITING' });
        sw.postMessage({ type: 'CLAIM_CLIENTS' });
        
        // If installing, watch state changes
        if (registration.installing) {
          console.log('[Loader] SW installing...');
          registration.installing.addEventListener('statechange', (e) => {
            console.log('[Loader] SW state changed:', e.target.state);
            if (e.target.state === 'activated') {
              updateProgress(70);
              updateStatus('loading');
              // Trigger claim
              e.target.postMessage({ type: 'CLAIM_CLIENTS' });
            }
          });
        }
        
        // If waiting, activate it
        if (registration.waiting) {
          console.log('[Loader] SW waiting, activating...');
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        
        // If already active
        if (registration.active) {
          console.log('[Loader] SW already active, claiming...');
          registration.active.postMessage({ type: 'CLAIM_CLIENTS' });
          updateProgress(70);
          updateStatus('loading');
        }
      }

      // Listen for controller change (SW takes control)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[Loader] SW controller changed - NOW CONTROLLING!');
        if (!swReady) {
          swReady = true;
          updateProgress(100);
          showSuccess();
          
          // Clear intervals
          if (countdownInterval) clearInterval(countdownInterval);
          if (progressInterval) clearInterval(progressInterval);
          
          // Redirect after brief success animation
          setTimeout(goToContent, 600);
        }
      });

      // Also check periodically
      startSWCheck();

    } catch (error) {
      console.error('[Loader] SW registration failed:', error);
      
      if (retryCount < CONFIG.MAX_RETRIES) {
        // Auto-retry
        retryCount++;
        updateStatus('retrying', { count: retryCount, max: CONFIG.MAX_RETRIES });
        console.log('[Loader] Retrying... attempt', retryCount);
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Reset and try again
        startTime = Date.now();
        countdownValue = CONFIG.COUNTDOWN_START;
        initServiceWorker();
      } else {
        // All retries exhausted
        showError(`Service Worker activation failed after ${CONFIG.MAX_RETRIES} attempts. Please refresh the page.`);
      }
    }
  }

  /**
   * Periodically check if SW is ready
   */
  function startSWCheck() {
    const checkSW = setInterval(async () => {
      if (swReady) {
        clearInterval(checkSW);
        return;
      }

      if (isSWControlling()) {
        console.log('[Loader] SW now controlling!');
        swReady = true;
        clearInterval(checkSW);
        
        updateProgress(100);
        showSuccess();
        
        if (countdownInterval) clearInterval(countdownInterval);
        if (progressInterval) clearInterval(progressInterval);
        
        setTimeout(goToContent, 600);
        return;
      }
      
      // Also check registration state
      const ready = await isSWActiveAndReady();
      if (ready && !swReady) {
        // SW is active, wait a bit for claim
        console.log('[Loader] SW active, waiting for claim...');
      }
    }, CONFIG.CHECK_INTERVAL);
    
    // Clear check after max wait time
    setTimeout(() => {
      clearInterval(checkSW);
    }, CONFIG.MAX_WAIT_TIME + 5000);
  }

  /**
   * Start countdown timer
   */
  function startCountdown() {
    updateCountdown(countdownValue);
    
    countdownInterval = setInterval(() => {
      countdownValue--;
      updateCountdown(Math.max(0, countdownValue));
      
      // Update progress based on time elapsed
      const elapsed = Date.now() - startTime;
      const progressPercent = Math.min((elapsed / CONFIG.MAX_WAIT_TIME) * 100, 95);
      
      if (!swReady) {
        updateProgress(progressPercent);
        
        // Update steps based on progress
        if (progressPercent > 30 && progressPercent <= 60) {
          activateStep(2);
          updateStatus('activating');
        } else if (progressPercent > 60) {
          activateStep(3);
          updateStatus('loading');
        }
      }
      
      // Timeout reached
      if (countdownValue <= 0) {
        clearInterval(countdownInterval);
        
        if (!swReady) {
          console.log('[Loader] Timeout reached');
          
          // Try one more aggressive approach before giving up
          if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            console.log('[Loader] Wait, SW is actually controlling now!');
            swReady = true;
            showSuccess();
            setTimeout(goToContent, 600);
            return;
          }
          
          // Check if we should auto-retry
          if (retryCount < CONFIG.MAX_RETRIES && !isRetrying) {
            isRetrying = true;
            retryCount++;
            updateStatus('retrying', { count: retryCount, max: CONFIG.MAX_RETRIES });
            console.log('[Loader] Auto-retrying... attempt', retryCount);
            
            // Reset state
            countdownValue = CONFIG.COUNTDOWN_START;
            startTime = Date.now();
            isRetrying = false;
            
            // Restart countdown
            startCountdown();
            
            // Re-init SW
            initServiceWorker();
          } else {
            // All retries exhausted - show error, DO NOT proceed
            showError('Service Worker could not be activated. Please try:\n1. Refresh the page\n2. Clear browser cache\n3. Try a different browser');
          }
        }
      }
    }, 1000);
  }

  /**
   * Initialize SVG gradient for countdown circle
   */
  function initSVGGradient() {
    const svg = document.querySelector('.countdown-ring svg');
    if (svg) {
      // Add gradient definition
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      defs.innerHTML = `
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#ff2d55;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#ff6b8a;stop-opacity:1" />
        </linearGradient>
      `;
      svg.insertBefore(defs, svg.firstChild);
      
      // Apply gradient to progress circle
      const progressCircle = document.getElementById('countdown-circle');
      if (progressCircle) {
        progressCircle.style.stroke = 'url(#gradient)';
      }
    }
  }

  /**
   * Handle retry button click
   */
  function handleRetry() {
    console.log('[Loader] Manual retry triggered');
    
    // Reset state
    retryCount = 0;
    swReady = false;
    countdownValue = CONFIG.COUNTDOWN_START;
    startTime = Date.now();
    
    // Reset UI
    if (elements.loaderCard) {
      elements.loaderCard.classList.remove('error', 'success');
    }
    if (elements.countdownNumber) {
      elements.countdownNumber.textContent = countdownValue.toString();
      elements.countdownNumber.style.fontSize = '';
      elements.countdownNumber.style.color = '';
    }
    if (elements.retryContainer) {
      elements.retryContainer.style.display = 'none';
    }
    
    // Reset steps
    for (let i = 1; i <= 3; i++) {
      const step = elements['step' + i];
      if (step) {
        step.classList.remove('active', 'completed');
      }
    }
    activateStep(1);
    
    updateProgress(0);
    updateStatus('connecting');
    
    // Restart
    startCountdown();
    initServiceWorker();
  }

  /**
   * Main initialization
   */
  function init() {
    console.log('[Loader] Initializing...');
    console.log('[Loader] Return URL:', returnUrl);
    
    // Setup retry button handler
    if (elements.retryButton) {
      elements.retryButton.addEventListener('click', handleRetry);
    }
    
    // Setup SVG gradient
    initSVGGradient();
    
    // Initialize countdown circle
    if (elements.countdownCircle) {
      const circumference = 2 * Math.PI * 45;
      elements.countdownCircle.style.strokeDasharray = circumference;
      elements.countdownCircle.style.strokeDashoffset = 0;
    }
    
    // Start countdown
    startCountdown();
    
    // Start SW initialization
    initServiceWorker();
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
