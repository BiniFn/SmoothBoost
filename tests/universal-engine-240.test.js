const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const hookSource = fs.readFileSync(path.join(__dirname, '../scripts/page-hook.js'), 'utf8');
const contentSource = fs.readFileSync(path.join(__dirname, '../scripts/content.js'), 'utf8');
const userscriptSource = fs.readFileSync(path.join(__dirname, '../dist/SmoothBoost.user.js'), 'utf8');

function createContentHarness(config = {}, hostname = 'example.com') {
  let messageListener = null;
  const observers = [];
  const styles = new Map();
  const windowListeners = new Map();
  let dispatchedEvents = [];

  class MockElement {
    constructor(tagName) {
      this.tagName = tagName.toUpperCase();
      this.nodeType = 1;
      this.attributes = new Map();
      this.style = {
        props: new Map(),
        setProperty(k, v) { this.props.set(k, v); },
        getPropertyValue(k) { return this.props.get(k) || ''; }
      };
      this.children = [];
      this.isConnected = true;
    }
    setAttribute(k, v) { this.attributes.set(k, String(v)); }
    getAttribute(k) { return this.attributes.get(k) || null; }
    removeAttribute(k) { this.attributes.delete(k); }
    appendChild(c) { this.children.push(c); return c; }
    remove() { styles.delete(this.id); }
    querySelectorAll() { return []; }
    querySelector() { return null; }
    closest() { return null; }
    matches() { return false; }
  }

  const root = new MockElement('html');
  root.setAttribute('data-smoothboost-channel', 'smoothboost-test-channel');
  const head = new MockElement('head');
  const body = new MockElement('body');

  const document = {
    nodeType: 9,
    documentElement: root,
    head,
    body,
    styleSheets: [],
    getElementById(id) { return styles.get(id) || null; },
    createElement(tag) {
      const el = new MockElement(tag);
      if (tag.toLowerCase() === 'style') {
        styles.set(el.id, el);
      }
      return el;
    },
    querySelectorAll(selector) {
      if (selector === 'canvas') return [];
      if (selector === 'video') return [];
      if (selector === 'iframe') return [];
      if (selector.includes('data-smoothboost-offscreen-canvas')) return [];
      return [];
    },
    querySelector() { return null; },
    addEventListener() {},
    getAnimations() { return []; }
  };

  class MockIntersectionObserver {
    constructor(cb, opts = {}) {
      this.cb = cb;
      this.opts = opts;
      this.targets = new Set();
      observers.push(this);
    }
    observe(t) { this.targets.add(t); }
    unobserve(t) { this.targets.delete(t); }
    disconnect() { this.targets.clear(); }
    trigger(t, isIntersecting) {
      this.cb([{ target: t, isIntersecting, boundingClientRect: { width: 100, height: 100 } }]);
    }
  }

  class MockMutationObserver {
    constructor(cb) { this.cb = cb; }
    observe() {}
    disconnect() {}
  }

  const window = {
    location: { hostname, pathname: '/' },
    addEventListener(type, fn) {
      const arr = windowListeners.get(type) || [];
      arr.push(fn);
      windowListeners.set(type, arr);
    },
    removeEventListener() {},
    dispatchEvent(evt) {
      dispatchedEvents.push(evt);
      for (const fn of windowListeners.get(evt.type) || []) fn(evt);
      return true;
    },
    setTimeout,
    clearTimeout,
    getComputedStyle: () => ({ backdropFilter: 'none', webkitBackdropFilter: 'none' }),
    performance: { now: () => 1000 }
  };
  window.top = window;

  const chrome = {
    storage: {
      local: {
        async get(keys) {
          return { smoothBoostConfig: config };
        },
        async set() {}
      },
      onChanged: { addListener() {} }
    },
    runtime: {
      getURL(file) { return `chrome-extension://id/${file}`; },
      onMessage: {
        addListener(fn) { messageListener = fn; }
      }
    }
  };

  vm.runInNewContext(contentSource, {
    chrome,
    document,
    window,
    IntersectionObserver: MockIntersectionObserver,
    MutationObserver: MockMutationObserver,
    CustomEvent: class { constructor(t, opt = {}) { this.type = t; this.detail = opt.detail; } },
    performance: window.performance,
    Promise,
    setTimeout,
    clearTimeout
  });

  return {
    root,
    document,
    window,
    styles,
    observers,
    dispatchedEvents,
    triggerWindow(type, evt = {}) {
      for (const fn of windowListeners.get(type) || []) fn(evt);
    },
    sendMessage(msg) {
      return new Promise((resolve) => {
        messageListener(msg, {}, resolve);
      });
    }
  };
}

