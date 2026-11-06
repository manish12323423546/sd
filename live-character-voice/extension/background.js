// Service worker: starts/stops a re-voicing session for a tab.
//  - "synced": opens the viewer window, which captures the tab (picture + sound held back D s)
//  - "overlay": an offscreen document captures the tab's sound; voices play over the live tab
//               and subtitles appear on the page (content.js)
const state = { tabId: null, mode: null, viewerTabId: null, pending: null, info: null };

async function stop() {
  if (state.mode === "overlay") {
    chrome.runtime.sendMessage({ target: "offscreen", type: "offscreen-stop" }).catch(() => {});
    if (state.tabId) chrome.tabs.sendMessage(state.tabId, { type: "lcv-clear" }).catch(() => {});
    setTimeout(() => chrome.offscreen.closeDocument().catch(() => {}), 2500);
  }
  if (state.mode === "synced" && state.viewerTabId) {
    chrome.tabs.sendMessage(state.viewerTabId, { type: "viewer-stop" }).catch(() => {});
  }
  Object.assign(state, { tabId: null, mode: null, viewerTabId: null, pending: null, info: null });
}

async function ensureOffscreen() {
  const has = await chrome.offscreen.hasDocument?.();
  if (has) return;
  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: ["USER_MEDIA"],
    justification: "Capture the tab's audio and play the character voices over it.",
  });
}

async function start({ tabId, settings }) {
  await stop();
  const tab = await chrome.tabs.get(tabId);
  const label = (tab.title || "tab").slice(0, 60);
  if (settings.mode === "synced") {
    const win = await chrome.windows.create({
      url: chrome.runtime.getURL("viewer.html"),
      type: "popup",
      width: 1320,
      height: 860,
    });
    const viewerTabId = win.tabs[0].id;
    const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId, consumerTabId: viewerTabId });
    Object.assign(state, { tabId, mode: "synced", viewerTabId, pending: { streamId, settings, label } });
  } else {
    await ensureOffscreen();
    const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId });
    await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
    Object.assign(state, { tabId, mode: "overlay" });
    await chrome.runtime.sendMessage({ target: "offscreen", type: "offscreen-start", streamId, settings, label });
  }
  return { ok: true };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.target === "offscreen") return false; // for the offscreen document
  switch (msg.type) {
    case "start":
      start(msg).then(sendResponse, (e) => sendResponse({ error: String(e?.message || e) }));
      return true;
    case "stop":
      stop().then(() => sendResponse({ ok: true }));
      return true;
    case "status":
      sendResponse({ mode: state.mode, tabId: state.tabId, info: state.info });
      return false;
    case "viewer-ready":
      sendResponse(state.pending);
      state.pending = null;
      return false;
    case "relay-status":
      state.info = msg.info;
      if (msg.info?.state === "ended" && sender.tab?.id === state.viewerTabId) state.info = msg.info;
      return false;
    case "subtitle":
    case "lcv-subtitles":
      if (state.tabId && state.mode === "overlay") chrome.tabs.sendMessage(state.tabId, msg).catch(() => {});
      return false;
    case "viewer-closed":
      if (state.mode === "synced") Object.assign(state, { tabId: null, mode: null, viewerTabId: null, info: null });
      return false;
    default:
      return false;
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === state.tabId || tabId === state.viewerTabId) stop();
});
