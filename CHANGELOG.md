# Changelog

## [2.5.0] - 2026-11-26

### Added

- **Official Store Availability**: Live on **Firefox Add-ons (AMO)** and **Microsoft Edge Add-ons** alongside updated v2.5.0 builds for Chrome, Safari, Titanium Android, and Tampermonkey/Violentmonkey.
- **Shadow DOM Boost (`attachShadow` & Web Components)**: Automatically applies offscreen containment and blur bypass inside open Shadow DOM trees (`shreddit-*` on Reddit, `ytd-*` on YouTube).
- **Site Rules Engine v3 Execution**: Wires up host and path rules in `data/site-rules.json` for YouTube, Reddit, X/Twitter, Twitch, Kick, TikTok, Instagram, Facebook, Fandom wikis, ChatGPT, and Claude.
- **Background Tab Timer & rAF Throttling**: Throttles rapid background timers and animation loops when `document.hidden` is true (preserving live calls and media).
- **Native FPS Option & Redesigned UI**: Added `Native` (uncapped) alongside `30 / 60 / 90 / 120 FPS`, redesigned the popup and Userscript Shadow HUD with SVG metric chips, archetype pills, grouped Custom toggles, mobile/Edge High Contrast ergonomics, and a non-intrusive **Donate / Support SmoothBoost** link (100% free core, zero telemetry).
- **32px Toolbar Icon & 300px Store Icon**: Added `icons/icon32.png` and `assets/store/store_icon_300x300.png` plus universal store promotional graphics.

### Improved

- **Scroll Boost v2 (Zero-Reflow)**: Eliminated the wildcard `*` `box-shadow`/`pointer-events` repaint storm on scroll start/stop and fixed nested scroll container behavior.
- **Differentiated Profiles**: Distinct **Smart Auto**, **Turbo (Maximum)** (full containment, tighter Memory Guard, WebGL2 instanced skipping, background-tab throttling), and **Balanced** (lightweight passive scroll + async image decoding) presets.
- **Reduced Extension Overhead**: Coalesced `MutationObserver` batches into a 4ms-budgeted rAF scheduler, removed synchronous `getBoundingClientRect()` canvas reflows, added 15s periodic Memory Guard sweeps, and fixed Safari static-vs-dynamic double-injection.
- **CSP & Trusted Types Safe Userscript**: Replaced `innerHTML` modal creation with pure DOM APIs, added `unsafeWindow` CSP fallback, ported the full archetype classifier & contrast safeguards, and added an optional `⚡ SB` corner pill.
- **Privacy Disclosure Alignment**: Updated `PRIVACY.md` and `privacy.html` to accurately describe `declarativeNetRequest` `fonts.googleapis.com` `display=swap` transforms.

## [2.4.0] - 2026-11-17

### Added

- **Apple Safari Support (macOS & iOS)**: Dedicated `SmoothBoost-Safari-2.4.0.zip` WebKit Manifest V3 package and 1-click userscript installation via the Userscripts Safari extension or Orion Browser.
- **Microsoft Edge Store Ready Package**: Dedicated `SmoothBoost-Edge-2.4.0.zip` package fully compliant with Microsoft Edge Partner Center submission standards and developer mode.
- **Unified Mozilla Firefox Package (AMO Store Ready)**: Consolidated Firefox Desktop and Firefox for Android into a single archive (`SmoothBoost-Firefox-2.4.0.zip`).
- **Mozilla Data Collection Consent Compliance**: Added mandatory `browser_specific_settings.gecko.data_collection_permissions: { required: ["none"] }` in `manifest.firefox.json` and bumped `strict_min_version` to `140.0` (Desktop) and `142.0` (Android) to eliminate all AMO validation errors and `declarativeNetRequest` minimum version warnings.
- **Tampermonkey & Violentmonkey Support**: Dedicated standalone `SmoothBoost.user.js` edition supporting direct installation via userscript managers without unpacked extension files. Features auto-updates via `@updateURL`/`@downloadURL`, persistent settings via GM storage, and an on-page Shadow DOM configuration HUD.
- **Scroll Boost**: Temporarily reduces expensive visual rendering effects and suppresses canvas drawing during active scrolling, restoring full fidelity within 160ms of scrolling idle.
- **Smart Resource Loading**: Defers offscreen iframes, heavy media embeds (YouTube, Vimeo, Twitter, Instagram, Spotify, SoundCloud, TikTok), and third-party widgets using `IntersectionObserver` with 400px pre-hydration margins.
- **Memory Guard**: Continuously checks heap allocation (`performance.memory`) and high DOM node counts (>3,500 elements) to unload paused background media preloads and prune canvas caches.
- **Dynamic FPS Profiles**: Added selectable target framerates (30, 60, 90, 120 FPS) with high-precision timestamp pacing in `page-hook.js`.
- **SPA Navigation Optimization**: Intercepts Single-Page Application route changes (`pushState`, `replaceState`, `popstate`, `hashchange`) and re-evaluates page archetypes without page reload.
- **Automatic Recovery Watchdog**: Detects repeated script or DOM errors (&ge;4 in 3 seconds) and automatically demotes optimizations into Safe Mode with one-click restore banner.
- **Universal Site Engine**: Upgraded `site-rules.json` to schema v2 with support for custom host overrides, downloadable rule packs, and 8 page archetypes.

### Improved

- **Zero-innerHTML Security Refactoring**: Eliminated all `.innerHTML` string assignments in `popup/popup.js`, replacing them with programmatic `document.createElement()`, `textContent`, and safe DOM node creation, resolving AMO security review warnings.
- Upgraded settings validation, presets, and UI controls in the popup with FPS selector pills, auto-recovery banners, and userscript quick-links.
- Expanded automated test suite to 75 test suites covering Safari WebKit MV3, Edge Chromium MV3, Firefox AMO Gecko MV3, userscript integrity, Scroll Boost debounce, embed hydration, dynamic FPS pacing, and auto-recovery.

## [2.3.1] - 2026-11-07

### Improved

- Added homepage-specific offscreen rendering, animation, carousel, and muted preview optimizations for ws.ryuo.to while keeping visible animations active and respecting the site's Reduce motion preference.
- Applied async image decoding and native lazy loading to images and iframes added by dynamic feeds.
- Corrected lazy-loading detection to use the HTML attribute, since the browser's default `loading` property is `auto` rather than empty.
- Updated popup status copy to explain when visible motion stays active and offscreen loops are paused.

## [2.3.0] - 2026-11-06

### Added

- Early detection for Discord, Google Meet, Microsoft Teams, Zoom, and WhatsApp, with automatic profiles that preserve live calls, app motion, and interactive canvas content.
- Motion-preference protection for ws.ryuo.to: automatic profiles leave animation playback to the site's Reduce motion setting.
- Clearer popup status for detected real-time apps and preserved site motion.
- A pressure-aware Custom frame limiter that waits for repeated long frames and releases during user input, active media, hidden tabs, Discord, and ws.ryuo.to.

### Improved

- Reduced unnecessary DOM, animation, canvas, media, blur, font, and observer work on real-time communication pages.
- Kept passive scroll handling independent from offscreen animation and canvas controls.
- Updated profile descriptions and scroll examples to avoid presenting illustrative behavior as measured extension performance.
