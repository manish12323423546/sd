// Stage 2 converter: Webflow HTML pages -> Next.js (App Router) TSX components.
// Usage: node convert.js <refDir> <captureDir> <appDir>
//   refDir:     folder with html/*.html, site.css, ix2.json
//   captureDir: extracted capture/ folder (assets/, assets.csv)
//   appDir:     the Next.js project root
// Treats the HTML as data; never executes anything from it.
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const [refDir, capDir, appDir] = process.argv.slice(2);
const htmlDir = path.join(refDir, 'html');
const SITE = 'https://grocer-tnc.webflow.io';

// ---------- assets ----------
const assetMap = new Map(); // source url -> /assets/file
{
  const csv = fs.readFileSync(path.join(capDir, 'assets.csv'), 'utf8').split(/\r?\n/).slice(1);
  for (const line of csv) {
    if (!line.trim()) continue;
    const cols = line.match(/("([^"]|"")*"|[^,]*)(,|$)/g).map((c) => c.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"'));
    const [file, url] = cols;
    assetMap.set(url, '/' + file);
    try { assetMap.set(decodeURI(url), '/' + file); } catch {}
  }
}
const pubAssets = path.join(appDir, 'public', 'assets');
fs.mkdirSync(pubAssets, { recursive: true });
for (const f of fs.readdirSync(path.join(capDir, 'assets'))) {
  fs.copyFileSync(path.join(capDir, 'assets', f), path.join(pubAssets, f));
}
const missing = new Set();
function localAsset(url) {
  if (!url) return url;
  if (url.startsWith('data:') || url.startsWith('/assets/')) return url;
  const abs = url.startsWith('http') ? url : new URL(url, SITE).href;
  const hit = assetMap.get(abs) || assetMap.get(abs.replace(/%20/g, ' '));
  if (hit) return hit;
  if (/cdn\.prod\.website-files\.com|cloudfront\.net|fonts\.gstatic/.test(abs)) {
    // Not captured from the DOM (e.g. only in CSS): download once, stable name.
    const name = abs.split('/').pop().split('?')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '-');
    missing.add(JSON.stringify([abs, name]));
    return '/assets/' + name;
  }
  return url;
}

// ---------- attribute / style mapping ----------
const ATTR = {
  class: 'className', for: 'htmlFor', tabindex: 'tabIndex', maxlength: 'maxLength', minlength: 'minLength',
  autocomplete: 'autoComplete', readonly: 'readOnly', srcset: 'srcSet', crossorigin: 'crossOrigin',
  playsinline: 'playsInline', autoplay: 'autoPlay', allowfullscreen: 'allowFullScreen', frameborder: 'frameBorder',
  enctype: 'encType', novalidate: 'noValidate', spellcheck: 'spellCheck', contenteditable: 'contentEditable',
  datetime: 'dateTime', colspan: 'colSpan', rowspan: 'rowSpan', accesskey: 'accessKey', 'xlink:href': 'xlinkHref',
  'xml:space': 'xmlSpace', 'xmlns:xlink': 'xmlnsXlink', 'xml:lang': 'xmlLang', 'accept-charset': 'acceptCharset',
  'http-equiv': 'httpEquiv', formaction: 'formAction', formnovalidate: 'formNoValidate', inputmode: 'inputMode',
  autofocus: 'autoFocus', usemap: 'useMap', cellpadding: 'cellPadding', cellspacing: 'cellSpacing', itemprop: 'itemProp',
  itemscope: 'itemScope', itemtype: 'itemType', fetchpriority: 'fetchPriority', enterkeyhint: 'enterKeyHint',
};
const NUMERIC = new Set(['tabIndex', 'maxLength', 'minLength', 'rows', 'cols', 'colSpan', 'rowSpan', 'size', 'span', 'start']);
const BOOL = new Set(['muted', 'loop', 'autoPlay', 'playsInline', 'checked', 'disabled', 'required', 'selected', 'hidden', 'multiple', 'controls', 'readOnly', 'noValidate', 'autoFocus', 'open', 'defaultChecked']);
const DROP_ATTR = new Set(['data-wf-bindings', 'data-wf-page', 'data-wf-site', 'data-wf-domain', 'data-w-tab', 'data-node-type']);
const KEEP_W_TAB = true;

