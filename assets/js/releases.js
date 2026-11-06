// SmoothBoost - Dynamic GitHub Releases & Platform Auto-Detector
// Fetches published releases, matches assets per browser/platform, and updates download targets dynamically.

(function () {
  'use strict';

  const GITHUB_REPO = 'BiniFn/SmoothBoost';
  const API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
  const RELEASES_PAGE_URL = `https://github.com/${GITHUB_REPO}/releases/latest`;
  const CACHE_KEY = 'smoothboost_release_cache_v4';
  const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

  const DEFAULT_RELEASE = {
    version: 'v2.3.0',
    publishedAt: 'November 6, 2026',
    releaseUrl: `https://github.com/${GITHUB_REPO}/tree/v2.3.0`,
    body: `### SmoothBoost v2.3.0 — Adaptive Responsiveness & Live App Safeguards

- **Real-Time App Detection**: Discord, Google Meet, Teams, Zoom, and WhatsApp are recognized before heavier page scans. Automatic profiles preserve calls, canvas content, and interface motion.
- **Motion Preference Respect**: Automatic profiles on ws.ryuo.to leave animation playback to the site's Reduce motion setting.
- **Adaptive Frame Pressure Control**: The optional Custom limiter responds to sustained frame pressure with recovery windows and backs off around user input and live media.
- **Clearer Status & Demos**: The popup explains which protections are active, and the site uses descriptive examples instead of unmeasured performance figures.
- **Browser-Aware Scanning**: Expensive animation, canvas, blur, and font scans are skipped on real-time communication pages.`,
    downloads: {
      chrome: {
        name: 'SmoothBoost-Chrome-2.3.0.zip',
        url: `https://raw.githubusercontent.com/${GITHUB_REPO}/main/dist/SmoothBoost-Chrome-2.3.0.zip`,
        size: '42.4 KB'
      },
      titanium: {
        name: 'SmoothBoost-Titanium-Android-2.3.0.zip',
        url: `https://raw.githubusercontent.com/${GITHUB_REPO}/main/dist/SmoothBoost-Titanium-Android-2.3.0.zip`,
        size: '42.4 KB'
      },
      firefox: {
        name: 'SmoothBoost-Firefox-2.3.0.zip',
        url: `https://raw.githubusercontent.com/${GITHUB_REPO}/main/dist/SmoothBoost-Firefox-2.3.0.zip`,
        size: '42.5 KB'
      },
      firefoxAndroid: {
        name: 'SmoothBoost-Firefox-Android-2.3.0.zip',
        url: `https://raw.githubusercontent.com/${GITHUB_REPO}/main/dist/SmoothBoost-Firefox-Android-2.3.0.zip`,
        size: '42.5 KB'
      }
    }
  };

  function detectBrowserPlatform() {
    const ua = (typeof navigator !== 'undefined' ? navigator.userAgent : '') || '';
    const isAndroid = /android/i.test(ua);
    const isFirefox = /firefox|fxios/i.test(ua);
    const isTitanium = /titanium/i.test(ua);
    const isEdge = /edg/i.test(ua);
    const isBrave = Boolean(typeof navigator !== 'undefined' && navigator.brave && typeof navigator.brave.isBrave === 'function');
    const isHelium = /helium/i.test(ua);

    if (isFirefox) {
      if (isAndroid) {
        return {
          key: 'firefox-android',
          downloadKey: 'firefoxAndroid',
          tabId: 'firefox-android',
          tutorialHash: '#firefox-android',
          name: 'Firefox for Android',
          shortName: 'Firefox Android',
          isMobile: true
        };
      }
      return {
        key: 'firefox',
        downloadKey: 'firefox',
        tabId: 'firefox',
        tutorialHash: '#firefox',
        name: 'Firefox Desktop',
        shortName: 'Firefox',
        isMobile: false
      };
    }

    if (isAndroid) {
      return {
        key: 'titanium',
        downloadKey: 'titanium',
        tabId: 'titanium',
        tutorialHash: '#titanium',
        name: isTitanium ? 'Titanium Browser' : 'Android Browser',
        shortName: isTitanium ? 'Titanium' : 'Android',
        isMobile: true
      };
    }

    let browserName = 'Chrome & Helium';
    let shortName = 'Chrome';
    if (isBrave) {
      browserName = 'Brave Desktop';
      shortName = 'Brave';
    } else if (isEdge) {
      browserName = 'Microsoft Edge';
      shortName = 'Edge';
    } else if (isHelium) {
      browserName = 'Helium Browser';
      shortName = 'Helium';
    }

    return {
      key: 'chrome',
      downloadKey: 'chrome',
      tabId: 'chrome',
      tutorialHash: '#chrome',
      name: browserName,
      shortName: shortName,
      isMobile: false
    };
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(2)} MB`;
  }

  function formatDate(isoString) {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (_e) {
      return '';
    }
  }

  function compareVersions(left, right) {
    const parts = (value) => String(value || '').replace(/^v/i, '').split('.').slice(0, 3)
      .map((part) => /^\d+$/.test(part) ? Number(part) : 0);
    const a = parts(left);
    const b = parts(right);
    for (let index = 0; index < 3; index += 1) {
      const difference = (a[index] || 0) - (b[index] || 0);
      if (difference) return Math.sign(difference);
    }
    return 0;
  }

  function parseReleasePayload(data) {
    const rawTag = String(data.tag_name || data.name || DEFAULT_RELEASE.version);
    const version = rawTag.startsWith('v') ? rawTag : `v${rawTag}`;
    const cleanVer = version.replace(/^v/, '');
    const publishedAt = formatDate(data.published_at) || DEFAULT_RELEASE.publishedAt;
    const releaseUrl = data.html_url || RELEASES_PAGE_URL;
    const body = data.body || DEFAULT_RELEASE.body;

    // Default dynamic URLs pointing to the exact release version tag
    const downloads = {
      chrome: {
        name: `SmoothBoost-Chrome-${cleanVer}.zip`,
        url: `https://github.com/${GITHUB_REPO}/releases/download/${version}/SmoothBoost-Chrome-${cleanVer}.zip`,
        size: '42.4 KB'
      },
      titanium: {
        name: `SmoothBoost-Titanium-Android-${cleanVer}.zip`,
        url: `https://github.com/${GITHUB_REPO}/releases/download/${version}/SmoothBoost-Titanium-Android-${cleanVer}.zip`,
        size: '42.4 KB'
      },
      firefox: {
        name: `SmoothBoost-Firefox-${cleanVer}.zip`,
        url: `https://github.com/${GITHUB_REPO}/releases/download/${version}/SmoothBoost-Firefox-${cleanVer}.zip`,
        size: '42.5 KB'
      },
      firefoxAndroid: {
        name: `SmoothBoost-Firefox-Android-${cleanVer}.zip`,
        url: `https://github.com/${GITHUB_REPO}/releases/download/${version}/SmoothBoost-Firefox-Android-${cleanVer}.zip`,
        size: '42.5 KB'
      }
    };

    const assets = Array.isArray(data.assets) ? data.assets : [];
    for (const asset of assets) {
      const name = asset.name || '';
      const sizeStr = formatBytes(asset.size);
      const downloadUrl = asset.browser_download_url;

      if (/titanium/i.test(name)) {
        downloads.titanium = { name, url: downloadUrl, size: sizeStr || '42.4 KB' };
      } else if (/firefox-android/i.test(name)) {
        downloads.firefoxAndroid = { name, url: downloadUrl, size: sizeStr || '42.5 KB' };
      } else if (/firefox/i.test(name)) {
        downloads.firefox = { name, url: downloadUrl, size: sizeStr || '42.5 KB' };
      } else if (/chrome/i.test(name) || name === `SmoothBoost-${cleanVer}.zip`) {
        downloads.chrome = { name, url: downloadUrl, size: sizeStr || '42.4 KB' };
      }
    }

    return {
      version,
      publishedAt,
      releaseUrl,
      body,
      downloads
    };
  }

  function getCachedRelease() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (Date.now() - (parsed.cachedAt || 0) < CACHE_TTL_MS && parsed.data) {
        return parsed.data;
      }
    } catch (_e) {}
    return null;
  }

  function setCachedRelease(data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ cachedAt: Date.now(), data }));
    } catch (_e) {}
  }

  async function fetchLiveRelease() {
    try {
      const res = await fetch(API_URL, {
        headers: { Accept: 'application/vnd.github.v3+json' },
        cache: 'no-cache'
      });
      if (!res.ok) throw new Error(`GitHub API HTTP ${res.status}`);
      const data = await res.json();
      const candidate = parseReleasePayload(data);
      const parsed = compareVersions(candidate.version, DEFAULT_RELEASE.version) < 0
        ? DEFAULT_RELEASE
        : candidate;
      setCachedRelease(parsed);
      return parsed;
    } catch (_e) {
      return null;
    }
  }

  function escapeHtml(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function markdownToHtml(md) {
    if (!md) return '';
    return escapeHtml(md)
      .replace(/### (.*?)\n/g, '<h4 class="changelog-heading">$1</h4>')
      .replace(/## (.*?)\n/g, '<h3 class="changelog-heading">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code class="changelog-code">$1</code>')
      .replace(/^- (.*$)/gm, '<li class="changelog-item">$1</li>')
      .replace(/\n\n+/g, '</p><p class="changelog-p">');
  }

  function applyReleaseToDom(release) {
    const platform = detectBrowserPlatform();

    // 1. Version & date text markers
    document.querySelectorAll('[data-release-version]').forEach((el) => {
      el.textContent = release.version;
    });
    document.querySelectorAll('[data-release-date]').forEach((el) => {
      el.textContent = release.publishedAt;
    });

    // 2. Specific platform download links & badges
    const map = {
      chrome: release.downloads.chrome,
      titanium: release.downloads.titanium,
      firefox: release.downloads.firefox,
      'firefox-android': release.downloads.firefoxAndroid
    };

    for (const [key, asset] of Object.entries(map)) {
      if (!asset) continue;
      document.querySelectorAll(`[data-download="${key}"]`).forEach((btn) => {
        btn.setAttribute('href', asset.url);
        btn.setAttribute('download', asset.name);
      });
      document.querySelectorAll(`[data-asset-size="${key}"]`).forEach((badge) => {
        badge.textContent = asset.size;
      });
      document.querySelectorAll(`[data-asset-name="${key}"]`).forEach((span) => {
        span.textContent = asset.name;
      });
    }

    // 3. Auto-detected browser download action (Hero & header auto-download buttons)
    const detectedAsset = release.downloads[platform.downloadKey] || release.downloads.chrome;
    if (detectedAsset) {
      document.querySelectorAll('[data-auto-download="true"]').forEach((btn) => {
        btn.setAttribute('href', detectedAsset.url);
        btn.setAttribute('download', detectedAsset.name);
        btn.setAttribute('data-target-platform', platform.key);

        const autoTextSpan = btn.querySelector('[data-auto-download-label]') || btn.querySelector('.btn-text-full');
        if (autoTextSpan) {
          autoTextSpan.textContent = `Download for ${platform.name}`;
        }
      });

      document.querySelectorAll('[data-detected-browser]').forEach((el) => {
        el.textContent = platform.name;
      });
    }

    // 4. Highlight & activate matching platform tab in compatibility section
    if (!window.__smoothboostPlatformUserSelected) {
      const targetTabBtn = document.querySelector(`[data-platform-tab="${platform.tabId}"]`);
      const targetPanel = document.querySelector(`[data-platform-panel="${platform.tabId}"]`);
      if (targetTabBtn && targetPanel) {
        document.querySelectorAll('[data-platform-tab]').forEach((btn) => {
          btn.classList.remove('is-active');
          btn.setAttribute('aria-selected', 'false');
        });
        document.querySelectorAll('[data-platform-panel]').forEach((panel) => {
          panel.hidden = true;
          panel.classList.remove('is-active');
        });
        targetTabBtn.classList.add('is-active');
        targetTabBtn.setAttribute('aria-selected', 'true');
        targetPanel.hidden = false;
        targetPanel.classList.add('is-active');
      }
    }

    // 5. Release notes / changelog container
    const notesContainer = document.getElementById('release-notes-content');
    if (notesContainer) {
      notesContainer.innerHTML = `<ul class="changelog-list">${markdownToHtml(release.body)}</ul>`;
    }

    // 6. View on GitHub release link
    document.querySelectorAll('[data-release-url]').forEach((el) => {
      el.setAttribute('href', release.releaseUrl);
    });
  }

  async function init() {
    // Step 1: Render cached or default release immediately (zero layout shift)
    const cached = getCachedRelease();
    const initial = cached || DEFAULT_RELEASE;
    applyReleaseToDom(initial);

    // Step 2: Fetch fresh GitHub release in background (stale-while-revalidate)
    const live = await fetchLiveRelease();
    if (live) {
      applyReleaseToDom(live);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.SmoothBoostReleases = {
    detectBrowserPlatform,
    fetchLiveRelease,
    applyReleaseToDom,
    DEFAULT_RELEASE
  };
})();
