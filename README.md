# SmoothBoost

SmoothBoost is a high-performance, cross-browser, and cross-platform web acceleration extension. It intelligently eliminates background rendering overhead, throttles offscreen canvases and media, and accelerates page scrolling—keeping web browsing buttery-smooth while protecting interactive productivity tools, games, and active media.

Supported across **Chrome & Helium Desktop**, **Titanium Browser on Android**, **Firefox Desktop**, and **Firefox for Android**.

---

## Browser & Platform Compatibility Matrix

| Platform / Browser | Engine / Manifest | Minimum Version | Battery Saver | Tab Discard | Keyboard Shortcut | Touch-Friendly UI |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| **Chrome / Chromium** | Chromium MV3 | Chrome 116+ | ✓ | ✓ | ✓ (`Alt+Shift+S`) | ✓ |
| **Helium Browser** | Chromium MV3 | Current | ✓ | ✓ | ✓ (`Alt+Shift+S`) | ✓ |
| **Titanium Browser (Android)** | Chromium MV3 (Vanadium) | Current | ✓ | Guarded (OS LMK) | Touch UI | ✓ (>=44px targets) |
| **Firefox Desktop** | Gecko MV3 Event Pages | Firefox 109+ (128+ recommended) | ✓ | ✓ | ✓ (`Alt+Shift+S`) | ✓ |
| **Firefox for Android** | Gecko MV3 Mobile | Firefox 120+ | ✓ | Guarded (OS LMK) | Touch UI | ✓ (>=44px targets) |
| **iOS / Safari** | WebKit | *Unsupported* | — | — | — | *WebKit engine restriction* |

> [!NOTE]
> On Android (Titanium Browser and Firefox for Android), operating system Low Memory Killer (LMK) manages application memory natively. SmoothBoost automatically detects mobile environments and guards unsupported desktop APIs (`tabs.discard`, physical keyboard shortcuts) to prevent crashes and unwanted wakeups.

---

## Core Features & What's New in v2.1.0

- **Cross-Browser & Mobile Architecture**: Universal `compat.js` abstraction normalizing Chromium (`chrome.*`) and Gecko (`browser.*`) runtimes across desktop and mobile.
- **Titanium Browser for Android Support**: Dedicated `titanium-android` release target for Titanium Browser users on Google Play. Features responsive fluid layout (320px–420px), large touch targets (>= 44px), and background efficiency.
- **Firefox MV3 Event Page Support**: Tailored Gecko Manifest V3 with event page background scripts, Firefox 128+ `world: "MAIN"` content scripts, and CSP-aware inline injection fallback.
- **Battery Saver Profile (`battery`)**: High-efficiency profile cutting power consumption on mobile devices and laptops. Enables aggressive offscreen DOM `content-visibility: auto`, suspends background media and canvases, and throttles non-interactive animations while preserving touch responsiveness. Displays an amber `BATT` badge.
- **Interactive App Safeguards**: Classifies pages into 5 archetypes (`interactive-canvas`, `media-stream`, `infinite-feed`, `game-canvas`, `standard`). Automatically disables canvas and animation throttling on Figma, Google Docs, Canva, Monaco/Ace code editors, and WebGL games.
- **Hardware-Composited Scrolling**: Upgrades scroll and touch listeners to `passive: true`, unblocking 60/120 FPS compositor scrolling while preserving `preventDefault` on maps (Google Maps, Leaflet) and sliders.
- **Settings Backup & Restore**: Export settings to JSON and import them with schema validation and parameter clamping across all your devices and browsers.
- **Site Recovery System**: Instant "Site looks broken" one-click override that disables optimizations for the current hostname, purges cached archetypes, and reloads the tab.
- **100% Vector Dark UI**: Premium SVG vector icons, live verified optimizer counters (zero fake percentages), and complete elimination of emoji icons.

---

## Profiles

