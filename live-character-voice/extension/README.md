# Live Character Voice — Chrome extension

Re-voice the commentary of **any live stream playing in a Chrome tab**.

## Install (2 minutes)
1. Start the engine on your Mac: `cd ~/sd/live-character-voice && make serve` (keep it running).
2. Open `chrome://extensions`, switch on **Developer mode** (top right).
3. Click **Load unpacked** and choose the folder `live-character-voice/extension`.
4. Pin it: puzzle-piece icon → pin **Live Character Voice**.

## Use
1. Open the live stream (YouTube, Twitch, any player) and start playing it.
2. Click the extension icon. The dot is green when the engine is ready.
3. Choose a mode:
   - **Synced window (best):** a viewer window opens; picture and sound are held back a few seconds
     (default 6) and every character voice lands exactly on its line. Watch the viewer window.
   - **Live overlay:** stay on the tab; voices play over it with subtitles on the page. Lowest
     latency, but each voice comes after its line has been said.
4. Optionally cast a voice per commentator (your clones from the Voice Lab appear here).
5. **Start on this tab**. Stop from the popup or the viewer's Stop button.

Viewer shortcuts: **Space** mute/unmute voices · **F** full screen. You can switch a commentator's
voice live in the viewer.

## Notes
- The engine URL is `http://localhost:8000` (change it under *Engine* in the popup).
- Capturing a tab mutes it in Chrome; the extension plays its sound back for you (ducked under the
  voices, and delayed in synced mode).
- Chrome's own pages (chrome://…) and some DRM-protected players cannot be captured.
- Each session gets a full report in the web app (Studio → report links), including the recorded
  input (`live_input.wav`).
- After changing `web/src/live/*`, rebuild the shared code: `make extension`.
