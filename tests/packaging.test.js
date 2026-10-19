const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const test = require('node:test');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const PACKAGER = path.join(ROOT, 'scripts/package_extension.py');

test('packager builds and verifies all release targets', () => {
  // Execute package_extension.py --target all
  const output = execFileSync('python3', [PACKAGER, '--target', 'all'], {
    cwd: ROOT,
    encoding: 'utf8'
  });

  assert.ok(output.includes('Building SmoothBoost release targets'), 'packager reported build start');
  assert.ok(output.includes('Successfully built 5 release package(s)'), 'built all 5 targets');

  const expectedArchives = [
    'SmoothBoost-Chrome-2.2.0.zip',
    'SmoothBoost-2.2.0.zip',
    'SmoothBoost-Titanium-Android-2.2.0.zip',
    'SmoothBoost-Firefox-2.2.0.zip',
    'SmoothBoost-Firefox-Android-2.2.0.zip'
  ];

  for (const name of expectedArchives) {
    const archivePath = path.join(DIST, name);
    assert.ok(fs.existsSync(archivePath), `archive exists: ${name}`);
    const stats = fs.statSync(archivePath);
    assert.ok(stats.size > 10000, `archive ${name} is substantial (${stats.size} bytes)`);
  }
});

test('Firefox package contains Gecko manifest and event page scripts', () => {
  // Verify using unzip -p to inspect manifest.json inside Firefox zip
  const manifestRaw = execFileSync('unzip', ['-p', path.join(DIST, 'SmoothBoost-Firefox-2.2.0.zip'), 'manifest.json'], {
    cwd: ROOT,
    encoding: 'utf8'
  });
  const manifest = JSON.parse(manifestRaw);

  assert.equal(manifest.version, '2.2.0');
  assert.equal(manifest.browser_specific_settings?.gecko?.id, 'smoothboost@binifn.github.io');
  assert.ok(Array.isArray(manifest.background?.scripts));
  assert.ok(manifest.background.scripts.includes('scripts/compat.js'));
  assert.ok(manifest.background.scripts.includes('scripts/background.js'));
});

test('Titanium Android package contains Chromium MV3 manifest', () => {
  const manifestRaw = execFileSync('unzip', ['-p', path.join(DIST, 'SmoothBoost-Titanium-Android-2.2.0.zip'), 'manifest.json'], {
    cwd: ROOT,
    encoding: 'utf8'
  });
  const manifest = JSON.parse(manifestRaw);

  assert.equal(manifest.version, '2.2.0');
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.background?.service_worker, 'scripts/background.js');
  assert.ok(manifest.web_accessible_resources[0].resources.includes('scripts/compat.js'));
});
