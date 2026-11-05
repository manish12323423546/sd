// E2E smoke test (docs/07 §7.8), headless Chromium via Playwright.
// Expects the API (serving the built web app) on BASE (default http://localhost:8000).
// 1. open Home with ?speed=SPEED (dev only), pick the clip, start a session
// 2. click "Start live playback", wait for ≥ 5 transcript lines
// 3. switch a commentator's voice and assert a `set_voice` message was sent over the WebSocket
// 4. screenshot → outputs/ui/player.png, screen recording → outputs/ui/session.webm
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const BASE = process.env.BASE ?? "http://localhost:8000";
const CLIP = process.env.CLIP ?? "synthetic_match_3spk.mp4";
const SPEED = process.env.SPEED ?? "1";
const SPEAKERS = process.env.SPEAKERS ?? "3";
const WATCH_S = Number(process.env.WATCH_S ?? "40");
const OUT = path.resolve(process.env.OUT ?? "../outputs/ui");
fs.mkdirSync(OUT, { recursive: true });

const fail = (msg) => {
  console.error(`SMOKE FAIL: ${msg}`);
  process.exit(1);
};

const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: OUT, size: { width: 1440, height: 900 } },
});
const page = await context.newPage();
const sent = [];
const received = [];
page.on("websocket", (ws) => {
  ws.on("framesent", (f) => sent.push(String(f.payload)));
  ws.on("framereceived", (f) => received.push(String(f.payload)));
});
page.on("pageerror", (e) => console.error("page error:", e.message));

await page.goto(`${BASE}/?speed=${SPEED}`);
await page.getByTestId("clips").waitFor();
// the clip card (a label) wraps a visually hidden radio input
await page.locator("label", { has: page.locator(`input[value="${CLIP}"]`) }).click();
await page.getByLabel("Max commentators").selectOption(SPEAKERS);
await page.waitForFunction(() => {
  const b = document.querySelector('[data-testid="start-session"]');
  return b && !b.hasAttribute("disabled");
}, null, { timeout: 120_000 });
await page.getByTestId("start-session").click();
await page.waitForURL(/\/session\//);
await page.getByTestId("start-live").click({ timeout: 30_000 });

await page.waitForFunction(
  () => document.querySelectorAll('[data-testid="transcript"] li').length >= 5,
  null,
  { timeout: 180_000 },
);
const firstSelect = page.locator('select[aria-label^="Voice for"]').first();
const current = await firstSelect.inputValue();
const options = await firstSelect.locator("option").evaluateAll((os) => os.map((o) => o.value));
const target = options.find((v) => v !== current);
if (!target) fail("no alternative voice to switch to");
await firstSelect.selectOption(target);
await page.waitForTimeout(1000);
const switched = sent.some((s) => s.includes('"set_voice"') && s.includes(target));
if (!switched) fail("set_voice was not sent");

// let the session play on so the recording shows lines arriving and voices playing
await page.waitForTimeout(WATCH_S * 1000);
await page.screenshot({ path: path.join(OUT, "player.png") });

const lines = await page.locator('[data-testid="transcript"] li').count();
const audioReady = received.filter((r) => r.includes('"audio.ready"')).length;
const videoTime = await page.evaluate(() => document.querySelector("video")?.currentTime ?? -1);
const videoPath = await page.video()?.path();
await context.close();
await browser.close();
if (videoPath && fs.existsSync(videoPath)) fs.renameSync(videoPath, path.join(OUT, "session.webm"));

const summary = { lines, audioReady, switchedTo: target, videoTime, sentTypes: [...new Set(sent.map((s) => JSON.parse(s).type))] };
fs.writeFileSync(path.join(OUT, "smoke.json"), JSON.stringify(summary, null, 2));
console.log("SMOKE OK", JSON.stringify(summary));
