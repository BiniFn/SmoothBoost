const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const hookSource = fs.readFileSync(path.join(__dirname, '../scripts/page-hook.js'), 'utf8');
const contentSource = fs.readFileSync(path.join(__dirname, '../scripts/content.js'), 'utf8');

test('page hook enforces passive event listeners for wheel and touch events', () => {
  let registeredOptions = null;
  class MockEventTarget {
    addEventListener(type, listener, options) {
      registeredOptions = options;
    }
  }

  const root = {
    setAttribute() {},
    getAttribute() { return null; },
    querySelectorAll() { return []; }
  };
  const window = new MockEventTarget();
  window.location = { hostname: 'example.com' };
  window.top = window;
  window.crypto = { getRandomValues(bytes) { return bytes; } };
  window.requestAnimationFrame = () => 1;
  window.cancelAnimationFrame = () => {};
  window.setInterval = () => 1;
  window.clearInterval = () => {};
  window.setTimeout = () => 1;
  window.clearTimeout = () => {};
  window.dispatchEvent = () => true;
  const document = new MockEventTarget();
  document.documentElement = root;
  document.body = {};
  document.querySelector = () => null;
  document.querySelectorAll = () => [];

  vm.runInNewContext(hookSource, {
    window,
    document,
    EventTarget: MockEventTarget,
    CustomEvent: class { constructor(type, opt = {}) { this.type = type; this.detail = opt.detail; } },
    IntersectionObserver: class { constructor() {} observe() {} disconnect() {} },
    MutationObserver: class { constructor() {} observe() {} disconnect() {} },
    PerformanceObserver: class { static supportedEntryTypes = []; constructor() {} observe() {} disconnect() {} },
    Date,
    Map,
    Number,
    Uint8Array,
    Math
  });

  const target = new MockEventTarget();
  target.addEventListener('wheel', () => {}, { passive: false });
  assert.equal(registeredOptions.passive, true, 'wheel listener is upgraded to passive: true');

  target.addEventListener('touchstart', () => {}, false);
  assert.equal(registeredOptions.passive, true, 'touchstart listener boolean option is converted to passive: true');
});

test('canvas draw calls are skipped when offscreen canvas attribute is set', () => {
  let clearRectCalled = false;
  let drawImageCalled = false;

  class FakeCanvas2D {
    constructor(canvas) { this.canvas = canvas; }
    clearRect() { clearRectCalled = true; }
    drawImage() { drawImageCalled = true; }
  }

  const root = {
    setAttribute() {},
    getAttribute() { return null; },
    querySelectorAll() { return []; }
  };
  const window = {
    location: { hostname: 'example.com' },
    top: null,
    crypto: { getRandomValues(b) { return b; } },
    requestAnimationFrame: () => 1,
    cancelAnimationFrame: () => {},
    setInterval: () => 1,
    clearInterval: () => {},
    setTimeout: () => 1,
    clearTimeout: () => {},
    addEventListener: () => {},
    dispatchEvent: () => true
  };
  window.top = window;
  const document = {
    documentElement: root,
    body: {},
    querySelector: () => null,
    querySelectorAll: () => []
  };

  vm.runInNewContext(hookSource, {
    window,
    document,
    CanvasRenderingContext2D: FakeCanvas2D,
    CustomEvent: class { constructor(t, o = {}) { this.type = t; this.detail = o.detail; } },
    IntersectionObserver: class { constructor() {} observe() {} disconnect() {} },
    MutationObserver: class { constructor() {} observe() {} disconnect() {} },
    PerformanceObserver: class { static supportedEntryTypes = []; constructor() {} observe() {} disconnect() {} },
    Date,
    Map,
    Number,
    Uint8Array,
    Math
  });

  const offscreenCanvas = {
    getAttribute(name) { return name === 'data-smoothboost-offscreen-canvas' ? 'true' : null; }
  };
  const ctxOffscreen = new FakeCanvas2D(offscreenCanvas);
  ctxOffscreen.clearRect(0, 0, 100, 100);
  ctxOffscreen.drawImage();
  assert.equal(clearRectCalled, false, 'clearRect skipped for offscreen canvas');
  assert.equal(drawImageCalled, false, 'drawImage skipped for offscreen canvas');

  const visibleCanvas = {
    getAttribute() { return null; }
  };
  const ctxVisible = new FakeCanvas2D(visibleCanvas);
  ctxVisible.clearRect(0, 0, 100, 100);
  assert.equal(clearRectCalled, true, 'clearRect executes for visible canvas');
});

