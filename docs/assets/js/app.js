// SmoothBoost - Main Application & Interactive Showcase Controller
// Powers profile simulation, scroll benchmarking, platform guides, spotlight effects, and accessibility controls.

(function () {
  'use strict';

  // --- Profile Simulation Data ---
  const PROFILES = {
    auto: {
      name: 'Smart Auto',
      badge: 'AUTO',
      badgeClass: 'badge-auto',
      description: 'Detects page type before applying heavier rules. Live communication apps keep their calls, canvas content, and interface motion active.',
      metrics: {
        passive: 'Safe targets only',
        videos: 'Offscreen previews',
        blurs: 'Profile controlled',
        canvas: 'Offscreen only',
        fonts: 'Optional',
        powerSavings: 'Adaptive'
      },
      rules: [
        { label: 'Compositor scroll listeners (passive)', active: true },
        { label: 'Offscreen canvas draw-skipping', active: true, note: 'Bypassed on Figma/Docs' },
        { label: 'Background ambient video pausing', active: true },
        { label: 'Backdrop blur opacity bypass', active: true },
        { label: 'Offscreen CSS animation pausing', active: true },
        { label: 'Offscreen DOM content-visibility', active: false },
        { label: 'CSSOM font-display swap', active: true },
        { label: 'Live chat, calls, and app motion preserved', active: true, note: 'Discord and voice apps' }
      ]
    },
    ultra: {
      name: 'Turbo (Maximum)',
      badge: 'MAX',
      badgeClass: 'badge-ultra',
      description: 'Maximum profile for ordinary pages. Real-time communication apps keep calls, interface motion, and canvas content intact.',
      metrics: {
        passive: 'Safe targets only',
        videos: 'Offscreen previews',
        blurs: 'Profile controlled',
        canvas: 'Offscreen only',
        fonts: 'Optional',
        powerSavings: 'High'
      },
      rules: [
        { label: 'Compositor scroll listeners (passive)', active: true },
        { label: 'Offscreen canvas draw-skipping', active: true },
        { label: 'Background ambient video pausing', active: true },
        { label: 'Backdrop blur opacity bypass', active: true },
        { label: 'Offscreen CSS animation pausing', active: true },
        { label: 'Offscreen DOM content-visibility', active: false },
        { label: 'CSSOM font-display swap', active: true },
        { label: 'Live chat and calls protected', active: true, note: 'real-time app safeguard' }
      ]
    },
    balanced: {
      name: 'Balanced',
      badge: 'BAL',
      badgeClass: 'badge-balanced',
      description: 'Conservative acceleration. Leaves page styling and media behavior untouched while keeping scrolling light.',
      metrics: {
        passive: 'Native behavior',
        videos: 'Unchanged',
        blurs: 'Unchanged',
        canvas: 'Standard',
        fonts: 'Unchanged',
        powerSavings: 'Moderate'
      },
      rules: [
        { label: 'Compositor scroll listeners (passive)', active: true },
        { label: 'Offscreen canvas draw-skipping', active: false },
        { label: 'Background ambient video pausing', active: false },
        { label: 'Backdrop blur opacity bypass', active: false },
        { label: 'Offscreen CSS animation pausing', active: false },
        { label: 'Offscreen DOM content-visibility', active: false },
        { label: 'CSSOM font-display swap', active: false }
      ]
    },
    battery: {
      name: 'Battery Saver',
      badge: 'BATT',
      badgeClass: 'badge-battery',
      description: 'Cuts background work on battery. Live communication apps keep their calls, motion, and canvas content active.',
      metrics: {
        passive: 'Safe targets only',
        videos: 'Offscreen previews',
        blurs: 'Profile controlled',
        canvas: 'Offscreen only',
        fonts: 'Optional',
        powerSavings: 'Extreme'
      },
      rules: [
        { label: 'Compositor scroll listeners (passive)', active: true },
        { label: 'Offscreen canvas draw-skipping', active: true },
        { label: 'Background ambient video pausing', active: true },
        { label: 'Backdrop blur opacity bypass', active: true },
        { label: 'Offscreen CSS animation pausing', active: true },
        { label: 'Offscreen DOM content-visibility', active: true, note: 'Frees offscreen DOM layout' },
        { label: 'CSSOM font-display swap', active: true },
        { label: 'Real-time app motion preserved', active: true, note: 'including Discord' }
      ]
    },
    custom: {
      name: 'Custom Profile',
      badge: 'CUSTOM',
      badgeClass: 'badge-custom',
      description: 'Independent tuning drawer allowing manual control over every single optimization flag and frame cap.',
      metrics: {
        passive: 'Choose in settings',
        videos: 'Choose in settings',
        blurs: 'Choose in settings',
        canvas: 'Configurable',
        fonts: 'Optional',
        powerSavings: 'Custom'
      },
      rules: [
        { label: 'Compositor scroll listeners (passive)', active: true },
        { label: 'Offscreen canvas draw-skipping', active: true },
        { label: 'Background ambient video pausing', active: true },
        { label: 'Backdrop blur opacity bypass', active: true },
        { label: 'Offscreen CSS animation pausing', active: false },
        { label: 'Offscreen DOM content-visibility', active: false },
        { label: 'CSSOM font-display swap', active: true }
      ]
    }
  };

  // --- Profile Showcase Controller ---
  function initProfileShowcase() {
    const buttons = document.querySelectorAll('[data-profile-btn]');
    const badgeEl = document.getElementById('sim-badge');
    const titleEl = document.getElementById('sim-title');
    const descEl = document.getElementById('sim-desc');
    const metricPassiveEl = document.getElementById('sim-metric-passive');
    const metricVideosEl = document.getElementById('sim-metric-videos');
    const metricBlursEl = document.getElementById('sim-metric-blurs');
    const metricCanvasEl = document.getElementById('sim-metric-canvas');
    const metricFontsEl = document.getElementById('sim-metric-fonts');
    const rulesListEl = document.getElementById('sim-rules-list');

    function selectProfile(key) {
      const data = PROFILES[key] || PROFILES.auto;

      // Update active button state
      buttons.forEach((btn) => {
        const isMatch = btn.getAttribute('data-profile-btn') === key;
        btn.classList.toggle('is-active', isMatch);
        btn.setAttribute('aria-selected', String(isMatch));
      });

      // Update text & badge
      if (badgeEl) {
        badgeEl.textContent = data.badge;
        badgeEl.className = `profile-badge ${data.badgeClass}`;
      }
      if (titleEl) titleEl.textContent = data.name;
      if (descEl) descEl.textContent = data.description;

      // Update metrics
      if (metricPassiveEl) metricPassiveEl.textContent = data.metrics.passive;
      if (metricVideosEl) metricVideosEl.textContent = data.metrics.videos;
      if (metricBlursEl) metricBlursEl.textContent = data.metrics.blurs;
      if (metricCanvasEl) metricCanvasEl.textContent = data.metrics.canvas;
      if (metricFontsEl) metricFontsEl.textContent = data.metrics.fonts;

      // Update rules checklist
      if (rulesListEl) {
        rulesListEl.innerHTML = data.rules.map((rule) => `
          <li class="sim-rule-item ${rule.active ? 'is-enabled' : 'is-disabled'}">
            <span class="sim-rule-icon">
              ${rule.active
                ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>'
                : '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'}
            </span>
            <span class="sim-rule-text">
              ${rule.label}
              ${rule.note ? `<small class="sim-rule-note">(${rule.note})</small>` : ''}
            </span>
          </li>
        `).join('');
      }

      // Sync 3D scene color and rotation dynamics
      if (window.SmoothBoost3D && typeof window.SmoothBoost3D.setProfile === 'function') {
        window.SmoothBoost3D.setProfile(key);
      }
    }

    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-profile-btn');
        selectProfile(key);
      });
    });

    // Initial state
    selectProfile('auto');
  }

  // --- Local Scroll Illustration ---
  function initScrollBenchmark() {
    const unoptBox = document.getElementById('bench-unoptimized');
    const optBox = document.getElementById('bench-optimized');
    const unoptFps = document.getElementById('bench-unopt-fps');
    const optFps = document.getElementById('bench-opt-fps');
    const unoptTime = document.getElementById('bench-unopt-time');
    const optTime = document.getElementById('bench-opt-time');

    if (!unoptBox || !optBox) return;

    // The left pane adds a fixed synthetic main-thread pause for illustration.
    unoptBox.addEventListener('scroll', () => {
      const start = performance.now();
      while (performance.now() - start < 14) {}
      const elapsed = performance.now() - start;
      if (unoptFps) unoptFps.textContent = 'Deliberate pause';
      if (unoptTime) unoptTime.textContent = `${elapsed.toFixed(1)} ms synthetic task`;
    });

    // The right pane keeps its handler light; it is not a device benchmark.
    optBox.addEventListener('scroll', () => {
      if (optFps) optFps.textContent = 'No synthetic pause';
      if (optTime) optTime.textContent = 'Native scroll';
    });
  }

  // --- Platform Installation Tabs ---
  function initPlatformTabs() {
    const tabs = document.querySelectorAll('[data-platform-tab]');
    const panels = document.querySelectorAll('[data-platform-panel]');

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        window.__smoothboostPlatformUserSelected = true;
        const target = tab.getAttribute('data-platform-tab');

        tabs.forEach((t) => {
          const isMatch = t === tab;
          t.classList.toggle('is-active', isMatch);
          t.setAttribute('aria-selected', String(isMatch));
        });

        panels.forEach((p) => {
          const isMatch = p.getAttribute('data-platform-panel') === target;
          p.hidden = !isMatch;
          p.classList.toggle('is-active', isMatch);
        });
      });
    });
  }

  // --- Archetype Inspector Tabs ---
  function initArchetypeTabs() {
    const tabs = document.querySelectorAll('[data-archetype-tab]');
    const panels = document.querySelectorAll('[data-archetype-panel]');

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const target = tab.getAttribute('data-archetype-tab');

        tabs.forEach((t) => {
          const isMatch = t === tab;
          t.classList.toggle('is-active', isMatch);
          t.setAttribute('aria-selected', String(isMatch));
        });

        panels.forEach((p) => {
          const isMatch = p.getAttribute('data-archetype-panel') === target;
          p.hidden = !isMatch;
          p.classList.toggle('is-active', isMatch);
        });
      });
    });
  }

  // --- FAQ Accordion ---
  function initFaqAccordion() {
    const items = document.querySelectorAll('.faq-item');

    items.forEach((item) => {
      const btn = item.querySelector('.faq-question');
      const answer = item.querySelector('.faq-answer');

      if (!btn || !answer) return;

      btn.addEventListener('click', () => {
        const isExpanded = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!isExpanded));
        answer.hidden = isExpanded;
        item.classList.toggle('is-open', !isExpanded);
      });
    });
  }

  // --- Header Sticky Glass & Mobile Menu ---
  function initHeader() {
    const header = document.querySelector('.site-header');
    const menuToggle = document.getElementById('mobile-menu-toggle');
    const navMenu = document.getElementById('nav-menu');

    window.addEventListener('scroll', () => {
      if (!header) return;
      if (window.scrollY > 20) {
        header.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
      }
    }, { passive: true });

    if (menuToggle && navMenu) {
      menuToggle.addEventListener('click', () => {
        const isOpen = navMenu.classList.toggle('is-open');
        menuToggle.setAttribute('aria-expanded', String(isOpen));
      });

      // Close menu on link click
      navMenu.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => {
          navMenu.classList.remove('is-open');
          menuToggle.setAttribute('aria-expanded', 'false');
        });
      });

      // Close on Escape key
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && navMenu.classList.contains('is-open')) {
          navMenu.classList.remove('is-open');
          menuToggle.setAttribute('aria-expanded', 'false');
        }
      });
    }
  }

  // --- Top Scroll Progress Bar ---
  function initProgressBar() {
    const bar = document.querySelector('.scroll-progress-bar');
    if (!bar) return;

    window.addEventListener('scroll', () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
      bar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
    }, { passive: true });
  }

  // --- BitChord Spotlight Hover Effect on Cards ---
  function initSpotlightHover() {
    const cards = document.querySelectorAll('.spotlight-card');
    cards.forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--spot-x', `${x}px`);
        card.style.setProperty('--spot-y', `${y}px`);
      }, { passive: true });
    });
  }

  // --- Copy Snippets ---
  function initCopyButtons() {
    document.querySelectorAll('[data-copy-target]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const targetSelector = btn.getAttribute('data-copy-target');
        const targetEl = document.querySelector(targetSelector);
        if (!targetEl) return;

        const text = targetEl.textContent.trim();
        try {
          await navigator.clipboard.writeText(text);
          const original = btn.innerHTML;
          btn.classList.add('is-copied');
          btn.textContent = 'Copied!';
          setTimeout(() => {
            btn.innerHTML = original;
            btn.classList.remove('is-copied');
          }, 2000);
        } catch (_e) {}
      });
    });
  }

  // --- Initialize All Components ---
  function init() {
    initProfileShowcase();
    initScrollBenchmark();
    initPlatformTabs();
    initArchetypeTabs();
    initFaqAccordion();
    initHeader();
    initProgressBar();
    initSpotlightHover();
    initCopyButtons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
