// SmoothBoost - popup controller (v2.0.0)

const DEFAULT_SETTINGS = {
  settingsVersion: 4,
  globalEnabled: true,
  mode: 'auto',
  showAutoPromo: false,
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
    discardIdleTabs: false,
    fontDisplaySwap: false,
    fpsLimit: 30
  },
  siteOverrides: {}
};
const GITHUB_ISSUE_URL = 'https://github.com/BiniFn/SmoothBoost/issues/new';
const UPDATE_CACHE_KEY = 'smoothBoostLatestReleaseCheck';
const UPDATE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

let currentTab = null;
let currentHostname = '';
let config = null;
let lastDiagnostics = null;

const domainLabel = document.getElementById('domain-label');
const siteToggle = document.getElementById('site-toggle');
const btnAuto = document.getElementById('btn-auto');
const btnUltra = document.getElementById('btn-ultra');
const btnBalanced = document.getElementById('btn-balanced');
const btnCustom = document.getElementById('btn-custom');
const autoPromoBanner = document.getElementById('auto-promo-banner');
const btnAcceptAuto = document.getElementById('btn-accept-auto');
const btnDismissAuto = document.getElementById('btn-dismiss-auto');
const updateNotificationBanner = document.getElementById('update-notification-banner');
const updateNotificationText = document.getElementById('update-notification-text');
const updateNotificationAction = document.getElementById('update-notification-action');
const updateNotificationDismiss = document.getElementById('update-notification-dismiss');
const updateTabDot = document.getElementById('update-tab-dot');
const resetBtn = document.getElementById('reset-defaults');
const controlsTab = document.getElementById('tab-controls');
const helpTab = document.getElementById('tab-help');
const controlsPanel = document.getElementById('controls-panel');
const helpPanel = document.getElementById('help-panel');
const statusDot = document.getElementById('status-dot');
const statusPage = document.getElementById('status-page');
const statusDetail = document.getElementById('status-detail');
const statusProfile = document.getElementById('status-profile');
const statusSiteRule = document.getElementById('status-site-rule');
const siteRuleRow = document.getElementById('site-rule-row');
const metricsContainer = document.getElementById('metrics-container');
const togglesWrapper = document.getElementById('toggles-wrapper');
const toggleAnim = document.getElementById('toggle-animations');
const toggleTrans = document.getElementById('toggle-transitions');
const toggleBlur = document.getElementById('toggle-blur');
const toggleScroll = document.getElementById('toggle-scroll');
const toggleMedia = document.getElementById('toggle-media');
const toggleFps = document.getElementById('toggle-fps');
const toggleOffscreen = document.getElementById('toggle-offscreen-animations');
const toggleContentVisibility = document.getElementById('toggle-content-visibility');
const toggleOffscreenCanvas = document.getElementById('toggle-offscreen-canvas');
const togglePassiveScroll = document.getElementById('toggle-passive-scroll');
const toggleAsyncImages = document.getElementById('toggle-async-images');
const siteBrokenButton = document.getElementById('site-broken');
const bugReportLink = document.getElementById('bug-report-link');
const updateStatus = document.getElementById('update-status');
const checkUpdatesButton = document.getElementById('check-updates');
const downloadUpdateLink = document.getElementById('download-update');
const releaseUpdateLink = document.getElementById('release-update-link');