- **Smart Auto** *(Default)*: Runs lightweight idle heuristics (`requestIdleCallback`) to detect page structure. Pauses offscreen media, accelerates compositor scrolling, bypasses blur filters, and dynamically disables canvas throttling on interactive tools.
- **Turbo (Maximum)**: Full acceleration profile for high-power web browsing. Pauses offscreen ambient media, suspends offscreen canvas rendering, enforces compositor scrolling, decodes images asynchronously, and bypasses heavy backdrop blur filters.
- **Balanced**: Subtle optimizations that preserve page visuals and media behavior without heavy intervention.
- **Battery Saver**: Aggressive power savings for mobile devices and laptops on battery power. Applies offscreen DOM `content-visibility`, suspends background canvas updates, pauses offscreen videos, and throttles canvas frames outside interactive editors.
- **Custom**: Granular tuning drawer providing individual toggles for passive scrolling, offscreen canvas throttling, CSS animations, blur filters, lazy image decoding, and adaptive 30 FPS limits.

---

## Installation Guides

### 1. Chrome & Helium Desktop
1. Download `SmoothBoost-Chrome-2.1.0.zip` from [Releases](https://github.com/BiniFn/SmoothBoost/releases/latest) and unzip it.
2. Navigate to `chrome://extensions` and toggle **Developer mode** in the top right.
3. Click **Load unpacked** and select the extracted folder.
4. Pin SmoothBoost to the toolbar for quick access.

### 2. Titanium Browser on Android (Google Play)
1. Download `SmoothBoost-Titanium-Android-2.1.0.zip` on your Android device.
2. In Titanium Browser, navigate to `chrome://extensions` (or open the Extensions menu).
3. Enable Developer Mode and install the extension via **Load unpacked** or via the Titanium Extension Manager.
4. SmoothBoost opens in mobile-optimized portrait mode with large touch targets.

### 3. Firefox Desktop
1. Download `SmoothBoost-Firefox-2.1.0.zip` from [Releases](https://github.com/BiniFn/SmoothBoost/releases/latest) and unzip it.
2. Navigate to `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on…** and select `manifest.json` from the unzipped directory.
4. SmoothBoost will appear in the Firefox extension toolbar.

### 4. Firefox for Android
1. In Firefox Nightly / Developer Edition for Android, enable the Debug menu in Settings.
2. Install via web-ext or load via your Custom Add-on Collection using ID `smoothboost@binifn.github.io`.

---

## Building Release Packages

SmoothBoost includes a multi-target build script that validates manifests, checks required assets, and packages clean distribution ZIPs into `dist/`:

```sh
# Build all release packages (Chrome, Titanium Android, Firefox, Firefox Android)
python3 scripts/package_extension.py --target all

# Or build a specific target:
python3 scripts/package_extension.py --target chrome
python3 scripts/package_extension.py --target titanium-android
python3 scripts/package_extension.py --target firefox
python3 scripts/package_extension.py --target firefox-android
```

Generated packages:
- `dist/SmoothBoost-Chrome-2.1.0.zip` (and backwards-compatible `SmoothBoost-2.1.0.zip`)
- `dist/SmoothBoost-Titanium-Android-2.1.0.zip`
- `dist/SmoothBoost-Firefox-2.1.0.zip`
- `dist/SmoothBoost-Firefox-Android-2.1.0.zip`

---

## Automated Test Suite

SmoothBoost has 59 automated regression and compatibility tests covering cross-browser adapters, manifest validation, settings persistence, battery mode, tab discarding, and packaging:

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
│   ├── page-hook.js               # Main-world passive listener & canvas guard
│   └── package_extension.py       # Multi-target release packager
├── data/
│   └── site-rules.json            # Dynamic site optimization rules
├── icons/                         # 16px, 48px, 128px high-DPI icons
├── tests/                         # 59 automated node:test suites
└── test-fixtures/                 # Real DOM & canvas smoke test pages
```
