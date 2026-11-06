# Chrome Web Store listing — Live Character Voice (ready to paste)

## Name
Live Character Voice

## Summary (≤ 132 characters)
Re-voice live sports commentary in any tab with character voices — in sync, with live transcript, speakers and emotion.

## Category
Accessibility  (alternative: Entertainment)

## Description
Live Character Voice re-speaks the commentary of any live stream or video playing in a Chrome tab in a character voice, at the right moment.

• Works on any tab: YouTube, Twitch, a broadcaster's player.
• Synced window: the picture is held back a few seconds (like a TV broadcast delay), so every new voice starts exactly when the commentator does.
• Live overlay: voices and subtitles right on the tab you are watching.
• Side panel: live transcript, who is speaking (up to 8 commentators), emotion, voice per commentator, original sound Full / Crowd only / Off, volume, mute.
• Your own voices: clone a voice you own in the Voice Lab and cast it on a commentator.
• Measured, not guessed: the Quality Lab scores accuracy and delay on test matches.

Requires a Live Character Voice engine (the hosted engine with an access code, or your own).

## Single purpose (for the review form)
Re-voice the commentary audio of the tab the user selects with character voices, in sync with the video, and show the live transcript and speaker labels.

## Permission justifications
- tabCapture: capture the audio (and in Synced mode the picture) of the tab the user starts it on.
- offscreen: process the captured audio in the background for Live overlay mode (MV3 requirement for media capture).
- sidePanel: show the live transcript, speakers and controls.
- storage: remember the user's settings (engine address, access code, mode, voices).
- activeTab: act only on the tab where the user clicked the extension.
- scripting: show subtitles on the page in Live overlay mode.
- Host permissions (localhost:8000, *.hf.space): connect to the Live Character Voice engine.

## Data usage disclosures (Privacy practices tab)
- Collects: "Website content" (audio of the selected tab, sent to the engine for transcription/voicing). Nothing else.
- Not sold, not used for unrelated purposes, not used for creditworthiness.
- Privacy policy URL: https://manishvk18-live-character-voice.hf.space/privacy.html

## Test instructions for the reviewer
Engine URL is pre-filled. Access code: <put a reviewer code here>. Open a YouTube video with commentary, click the extension → Start on this tab → Synced window.

## Assets in this folder
- screenshot-1..4 (1280×800) · promo-small (440×280) · icon 128 (in extension/icons)
