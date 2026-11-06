// Subtitles for "Live overlay" mode: shows the character line on the page while it is spoken.
(() => {
  if (window.__lcvSubs) return;
  window.__lcvSubs = true;
  const box = document.createElement("div");
  box.setAttribute("aria-live", "polite");
  Object.assign(box.style, {
    position: "fixed", left: "50%", bottom: "9%", transform: "translateX(-50%)", zIndex: "2147483647",
    maxWidth: "80vw", padding: "10px 18px", borderRadius: "14px", background: "rgba(6,8,12,.82)",
    color: "#fff", font: "600 clamp(14px,1.7vw,22px)/1.35 Inter,system-ui,sans-serif", textAlign: "center",
    boxShadow: "0 10px 40px rgba(0,0,0,.5)", backdropFilter: "blur(6px)", pointerEvents: "none",
    opacity: "0", transition: "opacity .18s ease",
  });
  const who = document.createElement("span");
  Object.assign(who.style, { marginRight: "10px", fontSize: ".72em", letterSpacing: ".08em", textTransform: "uppercase" });
  const text = document.createElement("span");
  box.append(who, text);
  const mount = () => (document.fullscreenElement || document.body).appendChild(box);
  mount();
  document.addEventListener("fullscreenchange", mount);
  let hideTimer = 0;
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "subtitle") {
      who.textContent = msg.speaker || "";
      who.style.color = msg.color || "#4FA3FF";
      text.textContent = msg.text || "";
      box.style.opacity = "1";
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => (box.style.opacity = "0"), Math.max(1200, (msg.duration || 2) * 1000 + 300));
    } else if (msg.type === "lcv-subtitles") {
      box.style.display = msg.on ? "" : "none";
    } else if (msg.type === "lcv-clear") {
      box.style.opacity = "0";
    }
  });
})();
