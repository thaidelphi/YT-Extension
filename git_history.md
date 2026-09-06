# Git History

## e06151a — Delegate ad handling to engine
- Removed duplicate ad handling from content.js.
- Push: SUCCESS — main → origin/main

## e330bde — Refactor YouTube ad blocker into detection engine
- Added multi-signal YouTube Ad Detection Engine.
- Added SPA navigation bridge and separated ad engine files.
- Push: SUCCESS — main → origin/main

## 30720ef — Improve ad detection scoring engine
- Removed stale ad handling calls from content.js.
- Fixed Playback Speed labels to use the × symbol.
- Added multi-signal scoring and detection threshold to the YouTube Ad Engine.
- Push: SUCCESS — main → origin/main

## 58cc516 — Redesign popup as YouTube control center
- Redesigned popup as a unified Control Center.
- Added Ad Blocker enable/disable control and engine status.
- Added default Playback Speed setting.
- Kept Google OAuth and YouTube Dislike controls in the same dashboard.
- Added persistent Ad Blocker and default speed settings.
- Push: SUCCESS — main → origin/main


## ed4be66 — Improve YouTube engine performance and cleanup
- Refactored `adblock/ad_engine.js` into a scheduled multi-signal engine to reduce MutationObserver/polling overhead.
- Kept scoring, threshold detection, Auto Skip and Auto Close behavior.
- Simplified `content.js` and corrected visible Thai error messages to UTF-8.
- Moved the duplicate legacy implementation to `adblock/ad_blocker_legacy.js`; it is not loaded by the manifest.
- Push: SUCCESS — main → origin/main

## 5ecb6d3 — Single speed button and real DNR toggle
- Changed the YouTube Playback Speed UI to one button that cycles through supported speeds.
- Prevented duplicate speed controls when YouTube SPA rebuilds the player controls.
- Connected the Ad Blocker toggle to the real `ad_block_rules` DNR ruleset.
- Added DNR status reporting to the Control Center and preserved the saved toggle state across extension updates/startup.
- Verified JavaScript syntax and `rules.json` JSON validity.
- Push: SUCCESS — main → origin/main

## 2026-09-06 — Playback Speed selection list
- Changed Playback Speed from click-to-cycle behavior to a dropdown-style list of direct speed choices.
- Added selected-state highlighting and automatic menu close after selection.
- Commit/Push: pending


## 2026-09-06 — เพิ่มปุ่ม Download
- Added one Download button to the YouTube player controls.
- The button attempts to invoke YouTube's own Download control when available; it does not extract or construct stream URLs.
- Commit/Push: pending

## 2026-09-06 — Final verification for Download button
- Updated `content.js` and `content.css` for the new Download control.
- JavaScript syntax verification: pending.
- Push: pending.





