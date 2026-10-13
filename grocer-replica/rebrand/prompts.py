"""Write one AI-image-generator prompt per brand image, as .txt files named after the image.

Usage: python3 -I prompts.py <content.json> <outDir>
The folder layout and file names mirror public/brand/ so the generated images can be dropped in.
"""
import json, os, sys

content_path, out = sys.argv[1:3]
C = json.load(open(content_path, encoding="utf8"))
B = C["brand"]
P = B["palette"]

STYLE = (
    "STYLE (same for every image): clean, modern, premium supermarket photography look, bright and sharp, "
    "warm natural light, Indian small-town retail context (Gujarat). Brand palette: lime green {lime}, saffron amber {saffron}, "
    "deep forest green {forest}, cream white {cream}, ice blue {ice}. No real brand names, no celebrity, no watermark, "
    "no extra text except what is listed. Krishna rules: the logo must never be cropped, distorted, recoloured or placed next to footwear, "
    "meat or alcohol. Keep clear space around the logo."
).format(lime=P["lime"], saffron=P["saffron"], forest=P["forest"], cream=P["cream"], ice=P["iceBlue"])

LOGOS = {
    "icon": "ADD THIS LOGO: the icon-only logo (cart + Krishna mark, transparent PNG, file logo-icon.png)",
    "horizontal": "ADD THIS LOGO: the horizontal lockup (cart mark left, 'hare krishna SUPERMARKET' wordmark right, file logo-horizontal.png)",
    "stacked": "ADD THIS LOGO: the stacked lockup (cart mark on top, 'hare krishna SUPERMARKET' below, file logo-stacked.png)",
}

files = {}


def add(path, size, ratio, body, logo=None):
    text = [
        f"IMAGE FILE: {path}",
        f"SIZE: {size} px (aspect ratio {ratio}). Deliver at this size or larger with the same ratio.",
        "",
        "PROMPT:",
        body.strip(),
        "",
    ]
    if logo:
        text.append(logo)
        text.append("")
    text.append(STYLE)
    files[path] = "\n".join(text) + "\n"


# ---------- products (36): studio packshots on pure white ----------
SHAPE_WORDS = {
    "sack": "a sturdy woven or laminated sack with a stitched top",
    "bag": "a sealed plastic bag with a crimped top",
    "pouch": "a stand-up foil pouch with a top seal",
    "box": "a rectangular carton box seen slightly from the front-left",
    "bottle": "a plastic bottle with a screw cap",
    "softbottle": "a PET soft-drink bottle with a cap",
    "carton": "a tetra-pack style carton with a small cap",
    "soap": "four bars stacked in a wrapped value pack",
    "pump": "a tall bottle with a pump dispenser",
    "tube": "a squeezable tube standing on its cap",
    "jar": "a squat jar with a wide lid",
    "can": "a round tin with a metal lid",
    "jug": "a jerry-can style bottle with a side handle",
    "roll": "three rolls standing side by side in a wrapper",
    "cooker": "an aluminium pressure cooker with a black handle and safety valve",
    "steelbottle": "a slim stainless-steel bottle with a dark cap",
    "containers": "a set of six airtight plastic containers in three sizes, stacked",
    "tawa": "a round non-stick tawa with a cool-touch handle, slight top-down angle",
    "tiffin": "a three-tier stainless steel tiffin with a locking clip",
    "bucket": "a 20-litre plastic bucket with a matching mug beside it",
    "diya": "a set of small brass diyas, three in front with lit flames, the rest in a box behind",
    "notebook": "two spiral-bound notebooks with a plain cover, fanned slightly",
    "pens": "an open box of twenty blue ball pens",
    "bag2": "a padded school backpack with two compartments and a bottle pocket",
}
for cat in C["categories"]:
    for p in C["products"][cat["slug"]]:
        label = p["label"] or p["name"].upper()
        body = (
            f"Studio product photo (packshot) of {p['name']} ({p['unit']}): {SHAPE_WORDS[p['shape']]}. "
            f"Generic, unbranded packaging in the main colour {p['color']} with accents in {p['accent']}. "
            f"The pack label reads only \"{label}\" in bold condensed capitals and \"{p['unit']}\" smaller underneath. "
            f"Category: {cat['name']}. {p['description']} "
            "Product centred, filling about 70% of the frame, pure white background (#FFFFFF), soft natural shadow under the product, "
            "no props, photorealistic, e-commerce catalogue quality."
        )
        add(f"products/{p['slug']}.webp", "1400 x 1400", "1:1", body,
            LOGOS["icon"] + " small on the top-left corner of the pack label, like a store own-brand mark.")

