/* ============================================
   Davis/Macleod — 2026 Redesign JS (Light)
   ============================================ */
(function () {
  'use strict';

  // --- Navigation scroll ---
  var nav = document.getElementById('nav');
  function handleScroll() {
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 50);
  }
  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  // --- Mobile nav ---
  var navToggle = document.getElementById('navToggle');
  var navLinks = document.getElementById('navLinks');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function () {
      navToggle.classList.toggle('active');
      navLinks.classList.toggle('active');
      document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
    });
    navLinks.querySelectorAll('.nav__link').forEach(function (link) {
      link.addEventListener('click', function () {
        navToggle.classList.remove('active');
        navLinks.classList.remove('active');
        document.body.style.overflow = '';
      });
    });
  }

  // --- Reveal on scroll ---
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length > 0) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });
    revealEls.forEach(function (el) { observer.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('visible'); });
  }

  // --- Stat counter ---
  function animateStat(el) {
    var target = parseFloat(el.getAttribute('data-target'));
    var suffix = el.getAttribute('data-suffix') || '';
    var prefix = el.getAttribute('data-prefix') || '';
    if (isNaN(target)) return;
    var duration = 1200;
    var start = performance.now();
    var isDecimal = String(target).includes('.');
    (function step(ts) {
      var progress = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      var current = eased * target;
      el.textContent = prefix + (isDecimal ? current.toFixed(1) : Math.floor(current)) + suffix;
      if (progress < 1) requestAnimationFrame(step);
    })(start);
  }

  var statNums = document.querySelectorAll('.stat__number[data-target]');
  if ('IntersectionObserver' in window && statNums.length > 0) {
    var statObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateStat(entry.target);
          statObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    statNums.forEach(function (el) { statObs.observe(el); });
  }

  // --- Portfolio filters ---
  var filterBtns = document.querySelectorAll('.portfolio-filter');
  var portfolioCards = document.querySelectorAll('.portfolio-card');
  if (filterBtns.length > 0) {
    filterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        filterBtns.forEach(function (b) { b.classList.remove('portfolio-filter--active'); });
        btn.classList.add('portfolio-filter--active');
        var filter = btn.getAttribute('data-filter');
        portfolioCards.forEach(function (card) {
          var cat = card.getAttribute('data-category');
          card.style.display = (filter === 'all' || cat === filter) ? '' : 'none';
        });
      });
    });
  }

  // --- Smooth scroll ---
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var href = this.getAttribute('href');
      if (href === '#') return;
      var target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
})();