function attrName(tag, name, isSvg) {
  if (name.startsWith('data-') || name.startsWith('aria-')) return name;
  if (ATTR[name]) return ATTR[name];
  if (isSvg && name.includes('-')) return name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  if (isSvg && name.includes(':')) return name.replace(/:([a-z])/g, (_, c) => c.toUpperCase());
  return name;
}
function styleObject(str) {
  const out = {};
  for (const decl of str.split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    let prop = decl.slice(0, i).trim();
    const val = decl.slice(i + 1).trim();
    if (!prop) continue;
    if (prop.startsWith('-moz-') || prop.startsWith('-ms-') || prop.startsWith('-webkit-')) continue; // keep unprefixed only
    prop = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    out[prop] = val.replace(/url\((['"]?)([^'")]+)\1\)/g, (m, q, u) => `url(${q}${localAsset(u)}${q})`);
  }
  return out;
}
const jsStr = (s) => JSON.stringify(s);

function isInternalHref(h) {
  return h && (h.startsWith('/') && !h.startsWith('//')) || (h && h.startsWith(SITE));
}

// ---------- JSX serializer ----------
function serialize($, node, ctx) {
  if (node.type === 'text') {
    if (!node.data) return '';
    return `{${jsStr(node.data)}}`;
  }
  if (node.type === 'comment') return '';
  if (node.type !== 'tag' && node.type !== 'script' && node.type !== 'style') return '';
  let tag = node.name;
  if (tag === 'script' || tag === 'style' || tag === 'link' || tag === 'noscript' || tag === 'template') return '';
  const isSvg = ctx.svg || tag === 'svg';
  const attrs = { ...node.attribs };
  const cls = attrs.class || '';
  if (/\bw-webflow-badge\b/.test(cls)) return '';
  if (/\bw-commerce-commercecartform\b/.test(cls)) return ''; // hidden cart template form (ecommerce not connected)
  if (/\bw-commerce-commercecarterrorstate\b/.test(cls)) return '';
  if (tag === 'img' && /\bw-dyn-bind-empty\b/.test(cls)) return '';

  // links
  let useLink = false;
  if (tag === 'a' && attrs.href) {
    let h = attrs.href;
    if (h.startsWith(SITE)) h = h.slice(SITE.length) || '/';
    if (/^\/?(\?|#)/.test(h) && h.startsWith('/')) h = h; // keep
    h = h.replace(/^\?[0-9a-f]{8}_page=(\d+)$/, `${ctx.baseRoute}?page=$1`).replace(/^(\/[^?]*)\?[0-9a-f]{8}_page=(\d+)$/, '$1?page=$2');
    attrs.href = h;
    if (isInternalHref(h) && !h.includes('?') && !h.startsWith('/#')) { useLink = true; ctx.usesLink = true; }
  }
  if (attrs['data-w-id'] && ctx.collectIds) ctx.collectIds.add(attrs['data-w-id']);

  // assets
  for (const k of ['src', 'poster', 'data-poster-url', 'data-video-urls', 'href']) {
    if (!attrs[k]) continue;
    if (k === 'href' && tag !== 'link' && tag !== 'use') continue;
    if (k === 'data-video-urls') attrs[k] = attrs[k].split(',').map((u) => localAsset(u)).join(',');
    else attrs[k] = localAsset(attrs[k]);
  }
  if (attrs.srcset) attrs.srcset = attrs.srcset.split(',').map((p) => { const [u, w] = p.trim().split(/\s+/); return [localAsset(u), w].filter(Boolean).join(' '); }).join(', ');
  if (tag === 'img' && attrs.alt === undefined) attrs.alt = '';
  if (tag === 'input' && attrs.type === 'submit' && attrs.value) { /* keep value for submit buttons */ }

  const parts = [];
  for (const [rawName, rawVal] of Object.entries(attrs)) {
    if (DROP_ATTR.has(rawName) && !(rawName === 'data-w-tab' && KEEP_W_TAB)) continue;
    if (rawName === 'style') { const o = styleObject(rawVal); if (Object.keys(o).length) parts.push(`style={${JSON.stringify(o)}}`); continue; }
    let name = attrName(tag, rawName, isSvg);
    let val = rawVal;
    if (name === 'checked') name = 'defaultChecked';
    if (name === 'value' && (tag === 'input' || tag === 'textarea' || tag === 'select') && attrs.type !== 'submit' && attrs.type !== 'button' && attrs.type !== 'hidden') name = 'defaultValue';
    if (name === 'selected') continue; // option selected: handled via no default (single option)
    if (name === 'xlink' && isSvg) name = 'xmlnsXlink';
    if (name === 'value' && tag === 'a') continue;
    if (name === 'htmlFor' && tag !== 'label' && tag !== 'output') continue;
    if (NUMERIC.has(name) && /^-?\d+$/.test(val)) { parts.push(`${name}={${val}}`); continue; }
    if (BOOL.has(name)) { parts.push(val === '' || val === name || val === 'true' ? `${name}` : `${name}={${val === 'false' ? 'false' : 'true'}}`); continue; }
    if (name === 'className' && ctx.stripCurrent) val = val.replace(/\bw--current\b/g, '').replace(/\s+/g, ' ').trim();
    if (name === 'aria-current' && ctx.stripCurrent) continue;
    if (name === 'className' && val === '') continue;
    parts.push(`${name}=${jsStr(val)}`);
  }
  const open = (useLink ? 'Link' : tag) + (parts.length ? ' ' + parts.join(' ') : '');
  const VOID = new Set(['img', 'br', 'hr', 'input', 'source', 'track', 'meta', 'link', 'area', 'base', 'col', 'embed', 'wbr', 'param']);
  const kids = node.children || [];
  const inner = kids.map((k) => serialize($, k, { ...ctx, svg: isSvg })).join('');
  if (VOID.has(tag) || (!inner && isSvg)) return `<${open}/>`;
  let html = `<${open}>${inner}</${useLink ? 'Link' : tag}>`;
  // demo labelling for forms
  if (tag === 'form' && !/w-commerce-commerceaddtocartform/.test(cls)) {
    ctx.forms = (ctx.forms || 0) + 1;
  }
  return html;
}

// ---------- pages ----------
const files = fs.readdirSync(htmlDir).filter((f) => f.endsWith('.html')).sort();
const routes = [];
let headerJsx = null, footerJsx = null, headerSig = null, footerSig = null;
const usedIds = new Set();
const sig = (html) => html.replace(/\bw--current\b/g, '').replace(/aria-current="page"/g, '').replace(/\s+/g, ' ');

const pagesDir = path.join(appDir, 'components', 'pages');
fs.mkdirSync(pagesDir, { recursive: true });
fs.mkdirSync(path.join(appDir, 'components', 'site'), { recursive: true });
const toComp = (slug) => 'Page' + slug.replace(/(^|[-_])([a-z0-9])/g, (_, __, c) => c.toUpperCase()).replace(/[^A-Za-z0-9]/g, '');

const report = [];
for (const file of files) {
  const slug = file.replace(/\.html$/, '');
  const paged = slug.match(/^(.*)-([0-9a-f]{8})_page-(\d+)$/);
  const baseRoute = slug === 'home' ? '/' : '/' + (paged ? paged[1] : slug).replace(/--/g, '/');
  const route = paged ? `${baseRoute}?page=${paged[3]}` : baseRoute;
  const html = fs.readFileSync(path.join(htmlDir, file), 'utf8');
  const $ = cheerio.load(html);
  const title = $('title').text();
  const desc = $('meta[name="description"]').attr('content') || '';
  const og = localAsset($('meta[property="og:image"]').attr('content') || '');
  const bodyClass = $('body').attr('class') || '';

  // shared header/footer
  const header = $('section.header-section').first();
  const footer = $('section.footer-section').first();
  let hasHeader = false, hasFooter = false;
  if (header.length) {
    hasHeader = true;
    const s = sig($.html(header));
    if (!headerJsx) { headerSig = s; headerJsx = serialize($, header[0], { stripCurrent: true, collectIds: usedIds }); }
    else if (s !== headerSig) report.push(`header differs on ${slug} (${Math.abs(s.length - headerSig.length)} chars)`);
    header.replaceWith('<header-slot></header-slot>');
  }
  if (footer.length) {
    hasFooter = true;
    const s = sig($.html(footer));
    if (!footerJsx) { footerSig = s; footerJsx = serialize($, footer[0], { stripCurrent: true, collectIds: usedIds }); }
    else if (s !== footerSig) report.push(`footer differs on ${slug} (${Math.abs(s.length - footerSig.length)} chars)`);
    footer.replaceWith('<footer-slot></footer-slot>');
  }
  const ctx = { collectIds: usedIds, baseRoute };
  let body = $('body').children().toArray().map((n) => serialize($, n, ctx)).join('');
  body = body.replace(/<header-slot><\/header-slot>|<header-slot\/>/g, '<Header/>').replace(/<footer-slot><\/footer-slot>|<footer-slot\/>/g, '<Footer/>');
  const comp = toComp(slug);
  const imports = [`import PageReady from "@/components/site/page-ready";`];
  if (body.includes('<Link')) imports.push(`import Link from "next/link";`);
  if (hasHeader) imports.push(`import Header from "@/components/site/header";`);
  if (hasFooter) imports.push(`import Footer from "@/components/site/footer";`);
  const src = `/* Generated from ${SITE}${route} by tools/convert.js. Do not edit by hand. */
${imports.join('\n')}

export const pageMeta = { title: ${jsStr(title)}, description: ${jsStr(desc)}, ogImage: ${jsStr(og)}, bodyClass: ${jsStr(bodyClass)} };

export default function ${comp}() {
  return (<>${body}<PageReady /></>);
}
`;
  fs.writeFileSync(path.join(pagesDir, slug + '.tsx'), src);
  routes.push({ slug, route, baseRoute, page: paged ? Number(paged[3]) : 1, comp, title, forms: ctx.forms || 0 });
}

// header / footer components
fs.writeFileSync(path.join(appDir, 'components', 'site', 'header.tsx'), `/* Generated from ${SITE}/ by tools/convert.js. Do not edit by hand. */
import Link from "next/link";

export default function Header() {
  return (${headerJsx});
}
`);
fs.writeFileSync(path.join(appDir, 'components', 'site', 'footer.tsx'), `/* Generated from ${SITE}/ by tools/convert.js. Do not edit by hand. */
import Link from "next/link";

export default function Footer() {
  return (${footerJsx});
}
`);

// route files (one folder per base route; paginated lists read ?page=N)
const groups = new Map();
for (const r of routes) { const g = groups.get(r.baseRoute) || []; g.push(r); groups.set(r.baseRoute, g); }
for (const [baseRoute, rs] of groups) {
  rs.sort((a, b) => a.page - b.page);
  const dir = baseRoute === '/' ? path.join(appDir, 'app') : path.join(appDir, 'app', ...baseRoute.slice(1).split('/'));
  fs.mkdirSync(dir, { recursive: true });
  const first = rs[0];
  if (rs.length === 1) {
    fs.writeFileSync(path.join(dir, 'page.tsx'), `import type { Metadata } from "next";
import Page, { pageMeta } from "@/components/pages/${first.slug}";
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, ${jsStr(baseRoute)});

export default Page;
`);
  } else {
    const imports = rs.map((r, i) => `import Page${r.page}${i === 0 ? ', { pageMeta }' : ''} from "@/components/pages/${r.slug}";`).join('\n');
    fs.writeFileSync(path.join(dir, 'page.tsx'), `import type { Metadata } from "next";
import { notFound } from "next/navigation";
${imports}
import { buildMetadata } from "@/lib/site";

export const metadata: Metadata = buildMetadata(pageMeta, ${jsStr(baseRoute)});

const PAGES: Record<string, React.ComponentType> = { ${rs.map((r) => `"${r.page}": Page${r.page}`).join(', ')} };

/** Paginated list: the original site pages this list with a query parameter. */
export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page } = await searchParams;
  const Comp = PAGES[page || "1"];
  if (!Comp) notFound();
  return <Comp />;
}
`);
  }
}
fs.writeFileSync(path.join(appDir, 'lib', 'routes.json'), JSON.stringify(routes, null, 1));

// ---------- CSS ----------
let css = fs.readFileSync(path.join(refDir, 'site.css'), 'utf8');
css = css.replace(/url\((['"]?)(https?:\/\/[^'")]+)\1\)/g, (m, q, u) => `url(${q}${localAsset(u)}${q})`);
css = css.replace(/Staatliches, sans-serif/g, 'var(--font-staatliches), sans-serif').replace(/Inter, sans-serif/g, 'var(--font-inter), sans-serif');
// Drop the Webflow badge rules.
css = css.replace(/\.w-webflow-badge[^{]*\{[^}]*\}\s*/g, '');
fs.writeFileSync(path.join(appDir, 'app', 'webflow.css'), css);

// ---------- IX2 data (only what the runtime needs) ----------
const ix = JSON.parse(fs.readFileSync(path.join(refDir, 'ix2.json'), 'utf8'));
const events = [];
const lists = {};
for (const e of Object.values(ix.events)) {
  const id = e.target.id.split('|').pop();
  if (!usedIds.has(id)) continue;
  const alid = e.action.config.actionListId;
  events.push({ id, type: e.eventTypeId, list: alid, config: e.config, mq: e.mediaQueries || ['main', 'medium', 'small', 'tiny'], reverse: !!e.action.config.playInReverse, delay: e.action.config.delay || 0 });
  const a = ix.actionLists[alid];
  if (a && !lists[alid]) {
    const clean = (it) => { const c = { ...it.config }; if (c.target) c.target = { selector: c.target.selector, useEventTarget: c.target.useEventTarget, id: c.target.id }; delete c.globalSwatchId; return { type: it.actionTypeId, config: c }; };
    lists[alid] = {
      initial: !!a.useFirstGroupAsInitialState,
      groups: (a.actionItemGroups || []).map((g) => g.actionItems.map(clean)),
      continuous: (a.continuousParameterGroups || []).map((g) => ({ id: g.id, type: g.type, keys: g.continuousActionGroups.map((k) => ({ at: k.keyframe, items: k.actionItems.map(clean) })) })),
    };
  }
}
fs.writeFileSync(path.join(appDir, 'lib', 'ix2-data.json'), JSON.stringify({ mediaQueries: ix.site.mediaQueries, events, lists }));

fs.writeFileSync(path.join(refDir, 'missing-assets.json'), JSON.stringify([...missing].map((s) => JSON.parse(s)), null, 1));
console.log(JSON.stringify({ pages: routes.length, headerIds: usedIds.size, events: events.length, lists: Object.keys(lists).length, missingAssets: missing.size, report }, null, 1));