# ---------- category tiles (6) ----------
CAT_SCENE = {
    "groceries-staples": "a tidy supermarket aisle with family-size bags of rice, atta and sugar, pouches of dal, bottles of cooking oil and tea packs stacked on clean shelves",
    "snacks-beverages": "a bright snack and beverage aisle with namkeen pouches, biscuit family packs, chips, bottles of cold drink and juice cartons",
    "personal-care": "a personal care aisle with soaps, shampoo bottles, toothpaste packs, hair oil and face cream jars neatly faced on shelves",
    "home-cleaning": "a home-care aisle with detergent packs, dishwash bars, floor cleaner and toilet cleaner bottles, garbage bag rolls and repellent refills",
    "kitchen-plastics": "a kitchenware section with pressure cookers, steel bottles, stacked plastic containers, non-stick tawas, tiffins and colourful buckets",
    "pooja-stationery": "a pooja and stationery corner with agarbatti boxes, brass diyas, camphor, notebooks, pen boxes and school bags",
}
for cat in C["categories"]:
    body = (
        f"Category banner for \"{cat['name']}\": {CAT_SCENE[cat['slug']]}. Wide shot, shelves slightly angled, "
        f"products generic and unbranded, lime-green shelf-edge labels, clean floor, no people, no readable brand names, "
        "modern organised small-town supermarket in India."
    )
    add(f"categories/{cat['slug']}.webp", "1548 x 1192", "4:3 (landscape)", body,
        LOGOS["icon"] + " on a small shelf-edge sign in the scene (optional, keep it small).")

# ---------- blog covers (9) ----------
BLOG_SCENE = {
    "list": "a handwritten monthly grocery list on a notepad lying on a kitchen counter next to a shopping bag of staples",
    "tag": "a close-up of a supermarket shelf-edge price label showing two prices, MRP and our price, with packs behind it",
    "compare": "two similar generic packs side by side on a shelf with a hand comparing them, price labels visible",
    "diya": "a Diwali shopping flat-lay: lit brass diyas, agarbatti, sweets ingredients, gift packs and cleaning supplies on a cream cloth",
    "garba": "a Navratri-themed flat-lay: fasting staples, fruits, dry fruits, ghee, a small garba lamp and saffron-and-green decorations",
    "school": "back-to-school flat-lay: notebooks, pens, a steel tiffin, a water bottle and a red school bag on a wooden table",
    "rain": "monsoon home essentials: airtight containers, floor cleaner, mosquito repellent and dry snacks arranged by a window with rain outside",
    "bulk": "family-size bulk packs of rice, atta, oil and detergent loaded in a shopping trolley in a supermarket aisle",
    "gift": "wedding-season shopping: pressure cookers, dinner set, steel bottles and gift packs arranged like a display",
}
for post in C["blog"]:
    body = (
        f"Editorial cover photo for the article \"{post['title']}\": {BLOG_SCENE[post['art']]}. "
        "Leave the LEFT 45% of the frame calmer and darker so a headline can be overlaid later. Generic unbranded products, "
        "warm light, shallow depth of field."
    )
    add(f"blog/{post['slug']}.webp", "1900 x 1160", "about 1.64:1 (landscape)", body,
        LOGOS["horizontal"] + " small in the bottom-right corner on a dark strip.")

# ---------- story images (3) ----------
add("story/story-1.webp", "1200 x 900", "4:3", (
    "Exterior of a modern small-town supermarket in Gujarat, India, in daylight: wide glass front, a long signboard above the entrance, "
    "a few two-wheelers parked at the side, clean forecourt, deep-forest-green and lime-green facade colours. Mission theme: welcoming, trustworthy."
), LOGOS["stacked"] + " large and centred on the signboard above the entrance; the sign background is deep forest green " + P["forest"] + ".")
add("story/story-2.webp", "1200 x 900", "4:3", (
    "Stylised illustrated map of two neighbouring small towns in Gujarat connected by a road, with two location pins labelled exactly \"Virpur\" "
    "and \"Lalsar\", surrounding villages drawn as small clusters of houses and farmland. Flat illustration, lime green, saffron and forest green palette. "
    "Vision theme: serving the towns and the villages around them. Do NOT add any third pin or 'coming soon' marker."
), LOGOS["icon"] + " inside each of the two location pins.")
add("story/story-3.webp", "1200 x 900", "4:3", (
    "Inside a well-organised supermarket: a staff member in a plain forest-green shirt facing products on a neat shelf, clear lime-green shelf labels, "
    "a tidy aisle stretching back. Expertise theme: organised, experienced retail. No readable brand names."
), LOGOS["icon"] + " embroidered small on the staff shirt pocket.")

