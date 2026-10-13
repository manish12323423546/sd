// Stage 1 capture: full-page screenshots, text, asset URLs, component CSS and motion hints per page.
//
// Usage: node capture.js <rawDir> <baseUrl> <route> [<route> ...]
//   Routes are given WITHOUT a leading slash (Git Bash rewrites "/x" into a Windows path).
//   Use "_" for the homepage:   node capture.js raw https://site.framer.app _ about blog/post-1
// Env: CHROME (default: installed Google Chrome), CONCURRENCY (default 3).
// Needs: npm i puppeteer-core@23.11.1  (install it next to this script, not inside the capture folder)
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const [outDir, base, ...rawRoutes] = process.argv.slice(2);
const routes = rawRoutes.map((a) => (a === '_' ? '/' : '/' + a.replace(/^\/+/, '')));
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const CONCURRENCY = Number(process.env.CONCURRENCY || 3);
const VIEWS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'narrow', width: 390, height: 844 },
];
// Framer preview/demo chrome that must not end up in screenshots. #sf-demo-bar is a shadow-DOM
// host with inline !important styles, so CSS hiding does not work: remove the nodes.
const CHROME_SELECTORS = '#__framer-badge-container, #sf-demo-bar, #__framer-editorbar-container, iframe[src*="framer.com/edit"], .w-webflow-badge, a[href*="webflow.com?utm_campaign=brandjs"]';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const slugOf = (p) => (p === '/' ? 'home' : p.replace(/^\//, '').replace(/\//g, '--').replace(/[?=&]/g, '-'));

async function autoScroll(page) {
  await page.evaluate(async () => {
    const step = Math.round(innerHeight * 0.6);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 250));
    }
    scrollTo(0, document.documentElement.scrollHeight);
    await new Promise((r) => setTimeout(r, 800));
    scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 800));
  });
}

