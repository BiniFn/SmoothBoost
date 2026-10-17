# SmoothBoost

SmoothBoost is a high-performance, unbloated Manifest V3 browser extension for Chrome and Helium. It intelligently eliminates background rendering overhead, throttles offscreen canvases and media, and accelerates page scrolling—keeping web browsing buttery-smooth while preserving active tools and media.

## Highlights in v2.0.0

- **Smart Auto Optimization**: Automatically detects page archetypes (`interactive-canvas`, `media-stream`, `infinite-feed`, `standard`) and applies optimal performance tweaks. Completely avoids degrading productivity tools (Figma, Google Docs, Canva, Google Maps).
- **Cross-Site Profile Memory**: Your chosen performance profile (Auto, Turbo, Balanced, Custom) is remembered globally across websites. Custom tuning tweaks automatically persist from site to site.
- **Hardware-Composited Scrolling**: Automatically upgrades non-map scroll and touch listeners to passive (`passive: true`), unblocking the browser's hardware compositor thread for 60/120 FPS scrolling without breaking map pan/zoom.
- **Offscreen Canvas Draw-Throttling**: Skips 2D and WebGL render calls on canvases outside the viewport while preserving detached memory buffers.
- **Native Tab Memory Saver**: Leverages Chrome's native `chrome.tabs.discard()` engine to safely free RAM on background tabs inactive for over 30 minutes, without disturbing active, audible, or pinned tabs.
- **CSSOM Font-Display Optimization**: Automatically patches web fonts to `font-display: swap` to prevent Flash of Invisible Text (FOIT) without layout shift.
- **Modern, Single-Screen UI**: Clean dark glass interface with 100% vector SVG icons (zero emojis), live verified optimizer counters, and an instant "Site looks broken" fix.

---

## Profiles

- **Smart Auto** *(Default)*: Runs lightweight idle heuristics (`requestIdleCallback`) to detect page structure. Pauses offscreen media, accelerates compositor scrolling, bypasses blur filters, and dynamically disables canvas throttling on interactive canvas editors (Figma, Docs, etc.).
- **Turbo (Maximum)**: Full acceleration profile for high-power web browsing. Pauses offscreen ambient media, suspends offscreen canvas rendering, enforces compositor scrolling, decodes images asynchronously, and bypasses heavy backdrop blur filters while preserving panel contrast.
- **Balanced**: Subtle optimizations that preserve page visuals and media behavior without heavy intervention.
- **Custom**: Granular tuning drawer providing individual toggles for passive scrolling, offscreen canvas throttling, CSS animations, blur filters, lazy image decoding, and adaptive 30 FPS limits during sustained long frames.

SmoothBoost only registers scripts on enabled sites. Sites disabled in the popup are completely excluded at the browser level.

---

## Install in Chrome or Helium

1. Download and extract the [latest SmoothBoost ZIP](https://github.com/BiniFn/SmoothBoost/releases/latest) (or clone this repository).
2. Open `chrome://extensions` in Chrome or Helium and enable **Developer mode**.
3. Click **Load unpacked** and select the folder containing `manifest.json`.
4. Pin SmoothBoost from the extensions toolbar for one-click access.
5. Reload any active tabs to apply optimizations.

**Keyboard Shortcut**: `Alt + Shift + S` (macOS: `Option + Shift + S`) to instantly toggle SmoothBoost on the active site.

---

## Build Release Package

To create the release ZIP:

```sh
python3 scripts/package_extension.py
```

Outputs `dist/SmoothBoost-2.0.0.zip` containing all production runtime assets.

---

## Automated Test Suite

Run the full suite of automated unit and performance regression tests:

```sh
node --test tests/*.test.js
```

---

## Project Structure

- `manifest.json` — Manifest V3 configuration with alarms and declarativeNetRequest permissions.
- `scripts/background.js` — Service worker, tab discard scheduler, settings migrations, and dynamic script registration.
- `scripts/content.js` — Isolated-world controller, idle archetype classifier, offscreen observers, and CSSOM font patcher.
- `scripts/page-hook.js` — Main-world hooks for passive event enforcement, detached buffer protection, and carousel autoplay control.
- `popup/` — Single-screen control panel (`popup.html`, `popup.css`, `popup.js`, `update-check.js`).
- `data/site-rules.json` — Dynamic site matching rules.
- `test-fixtures/` and `tests/` — Test suite and fixtures.
