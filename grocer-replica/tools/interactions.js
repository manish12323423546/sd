// Interaction checks against a running replica. Usage: node interactions.js <baseUrl> <outDir>
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const [base, outDir] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = {};

(async () => {
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium', headless: true, args: ['--no-sandbox', '--hide-scrollbars'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(base + '/', { waitUntil: 'networkidle2' });
  await sleep(1500);

  // 1. header dropdown hover (Pages)
  const dd = (await page.$$('.display-show-for-desktop .header-dropdown'))[1];
  await dd.hover();
  await sleep(700);
  results.dropdown = await page.evaluate(() => {
    const dd = document.querySelectorAll('.display-show-for-desktop .header-dropdown')[1];
    const list = dd.querySelector('.w-dropdown-list');
    const cs = getComputedStyle(list);
    return { open: list.classList.contains('w--open'), display: cs.display, opacity: cs.opacity, linksVisible: [...list.querySelectorAll('a')].filter((a) => a.getBoundingClientRect().height > 0).length };
  });
  await page.screenshot({ path: path.join(outDir, '1-dropdown.png') });
  await page.mouse.move(10, 500);
  await sleep(900);
  results.dropdownClosed = await page.evaluate(() => { const l = document.querySelectorAll('.display-show-for-desktop .header-dropdown')[1].querySelector('.w-dropdown-list'); return { open: l.classList.contains('w--open'), display: getComputedStyle(l).display }; });

  // 2. slider: click second dot
  await page.evaluate(() => document.querySelector('.home-hero-slider')?.scrollIntoView({ block: 'center' }));
  await sleep(600);
  await page.click('.home-hero-slider .w-slider-arrow-right');
  await sleep(700);
  results.slider = await page.evaluate(() => {
    const slides = [...document.querySelectorAll('.home-hero-slider .w-slide')];
    const dots = [...document.querySelectorAll('.home-hero-slider .w-slider-dot')];
    return { dots: dots.length, activeDot: dots.findIndex((d) => d.classList.contains('w-active')), transforms: slides.map((s) => s.style.transform), firstHidden: slides[0].getAttribute('aria-hidden') };
  });
  await page.screenshot({ path: path.join(outDir, '2-slider.png') });

  // 3. product card hover reveals the cart button
  const card = await page.$('.home-product-section .product-card, .home-product-section [data-w-id] .product-image');
  await page.evaluate(() => document.querySelector('.home-product-section')?.scrollIntoView({ block: 'start' }));
  await sleep(800);
  const productLink = await page.$('.home-product-section .product-card[data-w-id], .home-product-section [data-w-id]:has(> .product-cart-button), .home-product-section .product-item [data-w-id]');
  if (productLink) { await productLink.hover(); await sleep(700); }
  results.productHover = await page.evaluate(() => {
    const el = document.querySelector('.home-product-section .product-card[data-w-id], .home-product-section [data-w-id]:has(> .product-cart-button), .home-product-section .product-item [data-w-id]');
    const btn = el?.querySelector('.product-cart-button');
    const img = el?.querySelector('.product-image');
    return { btn: btn?.style.transform, img: img?.style.transform };
  });
  await page.screenshot({ path: path.join(outDir, '3-product-hover.png') });
  void card;

  // 4. FAQ tabs + accordion on home
  await page.evaluate(() => document.querySelector('.faq-tabs')?.scrollIntoView({ block: 'center' }));
  await sleep(800);
  await page.click('.faq-tabs .w-tab-link:nth-child(2)');
  await sleep(600);
  const faqQ = await page.$('.faq-tabs .w-tab-pane.w--tab-active .w-dropdown-toggle');
  await faqQ.click();
  await sleep(700);
  results.faq = await page.evaluate(() => {
    const pane = document.querySelector('.faq-tabs .w-tab-pane.w--tab-active');
    const dd = pane.querySelector('.w-dropdown');
    const ans = dd.querySelector('.w-dropdown-list');
    const hiddenInPane = [...pane.querySelectorAll('[data-w-id]')].filter((e) => parseFloat(getComputedStyle(e).opacity) < 0.05 && e.getBoundingClientRect().height > 0).length;
    return { activeTab: pane.getAttribute('data-w-tab'), open: ans.classList.contains('w--open'), height: ans.getBoundingClientRect().height, icon: dd.querySelector('.faq-question-icon')?.style.transform, hiddenInPane };
  });
  await page.screenshot({ path: path.join(outDir, '4-faq.png') });

  // 5. cart modal
  await page.evaluate(() => scrollTo(0, 0));
  await sleep(600);
  await page.click('.display-show-for-desktop .w-commerce-commercecartopenlink');
  await sleep(500);
  results.cart = await page.evaluate(() => {
    const m = document.querySelector('.display-show-for-desktop .w-commerce-commercecartcontainerwrapper');
    return { display: m.style.display, note: m.querySelector('.demo-cart-note')?.textContent, emptyVisible: m.querySelector('.w-commerce-commercecartemptystate')?.getBoundingClientRect().height };
  });
  await page.screenshot({ path: path.join(outDir, '5-cart.png') });
  await page.click('.display-show-for-desktop .w-commerce-commercecartcloselink');
  await sleep(300);
  results.cartClosed = await page.evaluate(() => document.querySelector('.display-show-for-desktop .w-commerce-commercecartcontainerwrapper').style.display);

  // 6. contact form submit
  await page.goto(base + '/contact-us', { waitUntil: 'networkidle2' });
  await sleep(1200);
  await page.type('#wf-form-Contact-Us #name', 'Replica Test');
  await page.type('#wf-form-Contact-Us input[type="email"]', 'test@example.com');
  await page.type('#wf-form-Contact-Us #Phone', '1234567890');
  await page.type('#wf-form-Contact-Us #Message', 'Checking the demo form.');
  results.formNoteBefore = await page.evaluate(() => document.querySelector('#wf-form-Contact-Us .demo-form-note')?.textContent);
  await page.evaluate(() => document.querySelector('#wf-form-Contact-Us input[type="submit"]').scrollIntoView({ block: 'center' }));
  await sleep(400);
  await page.click('#wf-form-Contact-Us input[type="submit"]');
  await sleep(800);
  results.form = await page.evaluate(() => ({ note: document.querySelector('#wf-form-Contact-Us .demo-form-note')?.textContent, toast: document.querySelector('.demo-toast')?.textContent, done: getComputedStyle(document.querySelector('.contact-success')).display, url: location.href }));
  await page.screenshot({ path: path.join(outDir, '6-form.png') });

  // 7. product page: add to cart
  await page.goto(base + '/product/basmati-rice-5kg', { waitUntil: 'networkidle2' });
  await sleep(1200);
  await page.click('.w-commerce-commerceaddtocartbutton');
  await sleep(600);
  results.addToCart = await page.evaluate(() => ({ toast: document.querySelector('.demo-toast')?.textContent, count: document.querySelector('.header-cart-quantity')?.textContent }));
  // product accordion
  const acc = await page.$('.product-faq-drop');
  const accToggle = await page.$('.product-faq .w-dropdown-toggle, .product-faq-question, [class*="product-faq"] .w-dropdown-toggle');
  if (accToggle) { await accToggle.click(); await sleep(600); }
  results.productAccordion = await page.evaluate(() => { const l = document.querySelector('.product-faq-drop'); return l ? { open: l.classList.contains('w--open'), height: l.getBoundingClientRect().height } : null; });
  void acc;
  await page.screenshot({ path: path.join(outDir, '7-product.png') });

  // 8. shop category dropdown + pagination
  await page.goto(base + '/shop', { waitUntil: 'networkidle2' });
  await sleep(1000);
  await page.click('.shop-drop .w-dropdown-toggle');
  await sleep(600);
  results.shopDrop = await page.evaluate(() => { const l = document.querySelector('.shop-nav'); return { open: l.classList.contains('w--open'), height: l.getBoundingClientRect().height }; });
  await page.screenshot({ path: path.join(outDir, '8-shop.png') });
  await page.evaluate(() => document.querySelector('.w-pagination-next')?.scrollIntoView({ block: 'center' }));
  await sleep(300);
  await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}), page.click('.w-pagination-next')]);
  await sleep(1200);
  results.shopPage2 = await page.evaluate(() => ({ url: location.href, products: document.querySelectorAll('a[href^="/product/"]').length, hidden: [...document.querySelectorAll('[data-w-id]')].filter((e) => parseFloat(getComputedStyle(e).opacity) < 0.05 && e.getBoundingClientRect().top < innerHeight && e.getBoundingClientRect().height > 0).length }));
  await page.screenshot({ path: path.join(outDir, '9-shop-page2.png') });

  // 9. narrow: mobile menu
  await page.setViewport({ width: 390, height: 844 });
  await page.goto(base + '/', { waitUntil: 'networkidle2' });
  await sleep(1200);
  await page.click('.header-menu-button');
  await sleep(900);
  results.mobileMenu = await page.evaluate(() => { const w = document.querySelector('.header-menu-wrap'); const r = w.getBoundingClientRect(); return { transform: w.style.transform, top: r.top, linksVisible: [...w.querySelectorAll('a')].filter((a) => a.getBoundingClientRect().height > 0).length }; });
  await page.screenshot({ path: path.join(outDir, '10-mobile-menu.png') });
  await page.click('.header-menu-button');
  await sleep(1200);
  results.mobileMenuClosed = await page.evaluate(() => document.querySelector('.header-menu-wrap').style.transform);

  // 10. client-side navigation keeps interactions alive
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(base + '/about-us', { waitUntil: 'networkidle2' });
  await sleep(800);
  await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}), page.click('.display-show-for-desktop a[href="/blog"]')]);
  await sleep(1500);
  await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 150)); } });
  await sleep(1200);
  results.clientNav = await page.evaluate(() => ({ url: location.href, hidden: [...document.querySelectorAll('[data-w-id]')].filter((e) => parseFloat(getComputedStyle(e).opacity) < 0.05 && e.getBoundingClientRect().height > 0).length, current: document.querySelector('.header-section a.w--current')?.getAttribute('href') }));

  results.errors = [...new Set(errors)];
  console.log(JSON.stringify(results, null, 1));
  await browser.close();
})();
