// Verify a replica: status, console errors, failed requests, overflow, hidden elements, screenshots.
// Usage: node verify.js <baseUrl> <outDir> <route> [...routes]   (routes without leading slash, "_" = home)
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const [base, outDir, ...rawRoutes] = process.argv.slice(2);
const routes = rawRoutes.map((a) => (a === '_' ? '/' : '/' + a.replace(/^\/+/, '')));
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium';
const VIEWS = [{ name: 'desktop', width: 1440, height: 900 }, { name: 'narrow', width: 390, height: 844 }];
const slugOf = (p) => (p === '/' ? 'home' : p.replace(/^\//, '').replace(/\//g, '--'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--hide-scrollbars', '--mute-audio', '--no-sandbox', '--disable-dev-shm-usage'] });
  const results = [];
  for (const route of routes) {
    const slug = slugOf(route);
    const res = { route, slug };
    for (const view of VIEWS) {
      const page = await browser.newPage();
      await page.setViewport({ width: view.width, height: view.height, deviceScaleFactor: 1 });
      const consoleErrors = [], failed = [];
      page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
      page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + String(e).slice(0, 200)));
      page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url().slice(0, 160)}`); });
      page.on('requestfailed', (r) => failed.push(`FAILED ${r.url().slice(0, 160)}`));
      const resp = await page.goto(base.replace(/\/$/, '') + route, { waitUntil: 'networkidle2', timeout: 90000 });
      res[`status_${view.name}`] = resp.status();
      await sleep(800);
      // scroll through the page so reveals fire
      await page.evaluate(async () => {
        const step = Math.round(innerHeight * 0.6);
        for (let y = 0; y < document.documentElement.scrollHeight; y += step) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 200)); }
        scrollTo(0, document.documentElement.scrollHeight); await new Promise((r) => setTimeout(r, 1200));
        scrollTo(0, 0); await new Promise((r) => setTimeout(r, 1000));
      });
      const checks = await page.evaluate(() => {
        const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
        const hidden = [];
        document.querySelectorAll('[data-w-id]').forEach((el) => {
          const cs = getComputedStyle(el);
          if (parseFloat(cs.opacity) < 0.05 && vis(el) && cs.display !== 'none') hidden.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ').slice(0, 3).join('.')}`);
        });
        const remote = [...document.querySelectorAll('img[src^="http"], source[src^="http"], video[src^="http"]')].map((e) => e.getAttribute('src'));
        return {
          scrollWidth: document.documentElement.scrollWidth, innerWidth, overflow: document.documentElement.scrollWidth > innerWidth + 1,
          height: document.documentElement.scrollHeight, hiddenCount: hidden.length, hidden: hidden.slice(0, 8), remote: remote.slice(0, 5),
          title: document.title, noindex: document.querySelector('meta[name="robots"]')?.content || '',
          brokenImgs: [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.getAttribute('src')).map((i) => i.getAttribute('src')).slice(0, 5),
        };
      });
      res[view.name] = { ...checks, consoleErrors: [...new Set(consoleErrors)].slice(0, 5), failed: [...new Set(failed)].slice(0, 8) };
      fs.mkdirSync(path.join(outDir, slug), { recursive: true });
      await page.screenshot({ path: path.join(outDir, slug, `${view.name}.png`), fullPage: true });
      await page.close();
    }
    results.push(res);
    const d = res.desktop, n = res.narrow;
    console.log(`${res.route} ${res.status_desktop}/${res.status_narrow} h=${d.height}/${n.height} overflow=${d.overflow}/${n.overflow} hidden=${d.hiddenCount}/${n.hiddenCount} errors=${d.consoleErrors.length}/${n.consoleErrors.length} failed=${d.failed.length}/${n.failed.length} broken=${d.brokenImgs.length}`);
  }
  fs.writeFileSync(path.join(outDir, 'results.json'), JSON.stringify(results, null, 1));
  await browser.close();
})();
