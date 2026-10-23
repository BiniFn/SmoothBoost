const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const popupSource = fs.readFileSync(path.join(__dirname, '../popup/popup.js'), 'utf8');

function getPopupExports() {
  const elements = new Map();
  const fakeElement = {
    addEventListener() {},
    classList: { toggle() {}, add() {}, remove() {} },
    setAttribute() {},
    textContent: '',
    checked: false,
    hidden: false
  };
  const fakeDoc = {
    body: fakeElement,
    addEventListener() {},
    getElementById() { return fakeElement; }
  };
  const context = {
    document: fakeDoc,
    window: { matchMedia: () => ({ matches: false }) },
    chrome: { runtime: { getManifest: () => ({ version: '2.2.0' }) } },
    module: { exports: {} },
    URL,
    Blob: class {},
    Date,
    Math,
    JSON,
    setTimeout: () => {}
  };
  vm.runInNewContext(popupSource, context);
  return context.module.exports;
}

test('validateImportedSettings accepts valid SmoothBoost backup payload', () => {
  const { validateImportedSettings } = getPopupExports();

  const backup = {
    app: 'SmoothBoost',
    version: '2.2.0',
    exportedAt: '2026-10-17T20:00:00.000Z',
    config: {
      settingsVersion: 4,
      globalEnabled: true,
      mode: 'battery',
      customSettings: {
        killAnimations: true,
        killTransitions: false,
        fpsLimit: 45
      },
      siteOverrides: {
        'github.com': { enabled: true, mode: 'ultra' },
        'youtube.com': { enabled: false }
      }
    }
  };

  const validated = validateImportedSettings(backup);
  assert.equal(validated.settingsVersion, 4);
  assert.equal(validated.globalEnabled, true);
  assert.equal(validated.mode, 'battery');
  assert.equal(validated.customSettings.killAnimations, true);
  assert.equal(validated.customSettings.killTransitions, false);
  assert.equal(validated.customSettings.fpsLimit, 45);
  assert.equal(validated.siteOverrides['github.com'].enabled, true);
  assert.equal(validated.siteOverrides['github.com'].mode, 'ultra');
  assert.equal(validated.siteOverrides['youtube.com'].enabled, false);
});

test('validateImportedSettings rejects null, non-objects, and invalid types', () => {
  const { validateImportedSettings } = getPopupExports();

  assert.throws(() => validateImportedSettings(null), /expected a root object/);
  assert.throws(() => validateImportedSettings(''), /expected a root object/);
  assert.throws(() => validateImportedSettings(42), /expected a root object/);
});

test('validateImportedSettings defaults invalid profiles to auto and clamps fpsLimit', () => {
  const { validateImportedSettings } = getPopupExports();

  const corrupted = {
    mode: 'super-hacker-mode',
    customSettings: {
      fpsLimit: 9999, // Way too high -> clamp to 120
      killBlurFilters: 'yes' // Invalid type -> discard / keep default
    },
    siteOverrides: {
      '  EXAMPLE.COM  ': {
        mode: 'fake-mode',
        customSettings: { fpsLimit: 2 } // Too low -> clamp to 10
      }
    }
  };

  const validated = validateImportedSettings(corrupted);
  assert.equal(validated.mode, 'auto', 'invalid mode fell back to auto');
  assert.equal(validated.customSettings.fpsLimit, 120, 'fpsLimit clamped to 120');
  assert.equal(typeof validated.customSettings.killBlurFilters, 'boolean');
  assert.ok(validated.siteOverrides['example.com'], 'hostname trimmed and lowercased');
  assert.equal(validated.siteOverrides['example.com'].mode, undefined, 'fake mode ignored');
  assert.equal(validated.siteOverrides['example.com'].customSettings.fpsLimit, 10, 'fpsLimit clamped to 10');
});

test('validateImportedSettings ignores prototype pollution keys in siteOverrides', () => {
  const { validateImportedSettings } = getPopupExports();

  const payload = {
    mode: 'auto',
    siteOverrides: JSON.parse('{"__proto__": {"polluted": true}, "prototype": {"polluted": true}, "constructor": {"polluted": true}, "normal.com": {"enabled": true}}')
  };

  const validated = validateImportedSettings(payload);
  assert.equal(Object.prototype.polluted, undefined, 'global Object prototype was not polluted');
  assert.equal(Object.keys(validated.siteOverrides).includes('__proto__'), false, '__proto__ key was discarded');
  assert.equal(Object.keys(validated.siteOverrides).includes('prototype'), false, 'prototype key was discarded');
  assert.equal(Object.keys(validated.siteOverrides).includes('constructor'), false, 'constructor key was discarded');
  assert.equal(validated.siteOverrides['normal.com'].enabled, true, 'valid host override preserved');
});
