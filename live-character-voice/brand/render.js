// Renders every brand / store asset from brand/mark.svg with Playwright (Chromium).
// Usage (from live-character-voice/): node brand/render.js
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MARK = fs.readFileSync(path.join(__dirname, "mark.svg"), "utf8");
const SMALL = fs.readFileSync(path.join(__dirname, "mark-small.svg"), "utf8");
const svg = (s, size) => s.replace(/width="512" height="512"/, `width="${size}" height="${size}"`);
const FONTS = `<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Sora:wght@500;600;700&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">`;
const BASE = `${FONTS}<style>
*{box-sizing:border-box;margin:0}body{background:transparent;font-family:Inter,sans-serif;color:#F4F6FB;-webkit-font-smoothing:antialiased}
.stage{position:relative;overflow:hidden;background:#070910}
.glow{position:absolute;border-radius:50%;filter:blur(70px);opacity:.55}
.wm{font-family:Sora;font-weight:700;letter-spacing:-.03em}
.grad{background:linear-gradient(135deg,#A48BFF,#7C5CFF 45%,#22D3EE);-webkit-background-clip:text;color:transparent}
.card{background:rgba(22,26,38,.78);border:1px solid rgba(255,255,255,.08);border-radius:18px;backdrop-filter:blur(14px);box-shadow:0 30px 60px -30px rgba(0,0,0,.9)}
.chip{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:4px 10px;font-size:12px;font-weight:600}
.mono{font-family:'JetBrains Mono',monospace}
.bar{border-radius:3px;background:linear-gradient(#A48BFF,#22D3EE)}
</style>`;

const wave = (n, h, seed = 3, w = 5) =>
  Array.from({ length: n }, (_, i) => {
    const v = 0.25 + 0.75 * Math.abs(Math.sin(i * 0.9 + seed) * Math.cos(i * 0.37 + seed * 2));
    return `<div class="bar" style="width:${w}px;height:${Math.round(v * h)}px"></div>`;
  }).join("");

const uiCard = (scale = 1) => `
<div class="card" style="width:${520 * scale}px;padding:${22 * scale}px;transform-origin:top left">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:${16 * scale}px">
    <span class="chip" style="background:rgba(255,106,61,.14);color:#FF8A65"><span style="width:7px;height:7px;border-radius:50%;background:#FF6A3D"></span>LIVE · synced 0.4 s</span>
    <span class="mono" style="font-size:${12 * scale}px;color:#8B93A7">67:12</span>
  </div>
  <div style="display:flex;flex-direction:column;gap:${12 * scale}px">
    ${[
      ["Commentator 1", "#7C5CFF", "The Veteran", "He's through on goal — what a run from Tanaka!", "excited"],
      ["Commentator 2", "#22D3EE", "Hype Host", "GOAL! Absolutely unbelievable!", "peak"],
      ["Commentator 1", "#7C5CFF", "The Veteran", "Look at the pace, look at the calm.", "calm"],
    ]
      .map(
        ([spk, c, voice, text, emo], i) => `
    <div style="display:flex;gap:${12 * scale}px;opacity:${i === 2 ? 0.55 : 1}">
      <div style="width:${4 * scale}px;border-radius:4px;background:${c}"></div>
      <div style="flex:1">
        <div style="display:flex;gap:8px;align-items:center;font-size:${12 * scale}px;color:#8B93A7;margin-bottom:4px">
          <b style="color:${c}">${spk}</b> → <span style="color:#F4F6FB">${voice}</span>
          <span class="chip" style="padding:2px 8px;font-size:${10 * scale}px;background:${emo === "peak" ? "rgba(255,106,61,.16)" : emo === "excited" ? "rgba(245,165,36,.16)" : "rgba(52,211,153,.14)"};color:${emo === "peak" ? "#FF8A65" : emo === "excited" ? "#F5B94A" : "#34D399"}">${emo}</span>
        </div>
        <div style="font-size:${15 * scale}px;line-height:1.35">${text}</div>
      </div>
    </div>`,
      )
      .join("")}
  </div>
  <div style="display:flex;align-items:center;gap:4px;height:${44 * scale}px;margin-top:${16 * scale}px">${wave(48, 40 * scale)}</div>
</div>`;

