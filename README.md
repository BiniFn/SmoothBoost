# SmoothBoost

SmoothBoost is a universal cross-browser performance extension and userscript for smoother scrolling, reduced background work, and instant frame pacing. It detects page archetypes before applying optimizations, while preserving live calls, interactive apps, and user-controlled animation preferences.

[![Install with Tampermonkey](https://img.shields.io/badge/Install%20with%20Tampermonkey-SmoothBoost.user.js-06b6d4?style=for-the-badge&logo=tampermonkey&logoColor=white)](https://raw.githubusercontent.com/BiniFn/SmoothBoost/main/dist/SmoothBoost.user.js)
[![Download Chrome ZIP](https://img.shields.io/badge/Download-Chrome%20Extension%20v2.4.0-38bdf8?style=for-the-badge&logo=googlechrome&logoColor=white)](https://raw.githubusercontent.com/BiniFn/SmoothBoost/main/dist/SmoothBoost-Chrome-2.4.0.zip)
[![Release](https://img.shields.io/badge/Release-v2.4.0-emerald?style=for-the-badge)](https://github.com/BiniFn/SmoothBoost/releases)

Supported across **Tampermonkey & Violentmonkey Userscript**, **Chrome & Helium Desktop**, **Titanium Browser on Android**, **Firefox Desktop**, and **Firefox for Android**.

---

## Browser & Platform Compatibility Matrix

| Platform / Environment | Engine / Distribution | Minimum Version | Scroll Boost & Smart Loading | Dynamic FPS (30/60/90/120) | Tab Discard | Settings UI |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| **Userscript (Tampermonkey / Violentmonkey)** | Userscript Manager | Tampermonkey 4.14+ / Violentmonkey 2.13+ | ✓ | ✓ | — *(extension only)* | Shadow DOM HUD & GM Menu |
| **Chrome / Chromium** | Chromium MV3 | Chrome 116+ | ✓ | ✓ | ✓ | Extension Popup (`Alt+Shift+S`) |
| **Helium Browser** | Chromium MV3 | Current | ✓ | ✓ | ✓ | Extension Popup (`Alt+Shift+S`) |
| **Titanium Browser (Android)** | Chromium MV3 (Vanadium) | Current | ✓ | ✓ | Guarded (OS LMK) | Touch UI (>=44px targets) |
| **Firefox Desktop** | Gecko MV3 Event Pages | Firefox 109+ (128+ recommended) | ✓ | ✓ | ✓ | Extension Popup (`Alt+Shift+S`) |
| **Firefox for Android** | Gecko MV3 Mobile | Firefox 120+ | ✓ | ✓ | Guarded (OS LMK) | Touch UI (>=44px targets) |
| **iOS / Safari** | WebKit (Userscript via Orion/Userscripts) | iOS 15+ | ✓ | ✓ | — | Shadow DOM HUD |

> [!NOTE]
> On Android (Titanium Browser and Firefox for Android), operating system Low Memory Killer (LMK) manages application memory natively. SmoothBoost automatically detects mobile environments and guards unsupported desktop APIs (`tabs.discard`, physical keyboard shortcuts) to prevent crashes and unwanted wakeups.

---

## What's New in v2.4.0 — Universal Performance Update

### 1. Tampermonkey & Violentmonkey Support *(Headline Feature)*
- **Standalone `SmoothBoost.user.js` Edition**: Install directly via Tampermonkey, Violentmonkey, or Greasemonkey without developer mode or unpacked extension directories.
- **Automatic Updates**: Preconfigured `@updateURL` and `@downloadURL` metadata pointing to the GitHub release channel.
- **Persistent Storage**: Utilizes `GM_setValue` and `GM_getValue` to persist global profiles and per-site rules across sessions.
- **Shadow DOM Settings HUD**: An isolated, collision-free on-page settings modal and floating status pill styled with glassmorphism.

### 2. New Boost Features
- **Scroll Boost**: Temporarily reduces expensive rendering effects, suppresses non-essential canvas drawing, and elevates scroll smoothness during active scrolling, restoring full fidelity within 160ms of idle.
- **Smart Resource Loading**: Defers offscreen iframes, heavy media embeds (YouTube, Vimeo, Twitter, Instagram, Spotify, SoundCloud, TikTok), and third-party widgets using `IntersectionObserver` with 400px pre-hydration margins.
- **Memory Guard**: Continuously inspects JS heap allocation (`performance.memory`) and DOM node count (>3,500 elements). Automatically unloads paused background video preloads (`preload = 'none'`) and trims canvas caches.
- **Dynamic FPS Profiles**: Target framerates configurable to **30 FPS**, **60 FPS**, **90 FPS**, or **120 FPS** with microsecond-accurate timestamp pacing and requestAnimationFrame cancellation support.
- **SPA Navigation Optimization**: Hooks `history.pushState`, `history.replaceState`, `popstate`, and `hashchange` to detect client-side route changes on Single-Page Applications (Next.js, React, Vue, Angular) and re-classify page archetypes without page reloads.

### 3. Universal Site Engine
- **Expanded Archetype Classifier**: Classifies pages across 8 archetypes (`realtime-app`, `video-streaming`, `canvas-gaming`, `heavy-spa`, `interactive-canvas`, `e-commerce`, `reading-article`, `standard`).
- **Community Site-Rules Schema v2**: Externalized, versioned JSON rule sets with support for custom host overrides, target selectors, and behavior policies.
- **Automatic Safe Mode Recovery**: Active watchdog detects consecutive script or DOM exceptions (&ge;4 errors in 3 seconds) and automatically demotes into Safe Mode to protect site functionality.

---

## Profiles

- **Smart Auto** *(Default)*: Automatically inspects page archetypes and applies balanced performance heuristics while protecting live communication, WebGL gaming, and creative tools.
- **Turbo (Maximum)**: Full acceleration profile. Enforces compositor scrolling, pauses offscreen ambient media, suspends offscreen canvas rendering, decodes images asynchronously, and bypasses heavy backdrop blur filters.
- **Balanced**: Subtle optimizations that preserve page visuals and media behavior without heavy intervention.
- **Battery Saver**: Aggressively minimizes background execution on laptops and mobile devices with amber `BATT` badge indicator.
- **Custom**: Granular drawer with independent controls for Scroll Boost, Smart Resource Loading, Memory Guard, Dynamic FPS limiter (30/60/90/120 FPS), and canvas guards.

---

## Installation Guides

For detailed, platform-specific walkthroughs with screenshots and troubleshooting steps, read the [Device Setup Tutorial](https://binifn.github.io/SmoothBoost/tutorial.html).

### 1. Tampermonkey & Violentmonkey Userscript (Recommended)

[![Install with Tampermonkey](https://img.shields.io/badge/⚡%20Install%20with%20Tampermonkey-SmoothBoost.user.js-06b6d4?style=for-the-badge&logo=tampermonkey&logoColor=white)](https://raw.githubusercontent.com/BiniFn/SmoothBoost/main/dist/SmoothBoost.user.js)

1. Install [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/) in your browser.
2. Click the **[Install with Tampermonkey](https://raw.githubusercontent.com/BiniFn/SmoothBoost/main/dist/SmoothBoost.user.js)** button above to trigger 1-click installation.
3. Confirm installation in your userscript manager prompt.
4. SmoothBoost is instantly active on every website! Access settings via your userscript extension menu or the on-page **⚡ SB** status pill.

### 2. Chrome & Helium Desktop Extension
1. Download [SmoothBoost-Chrome-2.4.0.zip](https://raw.githubusercontent.com/BiniFn/SmoothBoost/main/dist/SmoothBoost-Chrome-2.4.0.zip) and unzip it.
2. Navigate to `chrome://extensions` and toggle **Developer mode** in the top right.
3. Click **Load unpacked** and select the extracted folder.
4. Pin SmoothBoost to the toolbar for quick access.

### 3. Titanium Browser on Android (Google Play)
1. Download [SmoothBoost-Titanium-Android-2.4.0.zip](https://raw.githubusercontent.com/BiniFn/SmoothBoost/main/dist/SmoothBoost-Titanium-Android-2.4.0.zip) on your Android device.
2. In Titanium Browser, open menu &rarr; **Extensions** (or navigate to `chrome://extensions`).
3. Enable Developer Mode and install via **Load unpacked** or **+ (from .zip)**.

### 4. Firefox Desktop
1. Download [SmoothBoost-Firefox-2.4.0.zip](https://raw.githubusercontent.com/BiniFn/SmoothBoost/main/dist/SmoothBoost-Firefox-2.4.0.zip) and unzip it.
2. Navigate to `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on…** and select `manifest.json` from the unzipped directory.

### 5. Firefox for Android
1. In Firefox Nightly / Developer Edition for Android, enable the Debug menu in Settings.
2. Install via web-ext or load via your Custom Add-on Collection using ID `smoothboost@binifn.github.io`.

---

## Building Release Packages

SmoothBoost includes a multi-target build script that packages extension ZIPs and compiles the distribution userscript into `dist/`:

```sh
# Build all release packages & userscript
python3 scripts/package_extension.py --target all

# Or build a specific target:
python3 scripts/package_extension.py --target userscript
python3 scripts/package_extension.py --target chrome
python3 scripts/package_extension.py --target titanium-android
python3 scripts/package_extension.py --target firefox
python3 scripts/package_extension.py --target firefox-android
```

Generated packages:
- `dist/SmoothBoost.user.js` (Tampermonkey / Violentmonkey edition)
- `dist/SmoothBoost-Chrome-2.4.0.zip` (and backwards-compatible `SmoothBoost-2.4.0.zip`)
- `dist/SmoothBoost-Titanium-Android-2.4.0.zip`
- `dist/SmoothBoost-Firefox-2.4.0.zip`
- `dist/SmoothBoost-Firefox-Android-2.4.0.zip`

---

## Automated Test Suite

SmoothBoost has 69 automated regression and feature test suites covering cross-browser adapters, Scroll Boost, Smart Resource Loading, Dynamic FPS Profiles, Automatic Recovery, userscript integrity, settings persistence, and packaging:

```sh
node --test tests/*.test.js
```

---

## Project Structure

```text
├── manifest.json                  # Chromium MV3 manifest (Chrome, Titanium Android)
├── manifest.firefox.json          # Gecko MV3 manifest (Firefox Desktop & Android)
├── popup/
│   ├── popup.html                 # Responsive dark glass UI (320px–420px fluid)
│   ├── popup.css                  # Responsive styles & coarse pointer touch targets
│   ├── popup.js                   # Popup controller with settings import/export
│   └── update-check.js            # GitHub release update checker
├── scripts/
│   ├── compat.js                  # Cross-browser runtime adapter & capability guard
│   ├── background.js              # MV3 service worker / event page controller
│   ├── content.js                 # Isolated content script with archetype classifier
│   ├── page-hook.js               # Main-world passive listener, canvas guard & FPS limiter
│   ├── SmoothBoost.user.js        # Standalone Tampermonkey / Violentmonkey edition
│   └── package_extension.py       # Multi-target release packager
├── data/
│   └── site-rules.json            # Dynamic site optimization rules (Schema v2)
├── dist/                          # Packaged ZIP archives & SmoothBoost.user.js
├── icons/                         # 16px, 48px, 128px high-DPI icons
├── tests/                         # 69 automated node:test suites
└── test-fixtures/                 # Real DOM & canvas smoke test pages
```
