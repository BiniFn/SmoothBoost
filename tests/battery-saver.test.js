const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const backgroundSource = fs.readFileSync(path.join(__dirname, '../scripts/background.js'), 'utf8');
const contentSource = fs.readFileSync(path.join(__dirname, '../scripts/content.js'), 'utf8');
const popupSource = fs.readFileSync(path.join(__dirname, '../popup/popup.js'), 'utf8');

test('background script sets BATT amber badge for battery saver profile', async () => {
  let badgeText = '';
  let badgeColor = '';
  let activatedListener = null;

  const chrome = {
    runtime: {
      onInstalled: { addListener() {} },
      onStartup: { addListener() {} },
      onMessage: { addListener() {} }
    },
    alarms: { create() {}, onAlarm: { addListener() {} } },
    tabs: {
      onActivated: { addListener(l) { activatedListener = l; } },
      onUpdated: { addListener() {} },
      async get(id) { return { id, url: 'https://news.ycombinator.com' }; }
    },
    action: {
      async setBadgeText({ text }) { badgeText = text; },
      async setBadgeBackgroundColor({ color }) { badgeColor = color; }
    },
    storage: {
      local: {
        async get() {
          return {
            smoothBoostConfig: {
              globalEnabled: true,
              mode: 'battery',
              siteOverrides: {}
            }
          };
        },
        async set() {}
      },
      onChanged: { addListener() {} }
    },
    commands: { onCommand: { addListener() {} } }
  };

  vm.runInNewContext(backgroundSource, { chrome, URL, Promise, self: {} });

  assert.ok(activatedListener, 'registered tabs.onActivated listener');
  await activatedListener({ tabId: 101 });

  assert.equal(badgeText, 'BATT', 'badge text is BATT');
  assert.equal(badgeColor, '#f59e0b', 'badge color is amber #f59e0b');
});

test('popup PRESET_CONFIGS defines aggressive battery savings without breaking CSS interaction', () => {
  const fakeElement = { addEventListener() {}, classList: { toggle() {} } };
  const fakeDoc = { body: fakeElement, getElementById: () => fakeElement, addEventListener() {} };
  const context = {
    document: fakeDoc,
    window: { matchMedia: () => ({ matches: false }) },
    chrome: { runtime: { getManifest: () => ({ version: '2.1.0' }) } },
    module: { exports: {} },
    URL,
    Blob: class {},
    Date,
    Math,
    JSON,
    setTimeout: () => {}
  };
  vm.runInNewContext(popupSource, context);
  const { PRESET_CONFIGS } = context.module.exports;

  const battery = PRESET_CONFIGS.battery;
  assert.ok(battery, 'battery profile exists in PRESET_CONFIGS');
  assert.equal(battery.throttleCanvasFps, true, 'canvas FPS is throttled by default');
  assert.equal(battery.contentVisibility, true, 'content-visibility enabled for offscreen DOM savings');
  assert.equal(battery.pauseOffscreenCanvas, true, 'offscreen canvas rendering paused');
  assert.equal(battery.pauseBackgroundMedia, true, 'background media paused');
  assert.equal(battery.killAnimations, false, 'animations preserved for normal UX');
  assert.equal(battery.killTransitions, false, 'transitions preserved for normal UX');
});

test('content script battery mode protects interactive canvas and game apps from throttling', async () => {
  const styles = new Map();
  let messageListener;
  let storageListener;

  const root = {
    setAttribute() {},
    getAttribute() { return null; },
    querySelectorAll() { return []; },
    querySelector() { return null; }
  };
  const head = {
    appendChild(element) { styles.set(element.id, element); }
  };
  const document = {
    head,
    body: {},
    documentElement: root,
    readyState: 'complete',
    addEventListener() {},
    createElement() { return { id: '', textContent: '', remove() {} }; },
    getElementById(id) { return styles.get(id) || null; },
    querySelector() { return null; },
    querySelectorAll() { return []; }
  };

  const windowListeners = new Map();
  const window = {
    location: { hostname: 'figma.com', pathname: '/file/123' },
    setTimeout,
    clearTimeout,
    requestIdleCallback: (cb) => setTimeout(cb, 0),
    dispatchEvent() {},
    addEventListener(type, l) {
      const arr = windowListeners.get(type) || [];
      arr.push(l);
      windowListeners.set(type, arr);
    },
    removeEventListener() {}
  };
  window.top = window;

  const chrome = {
    runtime: {
      getURL(p) { return `chrome-extension://id/${p}`; },
      onMessage: { addListener(l) { messageListener = l; } }
    },
    storage: {
      local: {
        async get() {
          return {
            smoothBoostConfig: {
              globalEnabled: true,
              mode: 'battery',
              siteOverrides: {}
            },
            smoothBoostArchetypes: {
              'figma.com': { archetype: 'interactive-canvas', timestamp: Date.now() }
            }
          };
        },
        async set() {}
      },
      onChanged: { addListener(l) { storageListener = l; } }
    }
  };

  class MockMutationObserver {
    observe() {}
    disconnect() {}
  }
  class MockIntersectionObserver {
    observe() {}
    disconnect() {}
  }
  class MockCustomEvent {
    constructor(type, opt = {}) { this.type = type; this.detail = opt.detail; }
  }

  vm.runInNewContext(contentSource, {
    chrome,
    document,
    window,
    MutationObserver: MockMutationObserver,
    IntersectionObserver: MockIntersectionObserver,
    CustomEvent: MockCustomEvent,
    PerformanceObserver: undefined,
    fetch: async () => ({ ok: true, async json() { return { genericCarouselSelectors: [], siteRules: [] }; } }),
    performance: { now: () => Date.now() },
    Promise,
    setTimeout,
    clearTimeout
  });

  await new Promise((resolve) => setImmediate(resolve));

  assert.ok(messageListener, 'registered content script message listener');
  let statusResponse = null;
  messageListener({ type: 'GET_STATUS' }, {}, (resp) => { statusResponse = resp; });

  assert.ok(statusResponse, 'received GET_STATUS response');
  assert.equal(statusResponse.mode, 'battery');
  assert.equal(statusResponse.archetype, 'interactive-canvas');

  let metricsResponse = null;
  messageListener({ type: 'GET_METRICS' }, {}, (resp) => { metricsResponse = resp; });
  assert.ok(metricsResponse, 'received GET_METRICS response');
  assert.equal(metricsResponse.mode, 'battery');
});
