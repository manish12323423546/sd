"""Stage 1 packaging: turn capture.js output into the capture/ ZIP layout.

Usage: python -I package.py <rawDir> <workDir> <siteUrl>
  Reads <rawDir>/<slug>/{desktop.png,narrow.png,raw.json,components.css} (never modified),
  rebuilds <workDir>/capture/ from scratch and writes <workDir>/capture.zip. Safe to re-run.

Windows: run with PYTHONUTF8=1, from a short working directory, and keep <workDir> under
AppData\\Local\\Temp (the scratchpad). The packaged Python cannot read or write AppData\\Roaming;
copy capture.zip to the session folder with the shell afterwards.
"""
import csv, hashlib, json, os, re, shutil, subprocess, sys, urllib.request, zipfile
from collections import defaultdict
from urllib.parse import urlparse

raw_dir, work, site = sys.argv[1], sys.argv[2], sys.argv[3]
cap = os.path.join(work, 'capture')
zip_path = os.path.join(work, 'capture.zip')
shutil.rmtree(cap, ignore_errors=True)
pages_dir, assets_dir, styles_dir = (os.path.join(cap, d) for d in ('pages', 'assets', 'styles'))
for d in (pages_dir, assets_dir, styles_dir):
    os.makedirs(d)

FIRST = ['home', 'services', 'work', 'about', 'pricing', 'blog', 'careers', 'contact']
slugs = sorted((s for s in os.listdir(raw_dir) if os.path.exists(os.path.join(raw_dir, s, 'raw.json'))),
               key=lambda s: (FIRST.index(s) if s in FIRST else 50 + s.count('--'), s))
raws = {s: json.load(open(os.path.join(raw_dir, s, 'raw.json'), encoding='utf8')) for s in slugs}

FONT_EXT, VID_EXT = ('.woff2', '.woff', '.ttf', '.otf'), ('.mp4', '.webm', '.mov')
IMG_EXT = ('.webp', '.png', '.jpg', '.jpeg', '.gif', '.avif')
VIDEO_REENCODE_BYTES = 20 * 1024 * 1024


def canonical(u):
    """Framer serves resized variants (?scale-down-to=, ?width=); keep one full-size original."""
    p = urlparse(u)
    return f'{p.scheme}://{p.netloc}{p.path}' if p.netloc == 'framerusercontent.com' else u


def kind(u, t=''):
    path = urlparse(u).path.lower()
    if path.endswith(FONT_EXT) or t == 'font':
        return 'font'
    if path.endswith(VID_EXT) or t == 'media':
        return 'video'
    if path.endswith('.svg'):
        return 'svg'
    if path.endswith(IMG_EXT) or t == 'image':
        return 'image'
    return None


def licence(u, k):
    if urlparse(u).netloc == 'fonts.gstatic.com':
        return 'Google Fonts (SIL OFL 1.1), free to reuse with licence'
    if k == 'font':
        return 'Site-hosted font file; licence unverified, check the family before reuse'
    return 'Third-party site asset; reference only, not cleared for publication'


def probe(path):
    pr = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_name,width,height', '-of', 'csv=p=0', path],
                        capture_output=True, text=True)
    out = pr.stdout.strip()
    return pr.returncode == 0 and out != '', (out.splitlines()[0] if out else pr.stderr.strip()[:120])


assets = {}
for s, r in raws.items():
    for u, t in [(a['url'], a['type']) for a in r.get('netAssets', [])] + [(u, '') for u in r.get('urls', [])]:
        k = kind(u, t)
        if k:
            assets.setdefault(canonical(u), {'kind': k, 'pages': set()})['pages'].add(s)

rows, names, failures = [], set(), []


def unique_name(u, k):
    base = re.sub(r'[^a-z0-9._-]', '-', os.path.basename(urlparse(u).path).lower()) or 'asset'
    if '.' not in base:
        base += {'font': '.woff2', 'video': '.mp4', 'svg': '.svg'}.get(k, '.bin')
    stem, ext = os.path.splitext(base)
    name, i = base, 2
    while name in names:
        name, i = f'{stem}-{i}{ext}', i + 1
    names.add(name)
    return name


