const COLORS = ["#8B7BFF", "#22D3EE", "#F5A524", "#34D399", "#FF6A3D", "#F472B6", "#E8E36B", "#60A5FA"];
const $ = (id) => document.getElementById(id);
let settings = { engine: "https://manishvk18-live-character-voice.hf.space", code: "", mode: "synced", delay: 6, speakers: 2, cast: {} };
const hdr = () => (settings.code ? { "X-Access-Code": settings.code } : {});
let voices = [];

async function load() {
  const s = await chrome.storage.local.get("settings");
  settings = { ...settings, ...(s.settings || {}) };
  $("engine").value = settings.engine;
  $("code").value = settings.code || "";
  $("delay").value = settings.delay;
  $("speakers").value = String(settings.speakers);
  setMode(settings.mode);
  $("lab").href = `${settings.engine}/voices`;
  await checkEngine();
  renderCast();
  pollStatus();
}
const save = () => chrome.storage.local.set({ settings });

function setMode(m) {
  settings.mode = m;
  $("m-synced").setAttribute("aria-pressed", String(m === "synced"));
  $("m-overlay").setAttribute("aria-pressed", String(m === "overlay"));
  $("delayRow").style.display = m === "synced" ? "block" : "none";
  $("delayVal").textContent = `${settings.delay} s`;
  save();
}

async function checkEngine() {
  try {
    const h = await (await fetch(`${settings.engine}/api/health`, { headers: hdr() })).json();
    const ok = Object.values(h.models_loaded || {}).every(Boolean);
    const v = h.engines?.voices;
    $("dot").className = ok ? "dot ok" : "dot";
    $("engineState").textContent = ok ? `Engine ready · ${v?.online ? "Fish Audio voices" : "offline voices"}` : "Engine loading models…";
    const vr = await fetch(`${settings.engine}/api/voices`, { headers: hdr() });
    if (vr.status === 401) throw new Error("code");
    voices = await vr.json();
    $("start").disabled = !ok;
  } catch (e) {
    $("dot").className = "dot";
    if (String(e?.message) === "code") {
      $("engineState").textContent = "Engine needs its access code (open Engine below)";
      $("start").disabled = true;
      return;
    }
    $("engineState").textContent = "Engine not running — start it with: make serve";
    $("start").disabled = true;
  }
}

function renderCast() {
  const box = $("cast");
  box.innerHTML = "";
  for (let i = 0; i < Math.min(settings.speakers, 4); i++) {
    const sid = `S${i + 1}`;
    const sw = document.createElement("span");
    sw.className = "sw";
    sw.style.background = COLORS[i];
    const sel = document.createElement("select");
    sel.className = "field";
    sel.setAttribute("aria-label", `Voice for commentator ${i + 1}`);
    sel.append(new Option(`Commentator ${i + 1}: automatic`, ""));
    for (const v of voices) sel.append(new Option(`${v.name}${v.custom ? " (your clone)" : ""}`, v.voice_id));
    sel.value = settings.cast[sid] || "";
    sel.onchange = () => { settings.cast[sid] = sel.value || undefined; save(); };
    box.append(sw, sel);
  }
}

let currentTab = null;
chrome.tabs.query({ active: true, currentWindow: true }).then(([t]) => (currentTab = t));
// the side panel must be opened directly in the click (a user gesture), before any await
function openPanel() {
  if (currentTab?.windowId !== undefined) chrome.sidePanel?.open({ windowId: currentTab.windowId }).catch(() => {});
}

async function start() {
  openPanel();
  $("err").style.display = "none";
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || /^(chrome|edge|about):/.test(tab.url || "")) {
    showErr("Open the tab with the live stream first (Chrome's own pages cannot be captured).");
    return;
  }
  const cast = Object.fromEntries(Object.entries(settings.cast).filter(([k, v]) => v && Number(k.slice(1)) <= settings.speakers));
  const res = await chrome.runtime.sendMessage({ type: "start", tabId: tab.id, settings: { ...settings, cast } });
  if (res?.error) showErr(res.error);
  else pollStatus();
}

function showErr(t) {
  $("err").textContent = t;
  $("err").style.display = "block";
}

async function pollStatus() {
  const st = await chrome.runtime.sendMessage({ type: "status" });
  const running = !!st?.mode;
  document.body.classList.toggle("running", running);
  if (running) {
    $("liveMode").textContent = st.mode === "synced" ? "Synced window is running" : "Live overlay on this tab";
    const i = st.info || {};
    $("sSent").textContent = Math.round(i.sentS || 0);
    $("sVoiced").textContent = i.voiced || 0;
    $("sDelay").textContent = i.p50 !== undefined ? `${i.p50.toFixed(1)}s` : "–";
    setTimeout(pollStatus, 1000);
  }
}

$("m-synced").onclick = () => setMode("synced");
$("m-overlay").onclick = () => setMode("overlay");
$("delay").oninput = (e) => { settings.delay = Number(e.target.value); $("delayVal").textContent = `${settings.delay} s`; save(); };
$("speakers").onchange = (e) => { settings.speakers = Number(e.target.value); save(); renderCast(); };
$("engine").onchange = async (e) => { settings.engine = e.target.value.replace(/\/$/, ""); save(); await checkEngine(); renderCast(); };
$("code").onchange = async (e) => { settings.code = e.target.value.trim(); save(); await checkEngine(); renderCast(); };
$("start").onclick = start;
$("panel").onclick = openPanel;
$("stop").onclick = async () => { await chrome.runtime.sendMessage({ type: "stop" }); document.body.classList.remove("running"); };
load();
