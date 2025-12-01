/**
 * Landing Page JavaScript
 * Handles button loading state
 */

document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('proceed-form');
  const button = document.getElementById('proceed-btn');

  if (form && button) {
    form.addEventListener('submit', function() {
      // Add loading state
      button.classList.add('loading');
      button.disabled = true;
    });
  }
});

