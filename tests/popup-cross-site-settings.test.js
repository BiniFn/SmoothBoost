const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const popupSource = fs.readFileSync(path.join(__dirname, '../popup/popup.js'), 'utf8');
const updateChecker = require('../popup/update-check.js');

class FakeElement {
  constructor(id = '') {
    this.id = id;
    this.textContent = '';
    this.checked = false;
    this.disabled = false;
    this.hidden = false;
    this.listeners = new Map();
    this.classes = new Set();
    this.attributes = new Map();
    this.tabIndex = 0;
    this.classList = {
      add: (name) => this.classes.add(name),
      remove: (name) => this.classes.delete(name),
      toggle: (name, force) => {
        const shouldAdd = force === undefined ? !this.classes.has(name) : force;
        if (shouldAdd) this.classes.add(name);
        else this.classes.delete(name);
        return shouldAdd;
      }
    };
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }
}

function createPopupEnvironment(url, initialConfig = {}) {
  const elements = new Map();
  const documentListeners = new Map();
  const body = new FakeElement('body');
  let stored = { smoothBoostConfig: { ...initialConfig } };
  const messagesSent = [];

  const document = {
    body,
    addEventListener(type, listener) {
      documentListeners.set(type, listener);
    },
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, new FakeElement(id));
      return elements.get(id);
    }
  };

  const chrome = {
    tabs: {
      async query() { return [{ id: 101, url }]; },
      sendMessage(tabId, message, options, callback) {
        messagesSent.push({ tabId, message });
        if (typeof callback === 'function') {
          callback({ status: 'active', enabled: true, mode: 'auto' });
        }
      },
      async reload() {}
    },
    storage: {
      local: {
        async get(keys) {
          if (typeof keys === 'string') return { [keys]: stored[keys] };
          return stored;
        },
        async set(obj) {
          Object.assign(stored, obj);
        }
      }
    },
    action: {
      setBadgeText() {},
      setBadgeBackgroundColor() {}
    },
    runtime: {
      lastError: undefined,
      getManifest() { return { version: '2.0.0' }; },
      async sendMessage() { return { success: true }; }
    }
  };

  vm.runInNewContext(popupSource, {
    document,
    chrome,
    SmoothBoostUpdates: updateChecker,
    window: { setTimeout, clearTimeout },
    AbortController,
    fetch: async () => ({
      ok: true,
      async json() { return { tag_name: 'v2.0.0', assets: [] }; }
    }),
    URL
  });

  return {
    async init() {
      await documentListeners.get('DOMContentLoaded')();
      await new Promise((resolve) => setImmediate(resolve));
    },
    elements,
    getStoredConfig() {
      return stored.smoothBoostConfig;
    },
    messagesSent
  };
}

test('choosing a mode on site A sets global mode so site B uses it', async () => {
  // Step 1: Open popup on Site A (e.g., https://github.com)
  const envA = createPopupEnvironment('https://github.com/test/repo', {
    globalEnabled: true,
    mode: 'auto',
    siteOverrides: {}
  });
  await envA.init();

  // User clicks "Turbo" (ultra) mode on Site A
  const btnUltra = envA.elements.get('btn-ultra');
  btnUltra.listeners.get('click')();
  await new Promise((resolve) => setImmediate(resolve));

  const savedAfterA = envA.getStoredConfig();
  assert.equal(savedAfterA.mode, 'ultra', 'Global mode was updated to ultra');

  // Step 2: Open popup on Site B (e.g., https://reddit.com) with the saved config
  const envB = createPopupEnvironment('https://reddit.com/r/webdev', savedAfterA);
  await envB.init();

  // Verify Site B automatically reflects and uses the chosen mode (ultra)
  assert.equal(envB.elements.get('btn-ultra').classes.has('active'), true, 'Site B has Turbo mode active');
  assert.equal(envB.elements.get('btn-auto').classes.has('active'), false, 'Site B Auto is not active');
  assert.equal(envB.elements.get('site-toggle').checked, true, 'Site B is enabled');

  // Step 3: Switch to "Balanced" on Site B
  const btnBalanced = envB.elements.get('btn-balanced');
  btnBalanced.listeners.get('click')();
  await new Promise((resolve) => setImmediate(resolve));

  const savedAfterB = envB.getStoredConfig();
  assert.equal(savedAfterB.mode, 'balanced', 'Global mode was updated to balanced');

  // Step 4: Open popup on Site C (e.g., https://news.ycombinator.com)
  const envC = createPopupEnvironment('https://news.ycombinator.com', savedAfterB);
  await envC.init();

  assert.equal(envC.elements.get('btn-balanced').classes.has('active'), true, 'Site C uses Balanced mode chosen on Site B');
});

test('custom settings changed on site A persist to site B', async () => {
  const envA = createPopupEnvironment('https://site-a.com', {
    globalEnabled: true,
    mode: 'custom',
    customSettings: { passiveScroll: false, pauseOffscreenCanvas: false }
  });
  await envA.init();

  // User enables passive scrolling checkbox
  const togglePassive = envA.elements.get('toggle-passive-scroll');
  togglePassive.checked = true;
  togglePassive.listeners.get('change')();
  await new Promise((resolve) => setImmediate(resolve));

  const saved = envA.getStoredConfig();
  assert.equal(saved.mode, 'custom', 'Mode is custom');
  assert.equal(saved.customSettings.passiveScroll, true, 'Custom passiveScroll is true');

  // Open site B
  const envB = createPopupEnvironment('https://site-b.com', saved);
  await envB.init();

  assert.equal(envB.elements.get('btn-custom').classes.has('active'), true, 'Site B is in custom mode');
  assert.equal(envB.elements.get('toggle-passive-scroll').checked, true, 'Site B has passive scroll enabled');
});

test('turning off a specific site keeps global mode intact for other sites', async () => {
  const envA = createPopupEnvironment('https://broken-site.com', {
    globalEnabled: true,
    mode: 'ultra',
    siteOverrides: {}
  });
  await envA.init();

  // User clicks siteBrokenButton ("Site looks broken? Turn off for this site")
  const brokenBtn = envA.elements.get('site-broken');
  await brokenBtn.listeners.get('click')();
  await new Promise((resolve) => setImmediate(resolve));

  const saved = envA.getStoredConfig();
  assert.equal(saved.siteOverrides['broken-site.com']?.enabled, false, 'broken-site.com is disabled');
  assert.equal(saved.mode, 'ultra', 'Global mode is still ultra');

  // Another site is still running ultra mode
  const envB = createPopupEnvironment('https://good-site.com', saved);
  await envB.init();

  assert.equal(envB.elements.get('site-toggle').checked, true, 'good-site.com is enabled');
  assert.equal(envB.elements.get('btn-ultra').classes.has('active'), true, 'good-site.com is in ultra mode');
});