const PRESET_CONFIGS = {
  auto: {
    killAnimations: false,
    killTransitions: false,
    killBlurFilters: true,
    killScrollHijack: false,
    pauseBackgroundMedia: true,
    throttleCanvasFps: false,
    pauseOffscreenAnimations: true,
    contentVisibility: false,
    pauseOffscreenCanvas: true,
    passiveScroll: true,
    asyncImageDecoding: true,
    fontDisplaySwap: true
  },
  ultra: {
    killAnimations: false,
    killTransitions: false,
    killBlurFilters: true,
    killScrollHijack: false,
    pauseBackgroundMedia: true,
    throttleCanvasFps: false,
    pauseOffscreenAnimations: true,
    contentVisibility: false,
    pauseOffscreenCanvas: true,
    passiveScroll: true,
    asyncImageDecoding: true,
    fontDisplaySwap: true
  },
  balanced: {
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
    fontDisplaySwap: false
  }
};

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab || null;
  if (tab?.url && /^https?:\/\//i.test(tab.url)) {
    try {
      currentHostname = new URL(tab.url).hostname.toLowerCase();
      domainLabel.textContent = currentHostname;
    } catch (_error) {
      domainLabel.textContent = 'Current tab';
    }
  } else {
    domainLabel.textContent = 'Browser page (inactive)';
    siteToggle.disabled = true;
    siteBrokenButton.disabled = true;
  }

  const stored = await chrome.storage.local.get('smoothBoostConfig');
  config = {
    ...DEFAULT_SETTINGS,
    ...(stored.smoothBoostConfig || {}),
    customSettings: { ...DEFAULT_SETTINGS.customSettings, ...(stored.smoothBoostConfig?.customSettings || {}) },
    siteOverrides: stored.smoothBoostConfig?.siteOverrides || {}
  };
  renderUI();
  requestPageStatus();
  bindEvents();
  if (bugReportLink) bugReportLink.href = buildIssueUrl(false);
  void checkForUpdates();
}

function renderUpdateResult(result, checkedAt, note = '') {
  if (downloadUpdateLink) downloadUpdateLink.hidden = true;
  if (releaseUpdateLink) releaseUpdateLink.hidden = true;

  if (!result) {
    if (updateStatus) updateStatus.textContent = note || 'Could not read the latest GitHub release. Try again.';
    if (updateNotificationBanner) {
      updateNotificationBanner.hidden = true;
      if (updateNotificationBanner.style) updateNotificationBanner.style.display = 'none';
    }
    if (updateTabDot) {
      updateTabDot.hidden = true;
      if (updateTabDot.style) updateTabDot.style.display = 'none';
    }
    return;
  }

  const isUpdate = result.status === 'update' || result.status === 'update-without-zip';
  if (updateNotificationBanner && updateNotificationAction && updateNotificationText) {
    if (isUpdate) {
      updateNotificationText.textContent = `Update available: v${result.latestVersion}`;
      updateNotificationAction.href = result.downloadUrl || result.releaseUrl;
      updateNotificationAction.textContent = result.hasZip ? 'Download' : 'View';
      updateNotificationBanner.hidden = false;
      if (updateNotificationBanner.style) updateNotificationBanner.style.display = 'flex';
      if (updateTabDot) {
        updateTabDot.hidden = false;
        if (updateTabDot.style) updateTabDot.style.display = 'inline-block';
      }
    } else {
      updateNotificationBanner.hidden = true;
      if (updateNotificationBanner.style) updateNotificationBanner.style.display = 'none';
      if (updateTabDot) {
        updateTabDot.hidden = true;
        if (updateTabDot.style) updateTabDot.style.display = 'none';
      }
    }
  }

  const freshness = note || (checkedAt ? ` Checked ${new Date(checkedAt).toLocaleString()}.` : '');
  if (result.status === 'update') {
    if (updateStatus) updateStatus.textContent = `Update available: ${result.latestVersion}.${freshness}`;
    if (downloadUpdateLink) {
      downloadUpdateLink.href = result.downloadUrl;
      downloadUpdateLink.textContent = `Download SmoothBoost ${result.latestVersion}`;
      downloadUpdateLink.hidden = false;
    }
    return;
  }
  if (result.status === 'update-without-zip') {
    if (updateStatus) updateStatus.textContent = `Version ${result.latestVersion} is available, but its ZIP is not attached yet.${freshness}`;
    if (releaseUpdateLink) {
      releaseUpdateLink.href = result.releaseUrl;
      releaseUpdateLink.hidden = false;
    }
    return;
  }
  if (result.status === 'ahead') {
    if (updateStatus) updateStatus.textContent = `This installed version is newer than the latest GitHub release (${result.latestVersion}).${freshness}`;
    return;
  }
  if (updateStatus) updateStatus.textContent = `You're up to date (${result.currentVersion}).${freshness}`;
}

