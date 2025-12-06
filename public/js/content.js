/**
 * Content Page Script
 * 
 * Handles:
 * 1. Service Worker verification and monitoring
 * 2. Navigation interception for external links
 * 3. Ad script handling
 * 4. UI interactions
 */

(function() {
  'use strict';

  // ==========================================
  // SERVICE WORKER VERIFICATION
  // ==========================================

  /**
   * Check if Service Worker is controlling
   * If not, redirect back to loader
   */
  function verifySW() {
    if (!navigator.serviceWorker || !navigator.serviceWorker.controller) {
      console.warn('[Content] SW not controlling, user may be using real IP');
      // Continue anyway - don't break the experience
      // But log this for monitoring
      return false;
    }
    console.log('[Content] SW is controlling - all requests proxied');
    return true;
  }

  // Verify SW on load
  const swActive = verifySW();

  // Monitor SW status
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[Content] SW controller changed');
    });
  }

  // ==========================================
  // NAVIGATION INTERCEPTION
  // ==========================================
  // Ensures all external links go through proxy

  function isExternalUrl(url) {
    if (!url || url.startsWith('#') || url.startsWith('javascript:') || 
        url.startsWith('mailto:') || url.startsWith('tel:')) {
      return false;
    }
    if (url.startsWith('/')) {
      return false;
    }
    if (url.startsWith('http')) {
      try {
        const urlObj = new URL(url);
        return urlObj.hostname !== location.hostname;
      } catch(e) {
        return false;
      }
    }
    return false;
  }

  function handleExternalNavigation(url) {
    // Route through navigate endpoint
    window.location.href = '/navigate?url=' + encodeURIComponent(url);
  }

  // Intercept link clicks
  document.addEventListener('click', function(e) {
    const target = e.target.closest('a');
    if (target && target.href && isExternalUrl(target.href)) {
      e.preventDefault();
      e.stopPropagation();
      console.log('[Content] Intercepted external link:', target.href);
      handleExternalNavigation(target.href);
    }
  }, true);

  // Intercept window.open
  const originalWindowOpen = window.open;
  window.open = function(url, name, features) {
    if (url && isExternalUrl(url)) {
      console.log('[Content] Intercepted window.open:', url);
      return originalWindowOpen.call(this, '/navigate?url=' + encodeURIComponent(url), name, features);
    }
    return originalWindowOpen.call(this, url, name, features);
  };

  // ==========================================
  // UI INTERACTIONS
  // ==========================================

  // Mobile menu toggle
  const mobileMenuBtn = document.querySelector('.mobile-menu');
  const navMenu = document.querySelector('.nav');

  if (mobileMenuBtn && navMenu) {
    mobileMenuBtn.addEventListener('click', () => {
      navMenu.classList.toggle('active');
      mobileMenuBtn.classList.toggle('active');
    });
  }

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      
      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
        const targetPosition = targetEl.getBoundingClientRect().top + window.pageYOffset - headerHeight - 20;
        
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });

  // Header scroll effect
  const header = document.querySelector('.header');
  let lastScroll = 0;

  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 50) {
      header?.classList.add('scrolled');
    } else {
      header?.classList.remove('scrolled');
    }
    
    lastScroll = currentScroll;
  });

  // ==========================================
  // BUTTON INTERACTIONS
  // ==========================================

  // Add click handlers to CTA buttons
  const ctaButtons = document.querySelectorAll('.btn-primary, .btn-join, .btn-connect');
  
  ctaButtons.forEach(btn => {
    btn.addEventListener('click', function(e) {
      // Add ripple effect
      const ripple = document.createElement('span');
      ripple.classList.add('btn-ripple');
      this.appendChild(ripple);
      
      const rect = this.getBoundingClientRect();
      ripple.style.left = (e.clientX - rect.left) + 'px';
      ripple.style.top = (e.clientY - rect.top) + 'px';
      
      setTimeout(() => ripple.remove(), 600);
      
      // For demo, show alert
      if (!this.closest('form')) {
        e.preventDefault();
        showToast('Thanks for your interest! Sign up feature coming soon.');
      }
    });
  });

  // ==========================================
  // TOAST NOTIFICATION
  // ==========================================

  function showToast(message, duration = 3000) {
    // Remove existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();
    
    // Create toast
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <span class="toast-icon">✓</span>
      <span class="toast-message">${message}</span>
    `;
    
    // Add styles if not exists
    if (!document.querySelector('#toast-styles')) {
      const styles = document.createElement('style');
      styles.id = 'toast-styles';
      styles.textContent = `
        .toast {
          position: fixed;
          bottom: 30px;
          left: 50%;
          transform: translateX(-50%) translateY(100px);
          background: linear-gradient(135deg, #1a1a2e, #16213e);
          color: white;
          padding: 15px 25px;
          border-radius: 30px;
          display: flex;
          align-items: center;
          gap: 10px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
          z-index: 10000;
          animation: toastSlideUp 0.4s ease forwards;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .toast-icon {
          width: 24px;
          height: 24px;
          background: linear-gradient(135deg, #32CD32, #228B22);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
        }
        .toast-message {
          font-size: 14px;
          font-weight: 500;
        }
        @keyframes toastSlideUp {
          to { transform: translateX(-50%) translateY(0); }
        }
        .toast.hide {
          animation: toastSlideDown 0.4s ease forwards;
        }
        @keyframes toastSlideDown {
          to { transform: translateX(-50%) translateY(100px); opacity: 0; }
        }
        .btn-ripple {
          position: absolute;
          width: 20px;
          height: 20px;
          background: rgba(255, 255, 255, 0.4);
          border-radius: 50%;
          transform: translate(-50%, -50%) scale(0);
          animation: ripple 0.6s ease-out;
          pointer-events: none;
        }
        @keyframes ripple {
          to { transform: translate(-50%, -50%) scale(10); opacity: 0; }
        }
      `;
      document.head.appendChild(styles);
    }
    
    document.body.appendChild(toast);
    
    // Auto hide
    setTimeout(() => {
      toast.classList.add('hide');
      setTimeout(() => toast.remove(), 400);
    }, duration);
  }

  // ==========================================
  // PROFILE CARD INTERACTIONS
  // ==========================================

  const profileCards = document.querySelectorAll('.profile-showcase');
  
  profileCards.forEach(card => {
    card.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-5px)';
    });
    
    card.addEventListener('mouseleave', function() {
      this.style.transform = '';
    });
  });

  // ==========================================
  // LAZY LOAD IMAGES (if any real images)
  // ==========================================

  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.classList.add('loaded');
          }
          observer.unobserve(img);
        }
      });
    }, { rootMargin: '50px' });

    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });
  }

  // ==========================================
  // ANIMATION ON SCROLL
  // ==========================================

  if ('IntersectionObserver' in window) {
    const animateObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.feature-card, .profile-showcase, .story-card, .pricing-card').forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      animateObserver.observe(el);
    });

    // Add animate-in styles
    if (!document.querySelector('#animate-styles')) {
      const styles = document.createElement('style');
      styles.id = 'animate-styles';
      styles.textContent = `
        .animate-in {
          opacity: 1 !important;
          transform: translateY(0) !important;
        }
      `;
      document.head.appendChild(styles);
    }
  }

  // ==========================================
  // CONSOLE MESSAGE
  // ==========================================

  console.log('%c LoveMatch Premium ', 'background: linear-gradient(135deg, #e63946, #f4a261); color: white; font-size: 16px; padding: 10px 20px; border-radius: 5px;');
  console.log('[Content] Page loaded successfully');
  console.log('[Content] SW Status:', swActive ? 'Active - Proxied' : 'Not Active');

})();

