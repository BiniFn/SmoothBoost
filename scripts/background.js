// SmoothBoost - Background Service Worker (Manifest V3)

const DEFAULT_SETTINGS = {
  settingsVersion: 4,
  globalEnabled: true,
  mode: "auto",
  showAutoPromo: false,
  customSettings: {
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
    discardIdleTabs: false,
    fontDisplaySwap: false,
    fpsLimit: 30
  },
  siteOverrides: {}
};

const REGISTERED_SCRIPT_IDS = ["smoothboost-content", "smoothboost-page-hook"];
const KNOWN_PRODUCTIVITY_HOSTS = [
  "*://*.figma.com/*",
  "*://docs.google.com/*",
  "*://*.canva.com/*",
  "*://*.sketch.com/*",
  "*://*.photopea.com/*",
  "*://*.webflow.com/*",
  "*://maps.google.com/*",
  "*://earth.google.com/*"
];
const TAB_DISCARD_ALARM = "smoothboost-tab-discard";
const TAB_IDLE_THRESHOLD_MS = 30 * 60 * 1000;
let registrationQueue = Promise.resolve();

if (typeof self !== "undefined" && typeof self.addEventListener === "function") {
  self.addEventListener("unhandledrejection", (event) => {
    event.preventDefault();
  });
  self.addEventListener("error", (event) => {
    event.preventDefault();
  });
}

function getEffectiveSiteSettings(config, hostname) {
  const siteOverride = config.siteOverrides?.[hostname] || {};
  const enabled = siteOverride.enabled !== undefined ? siteOverride.enabled : config.globalEnabled !== false;
  const mode = siteOverride.mode || config.mode || "auto";
  const custom = {
    ...DEFAULT_SETTINGS.customSettings,
    ...(config.customSettings || {}),
    ...(siteOverride.customSettings || {})
  };
  return { enabled, mode, custom };
}

function toMatchPattern(hostname) {
  try {
    const normalized = new URL(`https://${hostname}`).hostname;
    if (normalized !== hostname.toLowerCase() || hostname.includes("*")) return null;
    return `*://${normalized}/*`;
  } catch (_error) {
    return null;
  }
}

async function syncDnrRules(config) {
  if (!chrome.declarativeNetRequest?.updateDynamicRules) return;
  const isEnabled = config.globalEnabled !== false &&
    (config.mode === "auto" || config.mode === "ultra" || config.customSettings?.fontDisplaySwap);
  const ruleId = 101;
  try {
    if (isEnabled) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [ruleId],
        addRules: [{
          id: ruleId,
          priority: 1,
          action: {
            type: "redirect",
            redirect: {
              transform: {
                queryTransform: {
                  addOrReplaceParams: [{ key: "display", value: "swap" }]
                }
              }
            }
          },
          condition: {
            urlFilter: "||fonts.googleapis.com/css*",
            resourceTypes: ["stylesheet"]
          }
        }]
      });
    } else {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [ruleId]
      });
    }
  } catch (_error) {}
}

async function syncRegisteredScripts() {
  if (!chrome.scripting?.registerContentScripts || !chrome.scripting?.unregisterContentScripts) return;

  const { smoothBoostConfig } = await chrome.storage.local.get("smoothBoostConfig");
  const config = { ...DEFAULT_SETTINGS, ...(smoothBoostConfig || {}) };

  try {
    const existing = await chrome.scripting.getRegisteredContentScripts({ ids: REGISTERED_SCRIPT_IDS });
    const existingIds = existing.map((script) => script.id).filter((id) => REGISTERED_SCRIPT_IDS.includes(id));
    if (existingIds.length) await chrome.scripting.unregisterContentScripts({ ids: existingIds });
  } catch (_error) {
    // Continue to registration; a fresh install has no existing scripts.
  }

  const siteEntries = Object.entries(config.siteOverrides || {});
  const excludedHosts = config.globalEnabled === false ? [] : siteEntries
    .filter(([, override]) => override?.enabled === false)
    .map(([hostname]) => toMatchPattern(hostname))
    .filter(Boolean);

  const matches = config.globalEnabled === false
    ? siteEntries.filter(([, override]) => override?.enabled === true)
      .map(([hostname]) => toMatchPattern(hostname)).filter(Boolean)
    : ["<all_urls>"];
  if (!matches.length) return;

  const common = {
    matches,
    ...(excludedHosts.length ? { excludeMatches: excludedHosts } : {}),
    allFrames: false,
    runAt: "document_start"
  };

  const scripts = [
    {
      id: "smoothboost-content",
      ...common,
      js: ["scripts/content.js"],
      world: "ISOLATED"
    },
    {
      id: "smoothboost-page-hook",
      ...common,
      js: ["scripts/page-hook.js"],
      world: "MAIN"
    }
  ];

  try {
    await chrome.scripting.registerContentScripts(scripts);
  } catch (_regError) {
    try {
      await chrome.scripting.unregisterContentScripts({ ids: REGISTERED_SCRIPT_IDS });
      await chrome.scripting.registerContentScripts(scripts);
    } catch (_retryError) {
      // Prevent uncaught rejection in service worker
    }
  }

  await syncDnrRules(config);
}

