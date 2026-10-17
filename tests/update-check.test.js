const test = require('node:test');
const assert = require('node:assert/strict');
const updates = require('../popup/update-check.js');

test('compares stable numeric versions without lexicographic mistakes', () => {
  assert.equal(updates.compareVersions('1.0.9', '1.0.10'), -1);
  assert.equal(updates.compareVersions('v2.0.0', '1.99.99'), 1);
  assert.equal(updates.compareVersions('1.0.7', 'v1.0.7'), 0);
  assert.equal(updates.compareVersions('1.0', '1.0.0'), 0);
  assert.equal(updates.compareVersions('v2', '1.0.8'), 1);
  assert.equal(updates.compareVersions('invalid', '1.0.0'), null);
});

test('returns a fixed GitHub ZIP link for a newer stable release with the expected asset', () => {
  const result = updates.fromRelease('1.0.7', {
    tag_name: 'v1.0.8',
    draft: false,
    prerelease: false,
    assets: [{ name: 'SmoothBoost-1.0.8.zip' }]
  });

  assert.equal(result.status, 'update');
  assert.equal(result.downloadUrl, 'https://github.com/BiniFn/SmoothBoost/releases/download/v1.0.8/SmoothBoost-1.0.8.zip');
  assert.equal(result.releaseUrl, 'https://github.com/BiniFn/SmoothBoost/releases/tag/v1.0.8');
});

test('handles short tag formats like v2 with attached zip assets', () => {
  const result = updates.fromRelease('1.0.8', {
    tag_name: 'v2',
    draft: false,
    prerelease: false,
    assets: [{ name: 'SmoothBoost-2.0.0.zip' }]
  });

  assert.equal(result.status, 'update');
  assert.equal(result.latestVersion, '2.0.0');
  assert.equal(result.downloadUrl, 'https://github.com/BiniFn/SmoothBoost/releases/download/v2/SmoothBoost-2.0.0.zip');
  assert.equal(result.releaseUrl, 'https://github.com/BiniFn/SmoothBoost/releases/tag/v2');
});

test('does not offer a ZIP when the release did not attach the expected file', () => {
  const result = updates.fromRelease('1.0.7', {
    tag_name: 'v1.0.8',
    draft: false,
    prerelease: false,
    assets: [{ name: 'another-file.zip' }]
  });

  assert.equal(result.status, 'update-without-zip');
  assert.equal(result.downloadUrl, undefined);
});

test('ignores drafts, prereleases, malformed versions, and malformed cache data', () => {
  const release = { tag_name: 'v1.0.8', assets: [{ name: 'SmoothBoost-1.0.8.zip' }] };
  assert.equal(updates.fromRelease('1.0.7', { ...release, draft: true }), null);
  assert.equal(updates.fromRelease('1.0.7', { ...release, prerelease: true }), null);
  assert.equal(updates.fromRelease('1.0.7', { ...release, tag_name: 'v1.0.8/evil' }), null);
  assert.equal(updates.fromCache('1.0.7', { checkedAt: Date.now(), latestVersion: '1.0.8/evil', hasZip: true }), null);
});

test('uses valid cached release versions to recreate only the fixed project URLs', () => {
  const result = updates.fromCache('1.0.7', {
    checkedAt: Date.now(),
    latestVersion: '1.0.8',
    hasZip: true,
    tag: 'v1.0.8',
    zipFileName: 'SmoothBoost-1.0.8.zip'
  });

  assert.equal(result.status, 'update');
  assert.equal(result.downloadUrl, 'https://github.com/BiniFn/SmoothBoost/releases/download/v1.0.8/SmoothBoost-1.0.8.zip');
});

test('fetchLatestReleaseInfo falls back to redirect when API fails', async () => {
  const fetchMock = async (url) => {
    if (url.includes('api.github.com')) {
      return { ok: false, status: 403 };
    }
    if (url.includes('releases/latest')) {
      return {
        ok: true,
        url: 'https://github.com/BiniFn/SmoothBoost/releases/tag/v2'
      };
    }
    if (url.includes('expanded_assets')) {
      return {
        ok: true,
        async text() {
          return '<a href="/BiniFn/SmoothBoost/releases/download/v2/SmoothBoost-2.0.0.zip">SmoothBoost-2.0.0.zip</a>';
        }
      };
    }
    return { ok: false };
  };

  const result = await updates.fetchLatestReleaseInfo('1.0.8', { fetchImpl: fetchMock });
  assert.notEqual(result, null);
  assert.equal(result.status, 'update');
  assert.equal(result.latestVersion, '2.0.0');
  assert.equal(result.downloadUrl, 'https://github.com/BiniFn/SmoothBoost/releases/download/v2/SmoothBoost-2.0.0.zip');
});
