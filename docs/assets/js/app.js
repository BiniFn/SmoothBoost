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
      description: 'Idle heuristics classify page structure to protect interactive editors while accelerating general web browsing.',
      metrics: {
        passive: 42,
        videos: 4,
        blurs: 18,
        canvas: 'Active (Exempts Docs/Figma)',
        fonts: 8,
        powerSavings: 'Adaptive'
      },
      rules: [
        { label: 'Compositor scroll listeners (passive)', active: true },
        { label: 'Offscreen canvas draw-skipping', active: true, note: 'Bypassed on Figma/Docs' },
        { label: 'Background ambient video pausing', active: true },
        { label: 'Backdrop blur opacity bypass', active: true },
        { label: 'Offscreen CSS animation pausing', active: true },
        { label: 'Offscreen DOM content-visibility', active: false },
        { label: 'CSSOM font-display swap', active: true }
      ]
    },
    ultra: {
      name: 'Turbo (Maximum)',
      badge: 'MAX',
      badgeClass: 'badge-ultra',
      description: 'Maximum acceleration profile. Enforces full offscreen canvas draw-skipping, video pausing, and blur bypass.',
      metrics: {
        passive: 68,
        videos: 8,
        blurs: 32,
        canvas: 'Full Acceleration',
        fonts: 14,
        powerSavings: 'High'
      },
      rules: [
        { label: 'Compositor scroll listeners (passive)', active: true },
        { label: 'Offscreen canvas draw-skipping', active: true },
        { label: 'Background ambient video pausing', active: true },
        { label: 'Backdrop blur opacity bypass', active: true },
        { label: 'Offscreen CSS animation pausing', active: true },
        { label: 'Offscreen DOM content-visibility', active: false },
        { label: 'CSSOM font-display swap', active: true }
      ]
    },
    balanced: {
      name: 'Balanced',
      badge: 'BAL',
      badgeClass: 'badge-balanced',
      description: 'Conservative acceleration. Leaves page styling and media behavior untouched while keeping scrolling light.',
      metrics: {
        passive: 16,
        videos: 0,
        blurs: 0,
        canvas: 'Standard',
        fonts: 0,
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
      description: 'Cuts CPU and GPU draw on mobile devices and laptops on battery power. Applies offscreen DOM content-visibility.',
      metrics: {
        passive: 54,
        videos: 6,
        blurs: 22,
        canvas: 'Throttled (30 FPS Cap)',
        fonts: 10,
        powerSavings: 'Extreme'
      },
      rules: [
        { label: 'Compositor scroll listeners (passive)', active: true },
        { label: 'Offscreen canvas draw-skipping', active: true },
        { label: 'Background ambient video pausing', active: true },
        { label: 'Backdrop blur opacity bypass', active: true },
        { label: 'Offscreen CSS animation pausing', active: true },
        { label: 'Offscreen DOM content-visibility', active: true, note: 'Frees offscreen DOM layout' },
        { label: 'CSSOM font-display swap', active: true }
      ]
    },
    custom: {
      name: 'Custom Profile',
      badge: 'CUSTOM',
      badgeClass: 'badge-custom',
      description: 'Independent tuning drawer allowing manual control over every single optimization flag and frame cap.',
      metrics: {
        passive: 35,
        videos: 3,
        blurs: 15,
        canvas: 'Configurable',
        fonts: 6,
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
      if (metricPassiveEl) metricPassiveEl.textContent = `${data.metrics.passive} listeners`;
      if (metricVideosEl) metricVideosEl.textContent = `${data.metrics.videos} paused`;
      if (metricBlursEl) metricBlursEl.textContent = `${data.metrics.blurs} bypassed`;
      if (metricCanvasEl) metricCanvasEl.textContent = data.metrics.canvas;
      if (metricFontsEl) metricFontsEl.textContent = `${data.metrics.fonts} swapped`;

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

  // --- Scroll Benchmark & Compositor Simulator ---
  function initScrollBenchmark() {
    const unoptBox = document.getElementById('bench-unoptimized');
    const optBox = document.getElementById('bench-optimized');
    const unoptFps = document.getElementById('bench-unopt-fps');
    const optFps = document.getElementById('bench-opt-fps');
    const unoptTime = document.getElementById('bench-unopt-time');
    const optTime = document.getElementById('bench-opt-time');

    if (!unoptBox || !optBox) return;

    // Simulate unoptimized scroll jank on the left pane
    let lastUnoptScroll = Date.now();
    unoptBox.addEventListener('scroll', () => {
      const now = Date.now();
      const delta = now - lastUnoptScroll;
      lastUnoptScroll = now;

      // Small simulated main-thread calculation blocking UI
      const start = performance.now();
      while (performance.now() - start < 14) {} // 14ms block
      const elapsed = Math.round(performance.now() - start);

      const fps = Math.max(24, Math.min(38, Math.round(1000 / (delta + 14))));
      if (unoptFps) unoptFps.textContent = `${fps} FPS`;
      if (unoptTime) unoptTime.textContent = `${14 + Math.round(Math.random() * 8)}ms / frame`;
    }, { passive: false }); // Non-passive listener blocks compositor

    // Optimized scroll uses native hardware compositor with passive listener
    let optFrames = 0;
    let lastOptTime = performance.now();
    optBox.addEventListener('scroll', () => {
      optFrames++;
      const now = performance.now();
      if (now - lastOptTime >= 300) {
        if (optFps) optFps.textContent = '60 FPS (Hardware Composited)';
        if (optTime) optTime.textContent = '4.2ms / frame';
        lastOptTime = now;
      }
    }, { passive: true }); // True passive listener!
  }

  // --- Platform Installation Tabs ---
  function initPlatformTabs() {
    const tabs = document.querySelectorAll('[data-platform-tab]');
    const panels = document.querySelectorAll('[data-platform-panel]');

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
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
