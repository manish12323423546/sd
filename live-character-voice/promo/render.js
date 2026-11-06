// Renders promo/promo.html frame by frame (window.render(t)) to JPEGs for ffmpeg.
// Usage (from live-character-voice/): node promo/render.js <frames dir> [fps=30] [seconds=50] [only t]
const { chromium } = require("playwright");
const path = require("path");
(async () => {
  const [dir, fps = 30, secs = 50, only] = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await p.goto("file://" + path.resolve(__dirname, "promo.html"), { waitUntil: "networkidle" });
  await p.evaluate(() => document.fonts.ready);
  const times = only !== undefined ? [Number(only)] : Array.from({ length: Math.round(secs * fps) }, (_, i) => i / fps);
  for (let i = 0; i < times.length; i++) {
    await p.evaluate((t) => window.render(t), times[i]);
    const name = only !== undefined ? `still_${only}.png` : `f${String(i).padStart(5, "0")}.jpg`;
    await p.screenshot(name.endsWith("png") ? { path: path.join(dir, name) } : { path: path.join(dir, name), type: "jpeg", quality: 92 });
  }
  await b.close();
})();
