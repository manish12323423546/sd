// Side panel: live transcript, who is speaking (detected live), emotion, voices and controls.
const $ = (id) => document.getElementById(id);
const EMO = { calm: "#5BC0BE", neutral: "#8A97A8", excited: "#F5A524", peak: "#FF4D6D" };
let S = { lines: [], speakers: {}, voices: [], metrics: null, status: null, mode: null, originalMode: "full", levels: { original: 0.35, voice: 1 }, voicesMuted: false, subtitles: true, current: null };
let lastSeen = 0;
const ctl = (action, value) => chrome.runtime.sendMessage({ type: "lcv-control", action, value }).catch(() => {});
const fmt = (t) => `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

function chip(text, color) {
  const c = document.createElement("span");
  c.className = "chip"; c.textContent = text; c.style.color = color; c.style.borderColor = color;
  return c;
}

function render() {
  const running = !!S.mode && S.status?.state !== "ended";
  $("idle").style.display = running ? "none" : "block";
  $("running").style.display = running ? "block" : "none";
  $("live").className = running ? "dot ok" : "dot";
  $("mode").textContent = !running ? "not running" : S.mode === "synced" ? "Synced window · voices land on time" : "Live overlay on the tab";
  $("subsRow").style.display = S.mode === "overlay" ? "flex" : "none";
  const m = S.metrics;
  $("sFelt").textContent = m ? `${m.p50_delay.toFixed(1)}s` : "–";
  $("sLines").textContent = S.lines.length;
  $("sVoiced").textContent = S.status?.voiced ?? 0;
  $("sLate").textContent = S.status?.late ?? 0;
  for (const b of document.querySelectorAll("[data-om]")) b.setAttribute("aria-pressed", String(b.dataset.om === S.originalMode));
  $("orig").value = S.levels.original; $("origV").textContent = `${Math.round(S.levels.original * 100)}%`;
  $("voice").value = S.levels.voice; $("voiceV").textContent = `${Math.round(S.levels.voice * 100)}%`;
  $("vmute").checked = !!S.voicesMuted; $("subs").checked = S.subtitles !== false;
  renderSpeakers(); renderNow(); renderLines();
}

function renderSpeakers() {
  const box = $("spk");
  const sp = Object.values(S.speakers);
  if (!sp.length) { box.textContent = "Listening…"; return; }
  box.innerHTML = "";
  for (const s of sp) {
    const mine = S.lines.filter((l) => l.speaker_id === s.speaker_id);
    const sims = mine.map((l) => l.speaker_sim).filter((x) => typeof x === "number");
    const avg = sims.length ? sims.reduce((a, b) => a + b, 0) / sims.length : null;
    const row = document.createElement("div"); row.className = "spk";
    const dot = document.createElement("span"); dot.style.cssText = `width:10px;height:10px;border-radius:50%;background:${s.color}`;
    const sel = document.createElement("select"); sel.className = "field"; sel.style.padding = "5px 8px";
    sel.setAttribute("aria-label", `Voice for ${s.display_name}`);
    for (const v of S.voices) sel.append(new Option(`${s.display_name} → ${v.name}${v.custom ? " (clone)" : ""}`, v.voice_id));
    sel.value = s.voice_id || "";
    sel.onchange = () => ctl("set-voice", { speaker_id: s.speaker_id, voice_id: sel.value });
    const m = document.createElement("div"); m.title = "voice-print match of this commentator's lines";
    m.style.cssText = "display:flex;flex-direction:column;align-items:flex-end;gap:2px;font-size:10px;color:var(--muted)";
    const meter = document.createElement("div"); meter.className = "meter";
    const fill = document.createElement("i"); fill.style.width = `${avg === null ? 0 : Math.round(Math.max(0, Math.min(1, avg)) * 100)}%`;
    meter.append(fill);
    const label = document.createElement("span"); label.textContent = `${mine.length} lines${avg === null ? "" : ` · ${Math.round(avg * 100)}%`}`;
    m.append(meter, label);
    row.append(dot, sel, m);
    box.append(row);
    if (sp.length > 1) {
      const fix = document.createElement("select");
      fix.className = "field"; fix.style.cssText = "grid-column: 2 / 4; padding: 3px 6px; font-size: 11px; color: var(--muted)";
      fix.setAttribute("aria-label", `${s.display_name} is the same person as`);
      fix.append(new Option(`${s.display_name} is the same person as…`, ""));
      for (const o of sp) if (o.speaker_id !== s.speaker_id) fix.append(new Option(o.display_name, o.speaker_id));
      fix.onchange = () => fix.value && ctl("merge", { from: s.speaker_id, into: fix.value });
      box.append(fix);
    }
  }
}

function renderNow() {
  const ln = S.lines.find((l) => l.line_id === S.current) || S.lines[0];
  if (!ln) return;
  const s = S.speakers[ln.speaker_id];
  $("nowBar").style.background = s?.color || "#8B7BFF";
  $("nowWho").textContent = s?.display_name || ln.speaker_id || "—";
  $("nowWho").style.color = s?.color || "";
  $("nowTxt").textContent = ln.text || "";
  const chips = $("nowChips"); chips.innerHTML = "";
  if (ln.emotion) chips.append(chip(ln.emotion, EMO[ln.emotion]));
  if (ln.speaker_conf) chips.append(chip(`speaker ${ln.speaker_conf}`, ln.speaker_conf === "high" ? "#34D399" : ln.speaker_conf === "low" ? "#F5A524" : "#8592A6"));
  if (ln.asr_by) {
    const base = String(ln.asr_by).replace("*", ""); // "*" = retried on the backup engine
    const name = { groq: "Groq", deepgram: "Deepgram", local: "offline" }[base] || base;
    chips.append(chip(`${name} ASR${String(ln.asr_by).endsWith("*") ? " (backup)" : ""}`, "#8592A6"));
  }
  const v = S.voices.find((x) => x.voice_id === (ln.voice_id || s?.voice_id));
  if (v) chips.append(chip(`voice: ${v.name}`, "#A48BFF"));
}

function renderLines() {
  const box = $("lines");
  if (!S.lines.length) return;
  box.innerHTML = "";
  for (const ln of S.lines.slice(0, 120)) {
    const s = S.speakers[ln.speaker_id];
    const el = document.createElement("div"); el.className = "ln";
    const meta = document.createElement("div"); meta.className = "meta";
    const t = document.createElement("span"); t.textContent = fmt(ln.t_start);
    const who = document.createElement("b"); who.textContent = s?.display_name || ln.speaker_id || "?"; who.style.color = s?.color || "";
    meta.append(t, who);
    if (ln.emotion) meta.append(chip(ln.emotion, EMO[ln.emotion]));
    const st = document.createElement("span");
    st.textContent = ln.voiced ? `✓ voiced${typeof ln.felt === "number" ? ` +${ln.felt.toFixed(1)}s` : ""}` : "… preparing";
    st.style.marginLeft = "auto"; st.style.color = ln.voiced ? "#34D399" : "";
    meta.append(st);
    const tx = document.createElement("div"); tx.textContent = ln.text || "";
    el.append(meta, tx); box.append(el);
  }
}

chrome.runtime.onMessage.addListener((m) => {
  lastSeen = Date.now();
  if (m.type === "lcv-snapshot") { S = { ...S, ...m.state }; render(); }
  else if (m.type === "lcv-status") { S.status = m.status; S.mode = m.mode || S.mode; render(); }
  else if (m.type === "lcv-speaking") {
    S.current = m.line_id; const ln = S.lines.find((l) => l.line_id === m.line_id); if (ln) ln.voiced = true; render();
  } else if (m.type === "lcv-stereo") {
    const st = m.stereo;
    $("stereoHint").textContent = st.silent ? "Waiting for sound…"
      : st.mono ? "This stream is MONO: commentary and crowd are in the same channel, so “Crowd only” cannot separate them here. Use Off or lower Original instead."
      : `Stereo stream (width ${(st.width * 100).toFixed(0)}%): “Crowd only” removes the centred commentators and keeps the stadium.`;
    $("stereoHint").style.color = st.mono && !st.silent ? "#F5A524" : "";
  } else if (m.type === "lcv-event") {
    const e = m.msg;
    if (e.type === "line.complete") { S.lines.unshift({ ...e.line, voiced: false }); S.lines = S.lines.slice(0, 300); }
    else if (e.type === "speaker.new" || e.type === "speaker.updated") S.speakers[e.speaker.speaker_id] = e.speaker;
    else if (e.type === "speaker.merged") {
      delete S.speakers[e.from];
      for (const l of S.lines) if (l.speaker_id === e.from) l.speaker_id = e.into;
    }
    else if (e.type === "audio.ready") { const ln = S.lines.find((l) => l.line_id === e.line_id); if (ln) { ln.voice_id = e.voice_id; ln.felt = Math.max(0, e.play_at_media - ln.t_start); } }
    else if (e.type === "metrics") S.metrics = e;
    else if (e.type === "session.ended") S.status = { ...(S.status || {}), state: "ended" };
    render();
  }
});

for (const b of document.querySelectorAll("[data-om]")) b.onclick = () => { S.originalMode = b.dataset.om; ctl("original-mode", b.dataset.om); render(); };
$("orig").oninput = (e) => { S.levels.original = Number(e.target.value); ctl("original-level", S.levels.original); render(); };
$("voice").oninput = (e) => { S.levels.voice = Number(e.target.value); ctl("voice-level", S.levels.voice); render(); };
$("vmute").onchange = (e) => { S.voicesMuted = e.target.checked; ctl("voices-muted", S.voicesMuted); };
$("subs").onchange = (e) => { S.subtitles = e.target.checked; ctl("subtitles", S.subtitles); };
$("stop").onclick = () => ctl("stop");
// ask the running session for its state; repeat while nothing is running
const hello = () => chrome.runtime.sendMessage({ type: "lcv-hello" }).catch(() => {});
hello();
setInterval(() => { if (Date.now() - lastSeen > 4000) hello(); }, 3000);
render();