# ---------- about hero, contact, CTA, OG ----------
add("about-hero.jpg", "1920 x 1080", "16:9", (
    "Wide interior shot of a bright, modern small-town supermarket in India: long organised aisles, lime-green shelf labels, a billing counter "
    "at the back, soft daylight from the front. A large illuminated brand panel is mounted on the back wall. No people in focus, no readable brand names."
), LOGOS["stacked"] + " large on the illuminated back-wall panel, panel background deep forest green " + P["forest"] + ".")
add("contact.jpg", "1418 x 1652", "about 6:7 (portrait)", (
    "Portrait photo of a friendly supermarket staff member (Indian, 30s, warm smile) standing at a billing counter in a clean store, "
    "hands folded in a respectful namaste gesture, forest-green shirt, blurred organised shelves behind. Welcoming 'we are here to help' mood."
), LOGOS["icon"] + " embroidered on the shirt pocket and " + LOGOS["horizontal"].replace("ADD THIS LOGO: ", "the ") + " on a small counter sign in the background.")
add("cta-1.jpg", "667 x 492", "4:3", (
    "Group shot of family-size grocery packs on a cream-coloured surface: a 5 kg bag of rice, a 10 kg bag of atta, a pouch of dal and a bottle of oil, "
    "generic labels, soft shadow, slightly angled from above."
))
add("cta-2.jpg", "667 x 492", "4:3", (
    "Group shot of kitchenware and home care on a cream-coloured surface: a pressure cooker, a steel bottle, a stack of plastic containers and a detergent pack, "
    "generic labels, soft shadow, slightly angled from above."
))
add("og.jpg", "1200 x 630", "about 1.9:1", (
    "Social-media preview card: deep forest green " + P["forest"] + " background with a subtle moss-green glow in the bottom-left corner, "
    "a soft row of generic grocery packs faded along the bottom edge, and one line of small cream text at the bottom centre: "
    "\"Everything under one roof · Virpur & Lalsar\". Nothing else."
), LOGOS["horizontal"] + " large and centred, taking about 70% of the width.")

# ---------- avatars (8) ----------
AV = {
    "HP": "a Gujarati woman in her late 30s, friendly smile, simple cotton kurta, soft indoor light",
    "RB": "a Gujarati farmer in his 50s, kind face, white shirt, outdoors near fields",
    "KJ": "a Gujarati woman in her 40s, confident smile, salwar kameez, home background",
    "MS": "a young Gujarati woman in her 20s, cheerful, modern casual wear",
    "JR": "a Gujarati man in his 40s, moustache, friendly, formal shirt",
    "BD": "a Gujarati woman in her 50s, warm expression, traditional saree",
    "PG": "a Gujarati man in his 60s, calm smile, kurta, village background",
    "NV": "a young Gujarati woman in her early 20s, student, bright smile",
}
for r in C["reviews"]:
    add(f"avatars/{r['initials'].lower()}.webp", "200 x 200", "1:1", (
        f"Square head-and-shoulders portrait for a customer review by {r['name']} ({r['role']}): {AV[r['initials']]}. "
        "Photorealistic, centred face, plain softly blurred background, natural skin tones. This will be shown as a round avatar."
    ))

os.makedirs(out, exist_ok=True)
for path, text in files.items():
    full = os.path.join(out, os.path.splitext(path)[0] + ".txt")
    os.makedirs(os.path.dirname(full), exist_ok=True)
    open(full, "w", encoding="utf8").write(text)

readme = f"""HARE KRISHNA SUPERMARKET – IMAGE PROMPTS
=========================================

There is one .txt prompt per image. The .txt file name and folder are exactly the image file I need back,
with the extension changed. Example: products/basmati-rice-5kg.txt  ->  products/basmati-rice-5kg.webp
(PNG or JPG with the same base name is also fine; I will convert.)

Folders: products/ (36 packshots on white), categories/ (6), blog/ (9), story/ (3), avatars/ (8),
and single files about-hero, contact, cta-1, cta-2, og.

Every prompt lists the SIZE and aspect ratio. Please keep the ratio; bigger is fine.

LOGO FILES referenced in the prompts (use the originals, never redraw):
  logo-icon.png        icon only: cart + Krishna mark, transparent background
  logo-horizontal.png  horizontal lockup: mark left, wordmark right
  logo-stacked.png     stacked lockup: mark on top, wordmark below
When a prompt says "ADD THIS LOGO" it names which file and where it goes.

Brand palette: lime {P['lime']}, saffron {P['saffron']}, forest green {P['forest']}, cream {P['cream']}, ice blue {P['iceBlue']}.

When done, zip the folder keeping the same structure and send it back.
"""
open(os.path.join(out, "README.txt"), "w", encoding="utf8").write(readme)
print(len(files), "prompts written to", out)
