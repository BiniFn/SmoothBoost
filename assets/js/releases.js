// SmoothBoost - Dynamic GitHub Releases Client
// Fetches the latest published release, maps assets per platform, and provides clean fallbacks.

(function () {
  'use strict';

  const GITHUB_REPO = 'BiniFn/SmoothBoost';
  const API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
  const RELEASES_PAGE_URL = `https://github.com/${GITHUB_REPO}/releases/latest`;
  const CACHE_KEY = 'smoothboost_release_cache_v2';
  const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

  const DEFAULT_RELEASE = {
    version: 'v2.1.0',
    publishedAt: 'October 18, 2026',
    releaseUrl: RELEASES_PAGE_URL,
    body: `### SmoothBoost v2.1.0 — Cross-Browser & Mobile Edition

- **Titanium Browser for Android**: Dedicated mobile release with touch-friendly controls (>= 44px tap targets) and Android Low Memory Killer (LMK) protection.
- **Firefox Desktop & Android (Gecko MV3)**: Event-page background scripts with Firefox 128+ \`world: "MAIN"\` content script support.
- **Battery Saver Profile**: Reduces CPU/GPU drain on mobile devices and laptops by enabling \`content-visibility: auto\` and pausing idle canvas draw loops.
- **Interactive App Safeguards**: Classifies page archetypes and strictly exempts Figma, Google Docs, Canva, and WebGL games from canvas draw-skips.
- **Settings Backup & Restore**: Export and import configurations via JSON with schema validation.
- **100% Vector Dark UI**: Streamlined interface with vector SVG icons and verified operational metrics.`,
    downloads: {
      chrome: {
        name: 'SmoothBoost-Chrome-2.1.0.zip',
        url: `https://github.com/${GITHUB_REPO}/releases/latest/download/SmoothBoost-Chrome-2.1.0.zip`,
        size: '38.0 KB'
      },
      titanium: {
        name: 'SmoothBoost-Titanium-Android-2.1.0.zip',
        url: `https://github.com/${GITHUB_REPO}/releases/latest/download/SmoothBoost-Titanium-Android-2.1.0.zip`,
        size: '38.0 KB'
      },
      firefox: {
        name: 'SmoothBoost-Firefox-2.1.0.zip',
        url: `https://github.com/${GITHUB_REPO}/releases/latest/download/SmoothBoost-Firefox-2.1.0.zip`,
        size: '38.1 KB'
      },
      firefoxAndroid: {
        name: 'SmoothBoost-Firefox-Android-2.1.0.zip',
        url: `https://github.com/${GITHUB_REPO}/releases/latest/download/SmoothBoost-Firefox-Android-2.1.0.zip`,
        size: '38.1 KB'
      }
    }
  };

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

  function parseReleasePayload(data) {
    const rawTag = String(data.tag_name || data.name || 'v2.1.0');
    const version = rawTag.startsWith('v') ? rawTag : `v${rawTag}`;
    const publishedAt = formatDate(data.published_at) || DEFAULT_RELEASE.publishedAt;
    const releaseUrl = data.html_url || RELEASES_PAGE_URL;
    const body = data.body || DEFAULT_RELEASE.body;

    const assets = Array.isArray(data.assets) ? data.assets : [];
    const downloads = { ...DEFAULT_RELEASE.downloads };

    for (const asset of assets) {
      const name = asset.name || '';
      const sizeStr = formatBytes(asset.size);
      const downloadUrl = asset.browser_download_url;

      if (/titanium/i.test(name)) {
        downloads.titanium = { name, url: downloadUrl, size: sizeStr || '38 KB' };
      } else if (/firefox-android/i.test(name)) {
        downloads.firefoxAndroid = { name, url: downloadUrl, size: sizeStr || '38 KB' };
      } else if (/firefox/i.test(name)) {
        downloads.firefox = { name, url: downloadUrl, size: sizeStr || '38 KB' };
      } else if (/chrome/i.test(name) || name === `SmoothBoost-${version.replace(/^v/, '')}.zip`) {
        downloads.chrome = { name, url: downloadUrl, size: sizeStr || '38 KB' };
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

  async function fetchLatestRelease() {
    const cached = getCachedRelease();
    if (cached) return cached;

    try {
      const res = await fetch(API_URL, {
        headers: { Accept: 'application/vnd.github.v3+json' }
      });
      if (!res.ok) throw new Error(`GitHub API HTTP ${res.status}`);
      const data = await res.json();
      const parsed = parseReleasePayload(data);
      setCachedRelease(parsed);
      return parsed;
    } catch (_e) {
      return DEFAULT_RELEASE;
    }
  }

  function markdownToHtml(md) {
    if (!md) return '';
    return md
      .replace(/### (.*?)\n/g, '<h4 class="changelog-heading">$1</h4>')
      .replace(/## (.*?)\n/g, '<h3 class="changelog-heading">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code class="changelog-code">$1</code>')
      .replace(/^- (.*$)/gm, '<li class="changelog-item">$1</li>')
      .replace(/\n\n+/g, '</p><p class="changelog-p">');
  }

  function applyReleaseToDom(release) {
    // 1. Text elements with version & date
    document.querySelectorAll('[data-release-version]').forEach((el) => {
      el.textContent = release.version;
    });
    document.querySelectorAll('[data-release-date]').forEach((el) => {
      el.textContent = release.publishedAt;
    });

    // 2. Platform download links & file size badges
    const map = {
      chrome: release.downloads.chrome,
      titanium: release.downloads.titanium,
      firefox: release.downloads.firefox,
      'firefox-android': release.downloads.firefoxAndroid
    };

    for (const [platform, asset] of Object.entries(map)) {
      if (!asset) continue;
      document.querySelectorAll(`[data-download="${platform}"]`).forEach((btn) => {
        btn.setAttribute('href', asset.url);
        btn.setAttribute('download', asset.name);
      });
      document.querySelectorAll(`[data-asset-size="${platform}"]`).forEach((badge) => {
        badge.textContent = asset.size;
      });
      document.querySelectorAll(`[data-asset-name="${platform}"]`).forEach((span) => {
        span.textContent = asset.name;
      });
    }

    // 3. Release notes / changelog container
    const notesContainer = document.getElementById('release-notes-content');
    if (notesContainer) {
      notesContainer.innerHTML = `<ul class="changelog-list">${markdownToHtml(release.body)}</ul>`;
    }

    // 4. View on GitHub release link
    document.querySelectorAll('[data-release-url]').forEach((el) => {
      el.setAttribute('href', release.releaseUrl);
    });
  }

  async function init() {
    // Render defaults immediately to avoid layout shift
    applyReleaseToDom(DEFAULT_RELEASE);

    // Fetch and apply live GitHub release
    const live = await fetchLatestRelease();
    applyReleaseToDom(live);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.SmoothBoostReleases = {
    fetchLatestRelease,
    applyReleaseToDom,
    DEFAULT_RELEASE
  };
})();
