// ==UserScript==
// @name         SmoothBoost: Web Performance Optimizer
// @namespace    https://github.com/BiniFn/SmoothBoost
// @version      2.4.0
// @description  Universal performance optimizer with Scroll Boost, Smart Resource Loading, Memory Guard, and Dynamic FPS profiles.
// @author       BiniFn
// @match        *://*/*
// @run-at       document-start
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @downloadURL  https://raw.githubusercontent.com/BiniFn/SmoothBoost/main/dist/SmoothBoost.user.js
// @updateURL    https://raw.githubusercontent.com/BiniFn/SmoothBoost/main/dist/SmoothBoost.user.js
// @homepageURL  https://github.com/BiniFn/SmoothBoost
// @supportURL   https://github.com/BiniFn/SmoothBoost/issues
// ==/UserScript==

(function smoothBoostUserscript() {
  'use strict';

  // ---------------------------------------------------------------------------
  // 1. Constants & Default Settings
  // ---------------------------------------------------------------------------
  const SCRIPT_VERSION = '2.4.0';
  const STORAGE_KEY = 'smoothBoostConfig';
  const CHANNEL_ID = `__sb_comm_${Math.random().toString(36).slice(2)}__`;

  const DEFAULT_SETTINGS = {
    settingsVersion: 5,
    globalEnabled: true,
    mode: 'auto',
    customSettings: {
      killAnimations: false,
      killTransitions: false,
      killBlurFilters: true,
      killScrollHijack: false,
      pauseBackgroundMedia: true,
      throttleCanvasFps: false,
      contentVisibility: false,
      pauseOffscreenAnimations: true,
      pauseOffscreenCanvas: true,
      passiveScroll: true,
      asyncImageDecoding: true,
      fontDisplaySwap: true,
      fpsLimit: 60,
      scrollBoost: true,
      smartResourceLoading: true,
      memoryGuard: true,
      spaOptimization: true,
      autoRecovery: true
    },
    siteOverrides: {}
  };

  const PRESET_CONFIGS = {
    auto: {
      killAnimations: false,
      killTransitions: false,
      killBlurFilters: true,
      killScrollHijack: false,
      pauseBackgroundMedia: true,
      throttleCanvasFps: false,
      pauseOffscreenAnimations: true,
      contentVisibility: false,
      pauseOffscreenCanvas: true,
      passiveScroll: true,
      asyncImageDecoding: true,
      fontDisplaySwap: true,
      scrollBoost: true,
      smartResourceLoading: true,
      memoryGuard: true,
      spaOptimization: true,
      autoRecovery: true,
      fpsLimit: 60
    },
    ultra: {
      killAnimations: false,
      killTransitions: false,
      killBlurFilters: true,
      killScrollHijack: false,
      pauseBackgroundMedia: true,
      throttleCanvasFps: false,
      pauseOffscreenAnimations: true,
      contentVisibility: false,
      pauseOffscreenCanvas: true,
      passiveScroll: true,
      asyncImageDecoding: true,
      fontDisplaySwap: true,
      scrollBoost: true,
      smartResourceLoading: true,
      memoryGuard: true,
      spaOptimization: true,
      autoRecovery: true,
      fpsLimit: 60
    },
    balanced: {
      killAnimations: false,
      killTransitions: false,
      killBlurFilters: false,
      killScrollHijack: false,
      pauseBackgroundMedia: false,
      throttleCanvasFps: false,
      pauseOffscreenAnimations: false,
      contentVisibility: false,
      pauseOffscreenCanvas: false,
      passiveScroll: false,
      asyncImageDecoding: false,
      fontDisplaySwap: false,
      scrollBoost: false,
      smartResourceLoading: false,
      memoryGuard: false,
      spaOptimization: true,
      autoRecovery: true,
      fpsLimit: 60
    },
    battery: {
      killAnimations: false,
      killTransitions: false,
      killBlurFilters: true,
      killScrollHijack: false,
      pauseBackgroundMedia: true,
      throttleCanvasFps: true,
      pauseOffscreenAnimations: true,
      contentVisibility: true,
      pauseOffscreenCanvas: true,
      passiveScroll: true,
      asyncImageDecoding: true,
      fontDisplaySwap: true,
      scrollBoost: true,
      smartResourceLoading: true,
      memoryGuard: true,
      spaOptimization: true,
      autoRecovery: true,
      fpsLimit: 30
    }
  };

  // ---------------------------------------------------------------------------
  // 2. Storage Helpers
  // ---------------------------------------------------------------------------
  function loadStoredConfig() {
    try {
      if (typeof GM_getValue === 'function') {
        const val = GM_getValue(STORAGE_KEY, null);
        if (val) return typeof val === 'string' ? JSON.parse(val) : val;
      }
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_e) {}
    return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  }

  function saveStoredConfig(cfg) {
    try {
      if (typeof GM_setValue === 'function') {
        GM_setValue(STORAGE_KEY, cfg);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    } catch (_e) {}
  }

  let userConfig = loadStoredConfig();
  const hostname = window.location.hostname.toLowerCase();

  function getEffectiveSettings() {
    const site = userConfig.siteOverrides?.[hostname] || {};
    const enabled = site.enabled !== undefined ? site.enabled : userConfig.globalEnabled !== false;
    const mode = site.mode || userConfig.mode || 'auto';
    if (!enabled) return { enabled: false, mode: 'off' };

    const custom = {
      ...DEFAULT_SETTINGS.customSettings,
      ...(userConfig.customSettings || {}),
      ...(site.customSettings || {})
    };

    if (PRESET_CONFIGS[mode]) {
      return {
        enabled: true,
        mode,
        ...PRESET_CONFIGS[mode],
        fpsLimit: custom.fpsLimit || PRESET_CONFIGS[mode].fpsLimit
      };
    }

    return {
      enabled: true,
      mode: 'custom',
      ...custom,
      fpsLimit: custom.fpsLimit || 30
    };
  }

  let activeSettings = getEffectiveSettings();

  // ---------------------------------------------------------------------------
  // 3. Page Hook (Runs in MAIN world to wrap APIs)
  // ---------------------------------------------------------------------------
  const hookSource = `(function() {
    const channel = "${CHANNEL_ID}";
    let targetFps = ${activeSettings.fpsLimit || 60};
    let optimizationsEnabled = ${activeSettings.enabled};
    let passiveScrollEnabled = ${activeSettings.enabled && activeSettings.passiveScroll};
    let scrollBoostActive = false;
    let throttling = false;
    let spaNavCount = 0;
    let passiveIntercepted = 0;
    let canvasSkips = 0;

    // Passive Scroll Guard
    const TargetProto = typeof EventTarget !== 'undefined' ? EventTarget.prototype : null;
    if (TargetProto && typeof TargetProto.addEventListener === 'function') {
      const nativeAdd = TargetProto.addEventListener;
      TargetProto.addEventListener = function(type, listener, options) {
        if (passiveScrollEnabled && typeof listener === 'function' &&
            (type === 'wheel' || type === 'mousewheel' || type === 'touchstart' || type === 'touchmove')) {
          const isMap = typeof this.closest === 'function' && this.closest('.leaflet-container, .mapboxgl-map, canvas, [role="slider"]');
          if (!isMap) {
            passiveIntercepted += 1;
            let opts = typeof options === 'boolean' ? { capture: options, passive: true } : (options && typeof options === 'object' ? { ...options, passive: true } : { passive: true });
            return nativeAdd.call(this, type, listener, opts);
          }
        }
        return nativeAdd.call(this, type, listener, options);
      };
    }

    // Canvas Draw Guard
    function shouldSkipCanvas(ctx) {
      if (!optimizationsEnabled && !scrollBoostActive) return false;
      const c = ctx?.canvas;
      if (!c || c.isConnected === false) return false;
      if (scrollBoostActive) return true;
      return c.getAttribute('data-smoothboost-offscreen-canvas') === 'true';
    }

    if (typeof CanvasRenderingContext2D !== 'undefined') {
      const origClear = CanvasRenderingContext2D.prototype.clearRect;
      CanvasRenderingContext2D.prototype.clearRect = function(...args) {
        if (shouldSkipCanvas(this)) { canvasSkips++; return; }
        return origClear.apply(this, args);
      };
      const origDraw = CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage = function(...args) {
        if (shouldSkipCanvas(this)) { canvasSkips++; return; }
        return origDraw.apply(this, args);
      };
    }

    // Dynamic FPS limiter
    const nativeRAF = window.requestAnimationFrame;
    let lastTime = 0;
    window.requestAnimationFrame = function(callback) {
      if (!throttling) return nativeRAF.call(window, callback);
      const interval = 1000 / (targetFps || 60);
      return nativeRAF.call(window, function schedule(now) {
        const elapsed = now - lastTime;
        if (elapsed >= interval) {
          lastTime = now - (elapsed % interval);
          callback(now);
        } else {
          nativeRAF.call(window, schedule);
        }
      });
    };

    // SPA Navigation Hooks
    if (window.history && typeof window.history.pushState === 'function') {
      const origPush = window.history.pushState;
      const origReplace = window.history.replaceState;
      function notify(type) {
        spaNavCount++;
        try { window.dispatchEvent(new CustomEvent(channel, { detail: { action: 'spa-nav', type, url: location.href } })); } catch(_e) {}
      }
      window.history.pushState = function(...args) {
        const ret = origPush.apply(this, args);
        notify('pushState');
        return ret;
      };
      window.history.replaceState = function(...args) {
        const ret = origReplace.apply(this, args);
        notify('replaceState');
        return ret;
      };
    }

    window.addEventListener(channel, (e) => {
      const act = e.detail?.action;
      if (act === 'optimizations-on') optimizationsEnabled = true;
      else if (act === 'optimizations-off') optimizationsEnabled = false;
      else if (act === 'passive-scroll-on') passiveScrollEnabled = true;
      else if (act === 'passive-scroll-off') passiveScrollEnabled = false;
      else if (act === 'scroll-boost-active') scrollBoostActive = true;
      else if (act === 'scroll-boost-idle') scrollBoostActive = false;
      else if (act === 'set-fps') { targetFps = e.detail?.fps || 60; }
      else if (act === 'throttle-on') throttling = true;
      else if (act === 'throttle-off') throttling = false;
      else if (act === 'get-metrics') {
        window.dispatchEvent(new CustomEvent(channel, {
          detail: {
            action: 'metrics-reply',
            passiveListeners: passiveIntercepted,
            canvasSkips,
            scrollBoostActive,
            spaNavCount,
            targetFps
          }
        }));
      }
    });
  })();`;

  const hookScript = document.createElement('script');
  hookScript.textContent = hookSource;
  (document.head || document.documentElement).appendChild(hookScript);
  hookScript.remove();

  // ---------------------------------------------------------------------------
  // 4. Content Optimization Engine
  // ---------------------------------------------------------------------------
  const STYLE_ID = 'smoothboost-userscript-style';
  let smartResourceObserver = null;
  let smartResourcesCount = 0;
  let isScrolling = false;
  let scrollTimer = null;
  let memoryPressure = 'normal';
  let memoryGuardActive = false;
  let autoRecoveryTriggered = false;
  let autoRecoverySafeMode = false;
  let errorTimestamps = [];
  let spaCount = 0;
  let metricsSnapshot = { passiveListeners: 0, canvasSkips: 0, pausedVideos: 0, blursBypassed: 0 };

  function buildStylesheet(cfg) {
    if (!cfg.enabled || autoRecoverySafeMode) return '';
    let css = '/* SmoothBoost Userscript Styles */\n';
    if (cfg.killScrollHijack) css += 'html, body { scroll-behavior: auto !important; }\n';
    if (cfg.killAnimations) css += '* , *::before, *::after { animation-duration: 0.0001s !important; animation-play-state: running !important; }\n';
    if (cfg.killTransitions) css += '* , *::before, *::after { transition-duration: 0.0001s !important; }\n';
    if (cfg.killBlurFilters) css += '[data-smoothboost-blur="true"], .backdrop-blur, [class*="backdrop-blur-"] { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }\n';
    if (cfg.pauseOffscreenAnimations) css += '[data-smoothboost-offscreen="true"] { animation-play-state: paused !important; }\n';
    if (cfg.pauseOffscreenCanvas) css += 'canvas[data-smoothboost-offscreen-canvas="true"] { visibility: hidden !important; }\n';
    if (cfg.contentVisibility) css += '[data-smoothboost-cv="true"] { content-visibility: auto !important; contain-intrinsic-size: auto 480px !important; }\n';
    if (cfg.scrollBoost) {
      css += '[data-smoothboost-scrolling="true"] * { pointer-events: none !important; animation-play-state: paused !important; box-shadow: none !important; text-shadow: none !important; }\n';
      css += '[data-smoothboost-scrolling="true"] html, [data-smoothboost-scrolling="true"] body, [data-smoothboost-scrolling="true"] [data-smoothboost-scroll-container] { pointer-events: auto !important; }\n';
    }
    return css;
  }

  function applyStyles(css) {
    let el = document.getElementById(STYLE_ID);
    if (!css) { el?.remove(); return; }
    if (!el) {
      el = document.createElement('style');
      el.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(el);
    }
    el.textContent = css;
  }

  function dispatchHook(action, detail = {}) {
    window.dispatchEvent(new CustomEvent(CHANNEL_ID, { detail: { action, ...detail } }));
  }

  // Scroll Boost
  function setupScrollBoost() {
    const onScroll = () => {
      if (!activeSettings.enabled || !activeSettings.scrollBoost) return;
      if (!isScrolling) {
        isScrolling = true;
        document.documentElement.setAttribute('data-smoothboost-scrolling', 'true');
        dispatchHook('scroll-boost-active');
      }
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        isScrolling = false;
        document.documentElement.removeAttribute('data-smoothboost-scrolling');
        dispatchHook('scroll-boost-idle');
      }, 160);
    };
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    window.addEventListener('wheel', onScroll, { passive: true, capture: true });
    window.addEventListener('touchmove', onScroll, { passive: true, capture: true });
  }

  // Smart Resource Loading
  const EMBED_PATTERNS = [
    /youtube(-nocookie)?\.com\/embed/i,
    /player\.vimeo\.com/i,
    /platform\.twitter\.com/i,
    /instagram\.com\/embed/i,
    /open\.spotify\.com\/embed/i,
    /w\.soundcloud\.com\/player/i,
    /disqus\.com\/embed/i
  ];

  function optimizeResources(root = document) {
    if (!activeSettings.enabled) return;
    if (activeSettings.asyncImageDecoding) {
      root.querySelectorAll?.('img:not([data-sb-img])').forEach((img) => {
        img.setAttribute('data-sb-img', '1');
        if (!img.decoding || img.decoding === 'auto') img.decoding = 'async';
        if (img.loading !== 'eager') img.loading = 'lazy';
      });
    }

    if (activeSettings.smartResourceLoading) {
      if (!smartResourceObserver && typeof IntersectionObserver === 'function') {
        smartResourceObserver = new IntersectionObserver((entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const target = entry.target;
            const realSrc = target.getAttribute('data-sb-src');
            if (realSrc) {
              target.src = realSrc;
              target.removeAttribute('data-sb-src');
            }
            smartResourceObserver.unobserve(target);
          }
        }, { rootMargin: '400px 0px' });
      }

      root.querySelectorAll?.('iframe:not([data-sb-frame]), embed, object').forEach((frame) => {
        frame.setAttribute('data-sb-frame', '1');
        frame.loading = 'lazy';
        const src = frame.getAttribute('src');
        if (src && EMBED_PATTERNS.some((pat) => pat.test(src))) {
          frame.setAttribute('data-sb-src', src);
          frame.src = 'about:blank';
          smartResourceObserver?.observe(frame);
          smartResourcesCount++;
        }
      });
    }
  }

  // Offscreen Canvas & Animation tagging
  let offscreenObserver = null;
  function setupOffscreenObserver() {
    if (offscreenObserver || typeof IntersectionObserver !== 'function') return;
    offscreenObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const el = entry.target;
        if (entry.isIntersecting) {
          el.removeAttribute('data-smoothboost-offscreen-canvas');
          el.removeAttribute('data-smoothboost-offscreen');
        } else {
          if (el.tagName === 'CANVAS') el.setAttribute('data-smoothboost-offscreen-canvas', 'true');
          else el.setAttribute('data-smoothboost-offscreen', 'true');
        }
      }
    }, { rootMargin: '200px 0px' });

    document.querySelectorAll('canvas').forEach((c) => offscreenObserver.observe(c));
  }

  // Memory Guard
  function runMemoryGuard() {
    if (!activeSettings.enabled || !activeSettings.memoryGuard) return;
    let high = false;
    const mem = window.performance?.memory;
    if (mem && mem.usedJSHeapSize && mem.jsHeapSizeLimit) {
      if (mem.usedJSHeapSize / mem.jsHeapSizeLimit > 0.75) high = true;
    }
    if ((document.querySelectorAll('*').length || 0) > 3500) high = true;

    if (high) {
      memoryGuardActive = true;
      memoryPressure = 'high';
      document.querySelectorAll('video').forEach((v) => { if (v.paused) v.preload = 'none'; });
      if (typeof window.gc === 'function') { try { window.gc(); } catch(_e) {} }
    } else {
      memoryPressure = 'normal';
    }
  }

  // Error Watchdog / Automatic Recovery
  function setupWatchdog() {
    const handleErr = () => {
      if (!activeSettings.enabled || !activeSettings.autoRecovery || autoRecoverySafeMode) return;
      const now = Date.now();
      errorTimestamps.push(now);
      while (errorTimestamps.length && now - errorTimestamps[0] > 3000) errorTimestamps.shift();
      if (errorTimestamps.length >= 4) {
        autoRecoveryTriggered = true;
        autoRecoverySafeMode = true;
        applyStyles('');
        dispatchHook('optimizations-off');
        showUserscriptNotice('SmoothBoost: Safe Mode activated due to detected page errors.');
      }
    };
    window.addEventListener('error', handleErr);
    window.addEventListener('unhandledrejection', handleErr);
  }

  // SPA Navigation listener
  window.addEventListener(CHANNEL_ID, (e) => {
    if (e.detail?.action === 'spa-nav') {
      spaCount++;
      optimizeResources(document);
    } else if (e.detail?.action === 'metrics-reply') {
      metricsSnapshot.passiveListeners = e.detail.passiveListeners || 0;
      metricsSnapshot.canvasSkips = e.detail.canvasSkips || 0;
    }
  });
  window.addEventListener('popstate', () => { spaCount++; optimizeResources(document); }, { passive: true });
  window.addEventListener('hashchange', () => { spaCount++; optimizeResources(document); }, { passive: true });

  function syncEngine() {
    activeSettings = getEffectiveSettings();
    applyStyles(buildStylesheet(activeSettings));
    dispatchHook(activeSettings.enabled ? 'optimizations-on' : 'optimizations-off');
    dispatchHook(activeSettings.enabled && activeSettings.passiveScroll ? 'passive-scroll-on' : 'passive-scroll-off');
    dispatchHook('set-fps', { fps: activeSettings.fpsLimit || 60 });
    dispatchHook(activeSettings.enabled && activeSettings.mode === 'battery' ? 'throttle-on' : 'throttle-off');
    optimizeResources(document);
  }

  // ---------------------------------------------------------------------------
  // 5. Interactive Floating Settings Modal (Shadow DOM)
  // ---------------------------------------------------------------------------
  let modalContainer = null;
  let shadowRoot = null;

  function toggleSettingsModal() {
    if (modalContainer) {
      modalContainer.remove();
      modalContainer = null;
      shadowRoot = null;
      return;
    }

    modalContainer = document.createElement('div');
    modalContainer.id = 'smoothboost-userscript-host';
    shadowRoot = modalContainer.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      :host {
        all: initial;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      .backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.65);
        backdrop-filter: blur(4px);
        z-index: 2147483647;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .card {
        background: #0f172a;
        color: #f8fafc;
        width: 380px;
        max-width: 90vw;
        max-height: 85vh;
        overflow-y: auto;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 20px 40px rgba(0,0,0,0.6);
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        padding-bottom: 8px;
      }
      .title-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .title {
        font-size: 15px;
        font-weight: 700;
        color: #fff;
      }
      .badge {
        font-size: 10px;
        background: #10b981;
        color: #000;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 10px;
      }
      .close-btn {
        background: transparent;
        border: none;
        color: #94a3b8;
        font-size: 18px;
        cursor: pointer;
      }
      .domain-bar {
        font-size: 11px;
        color: #94a3b8;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .btn-group {
        display: flex;
        gap: 4px;
      }
      .btn {
        flex: 1;
        background: #1e293b;
        color: #94a3b8;
        border: 1px solid rgba(255,255,255,0.06);
        padding: 6px 2px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        text-align: center;
      }
      .btn.active {
        background: rgba(16, 185, 129, 0.2);
        border-color: #10b981;
        color: #10b981;
      }
      .label {
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.5px;
        color: #64748b;
        margin-top: 4px;
      }
      .toggle-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 0;
        font-size: 12px;
      }
      .toggle-sub {
        font-size: 10px;
        color: #64748b;
      }
      .switch {
        position: relative;
        display: inline-block;
        width: 34px;
        height: 18px;
      }
      .switch input { opacity: 0; width: 0; height: 0; }
      .slider {
        position: absolute;
        cursor: pointer;
        inset: 0;
        background-color: #334155;
        border-radius: 18px;
        transition: .2s;
      }
      .slider:before {
        position: absolute;
        content: "";
        height: 14px;
        width: 14px;
        left: 2px;
        bottom: 2px;
        background-color: white;
        border-radius: 50%;
        transition: .2s;
      }
      input:checked + .slider { background-color: #10b981; }
      input:checked + .slider:before { transform: translateX(16px); }
      .metrics {
        background: #1e293b;
        border-radius: 6px;
        padding: 8px;
        font-size: 11px;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .pill {
        background: rgba(16, 185, 129, 0.15);
        color: #34d399;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 10px;
      }
      .alert {
        background: rgba(245, 158, 11, 0.2);
        border: 1px solid #f59e0b;
        color: #fbbf24;
        padding: 6px;
        border-radius: 6px;
        font-size: 11px;
      }
      .footer-note {
        font-size: 10px;
        color: #64748b;
        text-align: center;
        margin-top: 6px;
      }
    `;

    const card = document.createElement('div');
    card.className = 'backdrop';
    card.innerHTML = `
      <div class="card" role="dialog" aria-modal="true">
        <div class="header">
          <div class="title-row">
            <span class="title">SmoothBoost</span>
            <span class="badge">v${SCRIPT_VERSION} Userscript</span>
          </div>
          <button class="close-btn" id="sb-close">&times;</button>
        </div>

        <div class="domain-bar">
          <span>${hostname}</span>
          <label class="switch">
            <input type="checkbox" id="sb-domain-toggle" ${activeSettings.enabled ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
        </div>

        ${autoRecoverySafeMode ? '<div class="alert">🛡️ Safe Mode Active (Errors Recovered) <button class="btn" id="sb-reset-recovery" style="margin-left:8px;padding:2px 6px;display:inline;">Reset</button></div>' : ''}

        <div class="label">PERFORMANCE PROFILE</div>
        <div class="btn-group" id="sb-mode-group">
          <button class="btn ${activeSettings.mode === 'auto' ? 'active' : ''}" data-mode="auto">Auto</button>
          <button class="btn ${activeSettings.mode === 'ultra' ? 'active' : ''}" data-mode="ultra">Max</button>
          <button class="btn ${activeSettings.mode === 'balanced' ? 'active' : ''}" data-mode="balanced">Balanced</button>
          <button class="btn ${activeSettings.mode === 'battery' ? 'active' : ''}" data-mode="battery">Battery</button>
          <button class="btn ${activeSettings.mode === 'custom' ? 'active' : ''}" data-mode="custom">Custom</button>
        </div>

        <div class="label">FPS TARGET</div>
        <div class="btn-group" id="sb-fps-group">
          <button class="btn ${activeSettings.fpsLimit === 30 ? 'active' : ''}" data-fps="30">30</button>
          <button class="btn ${activeSettings.fpsLimit === 60 ? 'active' : ''}" data-fps="60">60</button>
          <button class="btn ${activeSettings.fpsLimit === 90 ? 'active' : ''}" data-fps="90">90</button>
          <button class="btn ${activeSettings.fpsLimit === 120 ? 'active' : ''}" data-fps="120">120</button>
        </div>

        <div class="label">BOOST ENGINE FEATURES</div>
        <div class="toggle-row">
          <div><div>Scroll Boost</div><div class="toggle-sub">Smooth 60/120 FPS scrolling</div></div>
          <label class="switch"><input type="checkbox" id="sb-scrollboost" ${activeSettings.scrollBoost ? 'checked' : ''}><span class="slider"></span></label>
        </div>
        <div class="toggle-row">
          <div><div>Smart Resource Loading</div><div class="toggle-sub">Defer offscreen embeds</div></div>
          <label class="switch"><input type="checkbox" id="sb-smartloading" ${activeSettings.smartResourceLoading ? 'checked' : ''}><span class="slider"></span></label>
        </div>
        <div class="toggle-row">
          <div><div>Memory Guard</div><div class="toggle-sub">Auto-trim background memory</div></div>
          <label class="switch"><input type="checkbox" id="sb-memguard" ${activeSettings.memoryGuard ? 'checked' : ''}><span class="slider"></span></label>
        </div>
        <div class="toggle-row">
          <div><div>SPA Optimization</div><div class="toggle-sub">Dynamic route transitions</div></div>
          <label class="switch"><input type="checkbox" id="sb-spa" ${activeSettings.spaOptimization ? 'checked' : ''}><span class="slider"></span></label>
        </div>
        <div class="toggle-row">
          <div><div>Reduce Backdrop Blur</div><div class="toggle-sub">Eliminate GPU fill bottleneck</div></div>
          <label class="switch"><input type="checkbox" id="sb-blur" ${activeSettings.killBlurFilters ? 'checked' : ''}><span class="slider"></span></label>
        </div>

        <div class="label">DIAGNOSTICS & METRICS</div>
        <div class="metrics">
          <span class="pill">⚡ FPS: ${activeSettings.fpsLimit}</span>
          <span class="pill">📦 Embeds deferred: ${smartResourcesCount}</span>
          <span class="pill">🛡️ Memory: ${memoryPressure}</span>
          <span class="pill">🔄 Routes: ${spaCount}</span>
        </div>

        <div class="footer-note">
          ℹ️ Tab discarding is extension-only. All rendering boosts are fully active. Press Alt+Shift+S to toggle this menu.
        </div>
      </div>
    `;

    shadowRoot.appendChild(style);
    shadowRoot.appendChild(card);
    document.body.appendChild(modalContainer);

    // Event listeners inside ShadowRoot
    card.addEventListener('click', (e) => {
      if (e.target === card) toggleSettingsModal();
    });
    shadowRoot.getElementById('sb-close').addEventListener('click', toggleSettingsModal);

    shadowRoot.getElementById('sb-domain-toggle').addEventListener('change', (e) => {
      userConfig.siteOverrides = userConfig.siteOverrides || {};
      userConfig.siteOverrides[hostname] = userConfig.siteOverrides[hostname] || {};
      userConfig.siteOverrides[hostname].enabled = e.target.checked;
      saveStoredConfig(userConfig);
      syncEngine();
    });

    shadowRoot.getElementById('sb-mode-group').addEventListener('click', (e) => {
      const mode = e.target.getAttribute('data-mode');
      if (!mode) return;
      userConfig.mode = mode;
      saveStoredConfig(userConfig);
      syncEngine();
      toggleSettingsModal();
      toggleSettingsModal();
    });

    shadowRoot.getElementById('sb-fps-group').addEventListener('click', (e) => {
      const fps = Number(e.target.getAttribute('data-fps'));
      if (!fps) return;
      userConfig.customSettings = userConfig.customSettings || {};
      userConfig.customSettings.fpsLimit = fps;
      saveStoredConfig(userConfig);
      syncEngine();
      toggleSettingsModal();
      toggleSettingsModal();
    });

    const bindToggle = (id, key) => {
      shadowRoot.getElementById(id)?.addEventListener('change', (e) => {
        userConfig.mode = 'custom';
        userConfig.customSettings = userConfig.customSettings || {};
        userConfig.customSettings[key] = e.target.checked;
        saveStoredConfig(userConfig);
        syncEngine();
      });
    };

    bindToggle('sb-scrollboost', 'scrollBoost');
    bindToggle('sb-smartloading', 'smartResourceLoading');
    bindToggle('sb-memguard', 'memoryGuard');
    bindToggle('sb-spa', 'spaOptimization');
    bindToggle('sb-blur', 'killBlurFilters');

    shadowRoot.getElementById('sb-reset-recovery')?.addEventListener('click', () => {
      autoRecoverySafeMode = false;
      autoRecoveryTriggered = false;
      errorTimestamps = [];
      syncEngine();
      toggleSettingsModal();
      toggleSettingsModal();
    });
  }

  function showUserscriptNotice(msg) {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;bottom:16px;right:16px;background:#0f172a;color:#f8fafc;padding:8px 14px;border-radius:8px;font-size:12px;z-index:2147483647;border:1px solid rgba(255,255,255,0.1);box-shadow:0 10px 20px rgba(0,0,0,0.5);font-family:sans-serif;';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }

  // ---------------------------------------------------------------------------
  // 6. Registration & Initialization
  // ---------------------------------------------------------------------------
  if (typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand('⚡ SmoothBoost: Settings', toggleSettingsModal);
    GM_registerMenuCommand('🔄 SmoothBoost: Toggle On/Off', () => {
      userConfig.globalEnabled = !userConfig.globalEnabled;
      saveStoredConfig(userConfig);
      syncEngine();
      showUserscriptNotice(`SmoothBoost: ${userConfig.globalEnabled ? 'Enabled' : 'Disabled'}`);
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.altKey && e.shiftKey && (e.key === 'S' || e.key === 's')) {
      e.preventDefault();
      toggleSettingsModal();
    }
    if (e.key === 'Escape' && modalContainer) {
      toggleSettingsModal();
    }
  });

  setupScrollBoost();
  setupWatchdog();
  syncEngine();

  function onReady() {
    optimizeResources(document);
    setupOffscreenObserver();
    runMemoryGuard();
    setInterval(runMemoryGuard, 12000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady, { once: true });
  } else {
    onReady();
  }
})();