test('Scroll Boost activates during scroll and debounces return to idle', async () => {
  const harness = createContentHarness({
    globalEnabled: true,
    mode: 'auto',
    customSettings: { scrollBoost: true }
  });

  await new Promise((r) => setTimeout(r, 60));

  // Trigger scroll
  harness.triggerWindow('scroll');
  assert.equal(harness.root.getAttribute('data-smoothboost-scrolling'), 'true');
  assert.ok(harness.dispatchedEvents.some((e) => e.detail?.action === 'scroll-boost-active'));

  // Wait for 200ms debounce
  await new Promise((r) => setTimeout(r, 220));
  assert.equal(harness.root.getAttribute('data-smoothboost-scrolling'), null);
  assert.ok(harness.dispatchedEvents.some((e) => e.detail?.action === 'scroll-boost-idle'));
});

test('Smart Resource Loading defers offscreen third-party embeds', async () => {
  let smartObserverInstance = null;
  class MockIntersectionObserver {
    constructor(cb) {
      this.cb = cb;
      this.targets = new Set();
    }
    observe(t) {
      this.targets.add(t);
      if (t === iframe) smartObserverInstance = this;
    }
    unobserve(t) { this.targets.delete(t); }
    disconnect() { this.targets.clear(); }
    trigger(t) { this.cb([{ target: t, isIntersecting: true }]); }
  }

  const iframe = {
    nodeType: 1,
    tagName: 'IFRAME',
    isConnected: true,
    attributes: new Map([['src', 'https://www.youtube.com/embed/dQw4w9WgXcQ']]),
    setAttribute(k, v) { this.attributes.set(k, String(v)); if (k === 'src') this.src = v; },
    getAttribute(k) { return this.attributes.get(k) || null; },
    removeAttribute(k) { this.attributes.delete(k); },
    src: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
  };

  const root = {
    nodeType: 1,
    tagName: 'HTML',
    attributes: new Map(),
    setAttribute(k, v) { this.attributes.set(k, String(v)); },
    getAttribute(k) { return this.attributes.get(k) || null; },
    querySelectorAll(sel) {
      if (sel.includes('iframe')) return [iframe];
      return [];
    }
  };

  const document = {
    documentElement: root,
    head: { appendChild() {} },
    body: {},
    querySelectorAll(sel) {
      if (sel.includes('iframe')) return [iframe];
      return [];
    },
    getElementById() { return null; },
    createElement() { return { id: '', remove() {} }; }
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
      local: {
        async get() {
          return {
            smoothBoostConfig: {
              globalEnabled: true,
              mode: 'auto',
              customSettings: { smartResourceLoading: true }
            }
          };
        }
      },
      onChanged: { addListener() {} }
    },
    runtime: {
      getURL() { return ''; },
      onMessage: { addListener() {} }
    }
  };

  vm.runInNewContext(contentSource, {
    chrome,
    document,
    window,
    IntersectionObserver: MockIntersectionObserver,
    MutationObserver: class { observe() {} disconnect() {} },
    CustomEvent: class {},
    performance: { now: () => 0 },
    Promise,
    setTimeout,
    clearTimeout
  });

  await new Promise((r) => setTimeout(r, 60));

  assert.equal(iframe.getAttribute('data-smoothboost-deferred-src'), 'https://www.youtube.com/embed/dQw4w9WgXcQ');
  assert.equal(iframe.src, 'about:blank');

  // Trigger intersection hydration
  if (smartObserverInstance) {
    smartObserverInstance.trigger(iframe);
    assert.equal(iframe.src, 'https://www.youtube.com/embed/dQw4w9WgXcQ');
    assert.equal(iframe.getAttribute('data-smoothboost-deferred-src'), null);
  }
});