function queueScriptSync() {
  registrationQueue = registrationQueue.catch(() => {}).then(syncRegisteredScripts).catch(() => {});
  return registrationQueue;
}

function setupTabDiscardAlarm() {
  if (!chrome.alarms?.create) return;
  try {
    chrome.alarms.create(TAB_DISCARD_ALARM, { periodInMinutes: 15 });
  } catch (_error) {}
}

async function checkAndDiscardIdleTabs() {
  if (!chrome.tabs?.query || !chrome.tabs?.discard) return;
  try {
    const { smoothBoostConfig } = await chrome.storage.local.get("smoothBoostConfig");
    const config = { ...DEFAULT_SETTINGS, ...(smoothBoostConfig || {}) };
    if (config.globalEnabled === false || !config.customSettings?.discardIdleTabs) return;

    const tabs = await chrome.tabs.query({});
    const now = Date.now();
    for (const tab of tabs) {
      if (
        tab.id &&
        !tab.active &&
        !tab.pinned &&
        !tab.audible &&
        !tab.discarded &&
        tab.url &&
        /^https?:\/\//i.test(tab.url) &&
        tab.lastAccessed &&
        now - tab.lastAccessed > TAB_IDLE_THRESHOLD_MS
      ) {
        try {
          await chrome.tabs.discard(tab.id);
        } catch (_discardError) {}
      }
    }
  } catch (_error) {}
}

if (chrome.alarms?.onAlarm) {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === TAB_DISCARD_ALARM) {
      return checkAndDiscardIdleTabs().catch(() => {});
    }
  });
}

// Initialize settings and ensure dynamic registrations follow the saved site
// state after installs, upgrades, service-worker restarts, and settings edits.
chrome.runtime.onInstalled.addListener(async ({ reason } = {}) => {
  try {
    setupTabDiscardAlarm();
    const existing = await chrome.storage.local.get("smoothBoostConfig");
    const current = existing?.smoothBoostConfig;

    if (!current) {
      await chrome.storage.local.set({ smoothBoostConfig: DEFAULT_SETTINGS });
    } else if (reason === "update" && (current.settingsVersion || 0) < DEFAULT_SETTINGS.settingsVersion) {
      const previousVersion = current.settingsVersion || 0;
      const upgradedCustom = {
        ...DEFAULT_SETTINGS.customSettings,
        ...(current.customSettings || {})
      };
      if (previousVersion < 2) {
        upgradedCustom.killAnimations = false;
        upgradedCustom.killTransitions = false;
        upgradedCustom.killBlurFilters = false;
        upgradedCustom.killScrollHijack = false;
        upgradedCustom.pauseBackgroundMedia = false;
      }
      const shouldShowPromo = previousVersion < 4;
      await chrome.storage.local.set({
        smoothBoostConfig: {
          ...current,
          settingsVersion: DEFAULT_SETTINGS.settingsVersion,
          showAutoPromo: shouldShowPromo,
          customSettings: upgradedCustom,
          siteOverrides: current.siteOverrides || {}
        }
      });
    }

    await queueScriptSync();
  } catch (_error) {
    // Avoid unhandled rejection in background service worker
  }
});

