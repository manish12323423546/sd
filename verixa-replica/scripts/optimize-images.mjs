// One-off media pipeline: capture ZIP assets -> public/img (WebP, two widths) + public/svg,
// and src/data/images.json (intrinsic sizes for width/height attributes, so no layout shift).
// Usage: node scripts/optimize-images.mjs <path-to-capture/assets>
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const src = process.argv[2];
if (!src) throw new Error("usage: node scripts/optimize-images.mjs <capture/assets>");
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const outImg = path.join(root, "public/img");
const outSvg = path.join(root, "public/svg");
const outFont = path.join(root, "src/fonts");
const WIDTHS = [640, 960, 1440];
const manifest = {};

for (const file of fs.readdirSync(src).sort()) {
  const ext = path.extname(file).toLowerCase();
  const name = path.basename(file, ext);
  const full = path.join(src, file);
  if (ext === ".svg") {
    fs.copyFileSync(full, path.join(outSvg, file));
  } else if (ext === ".woff2") {
    fs.copyFileSync(full, path.join(outFont, file));
  } else if ([".avif", ".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
    const meta = await sharp(full).metadata();
    const widths = [...new Set(WIDTHS.map((w) => Math.min(w, meta.width)))];
    for (const w of widths) {
      await sharp(full)
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: ext === ".png" ? 90 : 74, effort: 6, alphaQuality: 90 })
        .toFile(path.join(outImg, `${name}-${w}.webp`));
    }
    manifest[name] = { w: meta.width, h: meta.height, widths };
  }
}
fs.writeFileSync(path.join(root, "src/data/images.json"), JSON.stringify(manifest, null, 1) + "\n");
console.log(`images: ${Object.keys(manifest).length}`);