const assets = [
  // extension + store icons (Chrome: 128 icon = 96 px artwork + 16 px transparent padding)
  ...[16, 32, 48].map((s) => ({ out: `extension/icons/icon${s}.png`, w: s, h: s, html: svg(s <= 16 ? SMALL : MARK, s) })),
  { out: "extension/icons/icon128.png", w: 128, h: 128, html: `<div style="padding:8px">${svg(MARK, 112)}</div>` },
  { out: "extension-store/store-icon-128.png", w: 128, h: 128, html: `<div style="padding:16px">${svg(MARK, 96)}</div>` },
  { out: "web/public/favicon.svg", copy: "brand/mark.svg" },
  { out: "web/public/icon-512.png", w: 512, h: 512, html: svg(MARK, 512) },
  { out: "brand/mark-1024.png", w: 1024, h: 1024, html: svg(MARK, 1024) },
  {
    out: "brand/wordmark-dark.png", w: 1240, h: 300, bg: true,
    html: `<div class="stage" style="width:1240px;height:300px;display:flex;align-items:center;gap:44px;padding:0 40px">${svg(MARK, 220)}<span class="wm" style="font-size:150px">altercast</span></div>`,
  },
  {
    out: "brand/wordmark-light.png", w: 1240, h: 300,
    html: `<div style="width:1240px;height:300px;display:flex;align-items:center;gap:44px;padding:0 40px;background:#fff">${svg(MARK, 220)}<span class="wm" style="font-size:150px;color:#0B0D14">altercast</span></div>`,
  },
  // Chrome Web Store promo tiles
  {
    out: "extension-store/promo-small-440x280.png", w: 440, h: 280,
    html: `<div class="stage" style="width:440px;height:280px;padding:30px">
      <div class="glow" style="width:300px;height:300px;background:#5B4BFF;left:-80px;top:-120px"></div>
      <div class="glow" style="width:260px;height:260px;background:#16C7D9;right:-90px;bottom:-130px;opacity:.45"></div>
      <div style="position:relative;display:flex;align-items:center;gap:14px">${svg(MARK, 58)}<span class="wm" style="font-size:40px">altercast</span></div>
      <div style="position:relative;margin-top:22px;font-family:Sora;font-weight:600;font-size:26px;line-height:1.15;letter-spacing:-.02em">Any commentary.<br>Any character. <span class="grad">Live.</span></div>
      <div style="position:relative;display:flex;align-items:flex-end;gap:3px;height:34px;margin-top:22px">${wave(54, 34, 5, 4)}</div>
    </div>`,
  },
  {
    out: "extension-store/marquee-1400x560.png", w: 1400, h: 560,
    html: `<div class="stage" style="width:1400px;height:560px;padding:80px 90px;display:flex;justify-content:space-between;align-items:center">
      <div class="glow" style="width:620px;height:620px;background:#5B4BFF;left:-200px;top:-260px"></div>
      <div class="glow" style="width:520px;height:520px;background:#16C7D9;right:-120px;bottom:-300px;opacity:.4"></div>
      <div class="glow" style="width:360px;height:360px;background:#8A6BFF;right:380px;top:-200px;opacity:.3"></div>
      <div style="position:relative;max-width:620px">
        <div style="display:flex;align-items:center;gap:20px">${svg(MARK, 84)}<span class="wm" style="font-size:64px">altercast</span></div>
        <div style="margin-top:36px;font-family:Sora;font-weight:600;font-size:56px;line-height:1.08;letter-spacing:-.03em">Any commentary.<br>Any character. <span class="grad">Live.</span></div>
        <div style="margin-top:22px;font-size:20px;color:#AAB2C5;line-height:1.5">Re-voice live sports commentary in character voices — in sync with the picture, crowd kept, in any browser tab.</div>
      </div>
      <div style="position:relative">${uiCard(1)}</div>
    </div>`,
  },
  {
    out: "brand/og-1200x630.png", w: 1200, h: 630,
    html: `<div class="stage" style="width:1200px;height:630px;padding:90px;display:flex;flex-direction:column;justify-content:center">
      <div class="glow" style="width:600px;height:600px;background:#5B4BFF;left:-200px;top:-250px"></div>
      <div class="glow" style="width:500px;height:500px;background:#16C7D9;right:-150px;bottom:-280px;opacity:.4"></div>
      <div style="position:relative;display:flex;align-items:center;gap:20px">${svg(MARK, 88)}<span class="wm" style="font-size:68px">altercast</span></div>
      <div style="position:relative;margin-top:40px;font-family:Sora;font-weight:600;font-size:64px;line-height:1.06;letter-spacing:-.03em">Any commentary.<br>Any character. <span class="grad">Live.</span></div>
    </div>`,
  },
];

(async () => {
  const only = process.argv[2];
  const b = await chromium.launch();
  for (const a of assets) {
    if (only && !a.out.includes(only)) continue;
    const out = path.join(ROOT, a.out);
    if (a.copy) {
      fs.copyFileSync(path.join(ROOT, a.copy), out);
      continue;
    }
    const p = await b.newPage({ viewport: { width: a.w, height: a.h }, deviceScaleFactor: 1 });
    await p.setContent(`<!doctype html><html><head>${BASE}</head><body>${a.html}</body></html>`, { waitUntil: "networkidle" });
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: out, omitBackground: !a.bg, clip: { x: 0, y: 0, width: a.w, height: a.h } });
    await p.close();
    console.log("wrote", a.out);
  }
  await b.close();
})();
