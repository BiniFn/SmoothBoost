const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const popupSource = fs.readFileSync(path.join(__dirname, '../popup/popup.js'), 'utf8');
const updateChecker = require('../popup/update-check.js');

class FakeElement {
  constructor() {
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

async function renderPopup({ url, response, hasReceiver = true, storedConfig = null, mockRelease = null }) {
  const elements = new Map();
  const documentListeners = new Map();
  const body = new FakeElement();
  const runtime = {
    lastError: undefined,
    getManifest() { return { version: '1.0.8' }; }
  };
  let messageCount = 0;

  const document = {
    body,
    addEventListener(type, listener) {
      documentListeners.set(type, listener);
    },
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, new FakeElement());
      return elements.get(id);
    }
  };

  const chrome = {
    tabs: {
      async query() { return [{ id: 55, url }]; },
      sendMessage(tabId, message, options, callback) {
        messageCount++;
        assert.equal(tabId, 55);
        assert.equal(message.type, 'GET_STATUS');
        assert.equal(options.frameId, 0);
        if (!hasReceiver) {
          runtime.lastError = { message: 'Could not establish connection. Receiving end does not exist.' };
          callback(undefined);
          runtime.lastError = undefined;
        } else {
          callback(response);
        }
      }
    },
    storage: {
      local: {
        async get() {
          return { smoothBoostConfig: storedConfig || { globalEnabled: true, mode: 'ultra', customSettings: {}, siteOverrides: {} } };
        },
        async set() {}
      }
    },
    action: {
      setBadgeText() {},
      setBadgeBackgroundColor() {}
    },
    runtime
  };

  vm.runInNewContext(popupSource, {
    document,
    chrome,
    SmoothBoostUpdates: updateChecker,
    window: { setTimeout, clearTimeout },
    AbortController,
    fetch: async () => ({
      ok: true,
      async json() {
        return mockRelease || { tag_name: 'v1.0.8', draft: false, prerelease: false, assets: [{ name: 'SmoothBoost-1.0.8.zip' }] };
      }
    }),
    URL
  });
  await documentListeners.get('DOMContentLoaded')();
  await new Promise((resolve) => setImmediate(resolve));
  return { elements, messageCount };
}

test('popup reports an active script and the Re:Anime rule state', async () => {
  const { elements } = await renderPopup({
    url: 'https://reanime.to/home',
    response: { status: 'active', enabled: true, mode: 'ultra', siteRule: 'paused' }
  });

  assert.equal(elements.get('status-page').textContent, 'Active');
  assert.equal(elements.get('status-profile').textContent, 'Maximum');
  assert.equal(elements.get('status-site-rule').textContent, 'Paused');
  assert.equal(elements.get('site-rule-row').hidden, false);
});

test('popup reports a missing receiver as a reload request', async () => {
  const { elements, messageCount } = await renderPopup({
    url: 'https://example.com/',
    hasReceiver: false
  });

  assert.equal(messageCount, 1);
  assert.equal(elements.get('status-page').textContent, 'Reload tab to activate');
  assert.match(elements.get('status-detail').textContent, /Reload this tab/);
});

test('popup reports a disabled site without asking the user to reload', async () => {
  const { elements } = await renderPopup({
    url: 'https://example.com/',
    hasReceiver: false,
    storedConfig: {
      globalEnabled: true,
      mode: 'ultra',
      customSettings: {},
      siteOverrides: { 'example.com': { enabled: false } }
    }
  });

  assert.equal(elements.get('status-page').textContent, 'Off for this site');
  assert.match(elements.get('status-detail').textContent, /not injected here/);
});

test('popup reports browser-owned pages as unsupported without messaging them', async () => {
  const { elements, messageCount } = await renderPopup({ url: 'chrome://extensions/' });

  assert.equal(messageCount, 0);
  assert.equal(elements.get('status-page').textContent, 'Unsupported page');
  assert.match(elements.get('status-detail').textContent, /does not allow extensions/);
});

test('popup switches between Controls and Help & Bugs tabs', async () => {
  const { elements } = await renderPopup({ url: 'https://example.com/', response: { status: 'active', enabled: true, mode: 'ultra' } });
  elements.get('tab-help').listeners.get('click')();

  assert.equal(elements.get('help-panel').hidden, false);
  assert.equal(elements.get('controls-panel').hidden, true);
  assert.equal(elements.get('tab-help').attributes.get('aria-selected'), 'true');
  assert.equal(elements.get('tab-controls').tabIndex, -1);

  elements.get('tab-controls').listeners.get('click')();
  assert.equal(elements.get('help-panel').hidden, true);
  assert.equal(elements.get('controls-panel').hidden, false);
});

test('site-rule-row is hidden on non-Re:Anime sites (e.g. roblox.com)', async () => {
  const { elements } = await renderPopup({
    url: 'https://www.roblox.com/home',
    response: { status: 'active', enabled: true, mode: 'auto', siteRule: 'not-applicable' }
  });

  assert.equal(elements.get('site-rule-row').hidden, true, 'Re:Anime row must be hidden on roblox.com');
  assert.equal(elements.get('status-page').textContent, 'Active');
  assert.equal(elements.get('status-profile').textContent, 'Smart Auto');
});

test('promo banner dismisses and stays hidden', async () => {
  const { elements } = await renderPopup({
    url: 'https://www.roblox.com/home',
    response: { status: 'active', enabled: true, mode: 'ultra' },
    storedConfig: { globalEnabled: true, mode: 'ultra', showAutoPromo: true }
  });

  const banner = elements.get('auto-promo-banner');
  assert.equal(banner.hidden, false, 'Banner shown when mode is not auto and showAutoPromo is true');

  // Click dismiss
  elements.get('btn-dismiss-auto').listeners.get('click')();
  assert.equal(banner.hidden, true, 'Banner is hidden after clicking dismiss');
});

test('update notification pops up on the main screen when an update is available', async () => {
  const { elements } = await renderPopup({
    url: 'https://www.roblox.com/home',
    response: { status: 'active', enabled: true, mode: 'auto' },
    mockRelease: { tag_name: 'v2.1.0', draft: false, prerelease: false, assets: [{ name: 'SmoothBoost-2.1.0.zip' }] }
  });

  // Simulate update check returning a newer version (e.g. v2.0.1)
  const updateBanner = elements.get('update-notification-banner');
  const updateText = elements.get('update-notification-text');
  const updateAction = elements.get('update-notification-action');
  const updateTabDot = elements.get('update-tab-dot');

  // Trigger update check callback in popup
  // In renderPopup, update checker returns release { tag_name: 'v2.1.0' }
  // Wait for fetch update check to settle
  await new Promise((resolve) => setTimeout(resolve, 50));

  assert.equal(updateBanner.hidden, false, 'Update notification banner pops up');
  assert.match(updateText.textContent, /Update available/);
  assert.equal(updateTabDot.hidden, false, 'Tab dot is shown');

  // Dismiss update banner
  elements.get('update-notification-dismiss').listeners.get('click')();
  assert.equal(updateBanner.hidden, true, 'Update banner is hidden after dismissal');
});

