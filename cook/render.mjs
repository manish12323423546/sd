// Renders reference-shot stills headlessly.
// usage: node render.mjs <outDir> [w] [h] [shotIndices comma-separated]
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.dirname(new URL(import.meta.url).pathname);
const out = path.resolve(process.argv[2] || 'frames');
const w = +(process.argv[3] || 1280), h = +(process.argv[4] || 720);
const only = process.argv[5] ? process.argv[5].split(',').map(Number) : null;
fs.mkdirSync(out, { recursive: true });

const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(0);
const port = server.address().port;

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text().slice(0, 400)); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));

const { SHOTS } = await import('./src/shots.js');
const idx = only || SHOTS.map((_, i) => i);
const t0 = Date.now();
await page.goto(`http://localhost:${port}/index.html?shot=${idx[0]}&w=${w}&h=${h}`);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 600000 });
console.log('scene built in', ((Date.now() - t0) / 1000).toFixed(1), 's');
for (const i of idx) {
  const t1 = Date.now();
  await page.evaluate(async (i) => {
    const s = window.__scene;
    s.applyShot(i);
    s.setTime(12.0);
    s.render();
    s.render();
  }, i);
  const file = path.join(out, `${SHOTS[i].name}.png`);
  const data = await page.evaluate(() => window.__scene.renderer.domElement.toDataURL('image/png'));
  fs.writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'));
  console.log('shot', SHOTS[i].name, ((Date.now() - t1) / 1000).toFixed(1), 's');
}
await browser.close();
server.close();
