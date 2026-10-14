// Rebrand transform: turns the captured Grocer template pages into Hare Krishna Supermarket pages.
// Used by tools/convert.js on each cheerio document before it is serialised. All copy comes from
// rebrand/content.json; nothing here invents facts.
const path = require('path');
const fs = require('fs');
const C = JSON.parse(fs.readFileSync(path.join(__dirname, 'content.json'), 'utf8'));

const B = C.brand;
const norm = (s) => s.replace(/[\s\u00a0]+/g, ' ').trim();
const DICT = Object.fromEntries(Object.entries(C.text).map(([k, v]) => [norm(k), v]));
const catByOld = Object.fromEntries(C.categories.map((c) => [c.old, c]));
const catBySlug = Object.fromEntries(C.categories.map((c) => [c.slug, c]));
const postByOld = Object.fromEntries(C.blog.map((p) => [p.old, p]));
const reviewByOld = Object.fromEntries(C.reviews.map((r) => [r.old, r]));

// Old product slug -> new product. Old products are assigned per category, in the order the
// template lists them (see tools/convert.js: product pages carry their category link).
const OLD_PRODUCTS = {
  vegetables: ['tomato', 'potato', 'carrot', 'cabbage', 'spinach', 'onion'],
  fruits: ['fresh-green-apple', 'orange', 'kiwi', 'strawberry', 'sundrops-mango', 'purple-grapes'],
  meat: ['mutton', 'beef', 'chicken', 'duckling', 'turke', 'camel-meat'],
  'cooking-items': ['premium-soybean-oil', 'natural-butter', 'wheat-flour', 'pure-salt', 'turmeric-powder', 'mustard-oil'],
  beverage: ['cola-drink', 'lemon-soda', 'mango-juice', 'energy-drink', 'instant-coffee-powder', 'bottled-water'],
  'beauty-product': ['face-cream', 'shampoo', 'conditioner', 'lip-balm', 'body-lotion', 'hand-wash'],
};
const productByOld = {};
for (const [oldCat, olds] of Object.entries(OLD_PRODUCTS)) {
  const cat = catByOld[oldCat];
  const list = C.products[cat.slug];
  olds.forEach((o, i) => { productByOld[o] = { ...list[i % list.length], category: cat }; });
}

const money = (n) => '₹ ' + n.toLocaleString('en-IN');
const pct = (p) => Math.round((1 - p.price / p.mrp) * 100);

function newSlug(slug) {
  // page file slug -> new page slug (routes)
  let m;
  if ((m = slug.match(/^product--(.+)$/))) return productByOld[m[1]] ? `product--${productByOld[m[1]].slug}` : slug;
  if ((m = slug.match(/^category--([a-z-]+?)(-[0-9a-f]{8}_page-\d+)?$/))) return catByOld[m[1]] ? `category--${catByOld[m[1]].slug}${m[2] || ''}` : slug;
  if ((m = slug.match(/^blog--(.+)$/))) return postByOld[m[1]] ? `blog--${postByOld[m[1]].slug}` : slug;
  return slug;
}

function newHref(h) {
  if (!h) return h;
  let m;
  if ((m = h.match(/^\/product\/([a-z0-9-]+)(.*)$/))) return productByOld[m[1]] ? `/product/${productByOld[m[1]].slug}${m[2]}` : h;
  if ((m = h.match(/^\/category\/([a-z0-9-]+)(.*)$/))) return catByOld[m[1]] ? `/category/${catByOld[m[1]].slug}${m[2]}` : h;
  if ((m = h.match(/^\/blog\/([a-z0-9-]+)(.*)$/))) return postByOld[m[1]] ? `/blog/${postByOld[m[1]].slug}${m[2]}` : h;
  if (h.startsWith('tel:') ) return B.maps.virpur;
  if (h.startsWith('mailto:')) return B.maps.lalsar;
  if (/maps\.app\.goo\.gl|google\.com\/maps/.test(h)) return B.maps.virpur;
  if (/instagram\.com/.test(h)) return B.instagram;
  return h;
}

