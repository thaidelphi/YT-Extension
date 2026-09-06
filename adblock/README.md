# YouTube Ad Detection Engine

## Architecture
- `adblock/ad_engine.js`: multi-signal detection, skipping, overlay cleanup and state API.
- `adblock/engine_bridge.js`: reconnects the engine after YouTube SPA navigation.
- `ad_blocker.js`: compatibility entry point containing the same engine implementation.
- `content.js`: UI/Dislike/Playback Speed only; ad handling is delegated to the engine.

## Detection layers
1. YouTube player state: `.ad-showing`, `.ad-interrupting` and player class state.
2. DOM ad modules and overlays.
3. Visible Skip/Close controls.
4. MutationObserver for dynamic changes.
5. Fast polling fallback (150 ms).

The engine intentionally uses several independent signals instead of depending on one YouTube selector.
