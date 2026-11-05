import * as THREE from 'three';
import { tfbm, mulberry32 } from './shared.js';

function canvas(n) {
  const c = document.createElement('canvas');
  c.width = c.height = n;
  return c;
}

function toTexture(c, srgb = true, repeat = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

// Height -> tangent-space normal map
function normalFromHeight(h, n, strength) {
  const c = canvas(n);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(n, n);
  const at = (x, y) => h[((y + n) % n) * n + ((x + n) % n)];
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const l = Math.hypot(dx, dy, 1);
      const i = (y * n + x) * 4;
      img.data[i] = ((-dx / l) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((dy / l) * 0.5 + 0.5) * 255;
      img.data[i + 2] = ((1 / l) * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  return toTexture(c, false);
}

// Ashlar sandstone: staggered courses, per-block tint, chipped edges, weathering streaks.
// Texture covers 4 m x 4 m (UVs are in metres / 4).
export function makeStone(seed = 1, opts = {}) {
  const n = 1024;
  const rand = mulberry32(seed);
  const courses = opts.courses || 18;
  const ch = n / courses;
  const h = new Float32Array(n * n);
  const col = new Float32Array(n * n * 3);
  // per-course block layout
  const rows = [];
  for (let r = 0; r < courses; r++) {
    const blocks = [];
    let x = -rand() * ch * 2;
    while (x < n) {
      const w = ch * (1.6 + rand() * 2.4);
      blocks.push({ x0: x, x1: x + w, tint: rand(), tint2: rand() });
      x += w;
    }
    rows.push(blocks);
  }
  const base = opts.base || [0.66, 0.43, 0.24];
  for (let y = 0; y < n; y++) {
    const r = Math.floor(y / ch);
    const fy = (y % ch) / ch;
    const blocks = rows[r];
    for (let x = 0; x < n; x++) {
      let b = blocks[0];
      for (const bb of blocks) if (x >= bb.x0 && x < bb.x1) { b = bb; break; }
      // wrap: last block segment toward n continues into first
      const fx = (x - b.x0) / (b.x1 - b.x0);
      const u = x / n, v = y / n;
      const grain = tfbm(u * 24, v * 24, 24, 4, seed);
      const big = tfbm(u * 4, v * 4, 4, 4, seed + 7);
      const streak = tfbm(u * 30, v * 3, 30, 3, seed + 3);
      // mortar joints with chipped edges
      const chip = tfbm(u * 64, v * 64, 64, 2, seed + 11) * 0.06;
      const ex = Math.min(fx, 1 - fx) * (b.x1 - b.x0) / ch;
      const ey = Math.min(fy, 1 - fy);
      const edge = Math.min(ex, ey);
      const joint = smooth(0.015 + chip, 0.05 + chip, edge);
      const hv = joint * (0.7 + 0.3 * grain) - (1 - joint) * 0.2 + big * 0.15;
      h[y * n + x] = hv;
      // colour
      const t = b.tint, t2 = b.tint2;
      let cr = base[0] * (0.82 + 0.3 * t) * (0.85 + 0.3 * grain);
      let cg = base[1] * (0.82 + 0.28 * t) * (0.85 + 0.3 * grain);
      let cb = base[2] * (0.78 + 0.35 * t2) * (0.85 + 0.3 * grain);
      // a few redder / darker blocks
      if (t2 > 0.86) { cr *= 1.05; cg *= 0.82; cb *= 0.75; }
      if (t2 < 0.08) { cr *= 0.8; cg *= 0.78; cb *= 0.76; }
      // weathering: dark vertical streaks + lighter worn faces
      const w = 0.85 + 0.25 * streak - 0.12 * smooth(0.55, 0.8, big);
      cr *= w; cg *= w; cb *= w;
      // joints darker
      const j = 0.72 + 0.28 * joint;
      const i = (y * n + x) * 3;
      col[i] = cr * j; col[i + 1] = cg * j; col[i + 2] = cb * j;
    }
  }
  const c = canvas(n);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(n, n);
  for (let i = 0; i < n * n; i++) {
    img.data[i * 4] = lin2srgb(col[i * 3]);
    img.data[i * 4 + 1] = lin2srgb(col[i * 3 + 1]);
    img.data[i * 4 + 2] = lin2srgb(col[i * 3 + 2]);
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return { map: toTexture(c), normalMap: normalFromHeight(h, n, 2.5) };
}

// Dusty ground / paving texture (covers 8 m).
export function makeGround(seed = 5) {
  const n = 512;
  const h = new Float32Array(n * n);
  const c = canvas(n);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(n, n);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const u = x / n, v = y / n;
      const g = tfbm(u * 16, v * 16, 16, 5, seed);
      const big = tfbm(u * 3, v * 3, 3, 3, seed + 2);
      const peb = tfbm(u * 80, v * 80, 80, 2, seed + 9);
      const hv = g * 0.6 + peb * 0.4;
      h[y * n + x] = hv;
      const k = 0.75 + 0.45 * g + 0.15 * (peb - 0.5);
      const r = 0.50 * k * (0.9 + 0.2 * big), gg = 0.34 * k, b = 0.20 * k * (1.05 - 0.2 * big);
      const i = (y * n + x) * 4;
      img.data[i] = lin2srgb(r); img.data[i + 1] = lin2srgb(gg); img.data[i + 2] = lin2srgb(b); img.data[i + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  return { map: toTexture(c), normalMap: normalFromHeight(h, n, 3) };
}

// Palm frond leaflets with alpha.
export function makeFrond(seed = 3) {
  const w = 128, hgt = 512;
  const c = document.createElement('canvas');
  c.width = w; c.height = hgt;
  const ctx = c.getContext('2d');
  const rand = mulberry32(seed);
  ctx.clearRect(0, 0, w, hgt);
  // rachis
  ctx.strokeStyle = '#5a4a22';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(w / 2, hgt); ctx.lineTo(w / 2, 0); ctx.stroke();
  for (let y = hgt - 8; y > 6; y -= 5 + rand() * 2) {
    const t = y / hgt;
    const len = (w / 2 - 4) * Math.sin(Math.PI * Math.min(1, (1 - t) * 1.1 + 0.05)) * (0.85 + rand() * 0.2);
    for (const s of [-1, 1]) {
      const g = 70 + rand() * 50, r = 40 + rand() * 40, b = 18 + rand() * 18;
      ctx.strokeStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
      ctx.lineWidth = 2.5 + rand() * 1.5;
      ctx.beginPath();
      ctx.moveTo(w / 2, y);
      ctx.quadraticCurveTo(w / 2 + s * len * 0.5, y - 10, w / 2 + s * len, y - 18 - rand() * 8);
      ctx.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Fine cloth weave for sails / flags (greyscale, multiplied by vertex colour).
export function makeCloth() {
  const n = 256;
  const c = canvas(n);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(n, n);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const u = x / n, v = y / n;
      const weave = 0.9 + 0.06 * Math.sin(x * 1.6) * Math.sin(y * 1.6);
      const stain = 0.8 + 0.2 * tfbm(u * 4, v * 4, 4, 4, 41);
      const seam = (y % 42) < 2 ? 0.8 : 1.0;
      const k = weave * stain * seam;
      const i = (y * n + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.min(255, k * 255); img.data[i + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  return toTexture(c);
}

function smooth(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
function lin2srgb(v) {
  v = Math.max(0, Math.min(1, v));
  return (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055) * 255;
}

// Lime plaster washed in ochre, mottled and weathered (covers 4 m).
export function makePlaster(seed = 61) {
  const n = 512;
  const h = new Float32Array(n * n);
  const c = document.createElement('canvas');
  c.width = c.height = n;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(n, n);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const u = x / n, v = y / n;
      const mot = tfbm(u * 6, v * 6, 6, 5, seed);
      const fine = tfbm(u * 48, v * 48, 48, 3, seed + 4);
      const streak = tfbm(u * 20, v * 2, 20, 3, seed + 8);
      // patches where plaster has fallen and stone shows
      const loss = smooth(0.74, 0.8, tfbm(u * 3, v * 3, 3, 5, seed + 13)) * 0.8;
      const course = (y % 37) < 2 ? 0.75 : 1.0;
      h[y * n + x] = fine * 0.5 + mot * 0.3 - loss * 0.4 * (course < 1 ? 1.4 : 1);
      let r = 0.70, g = 0.47, b = 0.26;
      const k = (0.82 + 0.3 * mot + 0.08 * fine) * (0.86 + 0.2 * streak);
      r *= k; g *= k; b *= k;
      if (loss > 0) { const s = 0.78 * (loss < 1 ? 1 : course); r = r * (1 - loss) + 0.55 * s * loss; g = g * (1 - loss) + 0.36 * s * loss; b = b * (1 - loss) + 0.22 * s * loss; }
      const i = (y * n + x) * 4;
      img.data[i] = lin2srgb(r); img.data[i + 1] = lin2srgb(g); img.data[i + 2] = lin2srgb(b); img.data[i + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  return { map: toTexture(c), normalMap: normalFromHeight(h, n, 1.6) };
}
