// SmoothBoost - Universal Cross-Browser & Cross-Platform Compatibility Layer
// Supports Chrome, Chromium, Titanium Browser (Android), Firefox Desktop, and Firefox Android.

(function attachCompat(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SmoothBoostCompat = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createCompat() {
  'use strict';

  const rawBrowser = typeof globalThis.browser !== 'undefined' && globalThis.browser?.runtime ? globalThis.browser : null;
  const rawChrome = typeof globalThis.chrome !== 'undefined' && globalThis.chrome?.runtime ? globalThis.chrome : null;
  const ext = rawBrowser || rawChrome || {};

  const userAgent = typeof navigator !== 'undefined' ? (navigator.userAgent || '') : '';
  const isFirefox = /firefox|fxios/i.test(userAgent);
  const isEdge = /edg\//i.test(userAgent);
  const isSafari = (/^((?!chrome|android).)*safari/i.test(userAgent) || (/applewebkit/i.test(userAgent) && !/chrome|chromium|edg|android/i.test(userAgent))) && !isEdge;
  const isAndroid = /android/i.test(userAgent);
  const isIOS = /iphone|ipad|ipod/i.test(userAgent) || (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && Number(navigator.maxTouchPoints) > 1);
  const isMobile = isAndroid || isIOS || /mobile/i.test(userAgent);

  // Titanium Browser on Android is Chromium-based (built on Vanadium / GrapheneOS upstream).
  // It provides standard Chromium extension APIs but runs in an Android lifecycle.
  const isTitaniumAndroid = isAndroid && !isFirefox;

  // Tab discarding: Chrome & Firefox Desktop support chrome.tabs.discard / browser.tabs.discard.
  // On Android and Safari, tabs.discard is either missing, non-functional, or managed by OS LMK.
  const hasTabsDiscard = Boolean(!isMobile && !isSafari && ext.tabs?.discard);

  // Keyboard commands: physical keyboard shortcuts are only meaningful on desktop form factors.
  const hasCommands = Boolean(!isMobile && ext.commands?.onCommand);

  // DeclarativeNetRequest: supported in Chrome MV3 and Firefox 113+.
  const hasDnr = Boolean(!isSafari && ext.declarativeNetRequest?.updateDynamicRules);

  // Scripting API: registerContentScripts support.
  const hasScripting = Boolean(ext.scripting?.registerContentScripts);

  // Open Shadow DOM & memory telemetry capability checks.
  const hasShadowDom = typeof Element !== 'undefined' && Boolean(Element.prototype?.attachShadow);
  const hasPerformanceMemory = typeof performance !== 'undefined' && Boolean(performance.memory);

  const SUPPORT_URL = 'https://github.com/sponsors/BiniFn';
  const STORE_URLS = {
    firefox: 'https://addons.mozilla.org/en-US/firefox/addon/smoothboost/',
    edge: 'https://microsoftedge.microsoft.com/addons/search/SmoothBoost'
  };

  async function getStorage(keys) {
    if (!ext.storage?.local?.get) return {};
    try {
      return await ext.storage.local.get(keys);
    } catch (_error) {
      return new Promise((resolve) => {
        try {
          ext.storage.local.get(keys, (result) => {
            void ext.runtime?.lastError;
            resolve(result || {});
          });
        } catch (_inner) {
          resolve({});
        }
      });
    }
  }

  async function setStorage(items) {
    if (!ext.storage?.local?.set) return;
    try {
      await ext.storage.local.set(items);
    } catch (_error) {
      return new Promise((resolve) => {
        try {
          ext.storage.local.set(items, () => {
            void ext.runtime?.lastError;
            resolve();
          });
        } catch (_inner) {
          resolve();
        }
      });
    }
  }

  function getPlatformKey() {
    if (isEdge) {
      return 'edge';
    }
    if (isSafari) {
      return isMobile ? 'safari-ios' : 'safari';
    }
    if (isFirefox) {
      return isAndroid ? 'firefox-android' : 'firefox';
    }
    if (isTitaniumAndroid || isAndroid) {
      return 'titanium';
    }
    return 'chrome';
  }

  return {
    ext,
    isFirefox,
    isSafari,
    isEdge,
    isIOS,
    isAndroid,
    isMobile,
    isTitaniumAndroid,
    hasTabsDiscard,
    hasCommands,
    hasDnr,
    hasScripting,
    hasShadowDom,
    hasPerformanceMemory,
    SUPPORT_URL,
    STORE_URLS,
    getStorage,
    setStorage,
    getPlatformKey
  };
});
