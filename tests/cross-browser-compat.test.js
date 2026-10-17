const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const compatSource = fs.readFileSync(path.join(__dirname, '../scripts/compat.js'), 'utf8');

function loadCompat(env = {}) {
  const context = {
    globalThis: {},
    navigator: { userAgent: env.userAgent || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
    chrome: env.chrome || null,
    browser: env.browser || null,
    module: { exports: {} }
  };
  context.globalThis = context;
  vm.runInNewContext(compatSource, context);
  return context.module.exports;
}

test('compat detects Chrome Desktop and enables desktop features', () => {
  const compat = loadCompat({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    chrome: {
      runtime: {},
      tabs: { discard: async () => {} },
      commands: { onCommand: { addListener: () => {} } },
      declarativeNetRequest: { updateDynamicRules: async () => {} },
      scripting: { registerContentScripts: async () => {} }
    }
  });

  assert.equal(compat.isFirefox, false, 'is not firefox');
  assert.equal(compat.isAndroid, false, 'is not android');
  assert.equal(compat.isMobile, false, 'is not mobile');
  assert.equal(compat.isTitaniumAndroid, false, 'is not titanium android');
  assert.equal(compat.hasTabsDiscard, true, 'tabs discard enabled on desktop');
  assert.equal(compat.hasCommands, true, 'commands enabled on desktop');
  assert.equal(compat.hasDnr, true, 'dnr enabled');
  assert.equal(compat.hasScripting, true, 'scripting enabled');
});

test('compat detects Titanium Browser on Android and guards mobile restrictions', () => {
  const compat = loadCompat({
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36',
    chrome: {
      runtime: {},
      tabs: { discard: async () => {} }, // Even if method stub exists, must be guarded on Android
      commands: { onCommand: { addListener: () => {} } },
      declarativeNetRequest: { updateDynamicRules: async () => {} },
      scripting: { registerContentScripts: async () => {} }
    }
  });

  assert.equal(compat.isFirefox, false, 'is not firefox');
  assert.equal(compat.isAndroid, true, 'is android');
  assert.equal(compat.isMobile, true, 'is mobile');
  assert.equal(compat.isTitaniumAndroid, true, 'is titanium android');
  assert.equal(compat.hasTabsDiscard, false, 'tabs discard guarded on Android (LMK handles memory)');
  assert.equal(compat.hasCommands, false, 'desktop keyboard commands guarded on mobile');
  assert.equal(compat.hasDnr, true, 'dnr available');
});

test('compat detects Firefox Desktop and normalizes browser runtime', () => {
  const compat = loadCompat({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0',
    browser: {
      runtime: {},
      tabs: { discard: async () => {} },
      commands: { onCommand: { addListener: () => {} } },
      declarativeNetRequest: { updateDynamicRules: async () => {} },
      scripting: { registerContentScripts: async () => {} }
    }
  });

  assert.equal(compat.isFirefox, true, 'is firefox');
  assert.equal(compat.isAndroid, false, 'is not android');
  assert.equal(compat.isMobile, false, 'is not mobile');
  assert.equal(compat.hasTabsDiscard, true, 'tabs discard supported on firefox desktop');
  assert.equal(compat.hasCommands, true, 'commands supported on firefox desktop');
});

test('compat detects Firefox Android and guards mobile restrictions', () => {
  const compat = loadCompat({
    userAgent: 'Mozilla/5.0 (Android 14; Mobile; rv:128.0) Gecko/128.0 Firefox/128.0',
    browser: {
      runtime: {},
      tabs: { discard: async () => {} },
      commands: { onCommand: { addListener: () => {} } }
    }
  });

  assert.equal(compat.isFirefox, true, 'is firefox');
  assert.equal(compat.isAndroid, true, 'is android');
  assert.equal(compat.isMobile, true, 'is mobile');
  assert.equal(compat.isTitaniumAndroid, false, 'is not titanium (it is firefox android)');
  assert.equal(compat.hasTabsDiscard, false, 'tabs discard guarded on mobile firefox');
  assert.equal(compat.hasCommands, false, 'commands guarded on mobile firefox');
});

test('compat getStorage / setStorage handles callback and promise APIs reliably', async () => {
  let stored = { smoothBoostConfig: { mode: 'ultra' } };
  const mockStorage = {
    local: {
      get(keys, cb) {
        if (typeof cb === 'function') cb(stored);
        return Promise.resolve(stored);
      },
      set(items, cb) {
        Object.assign(stored, items);
        if (typeof cb === 'function') cb();
        return Promise.resolve();
      }
    }
  };

  const compat = loadCompat({
    userAgent: 'Mozilla/5.0 (Macintosh)',
    chrome: { runtime: {}, storage: mockStorage }
  });

  const read = await compat.getStorage('smoothBoostConfig');
  assert.deepEqual(read, stored);

  await compat.setStorage({ smoothBoostConfig: { mode: 'battery' } });
  const updated = await compat.getStorage('smoothBoostConfig');
  assert.deepEqual(updated.smoothBoostConfig.mode, 'battery');
});
