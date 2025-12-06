/**
 * Loader Script - Service Worker Activation Handler
 * 
 * This script handles:
 * 1. Service Worker registration and activation
 * 2. Countdown timer display
 * 3. Progress animation
 * 4. Redirect to content when SW is ready (or timeout)
 * 
 * MAX WAIT TIME: 5 seconds
 * If SW doesn't activate in time, proceed anyway (real IP fallback)
 */

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    MAX_WAIT_TIME: 5000,        // 5 seconds max wait
    CONTENT_URL: '/',            // Where to redirect after SW ready (homepage)
    SW_PATH: '/sw.js',           // Service Worker path
    CHECK_INTERVAL: 100,         // How often to check SW status (ms)
    COUNTDOWN_START: 5,          // Countdown starts from
  };

  // State
  let countdownValue = CONFIG.COUNTDOWN_START;
  let startTime = Date.now();
  let swReady = false;
  let countdownInterval = null;
  let progressInterval = null;

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
  };

  // Status Messages (Hindi + Hinglish)
  const STATUS_MESSAGES = {
    connecting: '🔒 Secure connection establish ho rahi hai...',
    registering: '⚡ Service activate ho raha hai...',
    activating: '🚀 Almost ready! Bas kuch seconds...',
    loading: '👤 Premium profiles load ho rahe hain...',
    ready: '✅ Tayaar! Aapko redirect kar rahe hain...',
    timeout: '⏱️ Thoda time lag raha hai, proceed kar rahe hain...',
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
  function updateStatus(key) {
    if (elements.statusText && STATUS_MESSAGES[key]) {
      elements.statusText.textContent = STATUS_MESSAGES[key];
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
  }

  /**
   * Redirect to content page
   */
  function goToContent() {
    console.log('[Loader] Redirecting to content...');
    window.location.href = CONFIG.CONTENT_URL;
  }

  /**
   * Check if Service Worker is controlling
   */
  function isSWControlling() {
    return navigator.serviceWorker && navigator.serviceWorker.controller;
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
      console.warn('[Loader] Service Workers not supported');
      updateStatus('timeout');
      setTimeout(goToContent, 1000);
      return;
    }

    try {
      updateStatus('registering');
      activateStep(1);
      updateProgress(20);

      // Register Service Worker
      console.log('[Loader] Registering Service Worker...');
      const registration = await navigator.serviceWorker.register(CONFIG.SW_PATH, {
        scope: '/'
      });

      console.log('[Loader] SW registered:', registration.scope);
      updateProgress(40);
      activateStep(2);
      updateStatus('activating');

      // If SW is already active and just needs to claim
      if (registration.active) {
        console.log('[Loader] SW active, waiting for claim...');
        registration.active.postMessage({ type: 'SKIP_WAITING' });
      }

      // If SW is waiting, activate it
      if (registration.waiting) {
        console.log('[Loader] SW waiting, activating...');
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      // If SW is installing, wait for it
      if (registration.installing) {
        console.log('[Loader] SW installing, waiting...');
        registration.installing.addEventListener('statechange', (e) => {
          console.log('[Loader] SW state changed:', e.target.state);
          if (e.target.state === 'activated') {
            updateProgress(70);
            updateStatus('loading');
          }
        });
      }

      // Listen for controller change (SW takes control)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[Loader] SW controller changed!');
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
      updateStatus('timeout');
      // Proceed anyway after a short delay
      setTimeout(goToContent, 1500);
    }
  }

  /**
   * Periodically check if SW is ready
   */
  function startSWCheck() {
    const checkSW = setInterval(() => {
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
      }
    }, CONFIG.CHECK_INTERVAL);
  }

  /**
   * Start countdown timer
   */
  function startCountdown() {
    updateCountdown(countdownValue);
    
    countdownInterval = setInterval(() => {
      countdownValue--;
      updateCountdown(countdownValue);
      
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
          console.log('[Loader] Timeout reached, proceeding without SW');
          updateStatus('timeout');
          updateProgress(100);
          
          // Mark all steps as completed anyway
          for (let i = 1; i <= 3; i++) {
            const step = elements['step' + i];
            if (step) {
              step.classList.remove('active');
              step.classList.add('completed');
            }
          }
          
          // Proceed to content (without proxy, real IP)
          setTimeout(goToContent, 800);
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
   * Main initialization
   */
  function init() {
    console.log('[Loader] Initializing...');
    
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
    
    // Fallback timeout (absolute max wait)
    setTimeout(() => {
      if (!swReady) {
        console.log('[Loader] Absolute timeout, forcing redirect');
        goToContent();
      }
    }, CONFIG.MAX_WAIT_TIME + 1000); // Extra 1 second buffer
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