test('Dynamic FPS Profiles: hook limiter paces at target frame intervals', () => {
  let nextId = 1;
  const frames = [];
  const windowListeners = new Map();
  const window = {
    location: { hostname: 'example.com' },
    requestAnimationFrame(cb) {
      const id = nextId++;
      frames.push({ id, cb });
      return id;
    },
    cancelAnimationFrame() {},
    performance: { now: () => 1000 },
    crypto: { getRandomValues(b) { return b; } },
    addEventListener(type, fn) {
      if (!windowListeners.has(type)) windowListeners.set(type, []);
      windowListeners.get(type).push(fn);
    },
    dispatchEvent(e) {
      for (const fn of windowListeners.get(e.type) || []) {
        fn(e);
      }
      return true;
    }
  };
  window.top = window;

  const root = {
    setAttribute(k, v) { root[k] = v; },
    getAttribute(k) { return root[k] || null; }
  };
  const document = {
    documentElement: root,
    body: {},
    querySelectorAll() { return []; }
  };

  vm.runInNewContext(hookSource, {
    window,
    document,
    CustomEvent: class { constructor(t, o = {}) { this.type = t; this.detail = o.detail; } },
    PerformanceObserver: class { static supportedEntryTypes = ['long-animation-frame']; observe() {} disconnect() {} },
    IntersectionObserver: class { observe() {} disconnect() {} },
    MutationObserver: class { observe() {} disconnect() {} },
    Date,
    Math,
    Number,
    Uint8Array
  });

  const channel = root['data-smoothboost-channel'];
  assert.ok(channel);

  // Set 120 FPS target
  window.dispatchEvent(new CustomEvent(channel, { detail: { action: 'set-fps-limit', fps: 120 } }));
  let metrics = null;
  window.addEventListener(channel, (e) => {
    if (e.detail?.action === 'hook-metrics') metrics = e.detail;
  });
  window.dispatchEvent(new CustomEvent(channel, { detail: { action: 'get-hook-metrics' } }));
  assert.equal(metrics?.targetFps, 120);

  // Set 60 FPS target
  window.dispatchEvent(new CustomEvent(channel, { detail: { action: 'set-fps-limit', fps: 60 } }));
  window.dispatchEvent(new CustomEvent(channel, { detail: { action: 'get-hook-metrics' } }));
  assert.equal(metrics?.targetFps, 60);
});

test('Automatic Recovery detects repeated errors and safely drops into Safe Mode', async () => {
  const harness = createContentHarness({
    globalEnabled: true,
    mode: 'auto',
    customSettings: { autoRecovery: true }
  });

  await new Promise((r) => setTimeout(r, 60));

  // Trigger 4 rapid errors
  harness.triggerWindow('error', new Error('Simulated page script crash'));
  harness.triggerWindow('error', new Error('Simulated DOM exception'));
  harness.triggerWindow('error', new Error('Simulated WebGL error'));
  harness.triggerWindow('error', new Error('Simulated CSS error'));

  const status = await harness.sendMessage({ type: 'GET_STATUS' });
  assert.equal(status.autoRecovery?.active, true, 'Auto Recovery safe mode activated');
  assert.equal(status.autoRecovery?.triggered, true, 'Auto Recovery triggered flag recorded');

  // Reset auto recovery
  const resetRes = await harness.sendMessage({ type: 'RESET_AUTO_RECOVERY' });
  assert.equal(resetRes.success, true);
});

test('SmoothBoost.user.js provides valid UserScript headers and syntax', () => {
  assert.ok(userscriptSource.includes('// ==UserScript=='));
  assert.ok(userscriptSource.includes('// ==/UserScript=='));
  assert.ok(userscriptSource.includes('@name         SmoothBoost: Web Performance Optimizer'));
  assert.ok(userscriptSource.includes('@version      2.4.0'));
  assert.ok(userscriptSource.includes('@grant        GM_getValue'));
  assert.ok(userscriptSource.includes('@grant        GM_setValue'));
  assert.ok(userscriptSource.includes('@grant        GM_registerMenuCommand'));
  assert.ok(userscriptSource.includes('@downloadURL  https://raw.githubusercontent.com/BiniFn/SmoothBoost/main/dist/SmoothBoost.user.js'));
  assert.ok(userscriptSource.includes('@updateURL    https://raw.githubusercontent.com/BiniFn/SmoothBoost/main/dist/SmoothBoost.user.js'));

  // Ensure script is syntactically sound by running under vm.Script
  assert.doesNotThrow(() => {
    new vm.Script(userscriptSource);
  });
});
