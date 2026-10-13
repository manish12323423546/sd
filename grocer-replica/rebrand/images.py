"""Generate the Hare Krishna Mall brand imagery used by the website (PIL only, no network).

Usage: python3 -I images.py <content.json> <fontsDir> <logosDir> <outDir>
Writes into <outDir> (public/brand): products/, categories/, blog/, story/, avatars/, cta, about, contact, og, logos.
All art is original illustration so nothing on the site needs a third-party licence.
"""
import json, math, os, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

content_path, fonts_dir, logos_dir, out = sys.argv[1:5]
C = json.load(open(content_path, encoding="utf8"))
P = C["brand"]["palette"]
LIME, SAFFRON, ICE, CREAM, FOREST, MOSS = P["lime"], P["saffron"], P["iceBlue"], P["cream"], P["forest"], P["moss"]
INK = "#1E1E1E"

for d in ("products", "categories", "blog", "story", "avatars"):
    os.makedirs(os.path.join(out, d), exist_ok=True)


def font(name, size, weight=None):
    path = {"display": "Staatliches-Regular.ttf", "sans": "Inter.ttf", "geo": "Poppins-SemiBold.ttf", "guj": "NotoSansGujarati.ttf"}[name]
    f = ImageFont.truetype(os.path.join(fonts_dir, path), size)
    if weight and name in ("sans", "guj"):
        try:
            f.set_variation_by_axes([weight] if name == "guj" else [14, weight])
        except Exception:
            try:
                f.set_variation_by_axes([weight])
            except Exception:
                pass
    return f


def hexrgb(h, a=255):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


def shade(h, k):
    """k<0 darkens, k>0 lightens towards white."""
    r, g, b, _ = hexrgb(h)
    if k >= 0:
        r, g, b = (int(r + (255 - r) * k), int(g + (255 - g) * k), int(b + (255 - b) * k))
    else:
        r, g, b = (int(r * (1 + k)), int(g * (1 + k)), int(b * (1 + k)))
    return (r, g, b, 255)


def gradient(size, top, bottom, horizontal=False):
    w, h = size
    base = Image.new("RGBA", size, top)
    overlay = Image.new("RGBA", size, bottom)
    mask = Image.linear_gradient("L").resize(size)
    if horizontal:
        mask = mask.rotate(90, expand=True).resize(size)
    return Image.composite(overlay, base, mask)


def text_center(draw, xy, text, f, fill, anchor="mm"):
    draw.text(xy, text, font=f, fill=fill, anchor=anchor)


def fit_text(text, fnt_name, max_w, start, min_size=18, weight=None):
    size = start
    while size > min_size:
        f = font(fnt_name, size, weight)
        if f.getlength(text) <= max_w:
            return f
        size -= 2
    return font(fnt_name, min_size, weight)


def wrap(text, f, max_w):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if f.getlength(t) <= max_w:
            cur = t
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def hk_badge(layer, cx, cy, r):
    d = ImageDraw.Draw(layer)
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=hexrgb(LIME))
    f = font("display", int(r * 1.15))
    text_center(d, (cx, cy + r * 0.05), "HK", f, hexrgb(FOREST))


def soft_shadow(canvas, box, blur=40, alpha=70):
    sh = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).ellipse(box, fill=(20, 30, 10, alpha))
    sh = sh.filter(ImageFilter.GaussianBlur(blur))
    canvas.alpha_composite(sh)


def label_plate(layer, box, color, accent, title, sub, radius=28):
    d = ImageDraw.Draw(layer)
    x0, y0, x1, y1 = box
    d.rounded_rectangle(box, radius=radius, fill=(255, 255, 255, 235), outline=hexrgb(accent), width=6)
    w = x1 - x0
    tf = fit_text(title, "display", w - 80, int((y1 - y0) * 0.42), 20)
    text_center(d, ((x0 + x1) / 2, y0 + (y1 - y0) * 0.38), title, tf, hexrgb(accent))
    if sub:
        sf = fit_text(sub, "geo", w - 100, int((y1 - y0) * 0.2), 14)
        text_center(d, ((x0 + x1) / 2, y0 + (y1 - y0) * 0.74), sub, sf, hexrgb(INK))
    hk_badge(layer, x0 + 46, y0 + 46, 26)


