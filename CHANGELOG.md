# Changelog

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
