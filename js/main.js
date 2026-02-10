/* ============================================
   Davis Macleod Fund — Main JavaScript
   ============================================ */

(function () {
  'use strict';

  // --- Navigation scroll effect ---
  const nav = document.getElementById('nav');

  function handleNavScroll() {
    if (window.scrollY > 50) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', handleNavScroll, { passive: true });
  handleNavScroll();

  // --- Mobile nav toggle ---
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function () {
      navToggle.classList.toggle('active');
      navLinks.classList.toggle('active');
      document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
    });

    // Close mobile nav on link click
    navLinks.querySelectorAll('.nav__link').forEach(function (link) {
      link.addEventListener('click', function () {
        navToggle.classList.remove('active');
        navLinks.classList.remove('active');
        document.body.style.overflow = '';
      });
    });
  }

  // --- Scroll animations (Intersection Observer) ---
  const fadeElements = document.querySelectorAll('.fade-up');

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    fadeElements.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    // Fallback: show all elements
    fadeElements.forEach(function (el) {
      el.classList.add('visible');
    });
  }

  // --- Portfolio filter tabs ---
  const filterButtons = document.querySelectorAll('.portfolio-filter');
  const portfolioCards = document.querySelectorAll('.portfolio-card');

  if (filterButtons.length > 0 && portfolioCards.length > 0) {
    filterButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        // Update active state
        filterButtons.forEach(function (btn) {
          btn.classList.remove('portfolio-filter--active');
        });
        button.classList.add('portfolio-filter--active');

        var filter = button.getAttribute('data-filter');

        portfolioCards.forEach(function (card) {
          var category = card.getAttribute('data-category');

          if (filter === 'all' || category === filter) {
            card.style.display = '';
            // Re-trigger animation
            card.classList.remove('visible');
            void card.offsetWidth; // Force reflow
            card.classList.add('visible');
          } else {
            card.style.display = 'none';
          }
        });
      });
    });
  }

  // --- Smooth scroll for anchor links ---
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var href = this.getAttribute('href');
      if (href === '#') return;

      var target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }
    });
  });

  // --- Counter animation for stats ---
  const statNumbers = document.querySelectorAll('.stat__number');

  if ('IntersectionObserver' in window && statNumbers.length > 0) {
    const statsObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateStat(entry.target);
            statsObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );

    statNumbers.forEach(function (stat) {
      statsObserver.observe(stat);
    });
  }

  function animateStat(el) {
    var text = el.textContent;
    var hasPlus = text.includes('+');
    var hasDollar = text.includes('$');
    var hasM = text.includes('M');
    var hasX = text.includes('x');

    // Extract numeric value
    var numStr = text.replace(/[^0-9.]/g, '');
    var target = parseFloat(numStr);

    if (isNaN(target) || target === 0) return;

    var duration = 1500;
    var start = performance.now();
    var isDecimal = numStr.includes('.');

    function step(timestamp) {
      var elapsed = timestamp - start;
      var progress = Math.min(elapsed / duration, 1);

      // Ease out cubic
      var eased = 1 - Math.pow(1 - progress, 3);
      var current = eased * target;

      var display = isDecimal ? current.toFixed(1) : Math.floor(current);
      var formatted = (hasDollar ? '$' : '') + display + (hasM ? 'M' : '') + (hasX ? 'x' : '') + (hasPlus ? '+' : '');

      el.textContent = formatted;

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }

    requestAnimationFrame(step);
  }
})();
