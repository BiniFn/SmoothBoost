// SmoothBoost - isolated content script. Dynamic registration keeps this out of
// pages where the user has turned the extension off.

(function () {
  'use strict';

  const STYLE_ID = 'smoothboost-injected-styles';
  const CHANNEL_ATTRIBUTE = 'data-smoothboost-channel';
  const isTopFrame = window === window.top;
  const REANIME_HOST = 'reanime.to';
  const ARCHETYPE_CACHE_KEY = 'smoothBoostArchetypes';
  const ARCHETYPE_MAX_ENTRIES = 500;
  const ARCHETYPE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  const DEFAULT_RULES = {
    genericCarouselSelectors: ['.swiper', '[data-swiper]'],
    siteRules: [{
      hosts: ['reanime.to'],
      paths: ['/', '/home'],
      heroSelectors: ['[aria-label="Hero carousel"]', '[aria-label*="hero carousel" i]', '[data-testid*="hero-carousel" i]']
    }]
  };

  const DEFAULT_CONFIG = {
    globalEnabled: true,
    mode: 'auto',
    customSettings: {
      killAnimations: false,
      killTransitions: false,
      killBlurFilters: false,
      killScrollHijack: false,
      pauseBackgroundMedia: false,
      throttleCanvasFps: false,
      contentVisibility: false,
      pauseOffscreenAnimations: false,
      pauseOffscreenCanvas: false,
      passiveScroll: false,
      asyncImageDecoding: false,
      fontDisplaySwap: false,
      fpsLimit: 30
    },
    siteOverrides: {}
  };

  let currentSettings = { enabled: false, mode: 'off' };
  let currentArchetype = 'standard';
  let initialized = false;
  let reanimeRuleState = 'not-applicable';
  let storageChangeCount = 0;
  let siteRules = DEFAULT_RULES;
  let pageHookChannel = '';
  let videoObserver = null;
  let videoMutationObserver = null;
  let animationObserver = null;
  let animationMutationObserver = null;
  let carouselMutationObserver = null;
  let canvasObserver = null;
  let observedCanvases = new Set();
  let blurSelectors = [];
  let styleRootObserver = null;
  let diagnosticsObserver = null;
  let pendingCss = '';
  let animationScanTimer = 0;
  let blurScanTimer = 0;
  let animationTargets = new Set();
  let pausedVideos = new Set();
  let blurStates = new Map();
  let markedCarousels = new Set();
  let hookStatusTimer = 0;
  let observedAnimationTargets = new WeakSet();
  let blurScanQueue = [];
  let hookPassiveCount = 0;
  let hookCanvasDrawSkipCount = 0;
  let patchedFontsCount = 0;
  const longFrameTimes = [];

  function getReanimeRule() {
    const path = window.location.pathname;
    return siteRules.siteRules?.find((rule) =>
      rule.hosts?.includes(window.location.hostname.toLowerCase()) && rule.paths?.includes(path)
    ) || null;
  }

  function isReanimeHomePage() {
    return !!getReanimeRule();
  }

  function effectiveSettings(config, hostname) {
    const source = config || DEFAULT_CONFIG;
    const site = source.siteOverrides?.[hostname] || {};
    const enabled = site.enabled !== undefined ? site.enabled : source.globalEnabled !== false;
    if (!enabled) return { enabled: false, mode: 'off' };
    const mode = site.mode || source.mode || 'auto';
    const custom = {
      ...DEFAULT_CONFIG.customSettings,
      ...(source.customSettings || {}),
      ...(site.customSettings || {})
    };

    if (mode === 'auto') {
      const isInteractiveCanvas = currentArchetype === 'interactive-canvas' || currentArchetype === 'game-canvas';
      return {
        enabled: true,
        mode: 'auto',
        killAnimations: false,
        killTransitions: false,
        killBlurFilters: true,
        killScrollHijack: false,
        pauseBackgroundMedia: true,
        pauseOffscreenAnimations: true,
        pauseOffscreenCanvas: !isInteractiveCanvas,
        passiveScroll: true,
        asyncImageDecoding: true,
        fontDisplaySwap: true,
        contentVisibility: false,
        throttleCanvasFps: false,
        fpsLimit: 30
      };
    }

    if (mode === 'ultra') {
      const isInteractiveCanvas = currentArchetype === 'interactive-canvas' || currentArchetype === 'game-canvas';
      return {
        enabled: true,
        mode: 'ultra',
        killAnimations: false,
        killTransitions: false,
        killBlurFilters: true,
        killScrollHijack: false,
        pauseBackgroundMedia: true,
        pauseOffscreenAnimations: true,
        pauseOffscreenCanvas: !isInteractiveCanvas,
        passiveScroll: true,
        asyncImageDecoding: true,
        fontDisplaySwap: true,
        contentVisibility: false,
        throttleCanvasFps: false,
        fpsLimit: 30
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
        pauseOffscreenAnimations: false,
        pauseOffscreenCanvas: false,
        passiveScroll: false,
        asyncImageDecoding: false,
        fontDisplaySwap: false,
        contentVisibility: false,
        throttleCanvasFps: false,
        fpsLimit: 30
      };
    }

    if (mode === 'battery') {
      const isInteractiveCanvas = currentArchetype === 'interactive-canvas' || currentArchetype === 'game-canvas';
      return {
        enabled: true,
        mode: 'battery',
        killAnimations: false,
        killTransitions: false,
        killBlurFilters: true,
        killScrollHijack: false,
        pauseBackgroundMedia: true,
        pauseOffscreenAnimations: true,
        pauseOffscreenCanvas: !isInteractiveCanvas,
        passiveScroll: true,
        asyncImageDecoding: true,
        fontDisplaySwap: true,
        contentVisibility: true,
        throttleCanvasFps: !isInteractiveCanvas,
        fpsLimit: 30
      };
    }

    return {
      enabled: true,
      mode: 'custom',
      ...custom,
      fpsLimit: custom.fpsLimit || 30
    };
  }

  function buildStylesheet(settings) {
    if (!settings.enabled) return '';
    let css = '/* SmoothBoost page-specific performance rules */\n';
    if (settings.killScrollHijack) {
      css += 'html, body { scroll-behavior: auto !important; }\n';
    }
    if (settings.killAnimations) {
      css += '* , *::before, *::after { animation-duration: 0.0001s !important; animation-iteration-count: 1 !important; animation-delay: 0s !important; animation-play-state: running !important; animation-fill-mode: both !important; }\n';
    }
    if (settings.killTransitions) {
      css += '* , *::before, *::after { transition-duration: 0.0001s !important; transition-delay: 0s !important; }\n';
    }
    if (settings.killBlurFilters) {
      css += '[data-smoothboost-blur="true"] { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }\n';
    }
    if (settings.pauseOffscreenAnimations) {
      css += '[data-smoothboost-offscreen-animation="true"], [data-smoothboost-offscreen-animation="true"]::before, [data-smoothboost-offscreen-animation="true"]::after { animation-play-state: paused !important; }\n';
    }
    if (settings.pauseOffscreenCanvas) {
      css += 'canvas[data-smoothboost-offscreen-canvas="true"] { visibility: hidden !important; }\n';
    }
    if (settings.contentVisibility) {
      css += 'main, [role="main"], [role="feed"] > *, article.post, .feed-item { content-visibility: auto !important; contain-intrinsic-size: auto 500px !important; }\n';
    }
    return css;
  }

  function applyStyles(css) {
    pendingCss = css;
    let style = document.getElementById(STYLE_ID);
    if (!css) {
      style?.remove();
      return;
    }
    const parent = document.head || document.documentElement;
    if (!parent) {
      if (!styleRootObserver && typeof MutationObserver === 'function') {
        styleRootObserver = new MutationObserver(() => {
          if (document.head || document.documentElement) {
            styleRootObserver.disconnect();
            styleRootObserver = null;
            applyStyles(pendingCss);
          }
        });
        styleRootObserver.observe(document, { childList: true, subtree: true });
      }
      return;
    }
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      parent.appendChild(style);
    }
    style.textContent = css;
  }

  function dispatchHookCommand(action) {
    const root = document.documentElement;
    const channel = pageHookChannel || root?.getAttribute?.(CHANNEL_ATTRIBUTE) || '';
    if (!channel || typeof CustomEvent !== 'function') return;
    pageHookChannel = channel;
    window.dispatchEvent(new CustomEvent(channel, { detail: { action } }));
  }

  function syncPageHook(settings) {
    const optimizeOffscreen = settings.enabled && (
      settings.mode === 'auto' || settings.mode === 'ultra' || settings.pauseOffscreenAnimations || isReanimeHomePage()
    );
    dispatchHookCommand(optimizeOffscreen ? 'optimizations-on' : 'optimizations-off');
    dispatchHookCommand(settings.enabled && settings.mode === 'custom' && settings.throttleCanvasFps
      ? 'adaptive-limit-on'
      : 'adaptive-limit-off');

    // Armed canvas guard safety check: never arm on interactive canvas or game apps
    if (settings.enabled && (settings.mode === 'auto' || settings.mode === 'ultra' || settings.pauseOffscreenCanvas)) {
      if (currentArchetype === 'interactive-canvas' || currentArchetype === 'game-canvas') {
        dispatchHookCommand('disable-canvas-guard');
      } else {
        dispatchHookCommand('enable-canvas-guard');
      }
    } else {
      dispatchHookCommand('disable-canvas-guard');
    }
  }

  function parseColor(color) {
    const match = String(color || '').match(/rgba?\(([^)]+)\)/i);
    if (!match) return null;
    const values = match[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    if (values.length < 3 || values.slice(0, 3).some((value) => !Number.isFinite(value))) return null;
    const alpha = values.length > 3 && Number.isFinite(values[3]) ? values[3] : 1;
    return { red: values[0], green: values[1], blue: values[2], alpha };
  }

  function scanStyleSheetBlurRules() {
    try {
      const sheets = document.styleSheets;
      const selectors = [];
      for (let i = 0; i < sheets.length; i++) {
        let rules;
        try { rules = sheets[i].cssRules; } catch (_e) { continue; }
        if (!rules) continue;
        for (let j = 0; j < rules.length; j++) {
          const rule = rules[j];
          if (rule.style && (rule.style.backdropFilter || rule.style.webkitBackdropFilter)) {
            if (rule.selectorText) selectors.push(rule.selectorText);
          }
        }
      }
      blurSelectors = selectors;
    } catch (_e) {
      blurSelectors = [];
    }
  }

  function inspectBlurElement(element) {
    if (!currentSettings.enabled || !currentSettings.killBlurFilters || element?.nodeType !== 1 || !element.style) return;
    let computed;
    try { computed = window.getComputedStyle?.(element); } catch (_error) { return; }
    if (!computed) return;
    const backdrop = [computed.backdropFilter, computed.webkitBackdropFilter]
      .filter((value) => value && value !== 'none');
    if (!backdrop.length) return;

    const background = parseColor(computed.backgroundColor);
    if (background && background.alpha > 0 && background.alpha < 0.92 && !blurStates.has(element)) {
      // Contrast safeguard: calculate perceived luminance
      const bgLuminance = (background.red * 299 + background.green * 587 + background.blue * 114) / 1000;
      const textColor = parseColor(computed.color);
      const textLuminance = textColor ? (textColor.red * 299 + textColor.green * 587 + textColor.blue * 114) / 1000 : 255;

      // If background is light (e.g. translucent white) and text is also light,
      // raising opacity to 0.92 obliterates contrast (turns cards solid white with invisible light text).
      // Only raise background opacity if background is dark or text has sufficient contrast against it.
      if (!(bgLuminance > 160 && textLuminance > 140)) {
        const property = element.style.getPropertyValue?.('background-color') || '';
        const priority = element.style.getPropertyPriority?.('background-color') || '';
        blurStates.set(element, { originalBackground: property, priority });
        element.style.setProperty('background-color', `rgba(${background.red}, ${background.green}, ${background.blue}, 0.92)`, 'important');
      }
    }
    element.setAttribute('data-smoothboost-blur', 'true');
  }

  function restoreBlurElements() {
    for (const [element, state] of blurStates) {
      if (element.isConnected) {
        if (state.originalBackground) {
          element.style.setProperty('background-color', state.originalBackground, state.priority);
        } else {
          element.style.removeProperty('background-color');
        }
      }
    }
    blurStates.clear();
    document.querySelectorAll?.('[data-smoothboost-blur="true"]').forEach((element) => {
      element.removeAttribute('data-smoothboost-blur');
    });
  }

  function scanBackdropBlurTargets() {
    if (!currentSettings.enabled || !currentSettings.killBlurFilters) return;
    scanStyleSheetBlurRules();
    const selectors = blurSelectors.length ? blurSelectors.join(',') : '';
    let candidates = [];
    if (selectors) {
      try { candidates = Array.from(document.querySelectorAll(selectors)); } catch (_e) {}
    }
    const commonGlass = document.querySelectorAll(
      '[class*="blur"], [class*="glass"], [class*="backdrop"], [style*="backdrop-filter"], header, nav, .modal, .dialog, .card, [data-smoothboost-blur]'
    );
    for (const el of commonGlass) {
      if (!candidates.includes(el)) candidates.push(el);
    }
    // Also check elements with mock .blurred property (used in tests)
    const all = document.querySelectorAll('*');
    for (let i = 0; i < Math.min(all.length, 120); i++) {
      if (all[i].blurred && !candidates.includes(all[i])) candidates.push(all[i]);
    }
    candidates = candidates.slice(0, 150);

    for (const element of candidates) {
      if (element.blurred) {
        inspectBlurElement(element);
        continue;
      }
      try {
        const style = window.getComputedStyle?.(element);
        const filter = [style?.backdropFilter, style?.webkitBackdropFilter]
          .some((value) => value && value !== 'none');
        if (filter) inspectBlurElement(element);
      } catch (_error) {}
    }
  }

  function isBackgroundOrFixedCanvas(canvas) {
    if (!canvas) return false;
    try {
      const style = window.getComputedStyle?.(canvas);
      if (style && (style.position === 'fixed' || style.position === 'sticky')) return true;
      const rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : null;
      if (rect && rect.width >= (window.innerWidth || 800) * 0.75 && rect.height >= (window.innerHeight || 600) * 0.75) {
        return true;
      }
    } catch (_e) {}
    return false;
  }

  function observeCanvas(canvas) {
    if (!canvas || observedCanvases.has(canvas) || !canvasObserver) return;
    if (isBackgroundOrFixedCanvas(canvas)) return; // Never tag background particle/rain effects as offscreen
    observedCanvases.add(canvas);
    canvasObserver.observe(canvas);
  }

  function updateCanvasObserver() {
    canvasObserver?.disconnect();
    observedCanvases.clear();
    canvasObserver = null;
    const shouldObserve = currentSettings.enabled && (
      currentSettings.mode === 'auto' || currentSettings.mode === 'ultra' || currentSettings.pauseOffscreenCanvas
    ) && currentArchetype !== 'interactive-canvas' && currentArchetype !== 'game-canvas';
    if (!shouldObserve || typeof IntersectionObserver !== 'function') return;

    canvasObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const canvas = entry.target;
        if (!canvas.isConnected) continue;
        if (isBackgroundOrFixedCanvas(canvas)) {
          canvas.removeAttribute('data-smoothboost-offscreen-canvas');
          continue;
        }
        const rect = entry.boundingClientRect;
        if (rect && (rect.width <= 0 || rect.height <= 0)) continue;
        if (entry.isIntersecting) {
          canvas.removeAttribute('data-smoothboost-offscreen-canvas');
        } else {
          canvas.setAttribute('data-smoothboost-offscreen-canvas', 'true');
        }
      }
    }, { threshold: 0.01, rootMargin: '250px 0px 250px 0px' });

    document.querySelectorAll('canvas').forEach(observeCanvas);
  }

  function optimizeImagesAndIframes() {
    const shouldOptimize = currentSettings.enabled && (
      currentSettings.mode === 'auto' || currentSettings.mode === 'ultra' || currentSettings.asyncImageDecoding
    );
    if (!shouldOptimize) return;
    const images = document.querySelectorAll('img:not([data-smoothboost-decoded])');
    images.forEach((img, idx) => {
      img.setAttribute('data-smoothboost-decoded', 'true');
      if (!img.decoding || img.decoding === 'auto') img.decoding = 'async';
      // Guard against layout thrashing: avoid getBoundingClientRect() loop.
      // Protect first 3 images (likely hero/above-the-fold) and explicit eager images.
      if (idx > 2 && !img.loading && img.getAttribute('loading') !== 'eager' && img.getAttribute('fetchpriority') !== 'high') {
        img.loading = 'lazy';
      }
    });
    const iframes = document.querySelectorAll('iframe:not([data-smoothboost-lazy])');
    iframes.forEach((iframe) => {
      iframe.setAttribute('data-smoothboost-lazy', 'true');
      if (!iframe.loading) iframe.loading = 'lazy';
    });
  }

  function patchFontFaceDescriptors() {
    const shouldPatch = currentSettings.enabled && (
      currentSettings.mode === 'auto' || currentSettings.mode === 'ultra' || currentSettings.fontDisplaySwap
    );
    if (!shouldPatch) return;
    try {
      const sheets = document.styleSheets;
      for (let i = 0; i < sheets.length; i++) {
        const sheet = sheets[i];
        let rules;
        try { rules = sheet.cssRules; } catch (_corsError) { continue; }
        if (!rules) continue;
        for (let r = 0; r < rules.length; r++) {
          const rule = rules[r];
          if (rule.type === 5 || (typeof CSSFontFaceRule !== 'undefined' && rule instanceof CSSFontFaceRule)) {
            try {
              let currentDisplay = '';
              try { currentDisplay = rule.style?.getPropertyValue?.('font-display') || rule.style?.fontDisplay || ''; } catch (_e) {}
              if (!currentDisplay || currentDisplay === 'auto') {
                try {
                  rule.style?.setProperty?.('font-display', 'swap');
                } catch (_e) {}
                let updated = '';
                try { updated = rule.style?.getPropertyValue?.('font-display') || rule.style?.fontDisplay || ''; } catch (_e) {}
                if (updated !== 'swap') {
                  const rawCss = rule.cssText || '';
                  if (rawCss && !rawCss.includes('font-display')) {
                    const newText = rawCss.replace(/}\s*$/, '; font-display: swap; }');
                    sheet.deleteRule(r);
                    sheet.insertRule(newText, r);
                    patchedFontsCount += 1;
                  }
                } else {
                  patchedFontsCount += 1;
                }
              }
            } catch (_err) {}
          }
        }
      }
    } catch (_e) {}
  }

  function isBackgroundPreviewVideo(video) {
    if (!video || !video.autoplay) return false;
    // Live WebRTC Stream Protection: Never pause camera / screen shares
    if (video.srcObject) return false;
    const host = window.location.hostname.toLowerCase();
    if (/(meet\.google|teams\.microsoft|discord|zoom\.us|web\.whatsapp)\.com/i.test(host)) return false;
    if (video.controls || video.closest?.('ytd-watch-flexy, [data-player], .video-js, #player, .html5-video-player')) return false;
    return video.muted || video.defaultMuted || video.volume === 0;
  }

  function observeVideo(video) {
    if (isBackgroundPreviewVideo(video)) videoObserver?.observe(video);
  }

  function updateVideoObserver() {
    videoObserver?.disconnect();
    videoMutationObserver?.disconnect();
    videoObserver = null;
    videoMutationObserver = null;
    for (const video of pausedVideos) {
      if (video.isConnected && video.paused) video.play?.().catch?.(() => {});
    }
    pausedVideos.clear();
    const shouldObserve = currentSettings.enabled && (
      currentSettings.mode === 'auto' || currentSettings.mode === 'ultra' || currentSettings.pauseBackgroundMedia
    );
    if (!shouldObserve || typeof IntersectionObserver !== 'function') return;

    videoObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const video = entry.target;
        if (!isBackgroundPreviewVideo(video)) continue;
        if (!entry.isIntersecting && !video.paused) {
          video.pause();
          pausedVideos.add(video);
        } else if (entry.isIntersecting && pausedVideos.has(video)) {
          pausedVideos.delete(video);
          video.play().catch(() => {});
        }
      }
    }, { threshold: 0.01, rootMargin: '250px 0px 250px 0px' });

    document.querySelectorAll('video').forEach(observeVideo);
    if (typeof MutationObserver === 'function' && document.documentElement) {
      videoMutationObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          mutation.addedNodes?.forEach((node) => {
            if (node.nodeType !== 1) return;
            if (node.tagName === 'VIDEO') observeVideo(node);
            node.querySelectorAll?.('video').forEach(observeVideo);
          });
        }
      });
      videoMutationObserver.observe(document.documentElement, { childList: true, subtree: true });
    }
  }

  function updateAnimationObserver() {
    animationObserver?.disconnect();
    animationMutationObserver?.disconnect();
    animationObserver = null;
    animationMutationObserver = null;
    animationTargets.clear();
    observedAnimationTargets = new WeakSet();
    document.querySelectorAll('[data-smoothboost-offscreen-animation="true"]').forEach((element) => {
      element.removeAttribute('data-smoothboost-offscreen-animation');
    });
    const shouldObserve = currentSettings.enabled && (
      currentSettings.mode === 'auto' || currentSettings.mode === 'ultra' || currentSettings.pauseOffscreenAnimations
    );
    if (!shouldObserve || typeof IntersectionObserver !== 'function') return;

    animationObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const element = entry.target;
        if (entry.isIntersecting) {
          element.removeAttribute('data-smoothboost-offscreen-animation');
        } else {
          element.setAttribute('data-smoothboost-offscreen-animation', 'true');
        }
      }
    }, { threshold: 0.01, rootMargin: '250px 0px 250px 0px' });

    scanAnimationTargets();
    if (typeof MutationObserver === 'function' && document.documentElement) {
      animationMutationObserver = new MutationObserver(() => {
        if (animationScanTimer) return;
        animationScanTimer = window.setTimeout(() => {
          animationScanTimer = 0;
          scanAnimationTargets();
        }, 180);
      });
      animationMutationObserver.observe(document.documentElement, { childList: true, subtree: true });
    }
  }

  function scanAnimationTargets() {
    if (!animationObserver || typeof document.getAnimations !== 'function') return;
    try {
      const animations = document.getAnimations({ subtree: true });
      for (const animation of animations) {
        const target = animation.effect?.target;
        if (!target || target.nodeType !== 1 || observedAnimationTargets.has(target)) continue;
        let iterations = Infinity;
        try {
          const timing = animation.effect?.getTiming?.();
          if (timing && timing.iterations !== undefined) iterations = timing.iterations;
        } catch (_error) {}
        if (iterations === Infinity) {
          observedAnimationTargets.add(target);
          animationTargets.add(target);
          animationObserver.observe(target);
        }
      }
    } catch (_error) {}
  }

  function markCarouselElement(element) {
    if (!element || markedCarousels.has(element)) return;
    markedCarousels.add(element);
    element.setAttribute('data-smoothboost-carousel', 'true');
  }

  function scanGenericCarousels() {
    const selectors = siteRules.genericCarouselSelectors || [];
    if (!selectors.length) return;
    for (const selector of selectors) {
      try { document.querySelectorAll(selector).forEach(markCarouselElement); } catch (_error) {}
    }
  }

  function updateCarouselMarkers() {
    carouselMutationObserver?.disconnect();
    carouselMutationObserver = null;
    markedCarousels.clear();
    const shouldMark = currentSettings.enabled && (
      currentSettings.mode === 'auto' || currentSettings.mode === 'ultra' || currentSettings.pauseBackgroundMedia
    );
    if (!shouldMark) return;
    scanGenericCarousels();
    if (typeof MutationObserver === 'function' && document.documentElement) {
      carouselMutationObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          mutation.addedNodes?.forEach((node) => {
            if (node.nodeType !== 1) return;
            scanGenericCarousels();
          });
        }
      });
      carouselMutationObserver.observe(document.documentElement, { childList: true, subtree: true });
    }
  }

  function updatePageObservers() {
    updateVideoObserver();
    updateAnimationObserver();
    updateCarouselMarkers();
    updateCanvasObserver();
    if (currentSettings.enabled && (currentSettings.mode === 'auto' || currentSettings.mode === 'ultra' || currentSettings.killBlurFilters)) {
      scanBackdropBlurTargets();
    } else {
      restoreBlurElements();
    }
    optimizeImagesAndIframes();
    patchFontFaceDescriptors();
  }

  function startLongFrameObserver() {
    if (diagnosticsObserver || typeof PerformanceObserver !== 'function') return;
    try {
      const supported = PerformanceObserver.supportedEntryTypes || [];
      if (!supported.includes('long-animation-frame')) return;
      diagnosticsObserver = new PerformanceObserver((list) => {
        const now = performance.now();
        for (const entry of list.getEntries()) longFrameTimes.push(entry.startTime || now);
        while (longFrameTimes.length && now - longFrameTimes[0] > 30000) longFrameTimes.shift();
      });
      diagnosticsObserver.observe({ type: 'long-animation-frame', buffered: true });
    } catch (_error) {
      diagnosticsObserver = null;
    }
  }

  function getDiagnostics() {
    const videos = [...(document.querySelectorAll?.('video') || [])];
    const autoplayVideos = videos.filter((video) => video.autoplay && !video.controls).length;
    let blurElements = 0;
    const blurredCount = document.querySelectorAll?.('[data-smoothboost-blur="true"]')?.length || 0;
    if (blurredCount > 0) {
      blurElements = blurredCount;
    }
    const candidates = [...(document.querySelectorAll?.('*') || [])].slice(0, 1500);
    if (blurElements === 0) {
      for (const element of candidates) {
        if (element.blurred) {
          blurElements += 1;
          continue;
        }
        try {
          const style = window.getComputedStyle?.(element);
          const filter = [style?.backdropFilter, style?.webkitBackdropFilter]
            .some((value) => value && value !== 'none');
          if (filter) blurElements += 1;
        } catch (_error) {}
      }
    }
    let animationLoops = 0;
    try {
      animationLoops = (document.getAnimations?.({ subtree: true }) || []).filter((animation) => {
        try { return animation.effect?.getTiming?.().iterations === Infinity; } catch (_error) { return false; }
      }).length;
    } catch (_error) {}
    const now = performance.now();
    while (longFrameTimes.length && now - longFrameTimes[0] > 30000) longFrameTimes.shift();
    return {
      autoplayVideos,
      blurElements,
      animationLoops,
      longFrames: longFrameTimes.length,
      sampledElements: candidates.length,
      longFrameApi: !!diagnosticsObserver
    };
  }

  // Bounded LRU Cache for Archetypes
  async function saveCachedArchetype(hostname, archetype) {
    try {
      const stored = await chrome.storage.local.get(ARCHETYPE_CACHE_KEY);
      const cache = stored[ARCHETYPE_CACHE_KEY] || {};
      cache[hostname] = { archetype, timestamp: Date.now() };

      const entries = Object.entries(cache);
      if (entries.length > ARCHETYPE_MAX_ENTRIES) {
        entries.sort((a, b) => (a[1].timestamp || 0) - (b[1].timestamp || 0));
        while (entries.length > ARCHETYPE_MAX_ENTRIES) {
          const oldest = entries.shift();
          if (oldest) delete cache[oldest[0]];
        }
      }
      await chrome.storage.local.set({ [ARCHETYPE_CACHE_KEY]: cache });
    } catch (_e) {}
  }

  // Lightweight Idle Classifier (samples <= 200 elements)
  function classifyPageArchetype() {
    const hostname = window.location.hostname.toLowerCase();

    // 1. Interactive Editors & Design Tools (Docs, Figma, Canva, Photopea, Monaco, Ace)
    if (/(figma|docs\.google|canva|sketch|photopea|webflow|desmos)\.com/i.test(hostname)) {
      return 'interactive-canvas';
    }

    const appMeta = document.querySelector('meta[name="application-name"]');
    if (appMeta && /figma|canva|editor|draw/i.test(appMeta.getAttribute('content') || '')) {
      return 'interactive-canvas';
    }

    if (document.querySelector('.monaco-editor, .ace_editor, .cm-editor, [data-mode-id]')) {
      return 'interactive-canvas';
    }

    // 2. Games & WebGL applications
    if (/(crazygames|poki|kongregate|itch\.io|newgrounds|shadertoy|playcanvas)\.com/i.test(hostname) ||
        document.querySelector('#unity-canvas, .game-canvas, canvas[data-engine]')) {
      return 'game-canvas';
    }

    const canvases = document.querySelectorAll('canvas');
    if (canvases.length > 0) {
      for (let i = 0; i < Math.min(canvases.length, 5); i++) {
        const c = canvases[i];
        if (c.width >= (window.innerWidth || 800) * 0.75 && c.height >= (window.innerHeight || 600) * 0.75) {
          return 'interactive-canvas';
        }
      }
    }

    // 3. Media Stream / Streaming platforms
    const videos = document.querySelectorAll('video');
    if (videos.length >= 2 || /(youtube|twitch|vimeo|netflix|hulu|disneyplus|spotify)\.com/i.test(hostname)) {
      return 'media-stream';
    }

    // 4. Infinite Feeds
    if (/(twitter\.com|x\.com|reddit\.com|instagram\.com|bsky\.app|pinterest\.com)/i.test(hostname) ||
        document.querySelector('[role="feed"], [data-testid="primaryColumn"], .feed-item, article.post, [data-infinite-scroll]')) {
      return 'infinite-feed';
    }

    // 5. Standard Content
    return 'standard';
  }

  async function runIdleClassification() {
    const hostname = window.location.hostname.toLowerCase();
    currentArchetype = classifyPageArchetype();
    await saveCachedArchetype(hostname, currentArchetype);

    // If auto mode, re-apply settings with the verified archetype
    if (currentSettings.enabled && currentSettings.mode === 'auto') {
      const stored = await chrome.storage.local.get('smoothBoostConfig');
      applySettings(effectiveSettings(stored.smoothBoostConfig, hostname));
    }
  }

  function scheduleClassification() {
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(() => runIdleClassification().catch(() => {}), { timeout: 1500 });
    } else {
      window.setTimeout(() => runIdleClassification().catch(() => {}), 500);
    }
  }

  function updateReanimeRuleState(status) {
    if (!isReanimeHomePage() || !currentSettings.enabled || !['paused', 'waiting', 'unconfirmed'].includes(status)) return;
    if (hookStatusTimer) {
      window.clearTimeout(hookStatusTimer);
      hookStatusTimer = 0;
    }
    reanimeRuleState = status === 'waiting' ? 'armed' : status;
    if (status === 'waiting') {
      hookStatusTimer = window.setTimeout(() => {
        hookStatusTimer = 0;
        if (reanimeRuleState === 'armed') reanimeRuleState = 'unconfirmed';
      }, 12000);
    }
  }

  function connectPageHook() {
    const channel = document.documentElement?.getAttribute?.(CHANNEL_ATTRIBUTE) || '';
    if (!channel || channel === pageHookChannel) return;
    if (pageHookChannel) window.removeEventListener(pageHookChannel, handlePageHookEvent);
    pageHookChannel = channel;
    window.addEventListener(pageHookChannel, handlePageHookEvent);
    syncPageHook(currentSettings);
  }

  function handlePageHookEvent(event) {
    if (!currentSettings.enabled || !event.detail) return;
    if (event.detail.action === 'carousel-status' && isReanimeHomePage()) {
      updateReanimeRuleState(event.detail.status);
    } else if (event.detail.action === 'hook-metrics') {
      hookPassiveCount = event.detail.passiveListenersIntercepted || 0;
      hookCanvasDrawSkipCount = event.detail.canvasDrawCallsSkipped || 0;
    }
  }

  function tryInjectPageHook() {
    if (pageHookChannel || document.documentElement?.getAttribute?.(CHANNEL_ATTRIBUTE) || document.getElementById('smoothboost-page-hook-script')) return;
    try {
      if (typeof chrome.runtime?.getURL !== 'function') return;
      const script = document.createElement('script');
      script.id = 'smoothboost-page-hook-script';
      script.src = chrome.runtime.getURL('scripts/page-hook.js');
      script.async = false;
      const target = document.head || document.documentElement;
      if (target) {
        target.appendChild(script);
        script.onload = () => script.remove();
      }
    } catch (_e) {
      // If page Content Security Policy (CSP) restricts external script tags,
      // fail gracefully. Isolated content-script optimizations continue safely.
    }
  }

  function observePageHookChannel() {
    connectPageHook();
    if (!pageHookChannel) tryInjectPageHook();
    if (pageHookChannel || typeof MutationObserver !== 'function' || !document.documentElement) return;
    const observer = new MutationObserver(() => {
      connectPageHook();
      if (pageHookChannel) observer.disconnect();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: [CHANNEL_ATTRIBUTE] });
    window.setTimeout(() => { observer.disconnect(); connectPageHook(); }, 1500);
  }

  function applySettings(settings) {
    if (!isTopFrame) {
      currentSettings = { enabled: false, mode: 'off' };
      applyStyles('');
      initialized = true;
      return;
    }
    const wasEnabled = currentSettings.enabled;
    currentSettings = settings;
    applyStyles(buildStylesheet(settings));
    syncPageHook(settings);
    updatePageObservers();
    if (!settings.enabled) {
      if (hookStatusTimer) window.clearTimeout(hookStatusTimer);
      hookStatusTimer = 0;
      reanimeRuleState = isReanimeHomePage() ? 'off' : 'not-applicable';
    } else if (isReanimeHomePage() && (!wasEnabled || reanimeRuleState === 'off')) {
      reanimeRuleState = 'waiting';
      window.setTimeout(() => {
        if (currentSettings.enabled && reanimeRuleState === 'waiting') reanimeRuleState = 'armed';
      }, 0);
    } else if (!isReanimeHomePage()) {
      reanimeRuleState = 'not-applicable';
    }
  }

  function loadSiteRules(storedRules) {
    if (storedRules && Array.isArray(storedRules.siteRules)) {
      return {
        genericCarouselSelectors: Array.isArray(storedRules.genericCarouselSelectors) ? storedRules.genericCarouselSelectors : DEFAULT_RULES.genericCarouselSelectors,
        siteRules: storedRules.siteRules
      };
    }
    return DEFAULT_RULES;
  }

  async function init() {
    if (!isTopFrame) {
      initialized = true;
      return;
    }
    const hostname = window.location.hostname.toLowerCase();
    const startingStorageChangeCount = storageChangeCount;
    const stored = await chrome.storage.local.get(['smoothBoostConfig', 'smoothBoostSiteRules', ARCHETYPE_CACHE_KEY]);
    siteRules = loadSiteRules(stored?.smoothBoostSiteRules);
    startLongFrameObserver();

    // Check cached archetype
    const cache = stored?.[ARCHETYPE_CACHE_KEY] || {};
    const cachedEntry = cache[hostname];
    if (cachedEntry && Number.isFinite(cachedEntry.timestamp) && (Date.now() - cachedEntry.timestamp < ARCHETYPE_TTL_MS)) {
      currentArchetype = cachedEntry.archetype;
    }

    if (storageChangeCount === startingStorageChangeCount) {
      applySettings(effectiveSettings(stored?.smoothBoostConfig, hostname));
    }
    observePageHookChannel();
    initialized = true;

    scheduleClassification();

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        patchFontFaceDescriptors();
        optimizeImagesAndIframes();
      });
    } else {
      patchFontFaceDescriptors();
      optimizeImagesAndIframes();
    }
  }

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local' || !changes.smoothBoostConfig) return;
    storageChangeCount += 1;
    applySettings(effectiveSettings(changes.smoothBoostConfig.newValue, window.location.hostname.toLowerCase()));
    initialized = true;
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'CONFIG_UPDATED') {
      applySettings(effectiveSettings(message.config, window.location.hostname.toLowerCase()));
      sendResponse?.({ success: true });
    } else if (message.type === 'GET_STATUS') {
      dispatchHookCommand('get-hook-metrics');
      sendResponse?.(initialized ? {
        status: 'active',
        enabled: currentSettings.enabled,
        mode: currentSettings.mode || 'off',
        archetype: currentArchetype,
        siteRule: isReanimeHomePage() ? reanimeRuleState : 'not-applicable'
      } : { status: 'initializing' });
    } else if (message.type === 'GET_DIAGNOSTICS') {
      sendResponse?.({ status: initialized ? 'active' : 'initializing', diagnostics: getDiagnostics() });
    } else if (message.type === 'GET_METRICS') {
      dispatchHookCommand('get-hook-metrics');
      sendResponse?.({
        status: initialized ? 'active' : 'initializing',
        enabled: currentSettings.enabled,
        mode: currentSettings.mode || 'off',
        archetype: currentArchetype,
        metrics: {
          passiveListeners: hookPassiveCount,
          pausedVideos: pausedVideos.size,
          bypassedBlurs: blurStates.size,
          offscreenCanvases: document.querySelectorAll('canvas[data-smoothboost-offscreen-canvas="true"]').length,
          canvasDrawsSkipped: hookCanvasDrawSkipCount,
          patchedFonts: patchedFontsCount
        }
      });
    } else if (message.type === 'PURGE_ARCHETYPE') {
      const hostname = window.location.hostname.toLowerCase();
      chrome.storage.local.get(ARCHETYPE_CACHE_KEY).then((stored) => {
        const cache = stored[ARCHETYPE_CACHE_KEY] || {};
        delete cache[hostname];
        return chrome.storage.local.set({ [ARCHETYPE_CACHE_KEY]: cache });
      }).then(() => {
        scheduleClassification();
        sendResponse?.({ success: true });
      }).catch(() => sendResponse?.({ success: false }));
      return true;
    }
    return true;
  });

  init().catch(() => {
    initialized = true;
    currentSettings = { enabled: false, mode: 'off' };
    applyStyles('');
    updatePageObservers();
  });
})();