async function capturePage(browser, route) {
  const slug = slugOf(route);
  const dir = path.join(outDir, slug);
  fs.mkdirSync(dir, { recursive: true });
  const net = new Map();
  const result = { path: route, slug };

  for (const view of VIEWS) {
    const page = await browser.newPage();
    await page.setViewport({ width: view.width, height: view.height, deviceScaleFactor: 1 });
    page.on('response', (res) => {
      const t = res.request().resourceType();
      const u = res.url();
      if (u.startsWith('data:')) return;
      if (['image', 'media', 'font'].includes(t) || /\.(svg|mp4|webm|mov|woff2?|ttf|otf)(\?|$)/i.test(u)) {
        net.set(u, { url: u, type: t, status: res.status() });
      }
    });
    const resp = await page.goto(base.replace(/\/$/, '') + route, { waitUntil: 'networkidle2', timeout: 90000 });
    result.status = result.status || resp.status();
    await sleep(1500);

    if (view.name === 'desktop') {
      // Motion hints, read before scrolling so reveal-on-scroll elements are still hidden.
      result.anim = await page.evaluate(() => {
        const out = { cssAnimations: [], hiddenBeforeScroll: 0, transformedBeforeScroll: 0 };
        for (const a of document.getAnimations()) {
          const el = a.effect && a.effect.target;
          const name = el && (el.getAttribute('data-framer-name') || el.className || el.tagName);
          const t = a.effect.getTiming();
          out.cssAnimations.push({ name: a.animationName || a.constructor.name, target: String(name).slice(0, 60), duration: t.duration, iterations: t.iterations === Infinity ? null : t.iterations });
        }
        out.cssAnimations = out.cssAnimations.slice(0, 40);
        document.querySelectorAll('[style]').forEach((el) => {
          if (el.getBoundingClientRect().top <= innerHeight) return;
          const s = el.style;
          if (s.opacity !== '' && parseFloat(s.opacity) < 0.05) out.hiddenBeforeScroll++;
          if (s.transform && s.transform !== 'none') out.transformedBeforeScroll++;
        });
        out.appearIds = document.querySelectorAll('[data-framer-appear-id]').length;
        return out;
      });
    }

    await autoScroll(page);

    if (view.name === 'desktop') {
      const dom = await page.evaluate((chromeSel) => {
        document.querySelectorAll(chromeSel).forEach((el) => el.remove());
        const abs = (u) => { try { return new URL(u, location.href).href; } catch { return null; } };
        const urls = new Set();
        document.querySelectorAll('img').forEach((i) => {
          [i.currentSrc, i.src].forEach((u) => u && urls.add(abs(u)));
          (i.srcset || '').split(',').forEach((s) => { const u = s.trim().split(/\s+/)[0]; if (u) urls.add(abs(u)); });
        });
        document.querySelectorAll('video, video source').forEach((v) => { if (v.src) urls.add(abs(v.src)); if (v.poster) urls.add(abs(v.poster)); });
        document.querySelectorAll('*').forEach((el) => {
          const bg = getComputedStyle(el).backgroundImage;
          (bg.match(/url\(["']?([^"')]+)["']?\)/g) || []).forEach((m) => urls.add(abs(m.replace(/^url\(["']?|["']?\)$/g, ''))));
        });

        // Sections: top-level <header>/<section>/<footer> (custom code components), else the
        // children of the Framer page root (descend from #main while there is a single child).
        const named = (el) => el.closest('[data-framer-name]')?.getAttribute('data-framer-name') || el.tagName.toLowerCase();
        let els = [...document.querySelectorAll('header, section, footer')].filter((el) => !el.parentElement.closest('section, header, footer') && el.innerText.trim());
        if (els.length < 3) {
          let root = document.querySelector('#main') || document.body;
          while (root.children.length === 1) root = root.children[0];
          els = [...root.children].filter((el) => el.innerText && el.innerText.trim());
        }
        // Visual order (fixed headers often sit after #main in the DOM).
        const top = (el) => el.getBoundingClientRect().top + scrollY;
        const pinned = (el) => {
          const near = [...el.querySelectorAll('*')].slice(0, 2);
          for (let e = el; e; e = e.parentElement) near.push(e);
          return near.some((x) => ['fixed', 'sticky'].includes(getComputedStyle(x).position)) ? 1 : 0;
        };
        els.sort((a, b) => top(a) - top(b) || pinned(b) - pinned(a));
        const sections = els.map((el) => ({
          name: `${named(el)} (${el.tagName.toLowerCase()}.${String(el.className).split(' ').slice(0, 4).join('.')})`,
          text: el.innerText.trim(),
          links: [...el.querySelectorAll('a[href]')].map((a) => ({ text: a.innerText.trim().replace(/\s+/g, ' '), href: a.getAttribute('href') })),
        }));

        const css = [...document.querySelectorAll('style')].map((s) => s.textContent).filter((t) => t.trim()).join('\n\n');
        const colors = {};
        document.querySelectorAll('body *').forEach((el) => {
          const cs = getComputedStyle(el);
          [cs.color, cs.backgroundColor].forEach((c) => { if (c && c !== 'rgba(0, 0, 0, 0)') colors[c] = (colors[c] || 0) + 1; });
        });
        const all = [...document.querySelectorAll('body *')];
        return {
          css,
          urls: [...urls].filter((u) => u && !u.startsWith('data:')),
          sections,
          title: document.title,
          desc: document.querySelector('meta[name="description"]')?.content || '',
          fonts: [...new Set([...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.weight} ${f.style}`))],
          topColors: Object.entries(colors).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([c]) => c),
          height: document.documentElement.scrollHeight,
          signals: {
            inlineSvgs: document.querySelectorAll('svg').length,
            canvases: document.querySelectorAll('canvas').length,
            videos: document.querySelectorAll('video').length,
            iframes: [...document.querySelectorAll('iframe')].map((f) => f.src).filter(Boolean),
            forms: document.querySelectorAll('form').length,
            sticky: all.filter((el) => ['sticky', 'fixed'].includes(getComputedStyle(el).position)).length,
            hoverTransitions: [...document.querySelectorAll('a, button')].filter((el) => getComputedStyle(el).transitionDuration !== '0s').length,
          },
        };
      }, CHROME_SELECTORS);
      fs.writeFileSync(path.join(dir, 'components.css'), dom.css);
      delete dom.css;
      Object.assign(result, dom);
    }

    await page.evaluate((chromeSel) => document.querySelectorAll(chromeSel).forEach((el) => el.remove()), CHROME_SELECTORS);
    await sleep(300);
    await page.screenshot({ path: path.join(dir, `${view.name}.png`), fullPage: true });
    await page.close();
  }
  result.netAssets = [...net.values()];
  fs.writeFileSync(path.join(dir, 'raw.json'), JSON.stringify(result, null, 2));
  return result;
}

(async () => {
  const queue = [...routes];
  let failed = 0;
  // One browser per worker: tabs sharing a headless browser are backgrounded and full-page
  // screenshots then fail with "Unable to capture screenshot".
  const worker = async () => {
    const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--hide-scrollbars', '--mute-audio', '--no-sandbox', '--disable-dev-shm-usage'] });
    while (queue.length) {
      const route = queue.shift();
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const r = await capturePage(browser, route);
          console.log('ok', route, r.status, `${r.sections.length} sections`, `${r.netAssets.length} net assets`);
          break;
        } catch (e) {
          if (attempt === 2) {
            failed++;
            console.log('FAIL', route, e.message);
          }
        }
      }
    }
    await browser.close();
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, routes.length) }, worker));
  console.log(`done: ${routes.length - failed} ok, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
