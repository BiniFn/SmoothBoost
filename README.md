# SmoothBoost

SmoothBoost is a 100% free, zero-telemetry cross-browser performance extension and userscript for smoother scrolling, reduced background work, Shadow DOM acceleration, and instant frame pacing. It detects page archetypes before applying optimizations while preserving live calls, interactive apps, and user-controlled animation preferences.

[![Firefox Add-ons](https://img.shields.io/badge/Firefox%20Add--ons-Live%20on%20AMO-ff7139?style=for-the-badge&logo=firefoxbrowser&logoColor=white)](https://addons.mozilla.org/en-US/firefox/addon/smoothboost/)
[![Edge Add-ons](https://img.shields.io/badge/Microsoft%20Edge-Live%20on%20Store-0078d7?style=for-the-badge&logo=microsoftedge&logoColor=white)](https://microsoftedge.microsoft.com/addons/search/SmoothBoost)
[![Install with Tampermonkey](https://img.shields.io/badge/Install%20with%20Tampermonkey-SmoothBoost.user.js-06b6d4?style=for-the-badge&logo=tampermonkey&logoColor=white)](https://raw.githubusercontent.com/BiniFn/SmoothBoost/main/dist/SmoothBoost.user.js)
[![Download Chrome ZIP](https://img.shields.io/badge/Download-Chrome%20Extension%20v2.5.0-38bdf8?style=for-the-badge&logo=googlechrome&logoColor=white)](https://raw.githubusercontent.com/BiniFn/SmoothBoost/main/dist/SmoothBoost-Chrome-2.5.0.zip)
[![Download Safari ZIP](https://img.shields.io/badge/Download-Safari%20Extension%20v2.5.0-000000?style=for-the-badge&logo=safari&logoColor=white)](https://raw.githubusercontent.com/BiniFn/SmoothBoost/main/dist/SmoothBoost-Safari-2.5.0.zip)
[![Donate / Sponsor](https://img.shields.io/badge/Donate-Support%20SmoothBoost-10b981?style=for-the-badge&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/BiniFn)
[![Release](https://img.shields.io/badge/Release-v2.5.0-emerald?style=for-the-badge)](https://github.com/BiniFn/SmoothBoost/releases)

Supported across **Mozilla Firefox Add-ons (Live)**, **Microsoft Edge Add-ons (Live)**, **Tampermonkey & Violentmonkey Userscript**, **Google Chrome & Helium**, **Apple Safari (macOS & iOS)**, and **Titanium Browser on Android**.

---

## Browser & Platform Compatibility Matrix

| Platform / Environment | Store / Distribution | Minimum Version | Scroll Boost v2 & Shadow DOM | Dynamic FPS (Native / 30–120) | Tab Discard | Settings UI |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| **Mozilla Firefox (Desktop & Android)** | [Firefox Add-ons (AMO)](https://addons.mozilla.org/en-US/firefox/addon/smoothboost/) & ZIP | Firefox 140+ (Android 142+) | ✓ | ✓ | ✓ *(desktop only)* | Redesigned Popup & Touch UI |
| **Microsoft Edge** | [Edge Add-ons Store](https://microsoftedge.microsoft.com/addons/search/SmoothBoost) & ZIP | Edge 116+ | ✓ | ✓ | ✓ | Redesigned Popup & High Contrast |
| **Chrome / Chromium / Brave / Helium** | Unpacked ZIP (CWS Ready) | Chrome 116+ | ✓ | ✓ | ✓ | Redesigned Popup (`Alt+Shift+S`) |
| **Apple Safari (macOS & iOS)** | WebKit MV3 ZIP / Userscript | Safari 16+ / iOS 15+ | ✓ | ✓ | Guarded (WebKit) | Responsive Popup / Shadow HUD |
| **Titanium Browser (Android)** | Chromium MV3 (Vanadium) ZIP | Current | ✓ | ✓ | Guarded (OS LMK) | Touch UI (&ge;44px targets) |
| **Userscript (Tampermonkey / Violentmonkey)** | 1-Click `SmoothBoost.user.js` | Tampermonkey 4.14+ / Violentmonkey 2.13+ | ✓ | ✓ | — *(extension only)* | CSP-Safe Shadow DOM HUD & Corner Pill |

> [!NOTE]
> SmoothBoost is **100% free and zero-telemetry** across every platform. If SmoothBoost keeps your browser silky smooth, consider supporting development via [GitHub Sponsors](https://github.com/sponsors/BiniFn).

---

## What's New in v2.5.0 — Universal Boost & Store Release

1. **Live on Official Stores**: Published on **[Firefox Add-ons (AMO)](https://addons.mozilla.org/en-US/firefox/addon/smoothboost/)** and **[Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/search/SmoothBoost)** alongside updated v2.5.0 packages for Chrome, Safari, Titanium Android, and Userscripts.
2. **Scroll Boost v2 (Zero-Reflow)**: Eliminated the wildcard `*` `box-shadow` repaint storm during scrolling and fixed nested scrollable container behavior (`overflow-y: auto`).
3. **Shadow DOM Boost & Site Rules v3**: Automatically injects offscreen containment into open Shadow DOM trees (`shreddit-*`, `ytd-*`) and executes targeted rules for YouTube, Reddit, X/Twitter, Twitch, Kick, TikTok, Instagram, Facebook, Fandom wikis, ChatGPT, and Claude.
4. **Differentiated Profiles & Background Tab Throttling**: Distinct **Smart Auto**, **Turbo (Maximum)** (full containment, 2,500-node Memory Guard sweeps, WebGL2 instanced skipping, hidden-tab timer/rAF throttling), **Balanced**, and **Battery Saver** modes, plus explicit **Native** (uncapped) FPS alongside 30/60/90/120 FPS.
5. **Low-Overhead Architecture**: 4ms-budgeted `requestAnimationFrame` mutation batching, zero-reflow canvas observation, 15s periodic Memory Guard sweeps, and Safari static/dynamic script deduplication.
6. **Redesigned UI & CSP-Safe Userscript**: Elevated dark-glass popup with archetype pills, SVG telemetry chips, grouped Custom controls, Edge High Contrast support, Trusted-Types-safe Shadow DOM HUD, optional corner `⚡ SB` pill, and a **Support SmoothBoost** donation card.

---

## Profiles

- **Smart Auto** *(Default)*: Archetype-aware acceleration. Applies `content-visibility: auto`, Shadow DOM optimization, and site rules on heavy feeds and shopping/article sites while protecting Discord, Meet, Figma, Google Docs, Maps, and WebGL games.
- **Turbo (Maximum)**: Maximum acceleration across all non-exempt pages — broad layout/paint containment, tighter 2,500-node Memory Guard, background-tab timer throttling, and WebGL2 offscreen draw skipping.
- **Balanced**: Zero-visual-change baseline that keeps page styling, blur filters, animations, and background videos untouched while upgrading scroll listeners and image decoding.
- **Battery Saver**: Aggressive power saving for laptops and mobile devices with 30 FPS pacing, background-tab throttling, and amber `BATT` badge.
- **Custom**: Categorized tuning drawer with independent controls for Scroll Boost v2, Shadow DOM Boost, Background Tab Throttle, Smart Resource Loading, Memory Guard, and Native–120 FPS pacing.

---

## Installation Guides

For detailed, platform-specific walkthroughs, read the [Device Setup Tutorial](tutorial.html).

- **Firefox (Desktop & Android):** Install directly from **[Firefox Add-ons (AMO)](https://addons.mozilla.org/en-US/firefox/addon/smoothboost/)** or load [SmoothBoost-Firefox-2.5.0.zip](https://raw.githubusercontent.com/BiniFn/SmoothBoost/main/dist/SmoothBoost-Firefox-2.5.0.zip).
- **Microsoft Edge:** Install directly from **[Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/search/SmoothBoost)** or load [SmoothBoost-Edge-2.5.0.zip](https://raw.githubusercontent.com/BiniFn/SmoothBoost/main/dist/SmoothBoost-Edge-2.5.0.zip).
- **Tampermonkey / Violentmonkey / Safari Userscripts:** 1-click install [SmoothBoost.user.js](https://raw.githubusercontent.com/BiniFn/SmoothBoost/main/dist/SmoothBoost.user.js).
- **Chrome / Brave / Helium:** Download [SmoothBoost-Chrome-2.5.0.zip](https://raw.githubusercontent.com/BiniFn/SmoothBoost/main/dist/SmoothBoost-Chrome-2.5.0.zip), unzip, open `chrome://extensions`, enable **Developer mode**, and click **Load unpacked**.
- **Apple Safari (macOS & iOS):** Install via Userscripts or load [SmoothBoost-Safari-2.5.0.zip](https://raw.githubusercontent.com/BiniFn/SmoothBoost/main/dist/SmoothBoost-Safari-2.5.0.zip).
- **Titanium Browser (Android):** Download [SmoothBoost-Titanium-Android-2.5.0.zip](https://raw.githubusercontent.com/BiniFn/SmoothBoost/main/dist/SmoothBoost-Titanium-Android-2.5.0.zip) and load in Extensions.

---

## Building Release Packages

```sh
python3 scripts/package_extension.py --target all
python3 scripts/generate_store_assets.py
```

## Automated Test Suite

```sh
node --test tests/*.test.js
```