chrome.runtime.onStartup?.addListener(() => {
  setupTabDiscardAlarm();
  queueScriptSync().catch(() => {});
});

chrome.storage.onChanged?.addListener((changes, areaName) => {
  if (areaName === "local" && changes.smoothBoostConfig) {
    queueScriptSync().catch(() => {});
  }
});

// Update the toolbar badge for the active site.
async function updateBadge(tabId, url) {
  if (!url || !url.startsWith("http")) {
    try {
      await chrome.action.setBadgeText({ tabId, text: "" });
    } catch (_error) {}
    return;
  }

  try {
    const domain = new URL(url).hostname;
    const { smoothBoostConfig } = await chrome.storage.local.get("smoothBoostConfig");
    const config = { ...DEFAULT_SETTINGS, ...(smoothBoostConfig || {}) };
    const { enabled, mode } = getEffectiveSiteSettings(config, domain);

    let badgeText = "OFF";
    let badgeColor = "#6b7280";
    if (enabled) {
      if (mode === "auto") {
        badgeText = "AUTO";
        badgeColor = "#06b6d4";
      } else if (mode === "ultra") {
        badgeText = "MAX";
        badgeColor = "#10b981";
      } else if (mode === "balanced") {
        badgeText = "BAL";
        badgeColor = "#3b82f6";
      } else {
        badgeText = "ON";
        badgeColor = "#10b981";
      }
    }

    await chrome.action.setBadgeText({ tabId, text: badgeText });
    await chrome.action.setBadgeBackgroundColor({ tabId, color: badgeColor });
  } catch (_error) {
    // Ignore invalid or browser-owned URLs or closed tabs.
  }
}

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab?.url) await updateBadge(tabId, tab.url);
  } catch (_error) {}
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab?.url) {
    updateBadge(tabId, tab.url).catch(() => {});
  }
});

function sendTabMessage(tabId, message) {
  let settled = false;
  const finish = () => { settled = true; };
  try {
    const result = chrome.tabs.sendMessage(tabId, message, { frameId: 0 }, () => {
      void chrome.runtime.lastError;
      finish();
    });
    if (result && typeof result.catch === "function") result.catch(finish);
  } catch (_error) {
    finish();
  }
  return settled;
}

chrome.runtime.onMessage?.addListener((message, _sender, sendResponse) => {
  if (message?.type === "SYNC_CONTENT_SCRIPTS") {
    queueScriptSync().then(() => sendResponse({ success: true })).catch(() => sendResponse({ success: false }));
    return true;
  }
  if (message?.type === "PURGE_ARCHETYPE" && message.hostname) {
    chrome.storage.local.get("smoothBoostArchetypes").then(({ smoothBoostArchetypes }) => {
      if (smoothBoostArchetypes && smoothBoostArchetypes[message.hostname]) {
        delete smoothBoostArchetypes[message.hostname];
        chrome.storage.local.set({ smoothBoostArchetypes });
      }
    }).catch(() => {});
    sendResponse({ success: true });
    return true;
  }
  return false;
});

// Handle keyboard shortcut (Alt+Shift+S / Option+Shift+S).
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "toggle-speed-boost") return;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url || !/^https?:\/\//i.test(tab.url)) return;

    const domain = new URL(tab.url).hostname;
    const { smoothBoostConfig } = await chrome.storage.local.get("smoothBoostConfig");
    const config = { ...DEFAULT_SETTINGS, ...(smoothBoostConfig || {}) };
    const current = getEffectiveSiteSettings(config, domain).enabled;
    config.siteOverrides = {
      ...(config.siteOverrides || {}),
      [domain]: { ...(config.siteOverrides?.[domain] || {}), enabled: !current }
    };

    await chrome.storage.local.set({ smoothBoostConfig: config });
    await queueScriptSync();
    await updateBadge(tab.id, tab.url);
    sendTabMessage(tab.id, { type: "CONFIG_UPDATED", config });
  } catch (_error) {}
});
