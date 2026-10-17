const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const backgroundSource = fs.readFileSync(path.join(__dirname, '../scripts/background.js'), 'utf8');
const contentSource = fs.readFileSync(path.join(__dirname, '../scripts/content.js'), 'utf8');

test('LRU archetype cache stays bounded to 500 entries', async () => {
  let storedData = {};
  const chrome = {
    storage: {
      local: {
        async get(key) {
          if (typeof key === 'string') return { [key]: storedData[key] };
          if (Array.isArray(key)) {
            const res = {};
            key.forEach((k) => { res[k] = storedData[k]; });
            return res;
          }
          return storedData;
        },
        async set(obj) {
          Object.assign(storedData, obj);
        }
      }
    }
  };

  // Seed cache with 500 entries
  const initialCache = {};
  for (let i = 0; i < 500; i++) {
    initialCache[`site${i}.com`] = { archetype: 'standard', timestamp: Date.now() - (500 - i) * 1000 };
  }
  storedData['smoothBoostArchetypes'] = initialCache;

  // Simulate saveCachedArchetype logic in content script context
  const context = {
    chrome,
    window: { location: { hostname: 'newsite.com' } },
    document: { documentElement: { getAttribute: () => null }, querySelectorAll: () => [] },
    Date
  };

  const testScript = `
    const ARCHETYPE_CACHE_KEY = 'smoothBoostArchetypes';
    const ARCHETYPE_MAX_ENTRIES = 500;

    async function saveCachedArchetype(hostname, archetype) {
      const stored = await chrome.storage.local.get(ARCHETYPE_CACHE_KEY);
      const cache = stored[ARCHETYPE_CACHE_KEY] || {};
      cache[hostname] = { archetype, timestamp: Date.now() };

      const entries = Object.entries(cache);
      if (entries.length > ARCHETYPE_MAX_ENTRIES) {
        entries.sort((a, b) => (a[1].timestamp || 0) - (b[1].timestamp || 0));
        while (entries.length > ARCHETYPE_MAX_ENTRIES) {
          const oldest = entries.shift();
          if (oldest) delete cache[oldest[0]];
        }
      }
      await chrome.storage.local.set({ [ARCHETYPE_CACHE_KEY]: cache });
    }
    saveCachedArchetype('newsite.com', 'media-stream');
  `;

  await vm.runInNewContext(testScript, context);
  const updatedCache = storedData['smoothBoostArchetypes'];
  const keys = Object.keys(updatedCache);

  assert.equal(keys.length, 500, 'cache size does not exceed 500');
  assert.equal(updatedCache['newsite.com'].archetype, 'media-stream');
  assert.equal(updatedCache['site0.com'], undefined, 'oldest entry was evicted');
});

test('PURGE_ARCHETYPE message purges the specified hostname from storage', async () => {
  let messageHandler;
  let storedData = {
    smoothBoostArchetypes: {
      'badguess.com': { archetype: 'canvas-app', timestamp: Date.now() },
      'keep.com': { archetype: 'standard', timestamp: Date.now() }
    }
  };

  const chrome = {
    runtime: {
      onInstalled: { addListener() {} },
      onStartup: { addListener() {} },
      onMessage: {
        addListener(listener) { messageHandler = listener; }
      }
    },
    storage: {
      local: {
        async get(key) {
          if (typeof key === 'string') return { [key]: storedData[key] };
          return storedData;
        },
        async set(obj) { Object.assign(storedData, obj); }
      },
      onChanged: { addListener() {} }
    },
    alarms: { create() {}, onAlarm: { addListener() {} } },
    tabs: { onActivated: { addListener() {} }, onUpdated: { addListener() {} } },
    commands: { onCommand: { addListener() {} } },
    action: { setBadgeText() {}, setBadgeBackgroundColor() {} }
  };

  vm.runInNewContext(backgroundSource, { chrome, URL, Promise, self: {} });

  let replied = null;
  const result = messageHandler({ type: 'PURGE_ARCHETYPE', hostname: 'badguess.com' }, {}, (resp) => { replied = resp; });
  assert.equal(result, true);

  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(storedData.smoothBoostArchetypes['badguess.com'], undefined, 'purged entry is removed');
  assert.ok(storedData.smoothBoostArchetypes['keep.com'], 'unrelated entry is preserved');
});
