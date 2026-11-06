// Session hub, loaded by the page that runs the relay (offscreen.html for the Live overlay,
// viewer.html for the Synced window). Keeps the live state, broadcasts it to the side panel and
// applies the side panel's controls. All messages are chrome.runtime broadcasts.
(() => {
  const state = { lines: [], speakers: {}, metrics: null, status: null, mode: null, voices: [],
                  levels: { original: 0.35, voice: 1 }, originalMode: "full", voicesMuted: false,
                  subtitles: true, current: null, stereo: null };  // fmt: skip
  let relay = null;
  const send = (m) => chrome.runtime.sendMessage(m).catch(() => {});

  function snapshot() {
    send({ type: "lcv-snapshot", state: { ...state, lines: state.lines.slice(0, 150) } });
  }

  const hub = {
    attach(r, mode, voices, levels) {
      relay = r;
      state.mode = mode;
      state.voices = voices || [];
      if (levels) state.levels = { ...state.levels, ...levels };
      setInterval(() => {
        if (!relay) return;
        state.stereo = relay.stereoInfo();
        send({ type: "lcv-stereo", stereo: state.stereo });
      }, 2000);
      snapshot();
    },
    onMessage(m) {
      if (m.type === "line.complete") {
        state.lines.unshift({ ...m.line, voiced: false });
        state.lines = state.lines.slice(0, 300);
      } else if (m.type === "speaker.new" || m.type === "speaker.updated") {
        state.speakers[m.speaker.speaker_id] = m.speaker;
      } else if (m.type === "speaker.merged") {
        delete state.speakers[m.from];
        for (const l of state.lines) if (l.speaker_id === m.from) l.speaker_id = m.into;
      } else if (m.type === "audio.ready") {
        const ln = state.lines.find((l) => l.line_id === m.line_id);
        if (ln) { ln.voice_id = m.voice_id; ln.felt = Math.max(0, m.play_at_media - ln.t_start); }
      } else if (m.type === "metrics") {
        state.metrics = m;
      }
      send({ type: "lcv-event", msg: m });
    },
    onStatus(s) {
      state.status = s;
      send({ type: "lcv-status", status: s, mode: state.mode });
    },
    onVoiceStart(lineId) {
      const ln = state.lines.find((l) => l.line_id === lineId);
      if (ln) ln.voiced = true;
      state.current = lineId;
      send({ type: "lcv-speaking", line_id: lineId });
    },
    lines: () => state.lines,
    speakers: () => state.speakers,
    state,
  };
  window.lcvHub = hub;

  chrome.runtime.onMessage.addListener((m) => {
    if (m.type === "lcv-hello") snapshot();
    if (m.type !== "lcv-control" || !relay) return;
    const v = m.value;
    switch (m.action) {
      case "original-mode": state.originalMode = v; relay.setOriginalMode(v); break;
      case "original-level": state.levels.original = v; relay.setOriginalLevel(v); break;
      case "voice-level": state.levels.voice = v; if (!state.voicesMuted) relay.setVoiceLevel(v); break;
      case "voices-muted": state.voicesMuted = v; relay.setVoiceLevel(v ? 0 : state.levels.voice); break;
      case "set-voice": relay.setVoice(v.speaker_id, v.voice_id);
        if (state.speakers[v.speaker_id]) state.speakers[v.speaker_id].voice_id = v.voice_id; break;
      case "subtitles": state.subtitles = v; send({ type: "lcv-subtitles", on: v }); break;
      case "merge": relay.send({ type: "merge_speakers", from: v.from, into: v.into }); break;
      case "rename": relay.send({ type: "rename_speaker", speaker_id: v.speaker_id, name: v.name }); break;
      case "stop": window.dispatchEvent(new Event("lcv-stop")); break;
    }
    snapshot();
  });
})();
