// GitHub release metadata is treated as untrusted input. Only accept stable
// semantic versions and build links from fixed project URLs.
(function attachUpdateChecker(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SmoothBoostUpdates = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createUpdateChecker() {
  const OWNER = 'BiniFn';
  const REPOSITORY = 'SmoothBoost';
  const RELEASES_API_URL = `https://api.github.com/repos/${OWNER}/${REPOSITORY}/releases/latest`;
  const RELEASES_PAGE_URL = `https://github.com/${OWNER}/${REPOSITORY}/releases/latest`;
  const RAW_MANIFEST_URL = `https://raw.githubusercontent.com/${OWNER}/${REPOSITORY}/main/manifest.json`;

  function parseVersion(value) {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    const match = /^v?(\d{1,3})(?:\.(\d{1,3}))?(?:\.(\d{1,3}))?$/.exec(trimmed);
    if (!match) return null;
    const major = Number(match[1]);
    const minor = match[2] !== undefined ? Number(match[2]) : 0;
    const patch = match[3] !== undefined ? Number(match[3]) : 0;
    return [major, minor, patch];
  }

  function compareVersions(left, right) {
    const a = parseVersion(left);
    const b = parseVersion(right);
    if (!a || !b) return null;
    for (let index = 0; index < a.length; index += 1) {
      if (a[index] !== b[index]) return a[index] > b[index] ? 1 : -1;
    }
    return 0;
  }

  function sanitizeTag(tag) {
    if (typeof tag !== 'string') return '';
    const clean = tag.trim();
    return /^v?[0-9A-Za-z._-]+$/.test(clean) ? clean : '';
  }

  function sanitizeZipName(name) {
    if (typeof name !== 'string') return '';
    const clean = name.trim();
    return /^SmoothBoost-[0-9A-Za-z._-]+\.zip$/i.test(clean) ? clean : '';
  }

  function createResult(currentVersion, latestVersion, hasZip, options = {}) {
    const comparison = compareVersions(latestVersion, currentVersion);
    if (comparison === null) return null;

    const parsedLatest = parseVersion(latestVersion);
    const version = parsedLatest.join('.');
    const cleanTag = sanitizeTag(options.tag) || `v${version}`;
    const cleanZip = sanitizeZipName(options.zipFileName) || `SmoothBoost-${version}.zip`;

    const result = {
      currentVersion,
      latestVersion: version,
      hasZip: Boolean(hasZip),
      releaseUrl: `https://github.com/${OWNER}/${REPOSITORY}/releases/tag/${encodeURIComponent(cleanTag)}`,
      status: comparison > 0 ? (hasZip ? 'update' : 'update-without-zip') : (comparison < 0 ? 'ahead' : 'current')
    };

    if (comparison > 0 && hasZip) {
      result.downloadUrl = `https://github.com/${OWNER}/${REPOSITORY}/releases/download/${encodeURIComponent(cleanTag)}/${cleanZip}`;
    }
    return result;
  }

  function matchPlatformAsset(assets, platformKey) {
    if (!Array.isArray(assets) || assets.length === 0) return null;
    const cleanKey = String(platformKey || '').toLowerCase();

    // 1. Direct browser platform match
    if (cleanKey === 'firefox-android') {
      const match = assets.find((a) => a && typeof a.name === 'string' && /firefox-android/i.test(a.name));
      if (match) return match;
    } else if (cleanKey === 'firefox') {
      const match = assets.find((a) => a && typeof a.name === 'string' && /firefox/i.test(a.name) && !/android/i.test(a.name));
      if (match) return match;
    } else if (cleanKey === 'titanium') {
      const match = assets.find((a) => a && typeof a.name === 'string' && /titanium/i.test(a.name));
      if (match) return match;
    } else if (cleanKey === 'chrome') {
      const match = assets.find((a) => a && typeof a.name === 'string' && /chrome/i.test(a.name));
      if (match) return match;
    }

    // 2. Legacy alias or generic package SmoothBoost-<version>.zip
    const legacy = assets.find((a) => a && typeof a.name === 'string' && /^smoothboost-\d/i.test(a.name));
    if (legacy) return legacy;

    // 3. Any SmoothBoost zip asset
    return assets.find((a) => {
      if (!a || typeof a.name !== 'string') return false;
      const name = a.name.toLowerCase();
      return name.endsWith('.zip') && name.includes('smoothboost');
    }) || null;
  }

  function fromRelease(currentVersion, release, options = {}) {
    if (!release || typeof release !== 'object' || release.draft || release.prerelease) return null;
    const rawTag = sanitizeTag(release.tag_name);
    let parsedTag = parseVersion(rawTag);
    if (!parsedTag && typeof release.name === 'string') {
      const match = /v?(\d{1,3}(?:\.\d{1,3}){0,2})/.exec(release.name);
      if (match) parsedTag = parseVersion(match[1]);
    }
    if (!parsedTag) return null;

    const latestVersion = parsedTag.join('.');
    const matchedAsset = Array.isArray(release.assets)
      ? matchPlatformAsset(release.assets, options.platformKey)
      : null;

    const hasZip = Boolean(matchedAsset);
    return createResult(currentVersion, latestVersion, hasZip, {
      tag: rawTag,
      zipFileName: matchedAsset ? matchedAsset.name : undefined
    });
  }

  function fromCache(currentVersion, cached) {
    if (!cached || typeof cached !== 'object' || typeof cached.checkedAt !== 'number') return null;
    const latestVersion = parseVersion(cached.latestVersion);
    if (!latestVersion || typeof cached.hasZip !== 'boolean') return null;
    return createResult(currentVersion, latestVersion.join('.'), cached.hasZip, {
      tag: cached.tag,
      zipFileName: cached.zipFileName
    });
  }

  async function fetchLatestReleaseInfo(currentVersion, options = {}) {
    const fetcher = typeof options.fetchImpl === 'function' ? options.fetchImpl : (typeof fetch === 'function' ? fetch : null);
    if (!fetcher) return null;
    const signal = options.signal;
    const platformKey = options.platformKey;

    // 1. Try official GitHub REST API
    try {
      const response = await fetcher(RELEASES_API_URL, {
        headers: { Accept: 'application/vnd.github+json' },
        cache: 'no-store',
        signal
      });
      if (response && response.ok) {
        const release = await response.json();
        const result = fromRelease(currentVersion, release, options);
        if (result) return result;
      }
    } catch (_apiError) {
      // Fall through to fallback
    }

    // 2. Fallback via GitHub release latest redirect & expanded assets (no REST API rate limit)
    try {
      const pageRes = await fetcher(RELEASES_PAGE_URL, {
        cache: 'no-store',
        signal,
        redirect: 'follow'
      });
      if (pageRes && pageRes.ok && pageRes.url) {
        const tagMatch = /\/releases\/tag\/([^/?#]+)/.exec(pageRes.url);
        if (tagMatch) {
          const rawTag = sanitizeTag(decodeURIComponent(tagMatch[1]));
          let hasZip = false;
          let zipFileName = undefined;

          try {
            const assetsRes = await fetcher(`https://github.com/${OWNER}/${REPOSITORY}/releases/expanded_assets/${encodeURIComponent(rawTag)}`, {
              cache: 'no-store',
              signal
            });
            if (assetsRes && assetsRes.ok) {
              const html = await assetsRes.text();
              const pattern = /href="\/[^"]*\/releases\/download\/([^"']+)\/(SmoothBoost-[^"']+\.zip)"/ig;
              let match;
              let bestZip = undefined;
              const key = String(platformKey || '').toLowerCase();

              while ((match = pattern.exec(html)) !== null) {
                const zipCandidate = sanitizeZipName(match[2]);
                if (!zipCandidate) continue;
                if (!bestZip) bestZip = zipCandidate;
                const lower = zipCandidate.toLowerCase();
                if (key === 'firefox-android' && lower.includes('firefox-android')) {
                  bestZip = zipCandidate;
                  break;
                } else if (key === 'firefox' && lower.includes('firefox') && !lower.includes('android')) {
                  bestZip = zipCandidate;
                  break;
                } else if (key === 'titanium' && lower.includes('titanium')) {
                  bestZip = zipCandidate;
                  break;
                } else if (key === 'chrome' && lower.includes('chrome')) {
                  bestZip = zipCandidate;
                  break;
                }
              }
              if (bestZip) {
                hasZip = true;
                zipFileName = bestZip;
              }
            }
          } catch (_assetsErr) {}

          let parsed = parseVersion(rawTag);
          if (!parsed && zipFileName) {
            const vMatch = /SmoothBoost-(\d{1,3}(?:\.\d{1,3}){0,2})\.zip/i.exec(zipFileName);
            if (vMatch) parsed = parseVersion(vMatch[1]);
          }

          if (parsed) {
            const result = createResult(currentVersion, parsed.join('.'), hasZip, {
              tag: rawTag,
              zipFileName
            });
            if (result) return result;
          }
        }
      }
    } catch (_pageErr) {}

    // 3. Fallback via raw repository manifest (no rate limit)
    try {
      const manifestRes = await fetcher(RAW_MANIFEST_URL, {
        cache: 'no-store',
        signal
      });
      if (manifestRes && manifestRes.ok) {
        const data = await manifestRes.json();
        const parsed = parseVersion(data?.version);
        if (parsed) {
          const latestVersion = parsed.join('.');
          let zipName = `SmoothBoost-${latestVersion}.zip`;
          const key = String(platformKey || '').toLowerCase();
          if (key === 'firefox') zipName = `SmoothBoost-Firefox-${latestVersion}.zip`;
          else if (key === 'firefox-android') zipName = `SmoothBoost-Firefox-Android-${latestVersion}.zip`;
          else if (key === 'titanium') zipName = `SmoothBoost-Titanium-Android-${latestVersion}.zip`;
          else if (key === 'chrome') zipName = `SmoothBoost-Chrome-${latestVersion}.zip`;

          const result = createResult(currentVersion, latestVersion, true, {
            tag: `v${latestVersion}`,
            zipFileName: zipName
          });
          if (result) return result;
        }
      }
    } catch (_manifestErr) {}

    return null;
  }

  return {
    OWNER,
    REPOSITORY,
    RELEASES_API_URL,
    RELEASES_PAGE_URL,
    RAW_MANIFEST_URL,
    compareVersions,
    fromCache,
    fromRelease,
    parseVersion,
    fetchLatestReleaseInfo
  };
});