async function checkForUpdates(force = false) {
  if (!checkUpdatesButton || !updateStatus) return;
  const currentVersion = chrome.runtime.getManifest().version;
  let cached = null;
  try {
    const stored = await chrome.storage.local.get(UPDATE_CACHE_KEY);
    cached = stored[UPDATE_CACHE_KEY];
  } catch (_error) {}

  const isFresh = cached && Number.isFinite(cached.checkedAt)
    && Date.now() - cached.checkedAt >= 0
    && Date.now() - cached.checkedAt < UPDATE_CACHE_TTL_MS;
  const cachedResult = isFresh ? SmoothBoostUpdates.fromCache(currentVersion, cached) : null;
  if (!force && cachedResult) {
    renderUpdateResult(cachedResult, cached.checkedAt);
    return;
  }

  checkUpdatesButton.disabled = true;
  checkUpdatesButton.textContent = 'Checking…';
  updateStatus.textContent = 'Checking GitHub for updates…';
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(SmoothBoostUpdates.RELEASES_API_URL, {
      headers: { Accept: 'application/vnd.github+json' },
      cache: 'no-store',
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
    const release = await response.json();
    const result = SmoothBoostUpdates.fromRelease(currentVersion, release);
    if (!result) throw new Error('GitHub release metadata was not valid');

    const checkedAt = Date.now();
    try {
      await chrome.storage.local.set({
        [UPDATE_CACHE_KEY]: {
          checkedAt,
          latestVersion: result.latestVersion,
          hasZip: result.hasZip
        }
      });
    } catch (_error) {}
    renderUpdateResult(result, checkedAt);
  } catch (_error) {
    if (cachedResult) {
      renderUpdateResult(cachedResult, cached.checkedAt, 'GitHub could not be reached; showing the last checked result.');
    } else {
      renderUpdateResult(null, null, 'Could not check GitHub. Check your connection and try again.');
    }
  } finally {
    window.clearTimeout(timeoutId);
    checkUpdatesButton.disabled = false;
    checkUpdatesButton.textContent = 'Check';
  }
}

function getSiteState() {
  if (!currentHostname) return { enabled: config.globalEnabled, mode: config.mode || 'auto' };
  const override = config.siteOverrides?.[currentHostname] || {};
  return {
    enabled: override.enabled !== undefined ? override.enabled : config.globalEnabled,
    mode: override.mode || config.mode || 'auto'
  };
}

function getCustomSettings() {
  const site = currentHostname ? config.siteOverrides?.[currentHostname] : null;
  return {
    ...DEFAULT_SETTINGS.customSettings,
    ...(config.customSettings || {}),
    ...(site?.customSettings || {})
  };
}

function getEffectiveSettings() {
  const { enabled, mode } = getSiteState();
  if (!enabled) return { enabled: false, mode: 'off' };
  if (mode === 'auto') return { enabled: true, mode, ...PRESET_CONFIGS.auto };
  if (mode === 'ultra') return { enabled: true, mode, ...PRESET_CONFIGS.ultra };
  if (mode === 'balanced') return { enabled: true, mode, ...PRESET_CONFIGS.balanced };
  return { enabled: true, mode: 'custom', ...getCustomSettings() };
}

function renderUI() {
  const { enabled, mode } = getSiteState();
  siteToggle.checked = enabled;
  document.body.classList.toggle('site-disabled', !enabled);

  if (btnAuto) btnAuto.classList.toggle('active', mode === 'auto');
  if (btnUltra) btnUltra.classList.toggle('active', mode === 'ultra');
  if (btnBalanced) btnBalanced.classList.toggle('active', mode === 'balanced');
  if (btnCustom) btnCustom.classList.toggle('active', mode === 'custom');

  if (togglesWrapper) {
    togglesWrapper.hidden = (mode !== 'custom');
  }

  if (autoPromoBanner) {
    const showPromo = Boolean(config.showAutoPromo && mode !== 'auto' && enabled);
    autoPromoBanner.hidden = !showPromo;
    if (autoPromoBanner.style) autoPromoBanner.style.display = showPromo ? 'flex' : 'none';
  }

  const custom = getCustomSettings();
  if (toggleAnim) toggleAnim.checked = custom.killAnimations;
  if (toggleTrans) toggleTrans.checked = custom.killTransitions;
  if (toggleBlur) toggleBlur.checked = custom.killBlurFilters;
  if (toggleScroll) toggleScroll.checked = custom.killScrollHijack;
  if (toggleMedia) toggleMedia.checked = custom.pauseBackgroundMedia;
  if (toggleFps) toggleFps.checked = custom.throttleCanvasFps;
  if (toggleOffscreen) toggleOffscreen.checked = custom.pauseOffscreenAnimations;
  if (toggleContentVisibility) toggleContentVisibility.checked = custom.contentVisibility;
  if (toggleOffscreenCanvas) toggleOffscreenCanvas.checked = custom.pauseOffscreenCanvas;
  if (togglePassiveScroll) togglePassiveScroll.checked = custom.passiveScroll;
  if (toggleAsyncImages) toggleAsyncImages.checked = custom.asyncImageDecoding;
}

function updateSiteOverride(patch) {
  if (!currentHostname) {
    Object.assign(config, patch);
    return;
  }
  const current = config.siteOverrides?.[currentHostname] || {};
  config.siteOverrides = {
    ...(config.siteOverrides || {}),
    [currentHostname]: { ...current, ...patch }
  };
}

async function saveAndBroadcast() {
  await chrome.storage.local.set({ smoothBoostConfig: config });
  if (currentTab?.id) {
    sendTabMessage(currentTab.id, { type: 'CONFIG_UPDATED', config });
    requestPageStatus();
  }
}

function setMode(mode) {
  config.mode = mode;
  if (currentHostname && config.siteOverrides?.[currentHostname]?.mode) {
    delete config.siteOverrides[currentHostname].mode;
  }
  renderUI();
  saveAndBroadcast();
}

function setCustomSetting(key, value) {
  config.mode = 'custom';
  if (!config.customSettings) {
    config.customSettings = { ...DEFAULT_SETTINGS.customSettings };
  }
  config.customSettings[key] = value;
  if (currentHostname && config.siteOverrides?.[currentHostname]?.customSettings) {
    delete config.siteOverrides[currentHostname].customSettings;
  }
  renderUI();
  saveAndBroadcast();
}

function renderRuleStatus(status) {
  if (status === 'paused') statusSiteRule.textContent = 'Paused';
  else if (status === 'waiting' || status === 'armed') statusSiteRule.textContent = 'Waiting for autoplay';
  else if (status === 'unconfirmed') statusSiteRule.textContent = 'Not confirmed';
  else statusSiteRule.textContent = 'Off';
}

function renderReloadStatus() {
  statusDot.className = 'status-dot is-warning';
  statusPage.textContent = 'Reload tab to activate';
  statusDetail.textContent = 'Reload this tab after installing or updating SmoothBoost.';
  statusProfile.textContent = '—';
  if (siteRuleRow) {
    siteRuleRow.hidden = true;
    if (siteRuleRow.style) siteRuleRow.style.display = 'none';
  }
  if (metricsContainer) metricsContainer.innerHTML = '';
}

function renderUnsupportedStatus() {
  statusDot.className = 'status-dot is-muted';
  statusPage.textContent = 'Unsupported page';
  statusDetail.textContent = 'The browser does not allow extensions to run on this page.';
  statusProfile.textContent = '—';
  if (siteRuleRow) {
    siteRuleRow.hidden = true;
    if (siteRuleRow.style) siteRuleRow.style.display = 'none';
  }
  if (metricsContainer) metricsContainer.innerHTML = '';
}

function renderSiteOffStatus() {
  statusDot.className = 'status-dot is-muted';
  statusPage.textContent = 'Off for this site';
  statusDetail.textContent = 'SmoothBoost is not injected here. Turn it on and reload this tab to apply it.';
  statusProfile.textContent = 'Off';
  if (siteRuleRow) {
    siteRuleRow.hidden = true;
    if (siteRuleRow.style) siteRuleRow.style.display = 'none';
  }
  if (metricsContainer) metricsContainer.innerHTML = '';
}

function renderMetricsPills(metrics) {
  if (!metricsContainer || !metrics) return;
  const pills = [];

  if (metrics.passiveListeners > 0) {
    pills.push(`
      <span class="metric-pill">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 7l-5-5-5 5M17 17l-5 5-5-5"/></svg>
        ${metrics.passiveListeners} scroll listeners passive
      </span>
    `);
  }

  if (metrics.pausedVideos > 0) {
    pills.push(`
      <span class="metric-pill">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="4" height="16" x="6" y="4" rx="1"/><rect width="4" height="16" x="14" y="4" rx="1"/></svg>
        ${metrics.pausedVideos} background videos paused
      </span>
    `);
  }

  if (metrics.bypassedBlurs > 0) {
    pills.push(`
      <span class="metric-pill">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        ${metrics.bypassedBlurs} blur panels bypassed
      </span>
    `);
  }

  if (metrics.offscreenCanvases > 0 || metrics.canvasDrawsSkipped > 0) {
    pills.push(`
      <span class="metric-pill">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
        Canvas draw-skipping active
      </span>
    `);
  }

  if (metrics.patchedFonts > 0) {
    pills.push(`
      <span class="metric-pill">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" x2="15" y1="20" y2="20"/><line x1="12" x2="12" y1="4" y2="20"/></svg>
        ${metrics.patchedFonts} fonts swapped
      </span>
    `);
  }

  metricsContainer.innerHTML = pills.join('');
}

function requestPageStatus(attempt = 0) {
  if (!currentTab?.id || !currentTab.url || !/^https?:\/\//i.test(currentTab.url)) {
    renderUnsupportedStatus();
    return;
  }
  sendTabMessage(currentTab.id, { type: 'GET_STATUS' }).then(({ response, error }) => {
    if (!error && response?.status === 'initializing' && attempt < 8) {
      window.setTimeout(() => requestPageStatus(attempt + 1), 125);
      return;
    }
    if (!error && response?.status === 'initializing') {
      renderReloadStatus();
      return;
    }
    if (error || !response?.status) {
      if (!getSiteState().enabled) renderSiteOffStatus();
      else renderReloadStatus();
      return;
    }

    statusDot.className = response.enabled ? 'status-dot is-active' : 'status-dot is-muted';
    statusPage.textContent = response.enabled ? 'Active' : 'Off for this site';
    statusDetail.textContent = response.enabled
      ? (response.mode === 'auto'
          ? (response.archetype === 'interactive-canvas'
              ? 'Smart Auto: Interactive canvas app detected. Bypassing canvas throttling to ensure full input responsiveness.'
              : 'Smart Auto: Running verified heuristics for responsive browsing.')
          : 'SmoothBoost is running in this tab.')
      : 'SmoothBoost is loaded, but paused for this site.';

    const modeLabels = { auto: 'Smart Auto', ultra: 'Maximum', balanced: 'Balanced', custom: 'Custom' };
    statusProfile.textContent = response.enabled ? (modeLabels[response.mode] || 'Custom') : 'Off';

    const onReanime = Boolean(response.siteRule && response.siteRule !== 'not-applicable');
    if (siteRuleRow) {
      siteRuleRow.hidden = !onReanime;
      if (siteRuleRow.style) siteRuleRow.style.display = onReanime ? 'flex' : 'none';
      if (onReanime) renderRuleStatus(response.siteRule);
    }

    // Request actual optimizer metrics
    sendTabMessage(currentTab.id, { type: 'GET_METRICS' }).then(({ response: metricsResp }) => {
      if (metricsResp?.metrics) renderMetricsPills(metricsResp.metrics);
    });
  });
}

function sendTabMessage(tabId, message) {
  return new Promise((resolve) => {
    try {
      chrome.tabs.sendMessage(tabId, message, { frameId: 0 }, (response) => {
        const error = chrome.runtime.lastError;
        resolve({ response, error });
      });
    } catch (err) {
      resolve({ response: null, error: err });
    }
  });
}

function buildIssueUrl(siteBroken) {
  const profile = getSiteState().mode || 'unknown';
  const browser = typeof navigator !== 'undefined' ? (navigator.userAgent || 'Unknown browser') : 'Unknown browser';
  const title = siteBroken ? `[Bug] Site looks broken on ${currentHostname || 'this page'}` : '[Bug] SmoothBoost issue';
  const body = [
    '## Page details',
    `- Site: ${currentHostname || 'unknown'}`,
    `- Profile: ${profile}`,
    `- Browser: ${browser}`,
    siteBroken ? '- SmoothBoost was turned off for this site from the popup.' : '',
    '',
    '## What happened?',
    '',
    '## Steps to reproduce',
    '1. ',
    '',
    '## Expected result',
    '',
    '## Actual result',
    ''
  ].filter(Boolean).join('\n');
  return `${GITHUB_ISSUE_URL}?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
}

function bindEvents() {
  if (controlsTab) controlsTab.addEventListener('click', () => selectTab('controls'));
  if (helpTab) helpTab.addEventListener('click', () => selectTab('help'));
  if (checkUpdatesButton) checkUpdatesButton.addEventListener('click', () => { void checkForUpdates(true); });

  siteToggle.addEventListener('change', () => {
    updateSiteOverride({ enabled: siteToggle.checked });
    renderUI();
    saveAndBroadcast();
  });

  if (btnAuto) btnAuto.addEventListener('click', () => setMode('auto'));
  if (btnUltra) btnUltra.addEventListener('click', () => setMode('ultra'));
  if (btnBalanced) btnBalanced.addEventListener('click', () => setMode('balanced'));
  if (btnCustom) btnCustom.addEventListener('click', () => setMode('custom'));

  if (btnAcceptAuto) {
    btnAcceptAuto.addEventListener('click', () => {
      config.showAutoPromo = false;
      if (autoPromoBanner) {
        autoPromoBanner.hidden = true;
        if (autoPromoBanner.style) autoPromoBanner.style.display = 'none';
      }
      setMode('auto');
    });
  }

  if (btnDismissAuto) {
    btnDismissAuto.addEventListener('click', () => {
      config.showAutoPromo = false;
      if (autoPromoBanner) {
        autoPromoBanner.hidden = true;
        if (autoPromoBanner.style) autoPromoBanner.style.display = 'none';
      }
      chrome.storage.local.set({ smoothBoostConfig: config });
    });
  }

  if (updateNotificationDismiss && updateNotificationBanner) {
    updateNotificationDismiss.addEventListener('click', () => {
      updateNotificationBanner.hidden = true;
      if (updateNotificationBanner.style) updateNotificationBanner.style.display = 'none';
    });
  }

  [
    [toggleAnim, 'killAnimations'],
    [toggleTrans, 'killTransitions'],
    [toggleBlur, 'killBlurFilters'],
    [toggleScroll, 'killScrollHijack'],
    [toggleMedia, 'pauseBackgroundMedia'],
    [toggleFps, 'throttleCanvasFps'],
    [toggleOffscreen, 'pauseOffscreenAnimations'],
    [toggleContentVisibility, 'contentVisibility'],
    [toggleOffscreenCanvas, 'pauseOffscreenCanvas'],
    [togglePassiveScroll, 'passiveScroll'],
    [toggleAsyncImages, 'asyncImageDecoding']
  ].forEach(([input, key]) => {
    if (input) input.addEventListener('change', () => setCustomSetting(key, input.checked));
  });

  if (siteBrokenButton) {
    siteBrokenButton.addEventListener('click', async () => {
      if (!currentHostname || !currentTab?.id) return;
      updateSiteOverride({ enabled: false });
      renderUI();

      // Purge cached archetype so a bad guess doesn't stick
      try {
        await chrome.runtime.sendMessage({ type: 'PURGE_ARCHETYPE', hostname: currentHostname });
      } catch (_e) {}

      await saveAndBroadcast();

      // Reload tab to instantly restore original site appearance
      try {
        await chrome.tabs.reload(currentTab.id);
      } catch (_e) {}
    });
  }

  if (bugReportLink) {
    bugReportLink.addEventListener('click', (event) => {
      event.preventDefault();
      chrome.tabs.create({ url: buildIssueUrl(false) });
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      config = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
      renderUI();
      await saveAndBroadcast();
    });
  }
}

function selectTab(tabName) {
  const showControls = tabName === 'controls';
  if (controlsTab) {
    controlsTab.classList.toggle('is-selected', showControls);
    controlsTab.setAttribute('aria-selected', String(showControls));
    controlsTab.tabIndex = showControls ? 0 : -1;
  }
  if (helpTab) {
    helpTab.classList.toggle('is-selected', !showControls);
    helpTab.setAttribute('aria-selected', String(!showControls));
    helpTab.tabIndex = showControls ? -1 : 0;
  }
  if (controlsPanel) controlsPanel.hidden = !showControls;
  if (helpPanel) helpPanel.hidden = showControls;
}

document.addEventListener('DOMContentLoaded', init);
