const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const backgroundSource = fs.readFileSync(path.join(__dirname, '../scripts/background.js'), 'utf8');

test('native tab discard engine filters out active, pinned, audible, and fresh tabs', async () => {
  let alarmListener;
  const discardedTabIds = [];
  const now = Date.now();
  const FORTY_MINS_AGO = now - (40 * 60 * 1000);
  const TEN_MINS_AGO = now - (10 * 60 * 1000);

  const fakeTabs = [
    { id: 1, active: true, pinned: false, audible: false, discarded: false, url: 'https://site.com', lastAccessed: FORTY_MINS_AGO }, // active -> skip
    { id: 2, active: false, pinned: true, audible: false, discarded: false, url: 'https://site.com', lastAccessed: FORTY_MINS_AGO }, // pinned -> skip
    { id: 3, active: false, pinned: false, audible: true, discarded: false, url: 'https://music.com', lastAccessed: FORTY_MINS_AGO }, // audible -> skip
    { id: 4, active: false, pinned: false, audible: false, discarded: true, url: 'https://site.com', lastAccessed: FORTY_MINS_AGO }, // already discarded -> skip
    { id: 5, active: false, pinned: false, audible: false, discarded: false, url: 'https://site.com', lastAccessed: TEN_MINS_AGO }, // too recent -> skip
    { id: 6, active: false, pinned: false, audible: false, discarded: false, url: 'chrome://settings', lastAccessed: FORTY_MINS_AGO }, // browser page -> skip
    { id: 7, active: false, pinned: false, audible: false, discarded: false, url: 'https://idle-tab.com', lastAccessed: FORTY_MINS_AGO } // ELIGIBLE!
  ];

  const chrome = {
    runtime: {
      onInstalled: { addListener() {} },
      onStartup: { addListener() {} },
      onMessage: { addListener() {} }
    },
    alarms: {
      create() {},
      onAlarm: {
        addListener(listener) { alarmListener = listener; }
      }
    },
    tabs: {
      onActivated: { addListener() {} },
      onUpdated: { addListener() {} },
      async query() { return fakeTabs; },
      async discard(id) { discardedTabIds.push(id); }
    },
    storage: {
      local: {
        async get() {
          return {
            smoothBoostConfig: {
              globalEnabled: true,
              mode: 'custom',
              customSettings: { discardIdleTabs: true },
              siteOverrides: {}
            }
          };
        },
        async set() {}
      },
      onChanged: { addListener() {} }
    },
    commands: { onCommand: { addListener() {} } },
    action: { setBadgeText() {}, setBadgeBackgroundColor() {} }
  };

  vm.runInNewContext(backgroundSource, { chrome, URL, Promise, self: {} });

  assert.ok(alarmListener, 'registered alarm listener');
  await alarmListener({ name: 'smoothboost-tab-discard' });

  assert.deepEqual(discardedTabIds, [7], 'only tab 7 (idle > 30m, not active/pinned/audible) was discarded');
});

test('tab discard does nothing when discardIdleTabs is false', async () => {
  let alarmListener;
  const discardedTabIds = [];
  const FORTY_MINS_AGO = Date.now() - (40 * 60 * 1000);

  const fakeTabs = [
    { id: 7, active: false, pinned: false, audible: false, discarded: false, url: 'https://idle-tab.com', lastAccessed: FORTY_MINS_AGO }
  ];

  const chrome = {
    runtime: { onInstalled: { addListener() {} }, onStartup: { addListener() {} }, onMessage: { addListener() {} } },
    alarms: { create() {}, onAlarm: { addListener(l) { alarmListener = l; } } },
    tabs: { onActivated: { addListener() {} }, onUpdated: { addListener() {} }, async query() { return fakeTabs; }, async discard(id) { discardedTabIds.push(id); } },
    storage: {
      local: {
        async get() {
          return { smoothBoostConfig: { globalEnabled: true, customSettings: { discardIdleTabs: false } } };
        },
        async set() {}
      },
      onChanged: { addListener() {} }
    },
    commands: { onCommand: { addListener() {} } },
    action: { setBadgeText() {}, setBadgeBackgroundColor() {} }
  };

  vm.runInNewContext(backgroundSource, { chrome, URL, Promise, self: {} });
  await alarmListener({ name: 'smoothboost-tab-discard' });

  assert.equal(discardedTabIds.length, 0, 'no tabs discarded when setting is disabled');
});
