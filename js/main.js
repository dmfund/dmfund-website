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
      var isOpen = navLinks.classList.contains('active');
      document.body.style.overflow = isOpen ? 'hidden' : '';
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

  // --- Custom file upload area ---
  var fileUploadArea = document.getElementById('fileUploadArea');
  var fileInput = document.getElementById('contactAttachment');
  var fileUploadLabel = document.getElementById('fileUploadLabel');
  var fileUploadName = document.getElementById('fileUploadName');

  if (fileUploadArea && fileInput) {
    fileUploadArea.addEventListener('click', function () {
      fileInput.click();
    });

    fileInput.addEventListener('change', function () {
      if (fileInput.files && fileInput.files[0]) {
        fileUploadName.textContent = fileInput.files[0].name;
        fileUploadName.style.display = 'block';
        fileUploadLabel.textContent = 'Change file';
      } else {
        fileUploadName.style.display = 'none';
        fileUploadLabel.textContent = 'Choose a file';
      }
    });

    fileUploadArea.addEventListener('dragover', function (e) {
      e.preventDefault();
      fileUploadArea.classList.add('dragging');
    });

    fileUploadArea.addEventListener('dragleave', function () {
      fileUploadArea.classList.remove('dragging');
    });

    fileUploadArea.addEventListener('drop', function (e) {
      e.preventDefault();
      fileUploadArea.classList.remove('dragging');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        fileInput.files = e.dataTransfer.files;
        fileUploadName.textContent = e.dataTransfer.files[0].name;
        fileUploadName.style.display = 'block';
        fileUploadLabel.textContent = 'Change file';
      }
    });
  }

  // --- Contact form submission ---
  var contactForm = document.getElementById('contactForm');

  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();

      var form = e.target;
      var submitBtn = form.querySelector('button[type="submit"]');
      var statusEl = document.getElementById('contactStatus');
      var pat = form.getAttribute('data-airtable-pat');
      var baseId = form.getAttribute('data-airtable-base');
      var tableName = 'Website - Contact';
      var fileInput = form.querySelector('#contactAttachment');

      // Disable button
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';
      statusEl.style.display = 'none';

      var payload = {
        fields: {
          Name: form.querySelector('#contactName').value.trim(),
          Email: form.querySelector('#contactEmail').value.trim(),
          Subject: form.querySelector('#contactSubject').value,
          Message: form.querySelector('#contactMessage').value.trim()
        }
      };

      var apiBase = 'https://api.airtable.com/v0/' + baseId + '/' + encodeURIComponent(tableName);

      // Create the record first
      fetch(apiBase, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + pat,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
        .then(function (response) {
          if (!response.ok) throw new Error('Submission failed');
          return response.json();
        })
        .then(function (record) {
          var recordId = record.id;
          var file = fileInput && fileInput.files && fileInput.files[0];

          if (!file) return Promise.resolve();

          // Upload attachment to the record
          var uploadUrl = 'https://content.airtable.com/v0/' + baseId + '/' + encodeURIComponent(tableName) + '/' + recordId + '/Attachment';

          return fetch(uploadUrl, {
            method: 'POST',
            headers: {
              Authorization: 'Bearer ' + pat,
              'Content-Type': file.type || 'application/octet-stream',
              'Content-Disposition': 'attachment; filename="' + file.name.replace(/"/g, '') + '"'
            },
            body: file
          }).then(function (uploadResponse) {
            if (!uploadResponse.ok) {
              console.warn('Attachment upload failed, but message was sent.');
            }
          });
        })
        .then(function () {
          statusEl.style.display = 'block';
          statusEl.style.backgroundColor = '#f0f7f0';
          statusEl.style.color = '#2d6a2e';
          statusEl.style.border = '1px solid #c3e6c3';
          statusEl.textContent = 'Thank you! Your message has been sent. We will be in touch soon.';
          form.reset();
        })
        .catch(function () {
          statusEl.style.display = 'block';
          statusEl.style.backgroundColor = '#fdf0f0';
          statusEl.style.color = '#a33';
          statusEl.style.border = '1px solid #f0c3c3';
          statusEl.textContent = 'Something went wrong. Please email us directly at info@dmfund.co.';
        })
        .finally(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Send Message';
        });
    });
  }

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
