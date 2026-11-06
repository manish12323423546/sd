// Synced viewer: captures the tab (picture + sound), holds both back D seconds, and plays the
// character voices exactly on each original line. ?test=<video url> uses a local video instead of
// a tab (automated tests).
const $ = (id) => document.getElementById(id);
const EMO = { calm: "#5BC0BE", neutral: "#8A97A8", excited: "#F5A524", peak: "#F31260" };
const lines = new Map();
const speakers = new Map();
let relay = null, delayed = null, voices = [], settings = null, metrics = null, voiceMuted = false;

async function getStart() {
  const test = new URLSearchParams(location.search).get("test");
  if (test) {
    return { test, settings: { engine: new URL(test).origin, mode: "synced", delay: 6, speakers: 2, cast: {} }, label: "test video" };
  }
  for (let i = 0; i < 50; i++) {
    const p = await chrome.runtime.sendMessage({ type: "viewer-ready" });
    if (p) return p;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("No tab to capture — start from the extension button on the stream's tab.");
}

async function captureStream(p) {
  if (p.test) {
    const v = document.createElement("video");
    v.src = p.test; v.muted = true; v.crossOrigin = "anonymous"; v.playsInline = true;
    await v.play();
    return v.captureStream();
  }
  return navigator.mediaDevices.getUserMedia({
    audio: { mandatory: { chromeMediaSource: "tab", chromeMediaSourceId: p.streamId } },
    video: { mandatory: { chromeMediaSource: "tab", chromeMediaSourceId: p.streamId, maxWidth: 1920, maxHeight: 1080, maxFrameRate: 30 } },
  });
}

function renderSpeakers() {
  const box = $("spk");
  if (!speakers.size) return;
  box.innerHTML = "";
  for (const sp of speakers.values()) {
    const sw = document.createElement("span");
    sw.style.cssText = `width:10px;height:10px;border-radius:50%;background:${sp.color}`;
    const sel = document.createElement("select");
    sel.className = "field";
    sel.setAttribute("aria-label", `Voice for ${sp.display_name}`);
    for (const v of voices) sel.append(new Option(`${sp.display_name}: ${v.name}${v.custom ? " (clone)" : ""}`, v.voice_id));
    sel.value = sp.voice_id || "";
    sel.onchange = () => relay?.setVoice(sp.speaker_id, sel.value);
    const row = document.createElement("div");
    row.className = "spk";
    row.append(sw, sel);
    box.append(row);
  }
}

function addLine(ln) {
  lines.set(ln.line_id, ln);
  const sp = speakers.get(ln.speaker_id);
  const el = document.createElement("div");
  el.className = "ln";
  const t = document.createElement("span"); t.className = "t";
  t.textContent = `${String(Math.floor(ln.t_start / 60)).padStart(2, "0")}:${String(Math.floor(ln.t_start % 60)).padStart(2, "0")}`;
  const who = document.createElement("b"); who.textContent = ln.speaker_id || "?"; who.style.color = sp?.color || "#4FA3FF";
  const emo = document.createElement("span"); emo.className = "emo";
  emo.textContent = ln.emotion || "—"; emo.style.color = EMO[ln.emotion] || "#8A97A8"; emo.style.borderColor = emo.style.color;
  const tx = document.createElement("span"); tx.textContent = `“${ln.text || ""}”`;
  el.append(t, who, emo, tx);
  $("lines").prepend(el);
}

function showSub(lineId, duration) {
  const ln = lines.get(lineId);
  if (!ln) return;
  const sp = speakers.get(ln.speaker_id);
  $("subWho").textContent = sp?.display_name || ln.speaker_id || "";
  $("subWho").style.color = sp?.color || "#4FA3FF";
  $("subText").textContent = ln.text || "";
  $("sub").style.opacity = "1";
  clearTimeout(showSub.t);
  showSub.t = setTimeout(() => ($("sub").style.opacity = "0"), Math.max(1000, duration * 1000 + 300));
}

async function main() {
  const p = await getStart();
  settings = p.settings;
  $("src").textContent = `${p.label} · picture and sound held back ${settings.delay} s so every voice lands on time`;
  voices = await (await fetch(`${settings.engine}/api/voices`, { headers: settings.code ? { "X-Access-Code": settings.code } : {} })).json().catch(() => []);
  const stream = await captureStream(p);
  relay = new window.LCV.LiveRelay(stream, {
    base: settings.engine,
    viewDelay: settings.delay,
    maxSpeakers: settings.speakers,
    voiceMap: settings.cast,
    label: p.label,
    accessCode: settings.code || undefined,
    workletUrl: chrome.runtime?.getURL ? chrome.runtime.getURL("lib/pcm-worklet.js") : "lib/pcm-worklet.js",
    onMessage: (m) => {
      if (m.type === "line.complete") addLine(m.line);
      if (m.type === "speaker.new" || m.type === "speaker.updated") { speakers.set(m.speaker.speaker_id, m.speaker); renderSpeakers(); }
      if (m.type === "metrics") { metrics = m; $("sDelay").textContent = `${m.p50_delay.toFixed(1)} s (p95 ${m.p95_delay.toFixed(1)})`; }
    },
    onStatus: (s) => {
      $("sSent").textContent = `${Math.round(s.sentS)} s`;
      $("sVoiced").textContent = s.voiced;
      $("sLate").textContent = s.late;
      chrome.runtime?.sendMessage?.({ type: "relay-status", info: { ...s, p50: metrics?.p50_delay } }).catch?.(() => {});
      if (s.state === "error") $("waitText").textContent = s.error || "error";
    },
    onVoiceStart: showSub,
  });
  relay.setOriginalLevel(Number($("orig").value));
  await relay.start();
  const vt = stream.getVideoTracks()[0];
  delayed = new window.LCV.DelayedVideo(vt, $("video"), relay, settings.delay);
  delayed.start();
  $("badge").style.display = "flex";
  $("badgeText").textContent = `SYNCED +${settings.delay}s`;
  setInterval(() => {
    const w = delayed.waiting;
    if (w > 0.05) { $("wait").style.display = "grid"; $("count").textContent = Math.ceil(w); $("waitText").textContent = "Buffering so every voice lands on time…"; }
    else $("wait").style.display = "none";
  }, 100);
  vt.addEventListener("ended", stop);
}

function stop() {
  relay?.stop();
  delayed?.stop();
  $("wait").style.display = "grid";
  $("count").textContent = "■";
  $("waitText").textContent = relay?.sessionId ? "Stopped. The session report is ready in the app." : "Stopped.";
}

$("stop").onclick = stop;
$("orig").oninput = (e) => relay?.setOriginalLevel(Number(e.target.value));
$("voice").oninput = (e) => relay?.setVoiceLevel(Number(e.target.value));
document.addEventListener("keydown", (e) => {
  if (e.key === " ") { e.preventDefault(); voiceMuted = !voiceMuted; relay?.setVoiceLevel(voiceMuted ? 0 : Number($("voice").value)); }
  if (e.key.toLowerCase() === "f") { document.fullscreenElement ? document.exitFullscreen() : $("stage").requestFullscreen(); }
});
chrome.runtime?.onMessage?.addListener((msg) => { if (msg.type === "viewer-stop") stop(); });
window.addEventListener("beforeunload", () => { relay?.stop(); chrome.runtime?.sendMessage?.({ type: "viewer-closed" }); });
main().catch((e) => { $("count").textContent = "!"; $("waitText").textContent = String(e.message || e); });