def lighting(layer, box, left_alpha=70, right_alpha=60):
    """Simple vertical highlight on the left third and shade on the right third of a body box."""
    x0, y0, x1, y1 = box
    w = x1 - x0
    hl = Image.new("RGBA", layer.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(hl)
    d.rounded_rectangle((x0 + w * 0.08, y0 + 10, x0 + w * 0.26, y1 - 10), radius=30, fill=(255, 255, 255, left_alpha))
    hl = hl.filter(ImageFilter.GaussianBlur(18))
    layer.alpha_composite(hl)
    sh = Image.new("RGBA", layer.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(sh)
    d.rounded_rectangle((x1 - w * 0.22, y0 + 10, x1 - 6, y1 - 10), radius=30, fill=(0, 0, 0, right_alpha))
    sh = sh.filter(ImageFilter.GaussianBlur(22))
    layer.alpha_composite(sh)


# ---------- packshot shapes (drawn in a 1000x1000 box, origin ox, oy) ----------

def shape_sack(L, ox, oy, p):
    d = ImageDraw.Draw(L)
    c, a = p["color"], p["accent"]
    body = (ox + 180, oy + 260, ox + 820, oy + 940)
    d.rounded_rectangle(body, radius=90, fill=hexrgb(c), outline=shade(c, -0.25), width=6)
    # gathered top
    d.polygon([(ox + 300, oy + 270), (ox + 700, oy + 270), (ox + 640, oy + 150), (ox + 360, oy + 150)], fill=shade(c, -0.08), outline=shade(c, -0.25))
    d.rounded_rectangle((ox + 350, oy + 135, ox + 650, oy + 185), radius=20, fill=hexrgb(a))
    # stitching
    for y in range(oy + 300, oy + 920, 48):
        d.line((ox + 215, y, ox + 232, y), fill=shade(c, -0.3), width=4)
        d.line((ox + 768, y, ox + 785, y), fill=shade(c, -0.3), width=4)
    lighting(L, body)
    label_plate(L, (ox + 260, oy + 440, ox + 740, oy + 720), c, a, p["label"], p["unit"])


def shape_bag(L, ox, oy, p):
    d = ImageDraw.Draw(L)
    c, a = p["color"], p["accent"]
    body = (ox + 220, oy + 200, ox + 780, oy + 940)
    d.rounded_rectangle(body, radius=50, fill=hexrgb(c), outline=shade(c, -0.3), width=6)
    d.rectangle((ox + 220, oy + 200, ox + 780, oy + 270), fill=hexrgb(a))
    for x in range(ox + 240, ox + 780, 36):
        d.line((x, oy + 205, x, oy + 265), fill=shade(a, -0.35), width=3)
    lighting(L, body)
    label_plate(L, (ox + 290, oy + 420, ox + 710, oy + 700), c, a, p["label"], p["unit"])


def shape_pouch(L, ox, oy, p):
    d = ImageDraw.Draw(L)
    c, a = p["color"], p["accent"]
    pts = [(ox + 250, oy + 200), (ox + 750, oy + 200), (ox + 820, oy + 920), (ox + 180, oy + 920)]
    d.polygon(pts, fill=hexrgb(c), outline=shade(c, -0.3))
    d.rectangle((ox + 250, oy + 200, ox + 750, oy + 250), fill=hexrgb(a))
    d.line((ox + 250, oy + 275, ox + 750, oy + 275), fill=shade(c, -0.35), width=4)
    d.ellipse((ox + 180, oy + 880, ox + 820, oy + 960), fill=shade(c, -0.18))
    lighting(L, (ox + 230, oy + 200, ox + 790, oy + 920))
    label_plate(L, (ox + 300, oy + 400, ox + 700, oy + 690), c, a, p["label"], p["unit"])


def shape_box(L, ox, oy, p):
    d = ImageDraw.Draw(L)
    c, a = p["color"], p["accent"]
    front = (ox + 180, oy + 320, ox + 720, oy + 920)
    d.polygon([(ox + 180, oy + 320), (ox + 330, oy + 200), (ox + 870, oy + 200), (ox + 720, oy + 320)], fill=shade(c, 0.35), outline=shade(c, -0.3))
    d.polygon([(ox + 720, oy + 320), (ox + 870, oy + 200), (ox + 870, oy + 800), (ox + 720, oy + 920)], fill=shade(c, -0.28), outline=shade(c, -0.35))
    d.rectangle(front, fill=hexrgb(c), outline=shade(c, -0.3), width=4)
    d.rectangle((ox + 180, oy + 320, ox + 720, oy + 380), fill=hexrgb(a))
    label_plate(L, (ox + 240, oy + 470, ox + 660, oy + 760), c, a, p["label"], p["unit"])


def shape_bottle(L, ox, oy, p, soft=False):
    d = ImageDraw.Draw(L)
    c, a = p["color"], p["accent"]
    # cap
    d.rounded_rectangle((ox + 430, oy + 110, ox + 570, oy + 200), radius=18, fill=hexrgb(a))
    d.rectangle((ox + 445, oy + 200, ox + 555, oy + 260), fill=shade(c, 0.15), outline=shade(c, -0.2))
    # shoulders
    d.polygon([(ox + 445, oy + 260), (ox + 555, oy + 260), (ox + 700, oy + 380), (ox + 300, oy + 380)], fill=shade(c, 0.1), outline=shade(c, -0.2))
    body = (ox + 300, oy + 370, ox + 700, oy + 930)
    d.rounded_rectangle(body, radius=70, fill=hexrgb(c), outline=shade(c, -0.3), width=5)
    if soft:
        d.rectangle((ox + 300, oy + 560, ox + 700, oy + 640), fill=shade(c, -0.12))
    lighting(L, body)
    label_plate(L, (ox + 340, oy + 470, ox + 660, oy + 780), c, a, p["label"], p["unit"])


def shape_softbottle(L, ox, oy, p):
    shape_bottle(L, ox, oy, p, soft=True)


def shape_carton(L, ox, oy, p):
    d = ImageDraw.Draw(L)
    c, a = p["color"], p["accent"]
    d.polygon([(ox + 260, oy + 330), (ox + 500, oy + 160), (ox + 740, oy + 330)], fill=shade(c, 0.3), outline=shade(c, -0.3))
    d.polygon([(ox + 500, oy + 160), (ox + 740, oy + 330), (ox + 820, oy + 280), (ox + 600, oy + 130)], fill=shade(c, -0.2), outline=shade(c, -0.3))
    d.rectangle((ox + 260, oy + 330, ox + 740, oy + 920), fill=hexrgb(c), outline=shade(c, -0.3), width=4)
    d.polygon([(ox + 740, oy + 330), (ox + 820, oy + 280), (ox + 820, oy + 870), (ox + 740, oy + 920)], fill=shade(c, -0.3))
    d.rounded_rectangle((ox + 470, oy + 170, ox + 530, oy + 215), radius=10, fill=hexrgb(a))
    label_plate(L, (ox + 310, oy + 470, ox + 690, oy + 760), c, a, p["label"], p["unit"])


def shape_soap(L, ox, oy, p):
    d = ImageDraw.Draw(L)
    c, a = p["color"], p["accent"]
    for i in range(4):
        y = oy + 760 - i * 150
        box = (ox + 230 + i * 18, y - 130, ox + 770 + i * 18, y)
        d.rounded_rectangle(box, radius=40, fill=shade(c, 0.08 * i), outline=shade(c, -0.3), width=4)
        d.rectangle((box[0] + 170, box[1], box[0] + 370, box[3]), fill=hexrgb(a))
        hk_badge(L, box[0] + 270, (box[1] + box[3]) // 2, 34)
    label_plate(L, (ox + 300, oy + 820, ox + 700, oy + 960), c, a, p["label"], p["unit"], radius=24)


def shape_pump(L, ox, oy, p):
    d = ImageDraw.Draw(L)
    c, a = p["color"], p["accent"]
    d.rectangle((ox + 480, oy + 120, ox + 520, oy + 240), fill=shade(a, -0.1))
    d.rounded_rectangle((ox + 480, oy + 100, ox + 640, oy + 150), radius=20, fill=hexrgb(a))
    d.rounded_rectangle((ox + 430, oy + 230, ox + 570, oy + 300), radius=16, fill=shade(c, -0.25))
    body = (ox + 310, oy + 290, ox + 690, oy + 930)
    d.rounded_rectangle(body, radius=80, fill=hexrgb(c), outline=shade(c, -0.3), width=5)
    lighting(L, body)
    label_plate(L, (ox + 350, oy + 430, ox + 650, oy + 760), c, a, p["label"], p["unit"])


def shape_tube(L, ox, oy, p):
    d = ImageDraw.Draw(L)
    c, a = p["color"], p["accent"]
    d.rounded_rectangle((ox + 420, oy + 820, ox + 580, oy + 930), radius=24, fill=hexrgb(a))
    d.polygon([(ox + 300, oy + 180), (ox + 700, oy + 180), (ox + 660, oy + 830), (ox + 340, oy + 830)], fill=hexrgb(c), outline=shade(c, -0.3))
    d.rectangle((ox + 300, oy + 160, ox + 700, oy + 200), fill=shade(c, -0.2))
    lighting(L, (ox + 320, oy + 180, ox + 680, oy + 830))
    label_plate(L, (ox + 360, oy + 330, ox + 640, oy + 640), c, a, p["label"], p["unit"])


def shape_jar(L, ox, oy, p):
    d = ImageDraw.Draw(L)
    c, a = p["color"], p["accent"]
    d.rounded_rectangle((ox + 240, oy + 300, ox + 760, oy + 440), radius=40, fill=hexrgb(a), outline=shade(a, -0.3), width=4)
    body = (ox + 220, oy + 430, ox + 780, oy + 920)
    d.rounded_rectangle(body, radius=90, fill=hexrgb(c), outline=shade(c, -0.3), width=5)
    lighting(L, body)
    label_plate(L, (ox + 290, oy + 520, ox + 710, oy + 820), c, a, p["label"], p["unit"])


def shape_can(L, ox, oy, p):
    d = ImageDraw.Draw(L)
    c, a = p["color"], p["accent"]
    d.ellipse((ox + 300, oy + 150, ox + 700, oy + 270), fill=(205, 208, 210, 255), outline=(150, 150, 150, 255), width=4)
    d.rectangle((ox + 300, oy + 210, ox + 700, oy + 880), fill=hexrgb(c), outline=shade(c, -0.3), width=4)
    d.ellipse((ox + 300, oy + 820, ox + 700, oy + 940), fill=shade(c, -0.15), outline=shade(c, -0.3), width=4)
    d.ellipse((ox + 330, oy + 170, ox + 670, oy + 250), fill=(225, 228, 230, 255))
    lighting(L, (ox + 300, oy + 230, ox + 700, oy + 860))
    label_plate(L, (ox + 340, oy + 400, ox + 660, oy + 700), c, a, p["label"], p["unit"])


def shape_jug(L, ox, oy, p):
    d = ImageDraw.Draw(L)
    c, a = p["color"], p["accent"]
    d.rounded_rectangle((ox + 300, oy + 120, ox + 440, oy + 220), radius=16, fill=hexrgb(a))
    d.polygon([(ox + 310, oy + 220), (ox + 430, oy + 220), (ox + 620, oy + 330), (ox + 220, oy + 330)], fill=shade(c, 0.1), outline=shade(c, -0.2))
    body = (ox + 220, oy + 320, ox + 640, oy + 930)
    d.rounded_rectangle(body, radius=60, fill=hexrgb(c), outline=shade(c, -0.3), width=5)
    d.rounded_rectangle((ox + 640, oy + 380, ox + 790, oy + 640), radius=60, outline=hexrgb(c), width=46)
    lighting(L, body)
    label_plate(L, (ox + 270, oy + 430, ox + 590, oy + 740), c, a, p["label"], p["unit"])


def shape_roll(L, ox, oy, p):
    d = ImageDraw.Draw(L)
    c, a = p["color"], p["accent"]
    for i, x in enumerate((180, 410, 640)):
        d.rounded_rectangle((ox + x, oy + 330, ox + x + 200, oy + 900), radius=40, fill=shade(c, 0.05 * i), outline=shade(c, -0.3), width=4)
        d.ellipse((ox + x, oy + 280, ox + x + 200, oy + 380), fill=shade(c, 0.25), outline=shade(c, -0.3), width=4)
        d.ellipse((ox + x + 70, oy + 310, ox + x + 130, oy + 350), fill=hexrgb(CREAM))
        d.rectangle((ox + x + 20, oy + 560, ox + x + 180, oy + 640), fill=hexrgb(a))
    label_plate(L, (ox + 280, oy + 660, ox + 720, oy + 820), c, a, p["label"], p["unit"], radius=24)


def shape_cooker(L, ox, oy, p):
    d = ImageDraw.Draw(L)
    c, a = p["color"], p["accent"]
    d.rounded_rectangle((ox + 470, oy + 150, ox + 530, oy + 240), radius=14, fill=hexrgb(a))
    d.rounded_rectangle((ox + 240, oy + 230, ox + 760, oy + 330), radius=40, fill=shade(c, 0.15), outline=shade(c, -0.3), width=5)
    d.rounded_rectangle((ox + 760, oy + 250, ox + 900, oy + 300), radius=20, fill=hexrgb(INK))
    body = (ox + 210, oy + 320, ox + 790, oy + 900)
    d.rounded_rectangle(body, radius=60, fill=hexrgb(c), outline=shade(c, -0.3), width=5)
    d.rounded_rectangle((ox + 110, oy + 380, ox + 220, oy + 440), radius=20, fill=hexrgb(INK))
    lighting(L, body, 110, 70)
    label_plate(L, (ox + 330, oy + 480, ox + 670, oy + 740), c, a, p["label"], p["unit"])


def shape_steelbottle(L, ox, oy, p):
    d = ImageDraw.Draw(L)
    c, a = p["color"], p["accent"]
    d.rounded_rectangle((ox + 420, oy + 110, ox + 580, oy + 230), radius=30, fill=hexrgb(a))
    d.polygon([(ox + 430, oy + 230), (ox + 570, oy + 230), (ox + 640, oy + 330), (ox + 360, oy + 330)], fill=shade(c, -0.05))
    body = (ox + 360, oy + 320, ox + 640, oy + 930)
    d.rounded_rectangle(body, radius=70, fill=hexrgb(c), outline=shade(c, -0.35), width=5)
    lighting(L, body, 140, 90)
    label_plate(L, (ox + 395, oy + 460, ox + 605, oy + 740), c, a, p["label"], p["unit"])


def shape_containers(L, ox, oy, p):
    d = ImageDraw.Draw(L)
    c, a = p["color"], p["accent"]
    for i, (x, w, y) in enumerate(((180, 420, 520), (560, 280, 600), (560, 280, 820))):
        box = (ox + x, oy + y - 180 if i == 0 else oy + y - 180, ox + x + w, oy + 900 if i == 0 else oy + y + 40)
        if i == 0:
            box = (ox + 180, oy + 380, ox + 600, oy + 900)
        elif i == 1:
            box = (ox + 640, oy + 380, ox + 900, oy + 630)
        else:
            box = (ox + 640, oy + 650, ox + 900, oy + 900)
        d.rounded_rectangle(box, radius=30, fill=(245, 248, 230, 255), outline=(200, 205, 180, 255), width=4)
        d.rounded_rectangle((box[0] - 8, box[1] - 30, box[2] + 8, box[1] + 30), radius=18, fill=hexrgb(a), outline=shade(a, -0.3), width=3)
    label_plate(L, (ox + 230, oy + 560, ox + 550, oy + 780), c, a, p["label"], p["unit"])


def shape_tawa(L, ox, oy, p):
    d = ImageDraw.Draw(L)
    c, a = p["color"], p["accent"]
    d.rounded_rectangle((ox + 640, oy + 420, ox + 960, oy + 500), radius=40, fill=hexrgb(INK))
    d.ellipse((ox + 80, oy + 220, ox + 700, oy + 760), fill=shade(c, -0.1), outline=shade(c, -0.4), width=8)
    d.ellipse((ox + 150, oy + 280, ox + 630, oy + 700), fill=hexrgb(c))
    d.ellipse((ox + 230, oy + 350, ox + 550, oy + 630), fill=shade(c, -0.08))
    label_plate(L, (ox + 260, oy + 640, ox + 620, oy + 820), c, a, p["label"], p["unit"], radius=24)


def shape_tiffin(L, ox, oy, p):
    d = ImageDraw.Draw(L)
    c, a = p["color"], p["accent"]
    for i in range(3):
        y = oy + 880 - i * 200
        d.rounded_rectangle((ox + 260, y - 190, ox + 740, y), radius=30, fill=shade(c, 0.05 * i), outline=shade(c, -0.35), width=5)
        d.ellipse((ox + 260, y - 215, ox + 740, y - 165), fill=shade(c, 0.25), outline=shade(c, -0.35), width=4)
    d.rounded_rectangle((ox + 470, oy + 200, ox + 530, oy + 900), radius=20, fill=hexrgb(a))
    d.rounded_rectangle((ox + 380, oy + 170, ox + 620, oy + 240), radius=30, fill=hexrgb(a))
    label_plate(L, (ox + 300, oy + 560, ox + 700, oy + 760), c, a, p["label"], p["unit"], radius=24)


def shape_bucket(L, ox, oy, p):
    d = ImageDraw.Draw(L)
    c, a = p["color"], p["accent"]
    d.arc((ox + 230, oy + 80, ox + 770, oy + 520), 200, 340, fill=hexrgb(INK), width=26)
    d.polygon([(ox + 200, oy + 300), (ox + 800, oy + 300), (ox + 720, oy + 900), (ox + 280, oy + 900)], fill=hexrgb(c), outline=shade(c, -0.35))
    d.ellipse((ox + 200, oy + 260, ox + 800, oy + 340), fill=shade(c, 0.2), outline=shade(c, -0.35), width=5)
    d.ellipse((ox + 280, oy + 860, ox + 720, oy + 940), fill=shade(c, -0.2))
    d.rounded_rectangle((ox + 760, oy + 700, ox + 940, oy + 900), radius=30, fill=shade(c, 0.1), outline=shade(c, -0.35), width=4)
    d.rounded_rectangle((ox + 930, oy + 740, ox + 990, oy + 860), radius=20, outline=shade(c, 0.1), width=22)
    lighting(L, (ox + 230, oy + 320, ox + 770, oy + 880))
    label_plate(L, (ox + 330, oy + 470, ox + 670, oy + 700), c, a, p["label"], p["unit"])


def shape_diya(L, ox, oy, p):
    d = ImageDraw.Draw(L)
    c, a = p["color"], p["accent"]
    for (x, y, s) in ((300, 700, 1.0), (620, 720, 1.0), (460, 520, 0.9)):
        w, h = int(260 * s), int(120 * s)
        d.chord((ox + x - w // 2, oy + y - h, ox + x + w // 2, oy + y + h), 0, 180, fill=hexrgb(c), outline=shade(c, -0.4), width=5)
        d.ellipse((ox + x - w // 2, oy + y - h // 3, ox + x + w // 2, oy + y + h // 3), fill=shade(c, 0.25), outline=shade(c, -0.4), width=4)
        fl = Image.new("RGBA", L.size, (0, 0, 0, 0))
        fd = ImageDraw.Draw(fl)
        fd.ellipse((ox + x - 28, oy + y - 150, ox + x + 28, oy + y - 20), fill=hexrgb(SAFFRON))
        fd.ellipse((ox + x - 14, oy + y - 110, ox + x + 14, oy + y - 30), fill=(255, 240, 160, 255))
        fl = fl.filter(ImageFilter.GaussianBlur(3))
        L.alpha_composite(fl)
    label_plate(L, (ox + 300, oy + 830, ox + 700, oy + 960), c, a, p["label"], p["unit"], radius=24)


def shape_notebook(L, ox, oy, p):
    d = ImageDraw.Draw(L)
    c, a = p["color"], p["accent"]
    d.rounded_rectangle((ox + 330, oy + 150, ox + 820, oy + 820), radius=30, fill=shade(c, -0.2), outline=shade(c, -0.4), width=4)
    d.rounded_rectangle((ox + 220, oy + 220, ox + 710, oy + 900), radius=30, fill=hexrgb(c), outline=shade(c, -0.4), width=4)
    d.rectangle((ox + 220, oy + 220, ox + 290, oy + 900), fill=hexrgb(a))
    for y in range(oy + 260, oy + 900, 50):
        d.ellipse((ox + 240, y, ox + 272, y + 32), fill=hexrgb(CREAM))
    d.rounded_rectangle((ox + 350, oy + 300, ox + 650, oy + 360), radius=14, fill=(255, 255, 255, 220))
    for y in range(oy + 400, oy + 760, 42):
        d.line((ox + 340, y, ox + 660, y), fill=(255, 255, 255, 150), width=3)
    label_plate(L, (ox + 330, oy + 600, ox + 670, oy + 820), c, a, p["label"], p["unit"], radius=24)


def shape_pens(L, ox, oy, p):
    d = ImageDraw.Draw(L)
    c, a = p["color"], p["accent"]
    d.rounded_rectangle((ox + 170, oy + 420, ox + 830, oy + 900), radius=30, fill=shade(c, 0.35), outline=shade(c, -0.3), width=4)
    d.rectangle((ox + 170, oy + 420, ox + 830, oy + 470), fill=hexrgb(a))
    for i in range(8):
        x = ox + 230 + i * 72
        d.rounded_rectangle((x, oy + 200, x + 34, oy + 820), radius=16, fill=hexrgb(c), outline=shade(c, -0.4), width=3)
        d.polygon([(x, oy + 820), (x + 34, oy + 820), (x + 17, oy + 870)], fill=hexrgb(INK))
        d.rounded_rectangle((x + 4, oy + 180, x + 30, oy + 260), radius=10, fill=hexrgb(INK))
    label_plate(L, (ox + 280, oy + 620, ox + 720, oy + 800), c, a, p["label"], p["unit"], radius=24)


def shape_bag2(L, ox, oy, p):
    d = ImageDraw.Draw(L)
    c, a = p["color"], p["accent"]
    d.rounded_rectangle((ox + 300, oy + 120, ox + 700, oy + 260), radius=60, outline=hexrgb(INK), width=26)
    body = (ox + 230, oy + 200, ox + 770, oy + 920)
    d.rounded_rectangle(body, radius=110, fill=hexrgb(c), outline=shade(c, -0.35), width=5)
    d.rounded_rectangle((ox + 290, oy + 560, ox + 710, oy + 880), radius=70, fill=shade(c, -0.18), outline=shade(c, -0.35), width=4)
    d.rounded_rectangle((ox + 290, oy + 560, ox + 710, oy + 600), radius=14, fill=hexrgb(INK))
    d.rounded_rectangle((ox + 700, oy + 520, ox + 790, oy + 760), radius=30, fill=shade(c, -0.1), outline=shade(c, -0.35), width=4)
    lighting(L, body)
    hk_badge(L, ox + 500, oy + 400, 90)


SHAPES = {k[6:]: v for k, v in globals().items() if k.startswith("shape_")}


def packshot(p, size=1400):
    canvas = Image.new("RGBA", (size, size), (255, 255, 255, 255))
    L = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ox, oy = (size - 1000) // 2, (size - 1000) // 2 - 20
    soft_shadow(canvas, (ox + 160, oy + 870, ox + 840, oy + 990), blur=45, alpha=80)
    SHAPES[p["shape"]](L, ox, oy, p)
    canvas.alpha_composite(L)
    return canvas


def save_variants(img, base, widths=(1400, 800, 500), fmt="webp", quality=82):
    out_files = {}
    for w in widths:
        im = img if img.width == w else img.resize((w, int(img.height * w / img.width)), Image.LANCZOS)
        suffix = "" if w == widths[0] else f"-p-{w}"
        path = f"{base}{suffix}.{fmt}"
        if fmt == "webp":
            im.convert("RGB" if im.mode == "RGBA" and base.find("products") >= 0 else "RGBA").save(path, "WEBP", quality=quality, method=6)
        else:
            im.save(path)
        out_files[w] = path
    return out_files


# ---------- products ----------
products = []
for cat in C["categories"]:
    for p in C["products"][cat["slug"]]:
        q = dict(p)
        q["category"] = cat["slug"]
        img = packshot(q)
        save_variants(img, os.path.join(out, "products", p["slug"]), (1400, 800, 500))
        q["_img"] = img
        products.append(q)
print("products", len(products))


# ---------- category tiles (774x596 -> 1548x1192) ----------
def tile_bg(size, tint, pattern=True):
    im = gradient(size, hexrgb(tint), shade(tint, -0.06))
    if pattern:
        d = ImageDraw.Draw(im)
        w, h = size
        for i in range(-h, w + h, 90):
            d.line((i, h, i + h, 0), fill=(255, 255, 255, 60), width=3)
    return im


def place(canvas, img, box):
    x0, y0, x1, y1 = box
    im = img.copy()
    im.thumbnail((x1 - x0, y1 - y0), Image.LANCZOS)
    # drop the white background of packshots: make near-white transparent
    px = im.load()
    for yy in range(im.height):
        for xx in range(im.width):
            r, g, b, a = px[xx, yy]
            if r > 246 and g > 246 and b > 246:
                px[xx, yy] = (r, g, b, 0)
    canvas.alpha_composite(im, (int((x0 + x1 - im.width) / 2), int(y1 - im.height)))


by_cat = {}
for q in products:
    by_cat.setdefault(q["category"], []).append(q)
for cat in C["categories"]:
    W, H = 1548, 1192
    im = tile_bg((W, H), cat["tint"])
    d = ImageDraw.Draw(im)
    d.ellipse((W * 0.1, H * 0.86, W * 0.9, H * 1.02), fill=(0, 0, 0, 25))
    items = by_cat[cat["slug"]][:3]
    place(im, items[1]["_img"], (W * 0.3, H * 0.08, W * 0.7, H * 0.92))
    place(im, items[0]["_img"], (W * 0.02, H * 0.22, W * 0.4, H * 0.92))
    place(im, items[2]["_img"], (W * 0.6, H * 0.22, W * 0.98, H * 0.92))
    save_variants(im, os.path.join(out, "categories", cat["slug"]), (1548, 774, 500))
print("categories done")

# ---------- blog covers 1900x1160 ----------
ART = {
    "list": lambda d, cx, cy: [d.rounded_rectangle((cx - 220, cy - 300 + i * 140, cx + 220, cy - 220 + i * 140), radius=28, fill=(255, 255, 255, 40)) or d.ellipse((cx - 190, cy - 285 + i * 140, cx - 140, cy - 235 + i * 140), fill=hexrgb(LIME)) for i in range(4)],
    "tag": lambda d, cx, cy: [d.polygon([(cx - 260, cy - 120), (cx + 120, cy - 120), (cx + 300, cy), (cx + 120, cy + 120), (cx - 260, cy + 120)], fill=hexrgb(SAFFRON)), d.ellipse((cx - 220, cy - 40, cx - 140, cy + 40), fill=hexrgb(FOREST))],
    "compare": lambda d, cx, cy: [d.rounded_rectangle((cx - 320, cy - 60, cx - 60, cy + 300), radius=30, fill=hexrgb(LIME)), d.rounded_rectangle((cx + 60, cy - 300, cx + 320, cy + 300), radius=30, fill=hexrgb(SAFFRON))],
    "diya": lambda d, cx, cy: [d.chord((cx - 260, cy - 60, cx + 260, cy + 260), 0, 180, fill=hexrgb(SAFFRON)), d.ellipse((cx - 50, cy - 260, cx + 50, cy - 40), fill=(255, 230, 120, 255))],
    "garba": lambda d, cx, cy: [d.regular_polygon((cx, cy, 300), 8, rotation=22, fill=hexrgb(SAFFRON)), d.regular_polygon((cx, cy, 180), 8, rotation=22, fill=hexrgb(FOREST)), d.regular_polygon((cx, cy, 90), 8, rotation=22, fill=hexrgb(LIME))],
    "school": lambda d, cx, cy: [d.rounded_rectangle((cx - 240, cy - 240, cx + 240, cy + 260), radius=90, fill=hexrgb(SAFFRON)), d.rounded_rectangle((cx - 150, cy - 320, cx + 150, cy - 200), radius=60, outline=hexrgb(CREAM), width=26), d.rounded_rectangle((cx - 160, cy + 40, cx + 160, cy + 220), radius=40, fill=hexrgb(FOREST))],
    "rain": lambda d, cx, cy: [d.ellipse((cx - 320, cy - 180, cx + 320, cy + 60), fill=hexrgb(ICE))] + [d.rounded_rectangle((cx - 260 + i * 110, cy + 110, cx - 230 + i * 110, cy + 260), radius=15, fill=hexrgb(LIME)) for i in range(6)],
    "bulk": lambda d, cx, cy: [d.rounded_rectangle((cx - 330 + (i % 3) * 230, cy - 60 + (i // 3) * -230, cx - 130 + (i % 3) * 230, cy + 140 + (i // 3) * -230), radius=30, fill=hexrgb(SAFFRON) if i % 2 else hexrgb(LIME)) for i in range(6)],
    "gift": lambda d, cx, cy: [d.rounded_rectangle((cx - 260, cy - 120, cx + 260, cy + 280), radius=40, fill=hexrgb(SAFFRON)), d.rectangle((cx - 40, cy - 120, cx + 40, cy + 280), fill=hexrgb(FOREST)), d.rounded_rectangle((cx - 300, cy - 200, cx + 300, cy - 100), radius=30, fill=hexrgb(LIME))],
}
for post in C["blog"]:
    W, H = 1900, 1160
    im = gradient((W, H), hexrgb(FOREST), hexrgb(MOSS), horizontal=True)
    d = ImageDraw.Draw(im)
    for i in range(-H, W + H, 120):
        d.line((i, H, i + H, 0), fill=(255, 255, 255, 14), width=2)
    ART.get(post["art"], ART["list"])(d, int(W * 0.72), int(H * 0.5))
    tf = font("display", 150)
    lines = wrap(post["title"], tf, int(W * 0.5))
    while len(lines) > 3:
        tf = font("display", tf.size - 12)
        lines = wrap(post["title"], tf, int(W * 0.5))
    y = H * 0.5 - len(lines) * tf.size * 0.55
    for ln in lines:
        d.text((W * 0.07, y), ln, font=tf, fill=hexrgb(CREAM))
        y += tf.size * 1.08
    d.rounded_rectangle((W * 0.07, H * 0.12, W * 0.07 + 420, H * 0.12 + 70), radius=35, fill=hexrgb(LIME))
    text_center(d, (W * 0.07 + 210, H * 0.12 + 35), "HARE KRISHNA MALL", font("geo", 30), hexrgb(FOREST))
    save_variants(im, os.path.join(out, "blog", post["slug"]), (1900, 1000, 500))
print("blog done")

# ---------- story images 1200x900 ----------
def story_image(idx):
    W, H = 1200, 900
    tint = [LIME, SAFFRON, ICE][idx]
    im = tile_bg((W, H), shade_hex(tint, 0.7))
    d = ImageDraw.Draw(im)
    if idx == 0:  # mission: a store front
        d.rounded_rectangle((150, 300, 1050, 820), radius=30, fill=hexrgb(CREAM), outline=hexrgb(FOREST), width=8)
        for i in range(9):
            d.polygon([(150 + i * 100, 300), (250 + i * 100, 300), (250 + i * 100, 380), (150 + i * 100, 380)], fill=hexrgb(LIME) if i % 2 else hexrgb(SAFFRON))
        d.rounded_rectangle((520, 520, 680, 820), radius=20, fill=hexrgb(FOREST))
        d.rounded_rectangle((200, 520, 460, 720), radius=16, fill=hexrgb(ICE), outline=hexrgb(FOREST), width=6)
        d.rounded_rectangle((740, 520, 1000, 720), radius=16, fill=hexrgb(ICE), outline=hexrgb(FOREST), width=6)
        d.rounded_rectangle((300, 160, 900, 270), radius=30, fill=hexrgb(FOREST))
        text_center(d, (600, 215), "HARE KRISHNA SUPERMARKET", font("display", 54), hexrgb(CREAM))
    elif idx == 1:  # vision: two town markers
        d.line((300, 620, 900, 420), fill=hexrgb(FOREST), width=10)
        for (x, y, name) in ((300, 620, "VIRPUR"), (900, 420, "LALSAR")):
            d.ellipse((x - 120, y - 120, x + 120, y + 120), fill=hexrgb(FOREST))
            d.ellipse((x - 70, y - 70, x + 70, y + 70), fill=hexrgb(SAFFRON))
            d.polygon([(x - 60, y + 90), (x + 60, y + 90), (x, y + 200)], fill=hexrgb(FOREST))
            text_center(d, (x, y + 260), name, font("display", 60), hexrgb(FOREST))
        text_center(d, (600, 170), "VIRPUR  ·  LALSAR", font("display", 70), hexrgb(FOREST))
    else:  # expertise: shelves with packshots
        for row, y in enumerate((420, 700)):
            d.rectangle((120, y, 1080, y + 24), fill=hexrgb(FOREST))
            for k in range(4):
                q = products[(row * 4 + k) % len(products)]
                place(im, q["_img"], (150 + k * 235, y - 230, 350 + k * 235, y))
        d.rounded_rectangle((300, 150, 900, 260), radius=30, fill=hexrgb(FOREST))
        text_center(d, (600, 205), "EVERYTHING UNDER ONE ROOF", font("display", 50), hexrgb(LIME))
    return im


def shade_hex(h, k):
    r, g, b, _ = shade(h, k)
    return "#%02x%02x%02x" % (r, g, b)


for i in range(3):
    save_variants(story_image(i), os.path.join(out, "story", f"story-{i + 1}"), (1200, 800, 500))
print("story done")

# ---------- logos ----------
def chroma_key(path):
    im = Image.open(path).convert("RGBA")
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            m = max(r, g, b)
            # dark green background: max channel below ~70; logo colours are bright
            if m < 78:
                px[x, y] = (r, g, b, 0)
            elif m < 118:
                px[x, y] = (r, g, b, int((m - 78) / 40 * 255))
    bbox = im.getbbox()
    return im.crop(bbox)


horiz = chroma_key(os.path.join(logos_dir, "horizontal-dark.png"))
horiz.save(os.path.join(out, "logo-horizontal.png"))
stacked = Image.open(os.path.join(logos_dir, "stacked-transparent.png")).convert("RGBA")
stacked = stacked.crop(stacked.getbbox())
stacked.save(os.path.join(out, "logo-stacked.png"))
icon = Image.open(os.path.join(logos_dir, "icon.png")).convert("RGBA")
icon.save(os.path.join(out, "logo-icon.png"))
# square icons on forest green for favicon / apple touch
for name, size in (("icon.png", 256), ("apple-icon.png", 180)):
    sq = Image.new("RGBA", (size, size), hexrgb(FOREST))
    ic = icon.copy()
    ic.thumbnail((int(size * 0.8), int(size * 0.8)), Image.LANCZOS)
    sq.alpha_composite(ic, ((size - ic.width) // 2, (size - ic.height) // 2))
    sq.save(os.path.join(out, name))
print("logos done", horiz.size, stacked.size)

# ---------- about hero 1920x1080, contact 1418x1652, cta 667x492, og 1200x630 ----------
def brand_bg(size):
    im = gradient(size, hexrgb(FOREST), hexrgb(MOSS))
    glow = Image.new("RGBA", size, (0, 0, 0, 0))
    g = ImageDraw.Draw(glow)
    w, h = size
    g.ellipse((-w * 0.3, h * 0.5, w * 0.5, h * 1.3), fill=(30, 65, 20, 160))
    glow = glow.filter(ImageFilter.GaussianBlur(int(w * 0.08)))
    im.alpha_composite(glow)
    return im


W, H = 1920, 1080
im = brand_bg((W, H))
lg = stacked.copy()
lg.thumbnail((700, 620), Image.LANCZOS)
im.alpha_composite(lg, ((W - lg.width) // 2, 150))
d = ImageDraw.Draw(im)
text_center(d, (W // 2, 830), "VIRPUR  ·  LALSAR", font("display", 64), hexrgb(LIME))
text_center(d, (W // 2, 900), "Everything under one roof, close to home", font("geo", 34), hexrgb(CREAM))
for k in range(8):
    q = products[(k * 5) % len(products)]
    place(im, q["_img"], (40 + k * 240, 930, 230 + k * 240, 1090))
im.convert("RGB").save(os.path.join(out, "about-hero.jpg"), quality=85)
im.resize((960, 540), Image.LANCZOS).convert("RGB").save(os.path.join(out, "about-hero-p-960.jpg"), quality=82)

W, H = 1418, 1652
im = brand_bg((W, H))
d = ImageDraw.Draw(im)
lg = stacked.copy()
lg.thumbnail((900, 700), Image.LANCZOS)
im.alpha_composite(lg, ((W - lg.width) // 2, 180))
text_center(d, (W // 2, 960), "JAY SHREE KRISHNA", font("display", 110), hexrgb(SAFFRON))
text_center(d, (W // 2, 1050), "We are here to help", font("geo", 44), hexrgb(CREAM))
for (y, name, sub) in ((1200, "VIRPUR", "Main branch"), (1400, "LALSAR", "Branch near Virpur")):
    d.rounded_rectangle((200, y - 70, W - 200, y + 70), radius=40, fill=hexrgb(LIME), outline=hexrgb(LIME), width=4)
    d.ellipse((250, y - 40, 330, y + 40), fill=hexrgb(SAFFRON))
    d.polygon([(260, y + 20), (320, y + 20), (290, y + 70)], fill=hexrgb(SAFFRON))
    d.text((370, y - 44), name, font=font("display", 60), fill=hexrgb(FOREST))
    d.text((370, y + 14), sub, font=font("geo", 28), fill=hexrgb(FOREST))
im.convert("RGB").save(os.path.join(out, "contact.jpg"), quality=85)

for n, idxs, tint in ((1, (0, 7, 13), LIME), (2, (18, 24, 30), SAFFRON)):
    W, H = 667, 492
    im = tile_bg((W, H), shade_hex(tint, 0.72))
    for k, i in enumerate(idxs):
        place(im, products[i % len(products)]["_img"], (20 + k * 215, 60, 215 + k * 215, 450))
    im.convert("RGB").save(os.path.join(out, f"cta-{n}.jpg"), quality=85)

W, H = 1200, 630
im = brand_bg((W, H))
lg = horiz.copy()
lg.thumbnail((900, 330), Image.LANCZOS)
im.alpha_composite(lg, ((W - lg.width) // 2, 120))
d = ImageDraw.Draw(im)
text_center(d, (W // 2, 520), "Everything under one roof  ·  Virpur & Lalsar", font("geo", 34), hexrgb(CREAM))
im.convert("RGB").save(os.path.join(out, "og.jpg"), quality=88)

# ---------- avatars 200x200 ----------
for i, r in enumerate(C["reviews"]):
    im = Image.new("RGBA", (200, 200), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    col = [LIME, SAFFRON, ICE, CREAM][i % 4]
    d.ellipse((0, 0, 200, 200), fill=hexrgb(col))
    d.ellipse((10, 10, 190, 190), outline=hexrgb(FOREST), width=6)
    text_center(d, (100, 108), r["initials"], font("display", 92), hexrgb(FOREST))
    im.save(os.path.join(out, "avatars", f"{r['initials'].lower()}.webp"), "WEBP", quality=90)
print("all done")