for u in sorted(assets, key=lambda x: (assets[x]['kind'], x)):
    a = assets[u]
    name = unique_name(u, a['kind'])
    dest = os.path.join(assets_dir, name)
    try:
        req = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=120) as resp, open(dest, 'wb') as f:
            shutil.copyfileobj(resp, f)
    except Exception as e:
        failures.append((u, f'download: {e}'))
        continue
    with open(dest, 'rb') as f:
        head = f.read(4096)
    ok, note = os.path.getsize(dest) > 0, ''
    if a['kind'] == 'font':
        ok = ok and head[:4] in (b'wOF2', b'wOFF', b'\x00\x01\x00\x00', b'OTTO', b'true')
    elif a['kind'] == 'svg':
        ok = ok and b'<svg' in head
    else:
        good, note = probe(dest)
        ok = ok and good
    extra = []
    if ok and a['kind'] == 'video':
        poster = os.path.splitext(dest)[0] + '-poster.jpg'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', '0.5', '-i', dest, '-frames:v', '1', poster])
        if os.path.getsize(dest) > VIDEO_REENCODE_BYTES:
            small = os.path.splitext(dest)[0] + '-h264.mp4'
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', dest, '-c:v', 'libx264', '-crf', '28', '-preset', 'slow',
                            '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', small])
            if probe(small)[0]:
                os.replace(small, dest)
                note += ' (re-encoded H.264 CRF 28)'
        if os.path.exists(poster):
            extra.append(poster)
    if not ok:
        failures.append((u, f'validate: {note or head[:4]!r}'))
    rows.append({'file': f'assets/{name}', 'source_url': u, 'page': ';'.join(sorted(a['pages'])), 'type': a['kind'],
                 'bytes': os.path.getsize(dest), 'licence_note': licence(u, a['kind'])})
    for p in extra:
        rows.append({'file': f'assets/{os.path.basename(p)}', 'source_url': u + ' (poster frame)', 'page': rows[-1]['page'],
                     'type': 'image', 'bytes': os.path.getsize(p), 'licence_note': licence(u, 'image')})


def safe(v):
    v = str(v)
    return "'" + v if v[:1] in ('=', '+', '-', '@') else v


COLS = ['file', 'source_url', 'page', 'type', 'bytes', 'licence_note']
with open(os.path.join(cap, 'assets.csv'), 'w', newline='', encoding='utf8') as f:
    w = csv.writer(f)
    w.writerow(COLS)
    for r in rows:
        w.writerow([safe(r[c]) for c in COLS])

css_ref = {}
for s in slugs:
    p = os.path.join(raw_dir, s, 'components.css')
    data = open(p, 'rb').read() if os.path.exists(p) else b''
    if data:
        h = hashlib.sha1(data).hexdigest()[:10]
        out = os.path.join(styles_dir, f'page-css-{h}.css')
        if not os.path.exists(out):
            open(out, 'wb').write(data)
        css_ref[s] = f'styles/page-css-{h}.css'

by_page = defaultdict(lambda: defaultdict(int))
for r in rows:
    for s in r['page'].split(';'):
        by_page[s][r['type']] += 1


def anim_summary(an, sig):
    if not an:
        return 'n/a'
    anims = an.get('cssAnimations', [])
    loops = sorted({a['name'] for a in anims if a.get('iterations') is None})
    once = sorted({f"{a['name']} {int(a['duration'] or 0)}ms" for a in anims if a.get('iterations') == 1})
    parts = []
    if loops:
        parts.append('looping: ' + ', '.join(loops))
    if once:
        parts.append('one-shot: ' + ', '.join(once[:8]))
    parts.append(f"{an.get('hiddenBeforeScroll', 0)} elements hidden until scrolled into view")
    parts.append(f"{sig.get('hoverTransitions', 0)} links/buttons with hover transitions")
    if sig.get('canvases'):
        parts.append(f"{sig['canvases']} canvas (drawn in JS, not capturable as an asset)")
    if sig.get('sticky'):
        parts.append(f"{sig['sticky']} sticky/fixed elements")
    return '; '.join(parts)


