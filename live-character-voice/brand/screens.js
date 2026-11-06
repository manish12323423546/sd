// Composes the 4 Chrome Web Store screenshots (1280x800) from raw captures of the real app.
// Usage (from live-character-voice/): node brand/screens.js <raw dir with viewer.png sidepanel.png popup.png app_studio.png app_lab.png>
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const RAW = path.resolve(process.argv[2]);
const img = (f) => `data:image/png;base64,${fs.readFileSync(path.join(RAW, f)).toString("base64")}`;
const MARK = fs.readFileSync(path.join(__dirname, "mark.svg"), "utf8").replace(/width="512" height="512"/, 'width="34" height="34"');
const HEAD = `<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=Sora:wght@600;700&display=swap" rel="stylesheet"><style>
*{box-sizing:border-box;margin:0}body{width:1280px;height:800px;overflow:hidden;background:#070910;color:#F4F6FB;font-family:Inter;-webkit-font-smoothing:antialiased;position:relative}
.glow{position:absolute;border-radius:50%;filter:blur(80px)}
.top{position:absolute;left:64px;top:52px;right:64px;display:flex;justify-content:space-between;align-items:flex-start}
h1{font-family:Sora;font-weight:700;font-size:42px;letter-spacing:-.03em;line-height:1.08}
.grad{background:linear-gradient(135deg,#B9A8FF,#7C5CFF 45%,#22D3EE);-webkit-background-clip:text;color:transparent}
p{margin-top:12px;font-size:17px;color:#AAB2C5;max-width:640px;line-height:1.45}
.logo{display:flex;align-items:center;gap:10px;font-family:Sora;font-weight:700;font-size:22px;letter-spacing:-.03em}
.shot{position:absolute;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,.1);box-shadow:0 40px 90px -30px rgba(0,0,0,.9),0 0 0 1px rgba(124,92,255,.15)}
.shot img{display:block;width:100%}
</style>`;
const frame = (title, sub, body) => `${HEAD}
<div class="glow" style="width:640px;height:640px;background:#5B4BFF;opacity:.45;left:-220px;top:-300px"></div>
<div class="glow" style="width:560px;height:560px;background:#16C7D9;opacity:.25;right:-200px;bottom:-320px"></div>
<div class="top"><div><h1>${title}</h1><p>${sub}</p></div><div class="logo">${MARK}altercast</div></div>${body}`;

const shots = [
  ["screenshot-1.png", frame("Any commentary. Any character. <span class='grad'>Live.</span>",
    "Every line re-spoken in the character you cast — exactly when the commentator speaks.",
    `<div class="shot" style="left:180px;top:200px;width:920px"><img src="${img("viewer.png")}"></div>`)],
  ["screenshot-2.png", frame("Know who's speaking. <span class='grad'>Live.</span>",
    "Up to 8 commentators found automatically, each with their own voice. Transcript, emotion and controls in the side panel.",
    `<div class="shot" style="left:250px;top:228px;width:300px"><img src="${img("popup.png")}"></div>
     <div class="shot" style="left:600px;top:228px;width:330px;height:560px"><img src="${img("sidepanel.png")}"></div>`)],
  ["screenshot-3.png", frame("Cast the voices. <span class='grad'>Press play.</span>",
    "Pick footage, choose a character for each commentator, and watch it re-voiced in sync.",
    `<div class="shot" style="left:150px;top:210px;width:980px"><img src="${img("app_studio.png")}"></div>`)],
  ["screenshot-4.png", frame("Measured, <span class='grad'>not guessed.</span>",
    "The built-in Quality Lab scores delay, words, speakers and emotion on real test matches.",
    `<div class="shot" style="left:150px;top:210px;width:980px"><img src="${img("app_lab.png")}"></div>`)],
];

(async () => {
  const b = await chromium.launch();
  for (const [name, html] of shots) {
    const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
    await p.setContent(`<!doctype html><html><head></head><body>${html}</body></html>`, { waitUntil: "networkidle" });
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(ROOT, "extension-store", name) });
    await p.close();
    console.log("wrote", name);
  }
  await b.close();
})();
