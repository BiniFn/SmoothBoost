const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..');

test('Chrome & Titanium Android manifest.json is fully valid MV3 and all assets exist', () => {
  const manifestPath = path.join(ROOT, 'manifest.json');
  assert.ok(fs.existsSync(manifestPath), 'manifest.json exists');

  const content = fs.readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(content);

  assert.equal(manifest.manifest_version, 3, 'is MV3');
  assert.equal(manifest.version, '2.2.0', 'version is 2.2.0');
  assert.ok(manifest.name, 'has name');
  assert.ok(manifest.description, 'has description');

  // Verify icons exist on disk
  for (const [size, iconPath] of Object.entries(manifest.icons || {})) {
    assert.ok(fs.existsSync(path.join(ROOT, iconPath)), `icon${size} exists: ${iconPath}`);
  }

  // Verify popup exists
  assert.ok(fs.existsSync(path.join(ROOT, manifest.action.default_popup)), 'popup html exists');

  // Verify service worker exists
  assert.ok(fs.existsSync(path.join(ROOT, manifest.background.service_worker)), 'background service worker exists');

  // Verify web accessible resources exist
  const warResources = (manifest.web_accessible_resources || []).flatMap((r) => r.resources || []);
  assert.ok(warResources.includes('scripts/compat.js'), 'war includes compat.js');
  assert.ok(warResources.includes('scripts/page-hook.js'), 'war includes page-hook.js');
  for (const res of warResources) {
    assert.ok(fs.existsSync(path.join(ROOT, res)), `war resource exists: ${res}`);
  }

  // Verify required permissions
  const perms = manifest.permissions || [];
  assert.ok(perms.includes('storage'), 'has storage perm');
  assert.ok(perms.includes('activeTab'), 'has activeTab perm');
  assert.ok(perms.includes('scripting'), 'has scripting perm');
  assert.ok(perms.includes('alarms'), 'has alarms perm');
  assert.ok(perms.includes('declarativeNetRequest'), 'has declarativeNetRequest perm');
});

test('Firefox manifest.firefox.json is fully valid Gecko MV3 and all assets exist', () => {
  const manifestPath = path.join(ROOT, 'manifest.firefox.json');
  assert.ok(fs.existsSync(manifestPath), 'manifest.firefox.json exists');

  const content = fs.readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(content);

  assert.equal(manifest.manifest_version, 3, 'is MV3');
  assert.equal(manifest.version, '2.2.0', 'version is 2.2.0');

  // Verify Gecko BSS
  const bss = manifest.browser_specific_settings;
  assert.ok(bss?.gecko?.id, 'has gecko id');
  assert.equal(bss.gecko.id, 'smoothboost@binifn.github.io');
  assert.ok(bss.gecko.strict_min_version, 'has gecko strict_min_version');
  assert.ok(bss.gecko_android?.strict_min_version, 'has gecko_android strict_min_version');

  // Verify event page scripts
  assert.ok(Array.isArray(manifest.background?.scripts), 'background is an array of scripts');
  assert.ok(manifest.background.scripts.includes('scripts/compat.js'), 'includes compat.js');
  assert.ok(manifest.background.scripts.includes('scripts/background.js'), 'includes background.js');
  for (const script of manifest.background.scripts) {
    assert.ok(fs.existsSync(path.join(ROOT, script)), `background script exists: ${script}`);
  }

  // Verify icons exist
  for (const [size, iconPath] of Object.entries(manifest.icons || {})) {
    assert.ok(fs.existsSync(path.join(ROOT, iconPath)), `icon${size} exists: ${iconPath}`);
  }

  // Verify popup
  assert.ok(fs.existsSync(path.join(ROOT, manifest.action.default_popup)), 'popup html exists');
});