test('content script observes canvas elements and tags offscreen state', async () => {
  const observers = [];
  class MockIntersectionObserver {
    constructor(callback) {
      this.callback = callback;
      this.targets = new Set();
      observers.push(this);
    }
    observe(target) { this.targets.add(target); }
    disconnect() { this.targets.clear(); }
    trigger(target, visible) {
      this.callback([{ target, isIntersecting: visible, intersectionRatio: visible ? 1 : 0 }]);
    }
  }

  const canvas = {
    nodeType: 1,
    tagName: 'CANVAS',
    isConnected: true,
    attributes: new Map(),
    setAttribute(k, v) { this.attributes.set(k, String(v)); },
    getAttribute(k) { return this.attributes.get(k) || null; },
    removeAttribute(k) { this.attributes.delete(k); },
    querySelectorAll() { return []; }
  };

  const root = {
    nodeType: 1,
    tagName: 'HTML',
    attributes: new Map(),
    setAttribute(k, v) { this.attributes.set(k, String(v)); },
    getAttribute(k) { return this.attributes.get(k) || null; },
    querySelectorAll(selector) {
      if (selector === 'canvas') return [canvas];
      return [];
    }
  };

  const document = {
    documentElement: root,
    head: { appendChild() {} },
    body: {},
    querySelectorAll(selector) {
      if (selector === 'canvas') return [canvas];
      return [];
    },
    getElementById() { return null; },
    createElement() { return { id: '', textContent: '', remove() {} }; }
  };

  const window = {
    location: { hostname: 'example.com', pathname: '/' },
    setTimeout,
    clearTimeout,
    getComputedStyle: () => ({ backdropFilter: 'none', webkitBackdropFilter: 'none' }),
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {}
  };
  window.top = window;

  const chrome = {
    storage: {
      local: { async get() { return {}; } },
      onChanged: { addListener() {} }
    },
    runtime: {
      getURL() { return 'chrome-extension://test/data/site-rules.json'; },
      onMessage: { addListener() {} }
    }
  };

  vm.runInNewContext(contentSource, {
    chrome,
    document,
    window,
    IntersectionObserver: MockIntersectionObserver,
    MutationObserver: class { constructor() {} observe() {} disconnect() {} },
    CustomEvent: class { constructor(t, o = {}) { this.type = t; this.detail = o.detail; } },
    fetch: async () => ({ ok: true, async json() { return { genericCarouselSelectors: [], siteRules: [] }; } }),
    performance,
    Promise,
    setTimeout,
    clearTimeout
  });

  await new Promise((r) => setImmediate(r));
  const canvasObs = observers.find((obs) => obs.targets.has(canvas));
  assert.ok(canvasObs, 'canvas observer registered');

  canvasObs.trigger(canvas, false);
  assert.equal(canvas.getAttribute('data-smoothboost-offscreen-canvas'), 'true');

  canvasObs.trigger(canvas, true);
  assert.equal(canvas.getAttribute('data-smoothboost-offscreen-canvas'), null);
});

test('passive scroll guard bypasses map containers and preserves preventDefault capability', () => {
  let registeredOptions = null;
  class MockEventTarget {
    addEventListener(type, listener, options) {
      registeredOptions = options;
    }
  }

  const root = { setAttribute() {}, getAttribute() { return null; } };
  const window = {
    location: { hostname: 'example.com' },
    top: null,
    crypto: { getRandomValues(b) { return b; } },
    addEventListener() {},
    dispatchEvent: () => true
  };
  window.top = window;

  vm.runInNewContext(hookSource, {
    window,
    document: { documentElement: root, querySelector: () => null, querySelectorAll: () => [] },
    EventTarget: MockEventTarget,
    CanvasRenderingContext2D: class {},
    CustomEvent: class { constructor(t, o = {}) { this.type = t; this.detail = o.detail; } },
    IntersectionObserver: class { constructor() {} observe() {} disconnect() {} },
    MutationObserver: class { constructor() {} observe() {} disconnect() {} },
    PerformanceObserver: class { static supportedEntryTypes = []; constructor() {} observe() {} disconnect() {} },
    Date, Map, Number, Uint8Array, Math
  });

  // Target inside a Leaflet/Mapbox map container
  const mapElement = new MockEventTarget();
  mapElement.closest = (sel) => sel.includes('.leaflet-container');

  mapElement.addEventListener('wheel', () => {}, { passive: false });
  assert.equal(registeredOptions.passive, false, 'wheel listener inside map container preserves passive: false for zooming');

  // Canvas element
  const canvasElement = new MockEventTarget();
  canvasElement.tagName = 'CANVAS';
  canvasElement.closest = (sel) => sel.includes('canvas');

  canvasElement.addEventListener('wheel', () => {}, { passive: false });
  assert.equal(registeredOptions.passive, false, 'wheel listener on canvas preserves passive: false');
});

