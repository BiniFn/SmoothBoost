# SmoothBoost

SmoothBoost is a cross-browser performance extension for smoother scrolling and lighter background work. It detects the kind of page before applying heavier rules, while preserving live calls, interactive apps, and user-controlled animation preferences.

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

## Core Features & What's New in v2.3.0

- **Adaptive Frame Pressure Control**: The optional Custom limiter responds to sustained long frames with recovery windows, then yields to active input and live media.
- **Contrast Safety for Glassmorphic Elements**: Guards translucent light cards with light text (such as link-in-bio profiles like Taplink) from being forced to opaque white.
- **Backdrop Blur Scan Optimization**: Eliminated forced reflow lag by targeting stylesheet rules and glass classes directly instead of scanning the full DOM tree.
- **Background & Particle Canvas Protection**: Ambient background canvases (such as rain or snow animations) with fixed positioning stay active without false-positive draw skips.
- **Live WebRTC Stream Protection**: Live webcam and screen-sharing video elements on Google Meet, Discord, Zoom, and Teams are never throttled.
- **Real-Time App Detection**: Discord, Meet, Teams, Zoom, and WhatsApp are recognized before heavier page scans. Automatic profiles preserve calls, canvas content, and interface motion while retaining safe scroll handling.
- **Motion Preference Respect**: Automatic profiles leave animation playback on ws.ryuo.to to the site's Reduce motion setting.
- **Cross-Browser & Mobile Architecture**: Universal `compat.js` abstraction normalizing Chromium (`chrome.*`) and Gecko (`browser.*`) runtimes across desktop and mobile.
- **Titanium Browser for Android Support**: Dedicated `titanium-android` release target for Titanium Browser users on Google Play. Features responsive fluid layout (320px–420px), large touch targets (>= 44px), and background efficiency.
- **Firefox MV3 Event Page Support**: Tailored Gecko Manifest V3 with event page background scripts, Firefox 128+ `world: "MAIN"` content scripts, and CSP-aware inline injection fallback.
- **Battery Saver Profile (`battery`)**: High-efficiency profile cutting power consumption on mobile devices and laptops. Enables aggressive offscreen DOM `content-visibility: auto`, suspends background media and canvases, and throttles non-interactive animations while preserving touch responsiveness. Displays an amber `BATT` badge.
- **Interactive App Safeguards**: Classifies pages into 6 archetypes (`interactive-canvas`, `media-stream`, `infinite-feed`, `game-canvas`, `realtime-app`, `standard`). Automatically disables canvas and animation throttling on Figma, Google Docs, Canva, Monaco/Ace code editors, WebGL games, and live communication apps.
- **Hardware-Composited Scrolling**: Upgrades scroll and touch listeners to `passive: true`, unblocking 60/120 FPS compositor scrolling while preserving `preventDefault` on maps (Google Maps, Leaflet) and sliders.
- **Settings Backup & Restore**: Export settings to JSON and import them with schema validation and parameter clamping across all your devices and browsers.
- **Site Recovery System**: Instant "Site looks broken" one-click override that disables optimizations for the current hostname, purges cached archetypes, and reloads the tab.
- **Vector Dark UI**: SVG icons, a responsive controls panel, and diagnostics that report extension state.

---

## Profiles

- **Smart Auto** *(Default)*: Recognizes communication apps by hostname before generic page checks. Uses passive scrolling on safe targets, pauses offscreen work on standard pages, and keeps live calls and app motion active.
- **Turbo (Maximum)**: Full acceleration profile for high-power web browsing. Pauses offscreen ambient media, suspends offscreen canvas rendering, enforces compositor scrolling, decodes images asynchronously, and bypasses heavy backdrop blur filters.
- **Balanced**: Subtle optimizations that preserve page visuals and media behavior without heavy intervention.
- **Battery Saver**: Reduces background work on ordinary pages. It preserves live calls and app motion, and skips offscreen DOM changes on real-time communication sites.
- **Custom**: Granular tuning drawer with passive scrolling, offscreen canvas control, CSS animation and blur controls, lazy image decoding, and a pressure-aware frame limiter that yields during input and live media.

---

## Installation Guides

For detailed, platform-specific walkthroughs with screenshots and troubleshooting steps, read the [Device Setup Tutorial](https://binifn.github.io/SmoothBoost/tutorial.html).

### 1. Chrome & Helium Desktop
1. Download `SmoothBoost-Chrome-2.3.0.zip` from [Releases](https://github.com/BiniFn/SmoothBoost/releases/latest) and unzip it.
2. Navigate to `chrome://extensions` and toggle **Developer mode** in the top right.
3. Click **Load unpacked** and select the extracted folder.
4. Pin SmoothBoost to the toolbar for quick access.

### 2. Titanium Browser on Android (Google Play)
1. Download `SmoothBoost-Titanium-Android-2.3.0.zip` on your Android device.
2. In Titanium Browser, navigate to `chrome://extensions` (or open the Extensions menu).
3. Enable Developer Mode and install the extension via **Load unpacked** or via the Titanium Extension Manager.
4. SmoothBoost opens in mobile-optimized portrait mode with large touch targets.

### 3. Firefox Desktop
1. Download `SmoothBoost-Firefox-2.3.0.zip` from [Releases](https://github.com/BiniFn/SmoothBoost/releases/latest) and unzip it.
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
- `dist/SmoothBoost-Chrome-2.3.0.zip` (and backwards-compatible `SmoothBoost-2.3.0.zip`)
- `dist/SmoothBoost-Titanium-Android-2.3.0.zip`
- `dist/SmoothBoost-Firefox-2.3.0.zip`
- `dist/SmoothBoost-Firefox-Android-2.3.0.zip`

---

## Automated Test Suite

SmoothBoost has 61 automated regression and compatibility tests covering cross-browser adapters, manifest validation, settings persistence, battery mode, tab discarding, and packaging:

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