function setImg($img, spec, alt) {
  const [src, widths] = Array.isArray(spec) ? spec : [spec, null];
  const base = src.replace(/\.(webp|jpg|png)$/, '');
  const ext = src.split('.').pop();
  $img.attr('src', src);
  if (alt !== undefined) $img.attr('alt', alt);
  if (widths && widths.length > 1) {
    $img.attr('srcset', widths.map((w, i) => `${i === 0 ? src : `${base}-p-${w}.${ext}`} ${w}w`).join(', '));
    // Card images render at about 80vw on phones, 42vw on tablets and 400px on desktop (measured),
    // so the browser can pick the 500/800 variants instead of the full-size file.
    $img.attr('sizes', '(max-width: 767px) 80vw, (max-width: 991px) 42vw, 400px');
  } else {
    $img.removeAttr('srcset');
  }
}
const productImg = (p) => [`/brand/products/${p.slug}.webp`, [1400, 800, 500]];
const categoryImg = (c) => [`/brand/categories/${c.slug}.webp`, [1548, 774, 500]];
const blogImg = (p) => [`/brand/blog/${p.slug}.webp`, [1900, 1000, 500]];

function setText($, el, text) {
  // replace the element's own text while keeping child elements (used for simple leaf nodes)
  const $el = $(el);
  if ($el.children().length === 0) $el.text(text);
  else {
    const t = $el.contents().filter((i, n) => n.type === 'text');
    if (t.length) { t.first().replaceWith(text); t.slice(1).remove(); } else $el.text(text);
  }
}