for s in slugs:
    r, sig = raws[s], raws[s].get('signals', {})
    d = os.path.join(pages_dir, s)
    os.makedirs(d)
    for v in ('desktop.png', 'narrow.png'):
        shutil.copy2(os.path.join(raw_dir, s, v), d)
    lines = [f"# {r.get('title', s)}", '', f"Route: `{r['path']}`  ", f"HTTP status: {r.get('status')}  ",
             f"Description: {r.get('desc', '')}  ", f"Desktop page height: {r.get('height')} px  ",
             f"Page CSS: `{css_ref.get(s, 'none')}`", '']
    for i, sec in enumerate(r.get('sections', []), 1):
        lines += [f"## {i}. {sec['name']}", '', sec['text'], '']
        links = [l for l in sec.get('links', []) if l['href']]
        if links:
            lines += ['Links:', ''] + [f"- {l['text'] or '(icon)'} -> `{l['href']}`" for l in links] + ['']
    open(os.path.join(d, 'content.md'), 'w', encoding='utf8').write('\n'.join(lines))
    meta = {k: r.get(k) for k in ('path', 'status', 'title', 'desc', 'height', 'fonts', 'topColors', 'anim', 'signals')}
    meta['sections'] = [x['name'] for x in r.get('sections', [])]
    json.dump(meta, open(os.path.join(d, 'meta.json'), 'w', encoding='utf8'), indent=2)

counts = defaultdict(int)
for r in rows:
    counts[r['type']] += 1
home = raws.get('home', raws[slugs[0]])
idx = [f'# Capture: {site}', '',
       'Headless Chrome (puppeteer-core). Desktop 1440x900, narrow 390x844, full-page screenshots at 1x after scrolling '
       'to trigger reveal animations. Framer preview chrome (badge, template promo, editor bar) removed before screenshots.', '',
       f"Pages: {len(slugs)} | Screenshots: {len(slugs) * 2} | Assets: {len(rows)} "
       f"({', '.join(f'{v} {k}' for k, v in sorted(counts.items()))}) | Failed assets: {len(failures)}", '',
       '## Site-wide', '',
       f"- Fonts loaded (home): {', '.join(home.get('fonts', []))}",
       f"- Most-used colours (home, by element count): {', '.join(home.get('topColors', []))}",
       f"- Page CSS (all <style> tags, deduplicated): {len(set(css_ref.values()))} files in `styles/`; holds the exact transitions and @keyframes.",
       '',
       '## Notes for the rebuild', '',
       '<!-- Fill in after looking at the screenshots: canvas/WebGL effects, live counters, pinned sections, carousels, forms. -->', '',
       '## Pages', '', '| Page | Route | Status | Height | Sections | Images | SVG files | Video |', '|---|---|---|---|---|---|---|---|']
for s in slugs:
    r = raws[s]
    idx.append(f"| {s} | `{r['path']}` | {r.get('status')} | {r.get('height')} | {len(r.get('sections', []))} | "
               f"{by_page[s]['image']} | {by_page[s]['svg']} | {by_page[s]['video']} |")
idx += ['', '## Sections and motion per page', '']
for s in slugs:
    r = raws[s]
    idx += [f"### {s} (`{r['path']}`)", '', 'Sections: ' + ' > '.join(x['name'].split(' (')[0] for x in r.get('sections', [])), '',
            'Motion: ' + anim_summary(r.get('anim'), r.get('signals', {})), '']
if failures:
    idx += ['## Failed assets', ''] + [f'- {u}: {e}' for u, e in failures]
open(os.path.join(cap, 'index.md'), 'w', encoding='utf8').write('\n'.join(idx))

if os.path.exists(zip_path):
    os.remove(zip_path)
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as z:
    for root, _, files in os.walk(cap):
        for fn in sorted(files):
            full = os.path.join(root, fn)
            stored = fn.endswith(('.png', '.webp', '.jpg', '.woff2', '.mp4'))
            z.write(full, ('capture/' + os.path.relpath(full, cap)).replace(os.sep, '/'),
                    compress_type=zipfile.ZIP_STORED if stored else zipfile.ZIP_DEFLATED)

zero = [r['file'] for r in rows if r['bytes'] == 0]
print(json.dumps({'pages': len(slugs), 'screenshots': len(slugs) * 2, 'assets': dict(counts), 'failures': failures,
                  'zero_byte': zero, 'zip': zip_path, 'zip_bytes': os.path.getsize(zip_path)}, indent=1))
sys.exit(1 if failures or zero else 0)
