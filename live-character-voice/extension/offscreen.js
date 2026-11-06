// "Live overlay" mode: captures the tab's sound, relays it to the engine, plays the original
// back (capture mutes the tab) with the character voices on top, and sends subtitles.
let relay = null;
const lines = new Map();
const speakers = new Map();

function report(info) {
  chrome.runtime.sendMessage({ type: "relay-status", info }).catch(() => {});
}

async function start({ streamId, settings, label }) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { mandatory: { chromeMediaSource: "tab", chromeMediaSourceId: streamId } },
    video: false,
  });
  relay = new window.LCV.LiveRelay(stream, {
    base: settings.engine,
    viewDelay: 0,
    maxSpeakers: settings.speakers,
    voiceMap: settings.cast,
    label,
    accessCode: settings.code || undefined,
    workletUrl: chrome.runtime.getURL("lib/pcm-worklet.js"),
    onMessage: (m) => {
      if (m.type === "line.complete") lines.set(m.line.line_id, m.line);
      if (m.type === "speaker.new" || m.type === "speaker.updated") speakers.set(m.speaker.speaker_id, m.speaker);
      if (m.type === "metrics") report({ ...(relay?.lastStatus || {}), p50: m.p50_delay, p95: m.p95_delay });
    },
    onStatus: (s) => {
      relay && (relay.lastStatus = s);
      report(s);
    },
    onVoiceStart: (lineId, duration) => {
      const ln = lines.get(lineId);
      const sp = ln?.speaker_id ? speakers.get(ln.speaker_id) : null;
      chrome.runtime.sendMessage({
        type: "subtitle", text: ln?.text || "", speaker: sp?.display_name || ln?.speaker_id || "",
        color: sp?.color, duration,
      }).catch(() => {});
    },
  });
  relay.setOriginalLevel(settings.original ?? 0.35);
  await relay.start();
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.target !== "offscreen") return;
  if (msg.type === "offscreen-start") start(msg).catch((e) => report({ state: "error", error: String(e?.message || e) }));
  if (msg.type === "offscreen-stop") relay?.stop();
});
