// ==UserScript==
// @name         SmoothBoost: Web Performance Optimizer
// @namespace    https://github.com/BiniFn/SmoothBoost
// @version      2.5.0
// @description  Universal performance optimizer with Scroll Boost v2, Shadow DOM Boost, Smart Resource Loading, Memory Guard, and Dynamic FPS profiles.
// @author       BiniFn
// @match        *://*/*
// @run-at       document-start
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @grant        unsafeWindow
// @downloadURL  https://raw.githubusercontent.com/BiniFn/SmoothBoost/main/dist/SmoothBoost.user.js
// @updateURL    https://raw.githubusercontent.com/BiniFn/SmoothBoost/main/dist/SmoothBoost.user.js
// @homepageURL  https://github.com/BiniFn/SmoothBoost
// @supportURL   https://github.com/BiniFn/SmoothBoost/issues
// ==/UserScript==

(function smoothBoostUserscript() {
  'use strict';

  if (window !== window.top) return;

  // ---------------------------------------------------------------------------
  // 1. Constants, Site Archetypes & Default Settings
  // ---------------------------------------------------------------------------
  const SCRIPT_VERSION = '2.5.0';
  const STORAGE_KEY = 'smoothBoostConfig';
  const SUPPORT_URL = 'https://github.com/sponsors/BiniFn';
  const CHANNEL_ID = `__sb_comm_${Math.random().toString(36).slice(2)}__`;

  const REALTIME_APP_HOSTS = [
    'discord.com',
    'discordapp.com',
    'meet.google.com',
    'teams.microsoft.com',
    'zoom.us',
    'web.whatsapp.com'
  ];
  const MOTION_PRESERVATION_HOSTS = ['ws.ryuo.to'];

  const SITE_RULES = [
    {
      id: 'youtube-feed-optimizer',
      hosts: ['youtube.com', 'm.youtube.com'],
      behavior: 'defer-offscreen-comments-and-ambient',
      selectors: ['#comments', 'ytd-comments', '#related', 'ytd-watch-next-secondary-results-renderer', 'ytd-rich-item-renderer', 'ytd-compact-video-renderer']
    },
    {
      id: 'reddit-feed-optimizer',
      hosts: ['reddit.com', 'www.reddit.com', 'old.reddit.com'],
      behavior: 'pause-offscreen-media-and-embeds',
      selectors: ['shreddit-async-loader', 'shreddit-post', 'shreddit-comment', '[data-testid="post-container"]']
    },
    {
      id: 'twitter-x-optimizer',
      hosts: ['x.com', 'twitter.com'],
      behavior: 'spa-feed-content-visibility',
      selectors: ['[data-testid="primaryColumn"] section', '[data-testid="cellInnerDiv"]', 'div[aria-label="Timeline: Your Home Timeline"] > div']
    },
    {
      id: 'twitch-kick-optimizer',
      hosts: ['twitch.tv', 'kick.com'],
      behavior: 'defer-offscreen-comments-and-ambient',
      selectors: ['.chat-scrollable-area__message-container > div', '[data-a-target="side-nav-card"]', '.vod-message']
    },
    {
      id: 'social-feed-optimizer',
      hosts: ['tiktok.com', 'instagram.com', 'facebook.com', 'bsky.app', 'threads.net', 'linkedin.com'],
      behavior: 'spa-feed-content-visibility',
      selectors: ['article', '[role="feed"] > div', '[data-e2e="recommend-list-item-container"]']
    },
    {
      id: 'fandom-wiki-optimizer',
      hosts: ['fandom.com'],
      behavior: 'contain-heavy-containers',
      selectors: ['.top-ads-container', '.bottom-ads-container', '.right-rail-wrapper', '#WikiaBar', 'aside.page__right-rail']
    },
    {
      id: 'ai-workspace-optimizer',
      hosts: ['chatgpt.com', 'claude.ai'],
      behavior: 'spa-feed-content-visibility',
      selectors: ['[data-testid^="conversation-turn-"]', 'article[data-turn-id]']
    }
  ];

  const DEFAULT_SETTINGS = {
    settingsVersion: 6,
    globalEnabled: true,
    mode: 'auto',
    showFloatingPill: false,
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
      autoRecovery: true,
      shadowDomBoost: true,
      backgroundTabThrottle: false
    },
    siteOverrides: {}
  };

  function hostMatches(host, domain) {
    return host === domain || host.endsWith(`.${domain}`);
  }

  function isRealtimeAppHost(host) {
    return REALTIME_APP_HOSTS.some((d) => hostMatches(host, d));
  }

  function preservesPageMotion(host) {
    return MOTION_PRESERVATION_HOSTS.some((d) => hostMatches(host, d));
  }

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
  let currentArchetype = 'standard';

  function classifyPageArchetype() {
    if (isRealtimeAppHost(hostname)) return 'realtime-app';
    if (/(figma|docs\.google|canva|sketch|photopea|webflow|desmos)\.com/i.test(hostname) || /(notion\.so|linear\.app)/i.test(hostname)) {
      return 'interactive-canvas';
    }
    if (document.querySelector?.('.monaco-editor, .ace_editor, .cm-editor, [data-mode-id]')) {
      return 'interactive-canvas';
    }
    if (/(crazygames|poki|kongregate|itch\.io|newgrounds|shadertoy|playcanvas)\.com/i.test(hostname) ||
        document.querySelector?.('#unity-canvas, .game-canvas, canvas[data-engine]')) {
      return 'game-canvas';
    }
    const canvases = document.querySelectorAll?.('canvas') || [];
    for (let i = 0; i < Math.min(canvases.length, 5); i++) {
      const c = canvases[i];
      if (c.width >= (window.innerWidth || 800) * 0.75 && c.height >= (window.innerHeight || 600) * 0.75) {
        return 'interactive-canvas';
      }
    }
    const videos = document.querySelectorAll?.('video') || [];
    if (videos.length >= 2 || /(youtube|twitch|kick|vimeo|netflix|hulu|disneyplus|spotify|crunchyroll|bilibili)\.(com|tv)/i.test(hostname)) {
      return 'media-stream';
    }
    if (/(twitter\.com|x\.com|reddit\.com|instagram\.com|bsky\.app|pinterest\.com|tiktok\.com|facebook\.com|threads\.net|linkedin\.com|chatgpt\.com|claude\.ai|gemini\.google\.com|perplexity\.ai)/i.test(hostname) ||
        document.querySelector?.('[role="feed"], [data-testid="primaryColumn"], .feed-item, article.post, [data-infinite-scroll], shreddit-feed')) {
      return 'infinite-feed';
    }
    if (/(amazon\.|ebay\.|aliexpress\.com|shopify\.com|etsy\.com|walmart\.com|target\.com|temu\.com|shopee\.)/i.test(hostname)) {
      return 'e-commerce';
    }
    if (/(wikipedia\.org|medium\.com|substack\.com|dev\.to|github\.com|fandom\.com)/i.test(hostname) ||
        document.querySelector?.('article, [itemprop="articleBody"], .wiki-content, .markdown-body')) {
      return 'reading-article';
    }
    return 'standard';
  }

  function getMatchingRules() {
    return SITE_RULES.filter((rule) => rule.hosts.some((h) => hostMatches(hostname, h)));
  }

  function getEffectiveSettings() {
    const site = userConfig.siteOverrides?.[hostname] || {};
    const enabled = site.enabled !== undefined ? site.enabled : userConfig.globalEnabled !== false;
    const mode = site.mode || userConfig.mode || 'auto';
    if (!enabled) return { enabled: false, mode: 'off' };

    const realtimeApp = isRealtimeAppHost(hostname) || currentArchetype === 'realtime-app';
    const keepMotion = preservesPageMotion(hostname);
    const isInteractiveCanvas = currentArchetype === 'interactive-canvas' || currentArchetype === 'game-canvas';
    const hasFeedRule = getMatchingRules().length > 0;
    const custom = {
      ...DEFAULT_SETTINGS.customSettings,
      ...(userConfig.customSettings || {}),
      ...(site.customSettings || {})
    };

    if (mode === 'auto') {
      const isFeedOrContent = hasFeedRule || ['infinite-feed', 'e-commerce', 'reading-article'].includes(currentArchetype);
      return {
        enabled: true,
        mode: 'auto',
        killAnimations: false,
        killTransitions: false,
        killBlurFilters: !realtimeApp,
        killScrollHijack: false,
        pauseBackgroundMedia: !realtimeApp && !keepMotion,
        throttleCanvasFps: false,
        pauseOffscreenAnimations: !realtimeApp && !keepMotion,
        contentVisibility: !realtimeApp && !isInteractiveCanvas && isFeedOrContent,
        aggressiveContainment: false,
        pauseOffscreenCanvas: !isInteractiveCanvas && !realtimeApp && !keepMotion,
        passiveScroll: true,
        asyncImageDecoding: !realtimeApp,
        fontDisplaySwap: !realtimeApp,
        scrollBoost: !realtimeApp,
        smartResourceLoading: true,
        memoryGuard: true,
        spaOptimization: true,
        autoRecovery: true,
        shadowDomBoost: !realtimeApp && !isInteractiveCanvas,
        backgroundTabThrottle: false,
        fpsLimit: custom.fpsLimit !== undefined ? custom.fpsLimit : 60
      };
    }

    if (mode === 'ultra') {
      return {
        enabled: true,
        mode: 'ultra',
        killAnimations: false,
        killTransitions: false,
        killBlurFilters: !realtimeApp,
        killScrollHijack: false,
        pauseBackgroundMedia: !realtimeApp && !keepMotion,
        throttleCanvasFps: false,
        pauseOffscreenAnimations: !realtimeApp && !keepMotion,
        contentVisibility: !realtimeApp && !isInteractiveCanvas,
        aggressiveContainment: !realtimeApp && !isInteractiveCanvas,
        pauseOffscreenCanvas: !isInteractiveCanvas && !realtimeApp && !keepMotion,
        passiveScroll: true,
        asyncImageDecoding: !realtimeApp,
        fontDisplaySwap: !realtimeApp,
        scrollBoost: !realtimeApp,
        smartResourceLoading: true,
        memoryGuard: true,
        spaOptimization: true,
        autoRecovery: true,
        shadowDomBoost: !realtimeApp && !isInteractiveCanvas,
        backgroundTabThrottle: !realtimeApp && !isInteractiveCanvas,
        fpsLimit: custom.fpsLimit !== undefined ? custom.fpsLimit : 0
      };
    }

    if (mode === 'balanced') {
      return {
        enabled: true,
        mode: 'balanced',
        killAnimations: false,
        killTransitions: false,
        killBlurFilters: false,
        killScrollHijack: false,
        pauseBackgroundMedia: false,
        throttleCanvasFps: false,
        pauseOffscreenAnimations: false,
        contentVisibility: false,
        aggressiveContainment: false,
        pauseOffscreenCanvas: false,
        passiveScroll: true,
        asyncImageDecoding: true,
        fontDisplaySwap: false,
        scrollBoost: false,
        smartResourceLoading: false,
        memoryGuard: false,
        spaOptimization: true,
        autoRecovery: true,
        shadowDomBoost: false,
        backgroundTabThrottle: false,
        fpsLimit: custom.fpsLimit !== undefined ? custom.fpsLimit : 0
      };
    }

    if (mode === 'battery') {
      return {
        enabled: true,
        mode: 'battery',
        killAnimations: false,
        killTransitions: false,
        killBlurFilters: !realtimeApp,
        killScrollHijack: false,
        pauseBackgroundMedia: !realtimeApp && !keepMotion,
        throttleCanvasFps: !isInteractiveCanvas && !realtimeApp && !keepMotion,
        pauseOffscreenAnimations: !realtimeApp && !keepMotion,
        contentVisibility: !realtimeApp && !keepMotion,
        aggressiveContainment: !realtimeApp && !isInteractiveCanvas,
        pauseOffscreenCanvas: !isInteractiveCanvas && !realtimeApp && !keepMotion,
        passiveScroll: true,
        asyncImageDecoding: !realtimeApp,
        fontDisplaySwap: !realtimeApp,
        scrollBoost: true,
        smartResourceLoading: true,
        memoryGuard: true,
        spaOptimization: true,
        autoRecovery: true,
        shadowDomBoost: !realtimeApp && !isInteractiveCanvas,
        backgroundTabThrottle: !realtimeApp && !isInteractiveCanvas,
        fpsLimit: 30
      };
    }

    return {
      enabled: true,
      mode: 'custom',
      ...custom,
      aggressiveContainment: !!custom.contentVisibility,
      shadowDomBoost: custom.shadowDomBoost !== false,
      backgroundTabThrottle: !!custom.backgroundTabThrottle,
      fpsLimit: custom.fpsLimit !== undefined ? custom.fpsLimit : 30
    };
  }

  currentArchetype = classifyPageArchetype();
  let activeSettings = getEffectiveSettings();

  // ---------------------------------------------------------------------------
  // 3. Page Hook (MAIN World via script or unsafeWindow fallback for strict CSP)
  // ---------------------------------------------------------------------------
  function installMainHook(win) {
    if (!win || win.__smoothboostHookInstalled) return;
    win.__smoothboostHookInstalled = true;

    const channel = CHANNEL_ID;
    let targetFps = activeSettings.fpsLimit !== undefined ? activeSettings.fpsLimit : 60;
    let optimizationsEnabled = activeSettings.enabled;
    let passiveScrollEnabled = activeSettings.enabled && activeSettings.passiveScroll;
    let canvasGuardArmed = activeSettings.enabled && activeSettings.pauseOffscreenCanvas;
    let bgThrottleEnabled = activeSettings.enabled && activeSettings.backgroundTabThrottle;
    let scrollBoostActive = false;
    let throttling = false;
    let spaNavCount = 0;
    let passiveIntercepted = 0;
    let canvasSkips = 0;
    let shadowRootsPatched = 0;

    const isInteractiveTarget = (target) => {
      if (!target) return false;
      const tag = target.tagName ? String(target.tagName).toUpperCase() : '';
      if (['INPUT', 'TEXTAREA', 'SELECT', 'CANVAS'].includes(tag)) return true;
      if (target.isContentEditable) return true;
      if (typeof target.closest === 'function') {
        return !!target.closest('.leaflet-container, .mapboxgl-map, [aria-roledescription="map"], canvas, [role="slider"], input[type="range"], .monaco-editor, .ace_editor, .cm-editor, .ProseMirror, [data-lexical-editor], #canvas, #unity-canvas, .game-canvas, [contenteditable="true"], [role="scrollbar"], [role="dialog"], [aria-modal="true"]');
      }
      return false;
    };

    const TargetProto = win.EventTarget ? win.EventTarget.prototype : null;
    if (TargetProto && typeof TargetProto.addEventListener === 'function') {
      const nativeAdd = TargetProto.addEventListener;
      TargetProto.addEventListener = function (type, listener, options) {
        if (passiveScrollEnabled && typeof listener === 'function' &&
            (type === 'wheel' || type === 'mousewheel' || type === 'touchstart' || type === 'touchmove')) {
          if (!isInteractiveTarget(this)) {
            passiveIntercepted += 1;
            const opts = typeof options === 'boolean'
              ? { capture: options, passive: true }
              : (options && typeof options === 'object' ? { ...options, passive: true } : { passive: true });
            return nativeAdd.call(this, type, listener, opts);
          }
        }
        return nativeAdd.call(this, type, listener, options);
      };
    }

    function shouldSkipCanvas(ctx) {
      if (!canvasGuardArmed && !scrollBoostActive) return false;
      if (!optimizationsEnabled && !scrollBoostActive) return false;
      const c = ctx?.canvas;
      if (!c || c.isConnected === false) return false;
      if (c.style && (c.style.position === 'fixed' || c.style.position === 'sticky')) return false;
      if (scrollBoostActive) return true;
      return c.getAttribute?.('data-smoothboost-offscreen-canvas') === 'true';
    }

    if (win.CanvasRenderingContext2D?.prototype) {
      for (const method of ['clearRect', 'drawImage']) {
        const orig = win.CanvasRenderingContext2D.prototype[method];
        if (typeof orig === 'function') {
          win.CanvasRenderingContext2D.prototype[method] = function (...args) {
            if (shouldSkipCanvas(this)) { canvasSkips++; return; }
            return orig.apply(this, args);
          };
        }
      }
    }
    for (const Ctx of [win.WebGLRenderingContext, win.WebGL2RenderingContext]) {
      if (Ctx?.prototype) {
        for (const method of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced']) {
          const orig = Ctx.prototype[method];
          if (typeof orig === 'function') {
            Ctx.prototype[method] = function (...args) {
              if (shouldSkipCanvas(this)) { canvasSkips++; return; }
              return orig.apply(this, args);
            };
          }
        }
      }
    }

    const nativeRAF = win.requestAnimationFrame;
    let lastTime = 0;
    if (typeof nativeRAF === 'function') {
      win.requestAnimationFrame = function (callback) {
        const isBg = bgThrottleEnabled && win.document?.hidden;
        if (!throttling && !isBg) return nativeRAF.call(win, callback);
        const effFps = isBg ? 2 : (targetFps || 60);
        if (effFps <= 0) return nativeRAF.call(win, callback);
        const interval = 1000 / effFps;
        return nativeRAF.call(win, function schedule(now) {
          const elapsed = now - lastTime;
          if (elapsed >= interval) {
            lastTime = now - (elapsed % interval);
            callback(now);
          } else {
            nativeRAF.call(win, schedule);
          }
        });
      };
    }

    if (win.Element?.prototype?.attachShadow) {
      const nativeAttach = win.Element.prototype.attachShadow;
      const pendingShadowHosts = new Set();
      let timer = 0;
      win.Element.prototype.attachShadow = function (init) {
        const sr = nativeAttach.call(this, init);
        if (optimizationsEnabled && init?.mode === 'open') {
          shadowRootsPatched += 1;
          if (pendingShadowHosts.size < 256) {
            pendingShadowHosts.add(this);
          }
          if (!timer) {
            timer = win.setTimeout(() => {
              timer = 0;
              pendingShadowHosts.forEach((host) => {
                try { host.setAttribute?.('data-smoothboost-shadow', 'pending'); } catch (_e) {}
              });
              pendingShadowHosts.clear();
              try { win.dispatchEvent(new win.CustomEvent(channel, { detail: { action: 'shadow-root-attached' } })); } catch (_e) {}
            }, 32);
          }
        }
        return sr;
      };
    }

    if (win.history && typeof win.history.pushState === 'function') {
      const origPush = win.history.pushState;
      const origReplace = win.history.replaceState;
      const notify = (type) => {
        spaNavCount++;
        try { win.dispatchEvent(new win.CustomEvent(channel, { detail: { action: 'spa-nav', type, url: win.location.href } })); } catch (_e) {}
      };
      win.history.pushState = function (...args) { const r = origPush.apply(this, args); notify('pushState'); return r; };
      win.history.replaceState = function (...args) { const r = origReplace.apply(this, args); notify('replaceState'); return r; };
    }

    win.addEventListener(channel, (e) => {
      const act = e.detail?.action;
      if (act === 'optimizations-on') optimizationsEnabled = true;
      else if (act === 'optimizations-off') optimizationsEnabled = false;
      else if (act === 'passive-scroll-on') passiveScrollEnabled = true;
      else if (act === 'passive-scroll-off') passiveScrollEnabled = false;
      else if (act === 'canvas-guard-on') canvasGuardArmed = true;
      else if (act === 'canvas-guard-off') canvasGuardArmed = false;
      else if (act === 'bg-throttle-on') bgThrottleEnabled = true;
      else if (act === 'bg-throttle-off') bgThrottleEnabled = false;
      else if (act === 'scroll-boost-active') scrollBoostActive = true;
      else if (act === 'scroll-boost-idle') scrollBoostActive = false;
      else if (act === 'set-fps') { targetFps = Number(e.detail?.fps ?? 60); }
      else if (act === 'throttle-on') throttling = true;
      else if (act === 'throttle-off') throttling = false;
      else if (act === 'get-metrics') {
        win.dispatchEvent(new win.CustomEvent(channel, {
          detail: {
            action: 'metrics-reply',
            passiveListeners: passiveIntercepted,
            canvasSkips,
            scrollBoostActive,
            spaNavCount,
            shadowRootsPatched,
            targetFps
          }
        }));
      }
    });
  }

  let hookInjected = false;
  try {
    const scriptEl = document.createElement('script');
    scriptEl.textContent = `(${installMainHook.toString().replace(/CHANNEL_ID/g, JSON.stringify(CHANNEL_ID))})(window);`;
    const target = document.head || document.documentElement;
    if (target) {
      target.appendChild(scriptEl);
      scriptEl.remove();
      hookInjected = Boolean(window.__smoothboostHookInstalled);
    }
  } catch (_cspErr) {}

  if (!hookInjected && typeof unsafeWindow !== 'undefined') {
    try {
      installMainHook(unsafeWindow);
      hookInjected = true;
    } catch (_uwErr) {}
  }
  if (!hookInjected) {
    installMainHook(window);
  }

  // ---------------------------------------------------------------------------
  // 4. Content Optimization Engine
  // ---------------------------------------------------------------------------
  const STYLE_ID = 'smoothboost-userscript-style';
  const SHADOW_STYLE_ID = 'smoothboost-shadow-styles';
  let smartResourceObserver = null;
  let smartResourcesCount = 0;
  let isScrolling = false;
  let scrollTimer = null;
  let memoryPressure = 'normal';
  let autoRecoverySafeMode = false;
  let errorTimestamps = [];
  let spaCount = 0;
  let shadowPatchedCount = 0;
  const blurStates = new Map();
  const patchedShadowRoots = new WeakSet();
  const pendingMutationNodes = new Set();
  let mutationFlushHandle = 0;
  let metricsSnapshot = { passiveListeners: 0, canvasSkips: 0, pausedVideos: 0, blursBypassed: 0 };

  function buildStylesheet(cfg) {
    if (!cfg.enabled || autoRecoverySafeMode) return '';
    let css = '/* SmoothBoost Userscript Styles v2.5.0 */\n';
    if (cfg.killScrollHijack) css += 'html, body { scroll-behavior: auto !important; }\n';
    if (cfg.killAnimations) css += '* , *::before, *::after { animation-duration: 0.0001s !important; animation-play-state: running !important; }\n';
    if (cfg.killTransitions) css += '* , *::before, *::after { transition-duration: 0.0001s !important; }\n';
    if (cfg.killBlurFilters) css += '[data-smoothboost-blur="true"], .backdrop-blur, [class*="backdrop-blur-"] { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }\n';
    if (cfg.pauseOffscreenAnimations) css += '[data-smoothboost-offscreen="true"], [data-smoothboost-offscreen="true"]::before, [data-smoothboost-offscreen="true"]::after { animation-play-state: paused !important; }\n';
    if (cfg.pauseOffscreenCanvas) css += 'canvas[data-smoothboost-offscreen-canvas="true"] { visibility: hidden !important; }\n';
    if (cfg.contentVisibility) css += '[data-smoothboost-cv="true"] { content-visibility: auto !important; contain-intrinsic-size: auto 480px !important; }\n';
    if (cfg.aggressiveContainment) css += '[data-smoothboost-contained="true"] { contain: layout style paint !important; }\n';
    if (cfg.scrollBoost) {
      css += 'html[data-smoothboost-scrolling="true"] [data-smoothboost-cv="true"], html[data-smoothboost-scrolling="true"] [data-smoothboost-offscreen="true"] { animation-play-state: paused !important; transition: none !important; }\n';
    }
    return css;
  }

  function applyStyles(css) {
    let el = document.getElementById(STYLE_ID);
    if (!css) { el?.remove(); return; }
    if (!el) {
      el = document.createElement('style');
      el.id = STYLE_ID;
      (document.head || document.documentElement)?.appendChild(el);
    }
    el.textContent = css;
  }

  function dispatchHook(action, detail = {}) {
    try {
      window.dispatchEvent(new CustomEvent(CHANNEL_ID, { detail: { action, ...detail } }));
    } catch (_e) {}
  }

  function parseColor(color) {
    const match = String(color || '').match(/rgba?\(([^)]+)\)/i);
    if (!match) return null;
    const values = match[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    if (values.length < 3 || values.slice(0, 3).some((v) => !Number.isFinite(v))) return null;
    return { red: values[0], green: values[1], blue: values[2], alpha: values.length > 3 && Number.isFinite(values[3]) ? values[3] : 1 };
  }

  function inspectBlurTargets() {
    if (!activeSettings.enabled || !activeSettings.killBlurFilters) {
      for (const [el, state] of blurStates) {
        if (el.isConnected) {
          if (state.orig) el.style.setProperty('background-color', state.orig, state.prio);
          else el.style.removeProperty('background-color');
        }
        el.removeAttribute('data-smoothboost-blur');
      }
      blurStates.clear();
      return;
    }
    const candidates = document.querySelectorAll?.('[class*="blur"], [class*="glass"], [class*="backdrop"], [style*="backdrop-filter"], header, nav, .modal, .dialog, .card') || [];
    let count = 0;
    for (const el of candidates) {
      if (count >= 120) break;
      count += 1;
      try {
        const comp = window.getComputedStyle?.(el);
        if (!comp) continue;
        const hasBlur = [comp.backdropFilter, comp.webkitBackdropFilter].some((v) => v && v !== 'none');
        if (!hasBlur) continue;
        const bg = parseColor(comp.backgroundColor);
        if (bg && bg.alpha > 0 && bg.alpha < 0.92 && !blurStates.has(el)) {
          const bgLum = (bg.red * 299 + bg.green * 587 + bg.blue * 114) / 1000;
          const fg = parseColor(comp.color);
          const fgLum = fg ? (fg.red * 299 + fg.green * 587 + fg.blue * 114) / 1000 : 255;
          if (!(bgLum > 160 && fgLum > 140)) {
            blurStates.set(el, { orig: el.style.getPropertyValue('background-color'), prio: el.style.getPropertyPriority('background-color') });
            el.style.setProperty('background-color', `rgba(${bg.red}, ${bg.green}, ${bg.blue}, 0.92)`, 'important');
          }
        }
        el.setAttribute('data-smoothboost-blur', 'true');
      } catch (_e) {}
    }
    metricsSnapshot.blursBypassed = blurStates.size;
  }

  function setupScrollBoost() {
    const onScroll = () => {
      if (!activeSettings.enabled || !activeSettings.scrollBoost) return;
      if (!isScrolling) {
        isScrolling = true;
        document.documentElement?.setAttribute('data-smoothboost-scrolling', 'true');
        dispatchHook('scroll-boost-active');
      }
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        isScrolling = false;
        document.documentElement?.removeAttribute('data-smoothboost-scrolling');
        dispatchHook('scroll-boost-idle');
      }, 160);
    };
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    window.addEventListener('wheel', onScroll, { passive: true, capture: true });
    window.addEventListener('touchmove', onScroll, { passive: true, capture: true });
  }

  const EMBED_PATTERNS = [
    /youtube(-nocookie)?\.com\/embed/i,
    /player\.vimeo\.com/i,
    /player\.twitch\.tv/i,
    /platform\.twitter\.com/i,
    /instagram\.com\/embed/i,
    /open\.spotify\.com\/embed/i,
    /w\.soundcloud\.com\/player/i,
    /disqus\.com\/embed/i,
    /tiktok\.com\/embed/i
  ];

  function applySiteRulesAndContainment(root = document) {
    if (!activeSettings.enabled || (!activeSettings.contentVisibility && !activeSettings.aggressiveContainment)) return;
    const rules = getMatchingRules();
    for (const rule of rules) {
      for (const selector of rule.selectors) {
        try {
          root.querySelectorAll?.(selector)?.forEach((el) => {
            if (el.closest?.('[role="dialog"], [aria-modal="true"]')) return;
            if (rule.behavior === 'contain-heavy-containers' || activeSettings.aggressiveContainment) {
              el.setAttribute('data-smoothboost-contained', 'true');
            } else {
              el.setAttribute('data-smoothboost-cv', 'true');
            }
          });
        } catch (_e) {}
      }
    }
    if (activeSettings.contentVisibility) {
      root.querySelectorAll?.('main section, [role="main"] section, [role="feed"] > *, main article, .feed-item')?.forEach((el) => {
        if (!el.closest?.('nav, header, footer, [role="dialog"]') && !el.querySelector?.('h1, video, iframe, canvas, form')) {
          el.setAttribute('data-smoothboost-cv', 'true');
        }
      });
    }
  }

  function syncShadowRoots(root = document) {
    if (!activeSettings.enabled || !activeSettings.shadowDomBoost) return;
    if (isRealtimeAppHost(hostname) || currentArchetype === 'realtime-app' || currentArchetype === 'interactive-canvas') return;
    const targets = [];
    if (root.nodeType === 1 && root.shadowRoot) targets.push(root);
    root.querySelectorAll?.('[data-smoothboost-shadow="pending"], shreddit-app, shreddit-feed, shreddit-post, shreddit-comment, ytd-app, ytd-comments')?.forEach((el) => {
      if (el.shadowRoot) targets.push(el);
    });
    for (const host of targets) {
      const sr = host.shadowRoot;
      if (!sr || typeof sr.getElementById !== 'function') continue;
      if (host.getAttribute?.('data-smoothboost-shadow') === 'pending') {
        host.setAttribute('data-smoothboost-shadow', 'patched');
      }
      let s = sr.getElementById(SHADOW_STYLE_ID);
      if (!s) {
        s = document.createElement('style');
        s.id = SHADOW_STYLE_ID;
        sr.appendChild(s);
        if (!patchedShadowRoots.has(sr)) {
          patchedShadowRoots.add(sr);
          shadowPatchedCount += 1;
        }
      }
      s.textContent = 'article, shreddit-comment, .feed-item { content-visibility: auto !important; contain-intrinsic-size: auto 320px !important; }';
    }
  }

  function optimizeResources(root = document) {
    if (!activeSettings.enabled) return;
    if (activeSettings.asyncImageDecoding) {
      root.querySelectorAll?.('img:not([data-sb-img])').forEach((img, idx) => {
        img.setAttribute('data-sb-img', '1');
        if (!img.decoding || img.decoding === 'auto') img.decoding = 'async';
        const isInitialHero = root === document && idx < 3;
        const loading = img.getAttribute('loading');
        if (!isInitialHero && loading !== 'eager' && loading !== 'lazy') img.loading = 'lazy';
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
        if (frame.getAttribute('loading') !== 'eager') frame.loading = 'lazy';
        const src = frame.getAttribute('src');
        if (src && EMBED_PATTERNS.some((pat) => pat.test(src))) {
          frame.setAttribute('data-sb-src', src);
          frame.src = 'about:blank';
          smartResourceObserver?.observe(frame);
          smartResourcesCount++;
        }
      });
    }
    applySiteRulesAndContainment(root);
    syncShadowRoots(root);
  }

  function enqueueMutationNode(node) {
    if (!node || node.nodeType !== 1) return;
    pendingMutationNodes.add(node);
    if (mutationFlushHandle) return;
    const run = () => {
      mutationFlushHandle = 0;
      const start = performance?.now ? performance.now() : Date.now();
      for (const item of pendingMutationNodes) {
        pendingMutationNodes.delete(item);
        if (item.isConnected) optimizeResources(item);
        if ((performance?.now ? performance.now() : Date.now()) - start >= 4 && pendingMutationNodes.size > 0) {
          enqueueMutationNode([...pendingMutationNodes][0]);
          break;
        }
      }
    };
    mutationFlushHandle = typeof requestAnimationFrame === 'function' ? requestAnimationFrame(run) : setTimeout(run, 16);
  }

  let offscreenObserver = null;
  function setupOffscreenObserver() {
    if (offscreenObserver || typeof IntersectionObserver !== 'function') return;
    if (isRealtimeAppHost(hostname) || currentArchetype === 'interactive-canvas' || currentArchetype === 'game-canvas') return;
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

  function runMemoryGuard() {
    if (!activeSettings.enabled || !activeSettings.memoryGuard) return;
    let high = false;
    const mem = window.performance?.memory;
    if (mem && mem.usedJSHeapSize && mem.jsHeapSizeLimit && mem.usedJSHeapSize / mem.jsHeapSizeLimit > 0.72) {
      high = true;
    }
    const domCount = document.getElementsByTagName?.('*')?.length ?? 0;
    if (domCount > (activeSettings.mode === 'ultra' ? 2500 : 3500) || document.hidden) high = true;

    if (high) {
      memoryPressure = 'high';
      document.querySelectorAll('video').forEach((v) => {
        if (v.paused && !v.ended && !v.srcObject) v.preload = 'none';
      });
    } else {
      memoryPressure = 'normal';
    }
  }

  function setupWatchdog() {
    const handleErr = () => {
      if (!activeSettings.enabled || !activeSettings.autoRecovery || autoRecoverySafeMode) return;
      const now = Date.now();
      errorTimestamps.push(now);
      while (errorTimestamps.length && now - errorTimestamps[0] > 3000) errorTimestamps.shift();
      if (errorTimestamps.length >= 4) {
        autoRecoverySafeMode = true;
        applyStyles('');
        dispatchHook('optimizations-off');
        showUserscriptNotice('SmoothBoost: Safe Mode activated due to detected page errors.');
      }
    };
    window.addEventListener('error', handleErr);
    window.addEventListener('unhandledrejection', handleErr);
  }

  window.addEventListener(CHANNEL_ID, (e) => {
    if (e.detail?.action === 'spa-nav') {
      spaCount++;
      currentArchetype = classifyPageArchetype();
      syncEngine();
    } else if (e.detail?.action === 'shadow-root-attached') {
      syncShadowRoots(document);
    } else if (e.detail?.action === 'metrics-reply') {
      metricsSnapshot.passiveListeners = e.detail.passiveListeners || 0;
      metricsSnapshot.canvasSkips = e.detail.canvasSkips || 0;
    }
  });
  window.addEventListener('popstate', () => { spaCount++; currentArchetype = classifyPageArchetype(); syncEngine(); }, { passive: true });
  window.addEventListener('hashchange', () => { spaCount++; currentArchetype = classifyPageArchetype(); syncEngine(); }, { passive: true });

  function syncEngine() {
    activeSettings = getEffectiveSettings();
    applyStyles(buildStylesheet(activeSettings));
    dispatchHook(activeSettings.enabled ? 'optimizations-on' : 'optimizations-off');
    dispatchHook(activeSettings.enabled && activeSettings.passiveScroll ? 'passive-scroll-on' : 'passive-scroll-off');
    dispatchHook(activeSettings.enabled && activeSettings.pauseOffscreenCanvas ? 'canvas-guard-on' : 'canvas-guard-off');
    dispatchHook(activeSettings.enabled && activeSettings.backgroundTabThrottle ? 'bg-throttle-on' : 'bg-throttle-off');
    dispatchHook('set-fps', { fps: activeSettings.fpsLimit !== undefined ? activeSettings.fpsLimit : 60 });
    dispatchHook(activeSettings.enabled && activeSettings.mode === 'battery' ? 'throttle-on' : 'throttle-off');
    inspectBlurTargets();
    optimizeResources(document);
  }

  // ---------------------------------------------------------------------------
  // 5. Interactive Floating Settings Modal (Shadow DOM, 100% Zero-innerHTML)
  // ---------------------------------------------------------------------------
  let modalContainer = null;
  let shadowRoot = null;
  let floatingPillHost = null;

  function h(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'className') node.className = v;
      else if (k === 'textContent') node.textContent = v;
      else if (k === 'checked') node.checked = Boolean(v);
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
      else node.setAttribute(k, v === true ? '' : String(v));
    }
    for (const child of Array.isArray(children) ? children : [children]) {
      if (child === null || child === undefined || child === false) continue;
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    }
    return node;
  }

  function makeToggleRow(title, sub, checked, onChange) {
    const input = h('input', { type: 'checkbox', checked, onChange: (e) => onChange(e.target.checked) });
    return h('div', { className: 'toggle-row' }, [
      h('div', { className: 'toggle-info' }, [
        h('div', { className: 'toggle-name', textContent: title }),
        h('div', { className: 'toggle-sub', textContent: sub })
      ]),
      h('label', { className: 'switch' }, [input, h('span', { className: 'slider' })])
    ]);
  }

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
      :host { all: initial; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif; }
      .backdrop { position: fixed; inset: 0; background: rgba(2, 6, 23, 0.72); backdrop-filter: blur(6px); z-index: 2147483647; display: flex; align-items: center; justify-content: center; padding: 12px; }
      .card { background: linear-gradient(180deg, #0f172a 0%, #090d16 100%); color: #f8fafc; width: 400px; max-width: 100%; max-height: 88vh; overflow-y: auto; border-radius: 14px; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 24px 48px rgba(0,0,0,0.65); padding: 16px; display: flex; flex-direction: column; gap: 12px; }
      .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 10px; }
      .title-row { display: flex; align-items: center; gap: 8px; }
      .title { font-size: 15px; font-weight: 700; color: #fff; }
      .badge { font-size: 10px; background: rgba(16,185,129,0.18); color: #34d399; border: 1px solid rgba(16,185,129,0.35); font-weight: 700; padding: 2px 7px; border-radius: 999px; }
      .arch-pill { font-size: 10px; background: rgba(6,182,212,0.15); color: #38bdf8; border: 1px solid rgba(6,182,212,0.3); font-weight: 600; padding: 2px 7px; border-radius: 999px; }
      .close-btn { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; color: #94a3b8; width: 28px; height: 28px; font-size: 16px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
      .domain-bar { font-size: 12px; color: #cbd5e1; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 8px 10px; display: flex; justify-content: space-between; align-items: center; gap: 8px; }
      .domain-host { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .btn-group { display: flex; gap: 4px; background: #0f172a; padding: 4px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.07); }
      .btn { flex: 1; background: transparent; color: #94a3b8; border: 1px solid transparent; padding: 7px 3px; min-height: 36px; border-radius: 7px; font-size: 11px; font-weight: 600; cursor: pointer; text-align: center; }
      .btn.active { background: rgba(16, 185, 129, 0.16); border-color: rgba(16,185,129,0.5); color: #34d399; }
      .label { font-size: 10px; font-weight: 700; letter-spacing: 0.6px; color: #64748b; text-transform: uppercase; }
      .toggle-group { background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 4px 10px; }
      .toggle-row { display: flex; justify-content: space-between; align-items: center; padding: 7px 0; border-bottom: 1px solid rgba(255,255,255,0.05); gap: 8px; }
      .toggle-row:last-child { border-bottom: none; }
      .toggle-name { font-size: 12px; font-weight: 600; color: #f1f5f9; }
      .toggle-sub { font-size: 10px; color: #64748b; }
      .switch { position: relative; display: inline-block; width: 36px; height: 20px; flex-shrink: 0; }
      .switch input { opacity: 0; width: 0; height: 0; }
      .slider { position: absolute; cursor: pointer; inset: 0; background-color: #334155; border-radius: 20px; transition: .2s; }
      .slider:before { position: absolute; content: ""; height: 14px; width: 14px; left: 3px; bottom: 3px; background-color: #fff; border-radius: 50%; transition: .2s; }
      input:checked + .slider { background-color: #10b981; }
      input:checked + .slider:before { transform: translateX(16px); }
      .metrics { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 8px; display: flex; flex-wrap: wrap; gap: 6px; }
      .pill { background: rgba(6, 182, 212, 0.12); border: 1px solid rgba(6,182,212,0.25); color: #38bdf8; padding: 3px 7px; border-radius: 999px; font-size: 10px; font-weight: 600; }
      .alert { background: rgba(245, 158, 11, 0.16); border: 1px solid #f59e0b; color: #fbbf24; padding: 8px; border-radius: 8px; font-size: 11px; display: flex; justify-content: space-between; align-items: center; }
      .support-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.22); border-radius: 8px; padding: 8px 10px; font-size: 11px; color: #cbd5e1; }
      .support-btn { background: #10b981; color: #022c22; text-decoration: none; font-weight: 700; font-size: 11px; padding: 5px 10px; border-radius: 6px; white-space: nowrap; }
      .footer-note { font-size: 10px; color: #64748b; text-align: center; }
    `;

    const rerender = () => {
      toggleSettingsModal();
      toggleSettingsModal();
    };

    const modeButtons = [
      ['auto', 'Auto'],
      ['ultra', 'Turbo'],
      ['balanced', 'Balanced'],
      ['battery', 'Battery'],
      ['custom', 'Custom']
    ].map(([mode, label]) =>
      h('button', {
        className: `btn ${activeSettings.mode === mode ? 'active' : ''}`,
        type: 'button',
        textContent: label,
        onClick: () => {
          userConfig.mode = mode;
          saveStoredConfig(userConfig);
          syncEngine();
          rerender();
        }
      })
    );

    const fpsValues = [
      [0, 'Native'],
      [30, '30'],
      [60, '60'],
      [90, '90'],
      [120, '120']
    ];
    const currentFps = activeSettings.fpsLimit !== undefined ? activeSettings.fpsLimit : 60;
    const fpsButtons = fpsValues.map(([fps, label]) =>
      h('button', {
        className: `btn ${Number(currentFps) === fps ? 'active' : ''}`,
        type: 'button',
        textContent: label,
        onClick: () => {
          userConfig.customSettings = userConfig.customSettings || {};
          userConfig.customSettings.fpsLimit = fps;
          saveStoredConfig(userConfig);
          syncEngine();
          rerender();
        }
      })
    );

    const setCustomFlag = (key, value) => {
      userConfig.mode = 'custom';
      userConfig.customSettings = userConfig.customSettings || {};
      userConfig.customSettings[key] = value;
      saveStoredConfig(userConfig);
      syncEngine();
      rerender();
    };

    const siteToggle = h('input', {
      type: 'checkbox',
      checked: activeSettings.enabled,
      onChange: (e) => {
        userConfig.siteOverrides = userConfig.siteOverrides || {};
        userConfig.siteOverrides[hostname] = userConfig.siteOverrides[hostname] || {};
        userConfig.siteOverrides[hostname].enabled = e.target.checked;
        saveStoredConfig(userConfig);
        syncEngine();
      }
    });

    const cardChildren = [
      h('div', { className: 'header' }, [
        h('div', { className: 'title-row' }, [
          h('span', { className: 'title', textContent: 'SmoothBoost' }),
          h('span', { className: 'badge', textContent: `v${SCRIPT_VERSION} Free` })
        ]),
        h('button', { className: 'close-btn', type: 'button', textContent: '✕', 'aria-label': 'Close', onClick: toggleSettingsModal })
      ]),
      h('div', { className: 'domain-bar' }, [
        h('span', { className: 'domain-host', textContent: hostname }),
        h('span', { className: 'arch-pill', textContent: currentArchetype }),
        h('label', { className: 'switch' }, [siteToggle, h('span', { className: 'slider' })])
      ])
    ];

    if (autoRecoverySafeMode) {
      cardChildren.push(
        h('div', { className: 'alert' }, [
          h('span', { textContent: 'Safe Mode Active (Errors Recovered)' }),
          h('button', {
            className: 'btn active',
            type: 'button',
            style: 'flex:0;padding:4px 10px;min-height:auto;',
            textContent: 'Reset',
            onClick: () => {
              autoRecoverySafeMode = false;
              errorTimestamps = [];
              syncEngine();
              rerender();
            }
          })
        ])
      );
    }

    cardChildren.push(
      h('div', { className: 'label', textContent: 'Performance Profile' }),
      h('div', { className: 'btn-group' }, modeButtons),
      h('div', { className: 'label', textContent: 'FPS Target' }),
      h('div', { className: 'btn-group' }, fpsButtons),
      h('div', { className: 'label', textContent: 'Boost Engine Controls' }),
      h('div', { className: 'toggle-group' }, [
        makeToggleRow('Scroll Boost v2', 'Zero-reflow active scroll pacing', activeSettings.scrollBoost, (v) => setCustomFlag('scrollBoost', v)),
        makeToggleRow('Shadow DOM Boost', 'Optimize Reddit/YouTube web components', activeSettings.shadowDomBoost, (v) => setCustomFlag('shadowDomBoost', v)),
        makeToggleRow('Smart Resource Loading', 'Defer offscreen heavy embeds', activeSettings.smartResourceLoading, (v) => setCustomFlag('smartResourceLoading', v)),
        makeToggleRow('Memory Guard', 'Trim background media & DOM caches', activeSettings.memoryGuard, (v) => setCustomFlag('memoryGuard', v)),
        makeToggleRow('Background Tab Throttle', 'Throttle hidden-tab timers & rAF', activeSettings.backgroundTabThrottle, (v) => setCustomFlag('backgroundTabThrottle', v)),
        makeToggleRow('Reduce Backdrop Blur', 'Eliminate GPU blur fill bottlenecks', activeSettings.killBlurFilters, (v) => setCustomFlag('killBlurFilters', v)),
        makeToggleRow('Show Floating Corner Pill', '1-tap mobile HUD launcher', Boolean(userConfig.showFloatingPill), (v) => {
          userConfig.showFloatingPill = v;
          saveStoredConfig(userConfig);
          syncFloatingPill();
        })
      ]),
      h('div', { className: 'label', textContent: 'Live Diagnostics' }),
      h('div', { className: 'metrics' }, [
        h('span', { className: 'pill', textContent: `FPS: ${currentFps === 0 ? 'Native' : currentFps}` }),
        h('span', { className: 'pill', textContent: `Embeds: ${smartResourcesCount}` }),
        h('span', { className: 'pill', textContent: `Shadow: ${shadowPatchedCount}` }),
        h('span', { className: 'pill', textContent: `Memory: ${memoryPressure}` }),
        h('span', { className: 'pill', textContent: `Routes: ${spaCount}` })
      ]),
      h('div', { className: 'support-row' }, [
        h('span', { textContent: '100% Free & Open Source. Keep SmoothBoost fast!' }),
        h('a', { className: 'support-btn', href: SUPPORT_URL, target: '_blank', rel: 'noopener noreferrer', textContent: 'Donate' })
      ]),
      h('div', { className: 'footer-note', textContent: 'Alt+Shift+S to toggle HUD · Zero telemetry or tracking' })
    );

    const card = h('div', { className: 'card', role: 'dialog', 'aria-modal': 'true' }, cardChildren);
    const backdrop = h('div', {
      className: 'backdrop',
      onClick: (e) => { if (e.target === backdrop) toggleSettingsModal(); }
    }, [card]);

    shadowRoot.appendChild(style);
    shadowRoot.appendChild(backdrop);
    (document.body || document.documentElement).appendChild(modalContainer);
  }

  function syncFloatingPill() {
    if (!userConfig.showFloatingPill) {
      floatingPillHost?.remove();
      floatingPillHost = null;
      return;
    }
    if (floatingPillHost || !document.body) return;
    floatingPillHost = document.createElement('div');
    floatingPillHost.id = 'smoothboost-floating-pill-host';
    const sr = floatingPillHost.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = `
      button { position: fixed; bottom: 16px; right: 16px; z-index: 2147483646; background: rgba(15,23,42,0.9); color: #38bdf8; border: 1px solid rgba(56,189,248,0.45); border-radius: 999px; padding: 7px 12px; font: 700 11px -apple-system, BlinkMacSystemFont, sans-serif; cursor: pointer; box-shadow: 0 8px 20px rgba(0,0,0,0.45); backdrop-filter: blur(8px); }
    `;
    const btn = h('button', { type: 'button', textContent: '⚡ SB', 'aria-label': 'Open SmoothBoost Settings', onClick: toggleSettingsModal });
    sr.appendChild(style);
    sr.appendChild(btn);
    document.body.appendChild(floatingPillHost);
  }

  function showUserscriptNotice(msg) {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;bottom:16px;right:16px;background:#0f172a;color:#f8fafc;padding:8px 14px;border-radius:8px;font-size:12px;z-index:2147483647;border:1px solid rgba(255,255,255,0.1);box-shadow:0 10px 20px rgba(0,0,0,0.5);font-family:sans-serif;';
    el.textContent = msg;
    (document.body || document.documentElement)?.appendChild(el);
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
    currentArchetype = classifyPageArchetype();
    syncEngine();
    setupOffscreenObserver();
    syncFloatingPill();
    runMemoryGuard();
    if (typeof MutationObserver === 'function' && document.documentElement) {
      const obs = new MutationObserver((mutations) => {
        for (const m of mutations) m.addedNodes?.forEach(enqueueMutationNode);
      });
      obs.observe(document.documentElement, { childList: true, subtree: true });
    }
    setInterval(runMemoryGuard, 15000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady, { once: true });
  } else {
    onReady();
  }
})();
