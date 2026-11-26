const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const contentSource = fs.readFileSync(path.join(__dirname, '../scripts/content.js'), 'utf8');
const hookSource = fs.readFileSync(path.join(__dirname, '../scripts/page-hook.js'), 'utf8');
const backgroundSource = fs.readFileSync(path.join(__dirname, '../scripts/background.js'), 'utf8');
const releasesSource = fs.readFileSync(path.join(__dirname, '../assets/js/releases.js'), 'utf8');
const siteRules = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/site-rules.json'), 'utf8'));

function makeElement(tagName = 'DIV') {
  const attrs = new Map();
  return {
    nodeType: 1,
    tagName: tagName.toUpperCase(),
    isConnected: true,
    attributes: attrs,
    style: { setProperty() {}, getPropertyValue() { return ''; }, getPropertyPriority() { return ''; }, removeProperty() {} },
    children: [],
    setAttribute(k, v) { attrs.set(k, String(v)); },
    getAttribute(k) { return attrs.get(k) || null; },
    removeAttribute(k) { attrs.delete(k); },
    appendChild(child) { this.children.push(child); return child; },
    matches() { return false; },
    closest() { return null; },
    querySelectorAll() { return []; },
    querySelector() { return null; }
  };
}

async function runContent(hostname, { config = {}, elementsBySelector = {}, shadowHosts = [] } = {}) {
  const styles = new Map();
  let messageListener;
  const root = makeElement('HTML');
  root.setAttribute('data-smoothboost-channel', 'sb-test-channel');
  const head = makeElement('HEAD');
  const body = makeElement('BODY');

  const document = {
    nodeType: 9,
    documentElement: root,
    head,
    body,
    hidden: false,
    styleSheets: [],
    getElementById(id) { return styles.get(id) || null; },
    createElement(tag) {
      const el = makeElement(tag);
      if (tag.toLowerCase() === 'style') {
        Object.defineProperty(el, 'id', {
          get() { return this._id || ''; },
          set(val) { this._id = val; styles.set(val, this); }
        });
        el.remove = () => styles.delete(el._id);
      }
      return el;
    },
    getElementsByTagName() { return []; },
    querySelectorAll(selector) {
      if (elementsBySelector[selector]) return elementsBySelector[selector];
      if (selector.includes('shreddit-app') || selector.includes('data-smoothboost-shadow')) return shadowHosts;
      return [];
    },
    querySelector() { return null; },
    addEventListener() {},
    getAnimations() { return []; }
  };

  const window = {
    location: { hostname, pathname: '/' },
    setTimeout,
    clearTimeout,
    setInterval: () => 1,
    clearInterval: () => {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {},
    getComputedStyle: () => ({ backdropFilter: 'none', webkitBackdropFilter: 'none' }),
    performance: { now: () => Date.now() }
  };
  window.top = window;

  const chrome = {
    storage: {
      local: { async get() { return { smoothBoostConfig: config, smoothBoostSiteRules: siteRules }; }, async set() {} },
      onChanged: { addListener() {} }
    },
    runtime: {
      getURL() { return 'chrome-extension://id/data/site-rules.json'; },
      onMessage: { addListener(fn) { messageListener = fn; } }
    }
  };

  vm.runInNewContext(contentSource, {
    chrome,
    document,
    window,
    IntersectionObserver: class { observe() {} unobserve() {} disconnect() {} },
    MutationObserver: class { observe() {} disconnect() {} },
    CustomEvent: class { constructor(t, o = {}) { this.type = t; this.detail = o.detail; } },
    performance: window.performance,
    Promise,
    setTimeout,
    clearTimeout
  });

  await new Promise((r) => setImmediate(r));
  return {
    styles,
    sendMessage(msg) {
      return new Promise((resolve) => messageListener(msg, {}, resolve));
    }
  };
}

test('Scroll Boost v2 emits zero-reflow targeted rules without wildcard box-shadow repaint', async () => {
  const env = await runContent('example.com', { config: { globalEnabled: true, mode: 'auto' } });
  const css = env.styles.get('smoothboost-injected-styles')?.textContent || '';
  assert.doesNotMatch(css, /box-shadow:\s*none/, 'Scroll Boost v2 avoids wildcard box-shadow repaint storm');
  assert.doesNotMatch(css, /\*\s*\{\s*pointer-events:\s*none/, 'Scroll Boost v2 preserves nested scroll containers');
  assert.match(css, /html\[data-smoothboost-scrolling="true"\]/, 'Scroll Boost v2 targets html attribute properly');
});

test('Auto, Turbo (ultra), and Balanced modes apply distinct optimization sets', async () => {
  const autoFeed = await runContent('reddit.com', { config: { globalEnabled: true, mode: 'auto' } });
  const autoCss = autoFeed.styles.get('smoothboost-injected-styles')?.textContent || '';
  assert.match(autoCss, /content-visibility:\s*auto/, 'Auto applies content-visibility on infinite feeds');
  assert.doesNotMatch(autoCss, /contain:\s*layout style paint/, 'Auto leaves aggressive containment for Turbo');

  const ultra = await runContent('example.com', { config: { globalEnabled: true, mode: 'ultra' } });
  const ultraCss = ultra.styles.get('smoothboost-injected-styles')?.textContent || '';
  assert.match(ultraCss, /content-visibility:\s*auto/, 'Turbo applies broad content-visibility');
  assert.match(ultraCss, /contain:\s*layout style paint/, 'Turbo enables aggressive CSS containment');
  const ultraStatus = await ultra.sendMessage({ type: 'GET_STATUS' });
  assert.equal(ultraStatus.backgroundTabThrottle, true, 'Turbo enables background tab throttling');

  const balanced = await runContent('example.com', { config: { globalEnabled: true, mode: 'balanced' } });
  const balStatus = await balanced.sendMessage({ type: 'GET_STATUS' });
  assert.equal(balStatus.mode, 'balanced');
});

test('Site Rules v3 and Shadow DOM penetration mark matching containers and patch open shadow roots', async () => {
  const commentEl = makeElement('YTD-COMMENTS');
  const shadowStyles = new Map();
  const shadowHost = makeElement('SHREDDIT-POST');
  shadowHost.setAttribute('data-smoothboost-shadow', 'pending');
  shadowHost.shadowRoot = {
    getElementById(id) { return shadowStyles.get(id) || null; },
    appendChild(node) { shadowStyles.set(node.id, node); }
  };

  const env = await runContent('youtube.com', {
    config: { globalEnabled: true, mode: 'auto' },
    elementsBySelector: { '#comments': [commentEl] },
    shadowHosts: [shadowHost]
  });

  assert.equal(commentEl.getAttribute('data-smoothboost-content-visibility'), 'true', 'YouTube site rule marks #comments for content-visibility');
  assert.equal(shadowHost.getAttribute('data-smoothboost-shadow'), 'patched', 'pending shadow host is marked patched');
  assert.ok(shadowStyles.has('smoothboost-shadow-styles'), 'Shadow DOM stylesheet injected');
  const metrics = await env.sendMessage({ type: 'GET_METRICS' });
  assert.equal(metrics.metrics.shadowRootsPatched, 1);
});

test('page-hook WebGL2 instanced draw calls and Native FPS 0 are handled safely', () => {
  let instancedCalled = false;
  class FakeWebGL2 {
    constructor(canvas) { this.canvas = canvas; }
    drawArraysInstanced() { instancedCalled = true; }
    drawElementsInstanced() {}
  }

  const root = { setAttribute() {}, getAttribute() { return null; } };
  const listeners = new Map();
  const window = {
    location: { hostname: 'example.com' },
    crypto: { getRandomValues(b) { return b; } },
    addEventListener(t, fn) { listeners.set(t, [...(listeners.get(t) || []), fn]); },
    dispatchEvent(e) { (listeners.get(e.type) || []).forEach((fn) => fn(e)); return true; },
    performance: { now: () => 100 }
  };
  window.top = window;

  vm.runInNewContext(hookSource, {
    window,
    document: { documentElement: root, body: {}, querySelectorAll: () => [], addEventListener() {} },
    WebGL2RenderingContext: FakeWebGL2,
    CustomEvent: class { constructor(t, o = {}) { this.type = t; this.detail = o.detail; } },
    PerformanceObserver: class { static supportedEntryTypes = []; observe() {} disconnect() {} },
    IntersectionObserver: class { observe() {} disconnect() {} },
    MutationObserver: class { observe() {} disconnect() {} },
    Date, Map, Set, Number, Uint8Array, Math
  });

  const offscreen = { isConnected: true, getAttribute: (n) => (n === 'data-smoothboost-offscreen-canvas' ? 'true' : null) };
  new FakeWebGL2(offscreen).drawArraysInstanced();
  assert.equal(instancedCalled, false, 'WebGL2 instanced draw call skipped when canvas is offscreen');

  const channel = root.getAttribute('data-smoothboost-channel') || listeners.keys().next().value;
  assert.ok(channel);
});

test('background.js avoids double-registering content script on Safari when manifest defines static content_scripts', async () => {
  let registered = [];
  let installListener;
  const event = () => ({ addListener() {} });

  const chrome = {
    runtime: {
      onInstalled: { addListener(fn) { installListener = fn; } },
      onStartup: event(),
      onMessage: event(),
      getManifest: () => ({ content_scripts: [{ matches: ['http://*/*'], js: ['scripts/content.js'] }] })
    },
    storage: {
      local: { async get() { return { smoothBoostConfig: { globalEnabled: true, mode: 'auto' } }; }, async set() {} },
      onChanged: event()
    },
    scripting: {
      async getRegisteredContentScripts() { return []; },
      async unregisterContentScripts() {},
      async registerContentScripts(scripts) { registered = scripts; }
    },
    tabs: { onActivated: event(), onUpdated: event() },
    commands: { onCommand: event() },
    action: { setBadgeText() {}, setBadgeBackgroundColor() {} }
  };

  vm.runInNewContext(backgroundSource, {
    chrome,
    SmoothBoostCompat: { isMobile: false, isSafari: true, hasDnr: false },
    URL,
    Promise,
    self: {}
  });

  await installListener({ reason: 'install' });
  assert.equal(registered.length, 1, 'Safari registers only MAIN world page-hook dynamically');
  assert.equal(registered[0].id, 'smoothboost-page-hook');
});

test('website releases.js maps Edge download assets cleanly', () => {
  const attrs = new Map();
  const edgeBtn = {
    setAttribute(k, v) { attrs.set(k, v); }
  };
  const window = {};
  const document = {
    readyState: 'loading',
    addEventListener() {},
    querySelectorAll(sel) {
      if (sel === '[data-download="edge"]') return [edgeBtn];
      return [];
    },
    querySelector() { return null; },
    getElementById() { return null; }
  };

  vm.runInNewContext(releasesSource, {
    window,
    document,
    navigator: { userAgent: 'Mozilla/5.0 Edg/128.0.0.0' },
    localStorage: { getItem: () => null, setItem() {} },
    fetch: async () => ({ ok: false })
  });

  window.SmoothBoostReleases.applyReleaseToDom(window.SmoothBoostReleases.DEFAULT_RELEASE);
  assert.equal(attrs.get('download'), 'SmoothBoost-Edge-2.5.0.zip');
  assert.ok(attrs.get('href').includes('SmoothBoost-Edge-2.5.0.zip'));
});

test('page-hook attachShadow defers data-smoothboost-shadow attribute outside Custom Element constructors', () => {
  const scheduled = [];
  const root = { setAttribute() {}, getAttribute() { return null; } };
  let setAttributeDuringAttach = false;
  const FakeElement = class {};
  FakeElement.prototype.attachShadow = function () { return { mode: 'open' }; };

  const listeners = new Map();
  const window = {
    location: { hostname: 'reddit.com' },
    crypto: { getRandomValues(b) { return b; } },
    setTimeout(fn) { scheduled.push(fn); return scheduled.length; },
    clearTimeout() {},
    addEventListener(t, fn) { listeners.set(t, [...(listeners.get(t) || []), fn]); },
    dispatchEvent(e) { (listeners.get(e.type) || []).forEach((fn) => fn(e)); return true; },
    performance: { now: () => 100 }
  };
  window.top = window;

  vm.runInNewContext(hookSource, {
    window,
    Element: FakeElement,
    document: { documentElement: root, body: {}, querySelectorAll: () => [], addEventListener() {} },
    CustomEvent: class { constructor(t, o = {}) { this.type = t; this.detail = o.detail; } },
    PerformanceObserver: class { static supportedEntryTypes = []; observe() {} disconnect() {} },
    IntersectionObserver: class { observe() {} disconnect() {} },
    MutationObserver: class { observe() {} disconnect() {} },
    Date, Map, Set, Number, Uint8Array, Math
  });

  let shadowAttr = null;
  let attaching = true;
  const host = Object.assign(Object.create(FakeElement.prototype), {
    setAttribute(k, v) {
      if (attaching && k === 'data-smoothboost-shadow') setAttributeDuringAttach = true;
      if (k === 'data-smoothboost-shadow') shadowAttr = v;
    }
  });
  host.attachShadow({ mode: 'open' });
  attaching = false;

  assert.equal(setAttributeDuringAttach, false, 'attachShadow must not call setAttribute synchronously during constructor');
  assert.equal(shadowAttr, null);
  assert.equal(scheduled.length, 1);
  scheduled[0]();
  assert.equal(shadowAttr, 'pending', 'pending host attribute applied safely after timer flush');
});

test('content.js tryInjectPageHook skips DOM script tag on MAIN-world success and consumes lastError on fallback', async () => {
  async function runInjectionScenario({ sendMessageImpl }) {
    const appendedScripts = [];
    const root = makeElement('HTML');
    const head = makeElement('HEAD');
    head.appendChild = (node) => {
      if (node.tagName === 'SCRIPT') appendedScripts.push(node);
      return node;
    };
    const document = {
      nodeType: 9,
      documentElement: root,
      head,
      body: makeElement('BODY'),
      hidden: false,
      styleSheets: [],
      getElementById() { return null; },
      createElement: (tag) => makeElement(tag),
      getElementsByTagName: () => [],
      querySelectorAll: () => [],
      querySelector: () => null,
      addEventListener() {},
      getAnimations: () => []
    };
    const window = {
      location: { hostname: 'youtube.com', pathname: '/' },
      setTimeout,
      clearTimeout,
      setInterval: () => 1,
      clearInterval() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {},
      getComputedStyle: () => ({ backdropFilter: 'none', webkitBackdropFilter: 'none' }),
      performance: { now: () => Date.now() }
    };
    window.top = window;

    let readLastError = false;
    const runtime = {
      getURL: (p) => `chrome-extension://id/${p}`,
      onMessage: { addListener() {} },
      sendMessage: sendMessageImpl,
      get lastError() {
        readLastError = true;
        return this._lastError;
      },
      _lastError: undefined
    };

    vm.runInNewContext(contentSource, {
      chrome: {
        storage: {
          local: { async get() { return { smoothBoostConfig: { globalEnabled: true, mode: 'auto' }, smoothBoostSiteRules: siteRules }; }, async set() {} },
          onChanged: { addListener() {} }
        },
        runtime
      },
      document,
      window,
      IntersectionObserver: class { observe() {} unobserve() {} disconnect() {} },
      MutationObserver: class { observe() {} disconnect() {} },
      CustomEvent: class { constructor(t, o = {}) { this.type = t; this.detail = o.detail; } },
      performance: window.performance,
      Promise,
      setTimeout,
      clearTimeout
    });

    await new Promise((r) => setImmediate(r));
    return { appendedScripts, wasLastErrorRead: () => readLastError, runtime };
  }

  const injected = await runInjectionScenario({
    sendMessageImpl(_msg, cb) { cb({ injected: true }); }
  });
  assert.equal(injected.wasLastErrorRead(), true, 'lastError accessed cleanly');
  assert.equal(injected.appendedScripts.length, 0, 'DOM script fallback skipped when scripting.executeScript succeeded');

  const fallback = await runInjectionScenario({
    sendMessageImpl(_msg, cb) {
      this._lastError = { message: 'restricted' };
      cb(undefined);
    }
  });
  assert.equal(fallback.wasLastErrorRead(), true, 'lastError consumed on failure');
  assert.equal(fallback.appendedScripts.length, 1, 'DOM script fallback used only when background injection fails');
});

test('background.js onInstalled skips discarded/frozen/webstore tabs and injects compat.js + content.js on enabled tabs', async () => {
  const executed = [];
  let installListener;
  const event = () => ({ addListener() {} });

  const chrome = {
    runtime: {
      onInstalled: { addListener(fn) { installListener = fn; } },
      onStartup: event(),
      onMessage: event(),
      getURL: (p) => `chrome-extension://id/${p}`
    },
    storage: {
      local: {
        async get() {
          return {
            smoothBoostConfig: {
              globalEnabled: true,
              mode: 'auto',
              siteOverrides: { 'disabled.example': { enabled: false } }
            }
          };
        },
        async set() {}
      },
      onChanged: event()
    },
    scripting: {
      async getRegisteredContentScripts() { return []; },
      async unregisterContentScripts() {},
      async registerContentScripts() {},
      async executeScript(opts) { executed.push(opts); }
    },
    tabs: {
      async query() {
        return [
          { id: 1, url: 'https://addons.mozilla.org/en-US/firefox/addon/smoothboost/' },
          { id: 2, url: 'https://microsoftedge.microsoft.com/addons/search/SmoothBoost' },
          { id: 3, url: 'https://chromewebstore.google.com/detail/test' },
          { id: 4, url: 'https://example.com/', discarded: true },
          { id: 5, url: 'https://disabled.example/' },
          { id: 6, url: 'https://reddit.com/' }
        ];
      },
      onActivated: event(),
      onUpdated: event()
    },
    commands: { onCommand: event() },
    action: { setBadgeText() {}, setBadgeBackgroundColor() {} }
  };

  vm.runInNewContext(backgroundSource, { chrome, URL, Promise, self: {} });
  await installListener({ reason: 'update' });

  assert.equal(executed.length, 1);
  assert.equal(executed[0].target.tabId, 6);
  assert.deepEqual([...executed[0].files], ['scripts/compat.js', 'scripts/content.js']);
});

test('popup.html avoids inline style attributes and tutorial.html avoids stale v2.4.0 references', () => {
  const popupHtml = fs.readFileSync(path.join(__dirname, '../popup/popup.html'), 'utf8');
  const tutorialHtml = fs.readFileSync(path.join(__dirname, '../tutorial.html'), 'utf8');
  assert.doesNotMatch(popupHtml, /\sstyle="/i, 'popup.html contains zero inline style attributes');
  assert.match(popupHtml, /addons\.mozilla\.org\/en-US\/firefox\/addon\/smoothboost/);
  assert.match(popupHtml, /microsoftedge\.microsoft\.com\/addons\/search\/SmoothBoost/);
  assert.doesNotMatch(tutorialHtml, /2\.4\.0/, 'tutorial.html has no stale 2.4.0 filenames');
});
