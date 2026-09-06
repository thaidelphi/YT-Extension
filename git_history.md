# Git Push History

## 2026-09-06 — Add aggressive local YouTube ad blocker
- Commit: `7fd4ada`
- Change: Added a dedicated aggressive YouTube ad blocker content script with rapid ad-state polling, MutationObserver detection, immediate Skip Ad/overlay-close attempts, expanded cosmetic hiding, and YouTube-focused DNR rules. Updated the extension to version `0.1.1` and fixed an existing malformed multiline selector string in `content.js` so the script passes syntax validation.
- Push: SUCCESS — `main` → `origin/main`

## 2026-09-06 — Strengthen YouTube ad blocking
- Commit: `c2d972f`
- Change: Strengthened YouTube-focused ad blocking with additional ad-network rules, higher priorities, expanded player ad cleanup, and retained automatic Skip Ad handling.
- Push: SUCCESS — `main` → `origin/main`

## 2026-09-06 — Add ad blocking layer
- Commit: `6ab1a31`
- Change: Added Declarative Net Request blocking for external ad networks and YouTube ad overlay cleanup while retaining automatic Skip Ad handling.
- Push: SUCCESS — `main` → `origin/main`

## 2026-09-06 — Add quick playback speed control
- Commit: `c8c6946`
- Change: Added quick Playback Speed control to the YouTube player controls.
- Push: SUCCESS — `main` → `origin/main`

## 2026-09-06 — Record playback speed feature push history
- Commit: `7f3fb8b`
- Change: Added and pushed the initial `git_history.md` record for the playback speed feature.
- Push: SUCCESS — `main` → `origin/main`

## 2026-09-06 — Add automatic YouTube ad skip
- Commit: `86eb3dd`
- Change: Added automatic detection of YouTube ad states, automatic click of available Skip Ad buttons, automatic closing of ad overlays, and decoupled ad handling from the other player controls for better SPA stability.
- Push: SUCCESS — `main` → `origin/main`

## e330bde � Refactor YouTube ad blocker into detection engine
- Added multi-signal YouTube Ad Detection Engine.
- Added SPA navigation bridge and separated ad engine files.
- Push: main  origin/main (success).