function apply($, slug, opts = {}) {
  const dict = DICT;
  const isHome = slug === 'home' || slug === 'home-02';

  // ---- links ----
  $('a[href]').each((i, a) => { $(a).attr('href', newHref($(a).attr('href'))); });

  // ---- logos ----
  $('img.brand-logo').each((i, img) => { setImg($(img), '/brand/logo-horizontal.png', B.logoName); $(img).removeAttr('srcset'); $(img).attr('width', '678').attr('height', '251'); });

  // ---- product cards ----
  $('.product-card').each((i, card) => {
    const $c = $(card);
    const link = $c.find('a.product-image-link, a.product-name').first().attr('href') || '';
    const m = link.match(/\/product\/([a-z0-9-]+)/);
    const p = m && Object.values(productByOld).find((x) => x.slug === m[1]);
    if (!p) return;
    $c.find('.product-offer').text(`(${pct(p)}% off)`);
    $c.find('img.product-image').each((k, img) => setImg($(img), productImg(p), p.name));
    $c.find('.product-name').text(p.name);
    $c.find('.product-unit').text(p.unit);
    $c.find('.product-main-price').text(money(p.price));
    $c.find('.product-com-price').text(money(p.mrp));
  });

  // ---- product detail page ----
  let pm = slug.match(/^product--(.+)$/);
  if (pm && productByOld[pm[1]]) {
    const p = productByOld[pm[1]];
    $('h2.product-heading').text(p.name);
    $('.product-details-block .wrapper-link').each((i, a) => { $(a).attr('href', `/category/${p.category.slug}`).text(p.category.name); });
    const wraps = $('.product-amount-wrap');
    wraps.each((i, w) => {
      const hs = $(w).find('h3');
      hs.eq(0).text(i === 0 ? money(p.price) : `MRP ${money(p.mrp)}`);
      hs.eq(1).text(i === 0 ? `/ ${p.unit}` : '');
    });
    $('.product-descrip p').first().html(`<strong>Description:</strong> ${p.description}`);
    $('img.product-thubm').each((i, img) => setImg($(img), productImg(p), p.name));
    const drops = $('.product-faq-drop');
    drops.eq(0).find('.product-faq-except').html(C.productCopy.availability);
    drops.eq(1).find('.product-faq-except').html(C.productCopy.returns);
    $('.product-faq-text').each((i, el) => { $(el).text(i === 0 ? C.productCopy.availabilityTitle : C.productCopy.returnTitle); });
    $('title').text(`${p.name} (${p.unit}) | ${C.seo.titleSuffix}`);
    $('meta[name="description"]').attr('content', `${p.name}, ${p.unit}: ${p.description} Available at Hare Krishna Mall, Virpur and Lalsar.`);
  }

  // ---- category images and copy (hero cards, category cards, offer slides) ----
  $('a[href^="/category/"]').each((i, a) => {
    const m = $(a).attr('href').match(/^\/category\/([a-z0-9-]+)/);
    const c = m && catBySlug[m[1]];
    if (!c) return;
    $(a).find('img').each((k, img) => { if (/home-hero-img|home-category-image|home-slider-image|category-image/.test($(img).attr('class') || '')) setImg($(img), categoryImg(c), c.name); });
  });
  $('.home-slider-card').each((i, card) => {
    const h = $(card).find('a[href^="/category/"]').attr('href') || '';
    const c = catBySlug[(h.match(/^\/category\/([a-z0-9-]+)/) || [])[1]];
    if (c) { $(card).find('img.home-slider-image').each((k, img) => setImg($(img), categoryImg(c), c.name)); $(card).find('.home-slider-title').text(c.offer); }
  });
  let cm = slug.match(/^category--([a-z-]+?)(-[0-9a-f]{8}_page-\d+)?$/);
  if (cm && catByOld[cm[1]]) {
    const c = catByOld[cm[1]];
    $('title').text(`${c.name} | ${C.seo.titleSuffix}`);
    $('meta[name="description"]').attr('content', `${c.name} at Hare Krishna Mall, Virpur and Lalsar: ${c.excerpt}`);
  }

  // ---- blog cards and post pages ----
  $('a[href^="/blog/"]').each((i, a) => {
    const m = $(a).attr('href').match(/^\/blog\/([a-z0-9-]+)/);
    const post = m && C.blog.find((p) => p.slug === m[1]);
    if (!post) return;
    $(a).find('img').each((k, img) => setImg($(img), blogImg(post), post.title));
    if ($(a).hasClass('blog-name') || $(a).hasClass('home-blog-name') || /name|title/.test($(a).attr('class') || '')) { if ($(a).children().length === 0) $(a).text(post.title); }
    // date / read time inside the same card
    const card = $(a).closest('.w-dyn-item');
    if (card.length) {
      card.find('.blog-text, .home-blog-text, .similar-text').each((k, t) => {
        const tx = $(t).text().trim();
        if (/^\w+ \d{1,2}, \d{4}$/.test(tx)) $(t).text(post.date);
        else if (/Min Read$/.test(tx)) $(t).text(post.read);
      });
      card.find('h1,h2,h3,h4,a').each((k, t) => { if ($(t).children().length === 0 && Object.values(postByOld).some((pp) => false)) {} });
    }
  });
  let bm = slug.match(/^blog--(.+)$/);
  if (bm && postByOld[bm[1]]) {
    const post = postByOld[bm[1]];
    const titleEl = $('h2.hero-title').first();
    const oldTitle = titleEl.text().trim();
    titleEl.text(post.title);
    $('img.details-image').each((i, img) => setImg($(img), blogImg(post), post.title));
    $('.breadcumb-text').each((i, el) => {
      const tx = $(el).text().trim();
      if (/^\w+ \d{1,2}, \d{4}$/.test(tx)) $(el).text(post.date);
      else if (/^\d+ Min Read$/.test(tx)) $(el).text(post.read);
      else if (tx === 'Ava Morgan') $(el).text(C.blogAuthor);
    });
    $('body *').each((i, el) => { if ($(el).children().length === 0 && $(el).text().trim() === oldTitle && el.tagName !== 'title') $(el).text(post.title); });
    const body = $('.details-content.w-richtext').first();
    if (body.length) {
      const h = body.find('h3').first(); const tagH = h.length ? h[0].tagName : 'h3';
      body.empty();
      for (const [heading, text] of post.sections) body.append(`<${tagH}>${heading}</${tagH}><p>${text}</p>`);
    }
    $('title').text(`${post.title} | ${C.seo.titleSuffix}`);
    $('meta[name="description"]').attr('content', post.sections[0][1]);
  }
  // blog titles anywhere (cards on home, similar posts) by old title text
  const oldTitles = opts.oldBlogTitles || {};
  for (const [oldT, oldSlug] of Object.entries(oldTitles)) {
    const post = postByOld[oldSlug];
    if (!post) continue;
    $('body *').each((i, el) => { if ($(el).children().length === 0 && $(el).text().trim() === oldT) $(el).text(post.title); });
    $(`img[alt="${oldT}"]`).attr('alt', post.title);
  }

  // ---- reviews ----
  $('.home-review-card').each((i, card) => {
    const name = $(card).find('.home-review-name').text().trim();
    const r = reviewByOld[name];
    if (!r) return;
    $(card).find('.home-review-text').text(r.quote);
    $(card).find('.home-review-name').text(r.name);
    $(card).find('.home-review-desig').text(r.role);
    $(card).find('img.home-review-avatar').each((k, img) => { setImg($(img), `/brand/avatars/${r.initials.toLowerCase()}.webp`, r.name); $(img).removeAttr('srcset'); });
  });

  // ---- features (why choose) ----
  for (const f of C.features) {
    $('body *').each((i, el) => {
      if ($(el).children().length || $(el).text().trim() !== f.oldTitle) return;
      $(el).text(f.title);
      const card = $(el).parent().parent();
      let best = null, bestLen = 0;
      card.find('*').each((k, d) => { if ($(d).children().length === 0 && $(d).text().trim().length > bestLen && $(d).text().trim() !== f.title) { best = d; bestLen = $(d).text().trim().length; } });
      if (best && bestLen > 60) $(best).text(f.text);
    });
  }

  // ---- story (about) ----
  $('.story-card').each((i, card) => {
    const s = C.story.cards[i];
    if (!s) return;
    $(card).find('.story-heading').text(s.heading);
    $(card).find('.story-except').text(s.text);
    $(card).find('img.story-image').each((k, img) => { setImg($(img), [`/brand/story/story-${i + 1}.webp`, [1200, 800, 500]], s.heading); });
  });
  // about video -> still image
  $('.about-video').each((i, el) => {
    const $el = $(el);
    $el.find('video').remove();
    $el.removeAttr('data-poster-url').removeAttr('data-video-urls').removeAttr('data-autoplay').removeAttr('data-loop');
    $el.removeClass('w-background-video w-background-video-atom');
    $el.append(`<img src="/brand/about-hero.jpg" srcset="/brand/about-hero-p-960.jpg 960w, /brand/about-hero.jpg 1920w" sizes="100vw" alt="${B.logoName}, Virpur and Lalsar" loading="eager" fetchpriority="high" style="width:100%;height:100%;object-fit:cover;display:block"/>`);
  });
  $('img.about-icon').closest('a, div').filter((i, el) => $(el).find('img.about-icon').length && $(el).children().length <= 2).remove();

  // ---- FAQ tabs (home, home-02, contact) ----
  $('.faq-tabs').each((i, tabs) => {
    const links = $(tabs).find('.w-tab-link');
    const panes = $(tabs).find('.w-tab-pane');
    C.faqTabs.forEach((tab, k) => {
      links.eq(k).find('.faq-tab-text').text(tab.name);
      const items = panes.eq(k).find('.faq-question');
      tab.qa.forEach(([q, a], j) => {
        const it = items.eq(j);
        it.find('.faq-question-text').text(q);
        it.find('.faq-answer-text, .faq-answer-except, .faq-answer-block p, .faq-answer-block div').filter((x, d) => $(d).children().length === 0 && $(d).text().trim().length > 10).first().text(a);
      });
    });
  });
  if (slug === 'faq') {
    const items = $('.faq-question');
    C.faqPage.forEach(([q, a], j) => {
      const it = items.eq(j);
      it.find('.faq-question-text').text(q);
      it.find('.faq-answer-block *').filter((x, d) => $(d).children().length === 0 && $(d).text().trim().length > 10).first().text(a);
    });
  }

  // ---- contact page ----
  if (slug === 'contact-us') {
    $('img.contact-image').each((i, img) => { setImg($(img), '/brand/contact.jpg', 'Jay Shree Krishna, we are here to help'); $(img).removeAttr('srcset'); });
    $('.contact-card').each((i, card) => {
      const texts = $(card).find('.contact-text, .contact-link-text, .contact-addr, a');
      if (i === 0) { // store locations -> two map links
        const lines = $(card).find('*').filter((k, d) => $(d).children().length === 0 && /\(1\d\d\) \d{3}-\d{4}/.test($(d).text()));
        lines.each((k, d) => {
          const $d = $(d);
          const branch = k === 0 ? 'Virpur, main branch: open in Google Maps' : 'Lalsar branch: open in Google Maps';
          const href = k === 0 ? B.maps.virpur : B.maps.lalsar;
          if (d.tagName === 'a') { $d.attr('href', href).attr('target', '_blank').attr('rel', 'noopener').text(branch); }
          else $d.html(`<a href="${href}" target="_blank" rel="noopener" style="color:inherit">${branch}</a>`);
        });
      }
      if (i === 1) {
        $(card).find('*').filter((k, d) => $(d).children().length === 0 && /@|yourdomain/.test($(d).text())).each((k, d) => {
          const $d = $(d);
          if (k === 0) { if (d.tagName === 'a') $d.attr('href', B.instagram).attr('target', '_blank').attr('rel', 'noopener').text(B.instagramHandle); else $d.html(`<a href="${B.instagram}" target="_blank" rel="noopener" style="color:inherit">${B.instagramHandle}</a>`); }
          else $d.text('DM us for offers, bulk orders and queries');
        });
      }
      if (i === 2) {
        $(card).find('*').filter((k, d) => $(d).children().length === 0 && /Coffeen|Sheridan/.test($(d).text())).text('Virpur, Gujarat, India. Serving nearby towns and villages.');
      }
    });
  }

  // ---- footer: social links and store column ----
  $('.footer-social a').each((i, a) => { const l = ($(a).attr('aria-label') || '').toLowerCase(); if (l !== 'instagram') $(a).remove(); else $(a).attr('href', B.instagram).attr('rel', 'noopener'); });
  $('a[aria-label="Phone"]').attr('href', B.maps.virpur).attr('target', '_blank').attr('rel', 'noopener').attr('aria-label', 'Virpur main branch on Google Maps');
  $('a[aria-label="Email"]').attr('href', B.maps.lalsar).attr('target', '_blank').attr('rel', 'noopener').attr('aria-label', 'Lalsar branch on Google Maps');

  // ---- CTA images ----
  $('img.cta-image').each((i, img) => { setImg($(img), `/brand/cta-${(i % 2) + 1}.jpg`, i % 2 === 0 ? 'Family packs on the shelf' : 'Kitchenware at Hare Krishna Mall'); $(img).removeAttr('srcset'); });

  // ---- language toggle (Gujarati default / English) next to the cart in both header blocks ----
  $('.header-section .display-show-for-desktop .w-commerce-commercecartwrapper').each((i, el) => {
    $(el).before('<a href="#" class="hk-lang-toggle" data-lang-toggle data-no-i18n aria-label="Switch language / ભાષા બદલો" role="button"><span class="hk-lang-opt" data-lang="gu">ગુજરાતી</span><span class="hk-lang-opt" data-lang="en">EN</span></a>');
  });
  // On phones and tablets the pill would crowd the logo, so it sits at the top of the hamburger menu instead.
  $('.header-section .header-menu-wrap .header-menu-wrapper').each((i, el) => {
    $(el).prepend('<div class="hk-lang-row" data-no-i18n><span class="hk-lang-row-label">ભાષા / Language</span><a href="#" class="hk-lang-toggle" data-lang-toggle data-no-i18n aria-label="Switch language / ભાષા બદલો" role="button"><span class="hk-lang-opt" data-lang="gu">ગુજરાતી</span><span class="hk-lang-opt" data-lang="en">EN</span></a></div>');
  });

  // ---- currency in cart ----
  $('body *').each((i, el) => { if ($(el).children().length === 0 && /^\$\s?0\.00\s?USD$/.test($(el).text().trim())) $(el).text('₹ 0.00'); });

  // ---- checkout tweaks ----
  if (slug === 'checkout') {
    $('select option').each((i, o) => { if ($(o).text().trim() === 'Afghanistan') $(o).text('India').attr('value', 'IN'); });
    $('body *').each((i, el) => { if ($(el).children().length) return; const t = $(el).text().trim(); if (t === 'Zip/Postal Code *') $(el).text('PIN Code *'); if (t === 'State/Province') $(el).text('State'); });
  }

  // ---- generic dictionary on text nodes and attributes ----
  const replaceText = (node) => {
    const raw = node.data;
    const key = norm(raw);
    if (key && Object.prototype.hasOwnProperty.call(dict, key)) {
      const lead = raw.match(/^\s*/)[0], trail = raw.match(/\s*$/)[0];
      node.data = lead + dict[key] + trail;
    }
  };
  const walk = (node) => {
    if (node.type === 'text') { replaceText(node); return; }
    if (node.type === 'tag') {
      if (node.name === 'script' || node.name === 'style') return;
      for (const attr of ['alt', 'placeholder', 'aria-label', 'value', 'title']) {
        const v = node.attribs && node.attribs[attr];
        if (v !== undefined) {
          const k = `@${attr}: ${norm(v)}`;
          if (Object.prototype.hasOwnProperty.call(dict, k)) node.attribs[attr] = dict[k];
        }
      }
    }
    (node.children || []).forEach(walk);
  };
  $('body').toArray().forEach(walk);
  // "Grocer" inside longer strings (copyright etc.) and template credits
  $('body *').each((i, el) => { if ($(el).children().length === 0) { const t = $(el).text(); if (/\bGrocer\b/.test(t)) $(el).text(t.replace(/\bGrocer\b/g, B.name)); } });

  // ---- head / seo ----
  const route = opts.route || '/';
  const seo = C.seo.pages[route];
  if (seo) { $('title').text(seo.title); $('meta[name="description"]').attr('content', seo.description); }
  else if (!pm && !cm && !bm) { $('title').text(($('title').text().split('|')[0].trim() || B.name) + ' | ' + C.seo.titleSuffix); }
  $('meta[property="og:image"], meta[property="twitter:image"]').attr('content', '/brand/og.jpg');
  return $;
}

function css(text) {
  const map = {
    '--color-style--primary-dark: #012804': `--color-style--primary-dark: ${B.palette.forest}`,
    '--color-style--primary-deep: #023606': `--color-style--primary-deep: ${B.palette.moss}`,
    '--color-style--primary-green: #2ecc71': `--color-style--primary-green: ${B.palette.lime}`,
    '--color-style--secondary-yellow: #fdc746': `--color-style--secondary-yellow: ${B.palette.saffron}`,
    '--color-style--warning: #ffc107': `--color-style--warning: ${B.palette.saffron}`,
    '--color-style--backgraund-01: #fbf6f0': `--color-style--backgraund-01: ${B.palette.cream}`,
    '--color-style--background-03: #ffefbe': '--color-style--background-03: #fff3cc',
    '--color-style--background-04: #ffe28c': '--color-style--background-04: #ffe59a',
    '--color-style--positive: #4caf50': `--color-style--positive: ${B.palette.lime}`,
  };
  let out = text;
  for (const [k, v] of Object.entries(map)) out = out.split(k).join(v);
  return out;
}

module.exports = { apply, css, newSlug, newHref, content: C, productByOld };