test('never skips canvas draw calls on explicitly detached buffer canvases', () => {
  let clearRectCalled = false;
  class FakeCanvas2D {
    constructor(canvas) { this.canvas = canvas; }
    clearRect() { clearRectCalled = true; }
    drawImage() {}
  }

  const root = { setAttribute() {}, getAttribute() { return null; } };
  const window = {
    location: { hostname: 'example.com' },
    top: null,
    crypto: { getRandomValues(b) { return b; } },
    addEventListener() {},
    dispatchEvent: () => true
  };
  window.top = window;

  vm.runInNewContext(hookSource, {
    window,
    document: { documentElement: root, querySelector: () => null, querySelectorAll: () => [] },
    CanvasRenderingContext2D: FakeCanvas2D,
    CustomEvent: class { constructor(t, o = {}) { this.type = t; this.detail = o.detail; } },
    IntersectionObserver: class { constructor() {} observe() {} disconnect() {} },
    MutationObserver: class { constructor() {} observe() {} disconnect() {} },
    PerformanceObserver: class { static supportedEntryTypes = []; constructor() {} observe() {} disconnect() {} },
    Date, Map, Number, Uint8Array, Math
  });

  // Explicitly detached canvas (document.createElement('canvas'))
  const detachedCanvas = {
    isConnected: false,
    getAttribute(name) { return name === 'data-smoothboost-offscreen-canvas' ? 'true' : null; }
  };
  const ctx = new FakeCanvas2D(detachedCanvas);
  ctx.clearRect(0, 0, 100, 100);

  assert.equal(clearRectCalled, true, 'draw calls on detached buffer canvas are never skipped');
});

test('patchFontFaceDescriptors patches style sheets to swap', async () => {
  let fontDisplayValue = '';
  const fakeRule = {
    type: 5,
    style: {
      getPropertyValue(prop) { return prop === 'font-display' ? fontDisplayValue : ''; },
      setProperty(prop, val) { if (prop === 'font-display') fontDisplayValue = val; }
    }
  };
  const fakeSheet = { cssRules: [fakeRule] };
  const root = { setAttribute() {}, getAttribute() { return null; }, querySelectorAll() { return []; } };

  let messageCallback;
  const chrome = {
    storage: {
      local: { async get() { return { smoothBoostConfig: { globalEnabled: true, mode: 'auto' } }; } },
      onChanged: { addListener() {} }
    },
    runtime: {
      getURL() { return 'chrome-extension://test/site-rules.json'; },
      onMessage: { addListener(cb) { messageCallback = cb; } }
    }
  };

  const window = {
    location: { hostname: 'example.com', pathname: '/' },
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => true,
    setTimeout,
    clearTimeout
  };
  window.top = window;

  const document = {
    documentElement: root,
    styleSheets: [fakeSheet],
    head: { appendChild() {} },
    getElementById: () => null,
    createElement: () => ({ setAttribute() {}, remove() {}, id: '', textContent: '' }),
    querySelectorAll() { return []; },
    addEventListener() {}
  };

  vm.runInNewContext(contentSource, {
    chrome,
    document,
    window,
    CSSFontFaceRule: class {},
    MutationObserver: class { observe() {} disconnect() {} },
    IntersectionObserver: class { observe() {} disconnect() {} },
    fetch: async () => ({ ok: true, async json() { return {}; } }),
    performance: { now: () => 0 }
  });

  await new Promise((r) => setTimeout(r, 50));
  assert.equal(fontDisplayValue, 'swap', 'font-display property was patched to swap');
});

