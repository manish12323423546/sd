import * as THREE from 'three';
import { islandRadius, mulberry32, fbm, vnoise } from './shared.js';
import { Batch, M, chain, box, shikhara, samvarana, chhatri, pillar, shade, BOX, CYL8, CYL16 } from './build.js';

// ---- layout ----
export const GHAT_TH = -2.95; // ghats face the setting sun
export const HARBOUR_TH = 1.0;
export const AVENUES = Array.from({ length: 8 }, (_, k) => GHAT_TH + (k * Math.PI) / 4);
export const RINGS = [190, 290, 372];
export const PRECINCT = 96; // half-size of the temple precinct square
export const TEMPLE_ROT = -GHAT_TH + Math.PI; // local +x points away from ghats (sanctum at back)

const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

export function groundHeight(x, z) {
  const r = Math.hypot(x, z);
  const th = Math.atan2(z, x);
  const R = islandRadius(th);
  const t = R - r;
  let h = -6 * (1 - smooth(-30, 0, t)) + 4.5 * smooth(0, 16, t);
  h += 5.5 * Math.exp(-((r / 180) ** 2));
  h += (fbm(x * 0.01, z * 0.01, 3, 4) - 0.5) * 1.4 * smooth(-5, 30, t);
  // ghats: carve the terrain down to the step profile
  {
    const c = Math.cos(GHAT_TH), sn = Math.sin(GHAT_TH);
    const Rg = islandRadius(GHAT_TH);
    const along = x * c + z * sn, lat = -x * sn + z * c;
    if (Math.abs(lat) < 84 && along > Rg - 32) {
      const t = (along - (Rg - 22.9)) / 31.5;
      const sy = 4.2 - Math.min(1, Math.max(0, t)) * 6.8;
      const fadeL = smooth(76, 84, Math.abs(lat));
      h = Math.min(h, sy - 0.6 + fadeL * 20);
    }
  }
  // rocks on the shore
  h += (vnoise(x * 0.12, z * 0.12, 9) - 0.5) * 1.6 * (smooth(-30, 0, t) * (1 - smooth(0, 14, t)));
  return h;
}

function smooth(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

function streetMask(x, z) {
  const r = Math.hypot(x, z);
  const th = Math.atan2(z, x);
  let m = 0;
  if (r > PRECINCT * 0.9) for (const a of AVENUES) { const d = Math.abs(Math.sin(angDiff(th, a))) * r; if (Math.cos(angDiff(th, a)) > 0) m = Math.max(m, 1 - smooth(5, 9, d)); }
  for (const rr of RINGS) m = Math.max(m, 1 - smooth(3.5, 6.5, Math.abs(r - rr)));
  return m;
}

// ---- palette (linear multipliers on the stone texture) ----
const STONES = [
  [1.0, 0.93, 0.82], // honey
  [1.08, 0.9, 0.72], // golden ochre
  [1.0, 0.8, 0.62], // amber
  [1.08, 0.86, 0.76], // rose-gold
  [0.95, 0.66, 0.52], // red sandstone
];

export function buildCity(mats) {
  Batch.ground = groundHeight;
  const lamp = new Batch(), stone = new Batch(), stone2 = new Batch(), plaster = new Batch(), gold = new Batch(), dark = new Batch(), cloth = new Batch(), wood = new Batch();
  const B = { stone, stone2, plaster, gold, dark, cloth, wood, lamp };
  const flags = [];
  const torches = [];

  // ---------- terrain ----------
  const terrain = makeTerrain();

  // ---------- main temple ----------
  const T = M(0, groundHeight(0, 0) - 0.4, 0, TEMPLE_ROT);
  mainTemple(B, T, flags);

  // precinct: wall, shrines, courtyard paving
  precinct(B, flags);

  // ---------- city fabric ----------
  houses(B, flags);

  // ---------- defences / waterfront ----------
  ramparts(B, flags);
  ghats(B, flags);
  harbour(B);
  torana(B);

  const group = new THREE.Group();
  group.add(terrain);
  const add = (b, m, o) => { const g = b.build(m, o); if (g) group.add(g); };
  add(stone, mats.stone);
  add(stone2, mats.stone2);
  add(plaster, mats.plaster);
  add(gold, mats.gold);
  add(dark, mats.dark, { cast: false });
  add(lamp, mats.lamp, { cast: false });
  add(cloth, mats.cloth);
  add(wood, mats.wood);
  return { group, flags };
}

// ---------------- terrain ----------------
function makeTerrain() {
  const size = 1100, seg = 330;
  const g = new THREE.PlaneGeometry(size, size, seg, seg);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  const col = new Float32Array(p.count * 3);
  const uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const y = groundHeight(x, z);
    p.setY(i, y);
    uv.setXY(i, x / 8, z / 8);
    const r = Math.hypot(x, z), th = Math.atan2(z, x);
    const t = islandRadius(th) - r;
    const n = fbm(x * 0.03, z * 0.03, 4, 21);
    // base: warm dust
    let c = [1.25, 1.1, 0.92].map((v) => v * (0.85 + 0.3 * n));
    // paved streets: lighter, cooler
    const s = streetMask(x, z);
    c = mix3(c, [1.5, 1.32, 1.12], s * 0.8);
    // precinct courtyard paving
    if (Math.max(Math.abs(x), Math.abs(z)) < PRECINCT) c = mix3(c, [1.3, 1.15, 1.0], 0.7);
    // dry garden patches
    const gpatch = smooth(0.62, 0.72, fbm(x * 0.008 + 3, z * 0.008, 3, 8)) * (1 - s);
    c = mix3(c, [0.62, 0.66, 0.38], gpatch * 0.7);
    // wet dark rock at the shore
    const wet = 1 - smooth(-2, 10, t);
    c = mix3(c, [0.42, 0.34, 0.27], wet * 0.85);
    if (y < 0.4) c = c.map((v) => v * 0.6);
    col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, null);
  m.receiveShadow = true;
  m.castShadow = true;
  m.name = 'terrain';
  return m;
}
const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// ---------------- main temple (Jagat Mandir type) ----------------
function mainTemple(B, T, flags) {
  const { stone, gold, dark } = B;
  const c = [1.08, 0.96, 0.84];
  // stepped jagati platform (local +x = sanctum end)
  const tiers = [[96, 66, 2.2], [84, 56, 2.0], [74, 46, 2.0]];
  let y = 0;
  for (const [w, d, h] of tiers) {
    box(stone, chain(T, M(4, y, 0)), w, h, d, shade(c, 0.94));
    // moulding lip
    box(stone, chain(T, M(4, y + h - 0.3, 0)), w + 0.6, 0.3, d + 0.6, shade(c, 1.05));
    // carved frieze: a running band of small niches/figures and a lotus cornice
    for (const [ln, along, ax] of [[w, d / 2, 'z'], [w, -d / 2, 'z'], [d, w / 2, 'x'], [d, -w / 2, 'x']]) {
      const n = Math.floor(ln / 1.4);
      for (let i = 0; i < n; i++) {
        const t = -ln / 2 + (i + 0.5) * (ln / n);
        const fx = ax === 'z' ? 4 + t : 4 + along + Math.sign(along) * 0.12;
        const fz = ax === 'z' ? along + Math.sign(along) * 0.12 : t;
        const sx = ax === 'z' ? 0.8 : 0.3, sz = ax === 'z' ? 0.3 : 0.8;
        stone.add(BOX, chain(T, M(fx, y + h * 0.42, fz, 0, sx, h * 0.38, sz)), shade(c, i % 2 ? 1.08 : 0.92), 'world');
      }
      const L = ax === 'z' ? [w + 0.4, 0.22, 0.5] : [0.5, 0.22, d + 0.4];
      stone.add(BOX, chain(T, M(ax === 'z' ? 4 : 4 + along, y + h * 0.2, ax === 'z' ? along : 0, 0, ...L)), shade(c, 1.1), 'world');
      stone.add(BOX, chain(T, M(ax === 'z' ? 4 : 4 + along, y + h * 0.66, ax === 'z' ? along : 0, 0, ...L)), shade(c, 1.1), 'world');
    }
    y += h;
  }
  // front staircase toward the ghats (local -x)
  for (let i = 0; i < 12; i++) box(stone, chain(T, M(-36 - i * 0.9 - 8, 0, 0)), 1.0, y - i * (y / 12), 16, shade(c, 0.98));
  // flanking elephants-like plinth blocks
  for (const s of [-1, 1]) box(stone, chain(T, M(-44, 0, s * 9.5)), 12, y * 0.6, 2.2, shade(c, 0.9));

  const base = y;
  // ---- sanctum (garbhagriha) with mandovara wall ----
  const SX = 20, SW = 20, wallH = 12;
  const S = chain(T, M(SX, base, 0));
  // pitha mouldings
  const mould = [[SW + 4, 0.8, 0.95], [SW + 3.4, 0.6, 1.05], [SW + 3, 1.0, 0.9], [SW + 2.6, 0.5, 1.06]];
  let my = 0;
  for (const [w, h, k] of mould) { rathaBox(stone, chain(S, M(0, my, 0)), w, h, shade(c, k)); my += h; }
  // wall with niches and pilasters
  rathaBox(stone, chain(S, M(0, my, 0)), SW, wallH, c);
  for (let side = 0; side < 4; side++) {
    const a = (side * Math.PI) / 2;
    const F = chain(S, M(0, my, 0, a));
    for (const off of [-6.5, 0, 6.5]) {
      const deep = off === 0;
      const z = SW / 2 + (deep ? 2.6 : 1.3);
      box(dark, chain(F, M(off, wallH * 0.3, z + 0.05)), deep ? 2.2 : 1.6, wallH * 0.42, 0.1, [1, 1, 1]);
      box(stone, chain(F, M(off, wallH * 0.3 + wallH * 0.42, z)), deep ? 3.4 : 2.6, 0.7, 0.8, shade(c, 1.05)); // pediment
      box(stone, chain(F, M(off, wallH * 0.72 + 0.7, z - 0.1)), deep ? 2.6 : 2.0, 1.4, 0.6, shade(c, 0.96));
    }
    // horizontal friezes
    for (const fy of [0.15, 0.82, 0.96]) box(stone, chain(F, M(0, wallH * fy, SW / 2 + 1.2)), SW + 1.5, 0.45, 2.6, shade(c, 1.07));
  }
  const sh0 = my + wallH;
  // eave (chajja)
  rathaBox(stone, chain(S, M(0, sh0, 0)), SW + 4.5, 0.6, shade(c, 1.1));
  // ---- the shikhara with clustered urushringas ----
  const top = shikhara(stone, gold, chain(S, M(0, sh0 + 0.6, 0)), SW + 1.5, 44, { layers: 52, proj: 0.14, color: c, curve: 1.6 });
  const rnd = mulberry32(77);
  for (let side = 0; side < 4; side++) {
    const a = (side * Math.PI) / 2;
    const F = chain(S, M(0, sh0 + 0.6, 0, a));
    // central urushringa on each face, two tiers
    shikhara(stone, gold, chain(F, M(0, 0, SW / 2 + 1.2)), 9.5, 22, { layers: 26, color: shade(c, 0.98), proj: 0.12 });
    shikhara(stone, gold, chain(F, M(0, 13, SW / 2 - 1.2)), 7.0, 15, { layers: 18, color: c, proj: 0.12 });
    // corner karnashringas
    for (const s of [-1, 1]) {
      shikhara(stone, gold, chain(F, M(s * (SW / 2 - 1.2), 0, SW / 2 - 1.2)), 5.5 + rnd() * 0.6, 11 + rnd() * 1.5, { layers: 13, color: shade(c, 0.96) });
      shikhara(stone, gold, chain(F, M(s * (SW / 2 - 4.2), 0, SW / 2 + 0.2)), 4.2, 8, { layers: 10, color: c });
    }
  }
  // flag mast with the great banner
  const mastBase = new THREE.Vector3(SX, base + sh0 + 0.6 + top, 0).applyMatrix4(T.clone().setPosition(0, 0, 0)).add(new THREE.Vector3().setFromMatrixPosition(T));
  gold.add(CYL8, M(mastBase.x, mastBase.y + 7, mastBase.z, 0, 0.35, 14, 0.35), [1, 1, 1]);
  flags.push({ pos: new THREE.Vector3(mastBase.x, mastBase.y + 13.6, mastBase.z), w: 16, h: 6.5, kind: 'great' });

  // ---- storeyed mandapa (multi-level pillared hall) ----
  const MX = -6, MW = 26;
  const Mm = chain(T, M(MX, base, 0));
  rathaBox(stone, Mm, MW + 3, 1.6, shade(c, 0.94));
  let ly = 1.6;
  const levels = [[MW, 6.0], [MW - 3, 5.0], [MW - 6, 4.4]];
  for (const [w, h] of levels) {
    // inner wall (dark interior)
    box(B.lamp, chain(Mm, M(0, ly, 0)), w - 4, h, w - 4, [0.12, 0.1, 0.12]);
    // pillars around
    const n = Math.round(w / 3.2);
    for (let i = 0; i <= n; i++) {
      const t = -w / 2 + (i / n) * w;
      for (const [px, pz] of [[t, -w / 2], [t, w / 2], [-w / 2, t], [w / 2, t]]) pillar(stone, chain(Mm, M(px, ly, pz)), h, 0.32, c);
    }
    // balustrade (vedika) and kakshasana seat-back
    for (let side = 0; side < 4; side++) {
      const F = chain(Mm, M(0, ly, 0, (side * Math.PI) / 2));
      box(stone, chain(F, M(0, 0, w / 2 + 0.2)), w, 1.1, 0.5, shade(c, 1.02));
      box(stone, chain(F, M(0, 1.1, w / 2 + 0.45)), w, 0.25, 0.9, shade(c, 1.08));
    }
    // floor slab with deep eave
    box(stone, chain(Mm, M(0, ly + h, 0)), w + 2.4, 0.55, w + 2.4, shade(c, 1.08));
    box(stone, chain(Mm, M(0, ly + h + 0.55, 0)), w + 0.8, 0.4, w + 0.8, shade(c, 0.95));
    ly += h + 0.95;
  }
  samvarana(stone, gold, chain(Mm, M(0, ly, 0)), MW - 8, MW - 8, 9, c);
  // ---- entrance porch ----
  const P = chain(T, M(-26, base, 0));
  rathaBox(stone, P, 14, 1.4, shade(c, 0.94));
  for (const [px, pz] of [[-5, -5], [-5, 5], [5, -5], [5, 5], [-5, 0]]) if (pz !== 0) pillar(stone, chain(P, M(px, 1.4, pz)), 6.5, 0.38, c);
  box(stone, chain(P, M(0, 7.9, 0)), 13.5, 0.6, 13.5, shade(c, 1.08));
  samvarana(stone, gold, chain(P, M(0, 8.5, 0)), 10, 10, 6, c);
  box(B.lamp, chain(P, M(4, 1.4, 0)), 0.3, 5.5, 4, [0.5, 0.45, 0.5]);
}

// A square box with ratha projections (offsets in plan) for temple walls.
function rathaBox(batch, mtx, w, h, col) {
  box(batch, mtx, w, h, w, col);
  box(batch, mtx, w * 0.6, h, w + 1.2, col);
  box(batch, mtx, w + 1.2, h, w * 0.6, col);
  box(batch, mtx, w * 0.25, h, w + 2.4, shade(col, 1.02));
  box(batch, mtx, w + 2.4, h, w * 0.25, shade(col, 1.02));
}

// ---------------- temple precinct ----------------
function precinct(B, flags) {
  const { stone, gold, dark } = B;
  const rnd = mulberry32(5);
  const R = M(0, 0, 0, TEMPLE_ROT);
  const c = [1.04, 0.92, 0.8];
  const P = PRECINCT;
  // enclosing wall with cloister along the inside
  for (let side = 0; side < 4; side++) {
    const F = chain(R, M(0, 0, 0, (side * Math.PI) / 2));
    const gateHere = side === 2; // gate toward ghats (local -x after rotation)
    for (let i = 0; i < 24; i++) {
      const t = -P + (i + 0.5) * ((2 * P) / 24);
      if (gateHere && Math.abs(t) < 9) continue;
      const wp = new THREE.Vector3(t, 0, P).applyMatrix4(F);
      const gy = groundHeight(wp.x, wp.z);
      box(stone, chain(F, M(t, gy - 1, P)), (2 * P) / 24 + 0.05, 9, 2.4, shade(c, 0.92 + 0.06 * rnd()));
      box(stone, chain(F, M(t, gy + 8, P)), (2 * P) / 24 + 0.05, 0.6, 3.2, shade(c, 1.06));
      // kangura crenellations
      box(stone, chain(F, M(t, gy + 8.6, P)), 2.4, 1.3, 1.6, c);
      // cloister roof
      box(stone, chain(F, M(t, gy + 4.5, P - 3)), (2 * P) / 24 + 0.05, 0.4, 6, shade(c, 1.02));
      if (i % 2 === 0) pillar(stone, chain(F, M(t, gy - 0.2, P - 5.6)), 4.7, 0.25, c);
    }
    // corner pavilions
    const cp = new THREE.Vector3(P, 0, P).applyMatrix4(F);
    const gy = groundHeight(cp.x, cp.z);
    box(stone, chain(F, M(P, gy - 1, P)), 8, 12, 8, shade(c, 0.95));
    chhatri(stone, gold, chain(F, M(P, gy + 11, P)), 6, c);
  }
  // gate tower toward the ghats (simple gopura-like)
  const G = chain(R, M(-P, groundHeight(-P, 0), 0, Math.PI / 2));
  for (const s of [-1, 1]) box(stone, chain(G, M(s * 7, -1, 0)), 5, 15, 7, shade(c, 0.95));
  box(stone, chain(G, M(0, 10, 0)), 19, 2.4, 8, c);
  box(dark, chain(G, M(0, -0.5, 0)), 9, 10.5, 3, [1, 1, 1]);
  box(B.lamp, chain(G, M(0, -0.5, -1.2)), 3.2, 7.5, 0.4, [0.22, 0.18, 0.22]);
  samvarana(stone, gold, chain(G, M(0, 12.4, 0)), 12, 7, 6, c);

  // subsidiary shrines (each one different)
  const spots = [[-55, -60], [-55, 60], [60, -62], [62, 60], [30, -70], [28, 72], [-70, -25], [-72, 28], [72, 0]];
  spots.forEach(([lx, lz], i) => {
    const wp = new THREE.Vector3(lx, 0, lz).applyMatrix4(R);
    const gy = groundHeight(wp.x, wp.z);
    const S = chain(R, M(lx, gy - 0.3, lz, Math.round(rnd() * 3) * Math.PI / 2));
    const w = 6 + rnd() * 4;
    const cc = shade(STONES[i % 4], 1.0 + rnd() * 0.08);
    box(stone, S, w + 3, 1.6, w + 3, shade(cc, 0.92));
    rathaBox(stone, chain(S, M(0, 1.6, 0)), w, 4 + rnd() * 2, cc);
    const hh = 1.6 + 5;
    box(dark, chain(S, M(0, 1.6, w / 2 + 0.7)), 1.4, 2.8, 0.1, [1, 1, 1]);
    rathaBox(stone, chain(S, M(0, hh, 0)), w + 1.6, 0.4, shade(cc, 1.08));
    const top = shikhara(stone, gold, chain(S, M(0, hh + 0.4, 0)), w + 0.4, 9 + rnd() * 9, { color: cc, proj: 0.1 + rnd() * 0.06, curve: 1.4 + rnd() * 0.6 });
    if (i % 3 === 0) {
      const fp = new THREE.Vector3(0, hh + 0.4 + top + 2.5, 0).applyMatrix4(S);
      gold.add(CYL8, M(fp.x, fp.y - 1.5, fp.z, 0, 0.12, 4, 0.12), [1, 1, 1]);
      flags.push({ pos: fp, w: 3.5, h: 1.6, kind: 'small' });
    }
    // small mandapa porch for larger ones
    if (w > 8) {
      const Pm = chain(S, M(0, 1.6, w / 2 + 3));
      for (const [px, pz] of [[-2.2, -1.8], [2.2, -1.8], [-2.2, 1.8], [2.2, 1.8]]) pillar(stone, chain(Pm, M(px, 0, pz)), 3.6, 0.2, cc);
      box(stone, chain(Pm, M(0, 3.6, 0)), 6, 0.4, 5, shade(cc, 1.06));
      samvarana(stone, gold, chain(Pm, M(0, 4, 0)), 4.5, 4, 4, cc);
    }
  });
  // stepped tank (kund) inside the precinct
  const K = chain(R, M(-48, groundHeight(-48 * Math.cos(TEMPLE_ROT), 48 * Math.sin(TEMPLE_ROT)) - 0.2, 0));
  for (let i = 0; i < 5; i++) {
    const s = 22 - i * 3;
    for (let side = 0; side < 4; side++) box(stone, chain(K, M(0, -i * 0.7, 0, (side * Math.PI) / 2)), s, 0.3, 1.5, shade(c, 0.9));
    void s;
  }
}

// ---------------- houses ----------------
function houses(B, flags) {
  const { stone, plaster, gold, dark, cloth, wood } = B;
  const grid = 15;
  const rnd = mulberry32(1234);
  const awn = [[0.85, 0.25, 0.06], [0.62, 0.1, 0.05], [0.9, 0.5, 0.08], [0.16, 0.2, 0.42], [0.5, 0.42, 0.12]];
  for (let gx = -440; gx <= 440; gx += grid)
    for (let gz = -440; gz <= 440; gz += grid) {
      const x = gx + (rnd() - 0.5) * 4, z = gz + (rnd() - 0.5) * 4;
      const r = Math.hypot(x, z), th = Math.atan2(z, x);
      const R = islandRadius(th);
      if (r > R - 30) continue;
      if (Math.max(Math.abs(x * Math.cos(TEMPLE_ROT) - z * Math.sin(TEMPLE_ROT)), Math.abs(x * Math.sin(TEMPLE_ROT) + z * Math.cos(TEMPLE_ROT))) < PRECINCT + 12) continue;
      if (Math.abs(angDiff(th, GHAT_TH)) < 0.2 && r > R - 70) continue;
      if (Math.abs(angDiff(th, HARBOUR_TH)) < 0.17 && r > R - 75) continue;
      // keep clear of streets
      let blocked = false;
      for (const a of AVENUES) if (Math.cos(angDiff(th, a)) > 0 && Math.abs(Math.sin(angDiff(th, a))) * r < 12) blocked = true;
      for (const rr of RINGS) if (Math.abs(r - rr) < 10) blocked = true;
      if (blocked) continue;
      if (rnd() < 0.06) continue; // courtyards / gardens

      const gy = groundHeight(x, z);
      const ang = -th + Math.PI / 2 + (rnd() - 0.5) * 0.08; // face the nearest ring road
      if (rnd() < 0.035) { localTemple(B, flags, x, gy, z, ang, rnd); continue; }
      const near = 1 - r / R;
      const w = 8 + rnd() * 5, d = 8 + rnd() * 5;
      const floors = Math.max(1, Math.round(1 + rnd() * 1.6 + near * 2.2));
      const fh = 3.2 + rnd() * 0.5;
      const H = floors * fh;
      const usePlaster = rnd() < 0.85;
      const bat = usePlaster ? plaster : stone;
      let col;
      if (usePlaster) {
        // lime washes: ochre, whitewash, rose, weathered grey, rare indigo
        const wr = rnd();
        const wash = wr < 0.34 ? [0.98, 0.74, 0.5] : wr < 0.62 ? [1.08, 1.02, 0.94] : wr < 0.78 ? [1.04, 0.74, 0.62] : wr < 0.93 ? [0.84, 0.78, 0.7] : [0.62, 0.7, 0.9];
        col = shade(wash, 0.88 + rnd() * 0.16);
      } else col = shade(STONES[Math.floor(rnd() * (rnd() < 0.75 ? 4 : 5))], 0.9 + rnd() * 0.18);
      const X = M(x, gy - 0.5, z, ang);
      // plinth & body
      box(bat, X, w + 0.8, 1.1, d + 0.8, shade(col, 0.9));
      box(bat, chain(X, M(0, 1.1, 0)), w, H, d, col);
      // floor bands
      for (let f = 1; f <= floors; f++) box(bat, chain(X, M(0, 1.1 + f * fh - 0.35, 0)), w + 0.35, 0.35, d + 0.35, shade(col, 1.08));
      // windows on the two long faces + doors
      const nwin = Math.max(1, Math.floor(w / 3.1));
      for (const face of [1, -1]) {
        for (let f = 0; f < floors; f++) {
          for (let i = 0; i < nwin; i++) {
            if (rnd() < 0.12) continue;
            const wx = -w / 2 + (i + 0.5) * (w / nwin);
            const wy = 1.1 + f * fh + (f === 0 ? 0.2 : 0.9);
            const ground = f === 0 && i === Math.floor(nwin / 2) && face === 1;
            const ww = ground ? 1.6 : 0.95, wh = ground ? 2.5 : 1.45;
            const F = chain(X, M(0, 0, 0, face === 1 ? 0 : Math.PI));
            const paint = rnd();
            if (paint < 0.22) B.wood.add(BOX, chain(F, M(wx, wy + wh / 2, d / 2 + 0.03, 0, ww, wh, 0.06)), [[2.2, 0.9, 0.35], [0.5, 1.3, 1.6], [2.6, 1.6, 0.5], [2.0, 0.6, 0.4]][Math.floor(rnd() * 4)]);
            else if (rnd() < 0.3 + near * 0.2) { const k = 0.4 + rnd() * 0.8; box(B.lamp, chain(F, M(wx, wy, d / 2 + 0.02)), ww, wh, 0.06, [k, k * (0.85 + rnd() * 0.15), k]); }
            else box(dark, chain(F, M(wx, wy, d / 2 + 0.02)), ww, wh, 0.06, [1, 1, 1]);
            // frame & arched hood
            box(bat, chain(F, M(wx - ww / 2 - 0.12, wy, d / 2 + 0.08)), 0.24, wh, 0.18, shade(col, 1.05));
            box(bat, chain(F, M(wx + ww / 2 + 0.12, wy, d / 2 + 0.08)), 0.24, wh, 0.18, shade(col, 1.05));
            box(bat, chain(F, M(wx, wy + wh, d / 2 + 0.1)), ww + 0.6, 0.28, 0.24, shade(col, 1.1));
            if (!ground && rnd() < 0.35) box(bat, chain(F, M(wx, wy + wh + 0.28, d / 2 + 0.3)), ww + 0.9, 0.12, 0.7, shade(col, 1.12)); // chajja
            if (ground && rnd() < 0.5) {
              // cloth awning over shopfront
              const a = awn[Math.floor(rnd() * awn.length)];
              cloth.add(BOX, chain(F, M(wx, wy + wh + 0.4, d / 2 + 1.0, 0, ww + 2.4, 0.06, 2.0, 0.28)), a);
              wood.add(BOX, chain(F, M(wx - ww / 2 - 1.0, wy, d / 2 + 1.8, 0, 0.1, wh + 0.2, 0.1)), [1, 1, 1]);
              wood.add(BOX, chain(F, M(wx + ww / 2 + 1.0, wy, d / 2 + 1.8, 0, 0.1, wh + 0.2, 0.1)), [1, 1, 1]);
            }
          }
        }
      }
      // side windows (small)
      for (const face of [1, -1]) for (let f = 1; f < floors; f++) if (rnd() < 0.6) {
        const F = chain(X, M(0, 0, 0, face * Math.PI / 2));
        box(dark, chain(F, M((rnd() - 0.5) * (d - 3), 1.1 + f * fh + 0.9, w / 2 + 0.02)), 0.8, 1.2, 0.06, [1, 1, 1]);
      }
      // jharokha (projecting balcony) on upper floors
      if (floors >= 2 && rnd() < 0.5) {
        const jx = (rnd() - 0.5) * (w - 4);
        const jy = 1.1 + fh * (floors - 1) + 0.5;
        const J = chain(X, M(jx, jy, d / 2 + 0.7));
        box(bat, chain(J, M(0, -0.5, 0)), 2.6, 0.5, 1.6, shade(col, 1.05));
        for (const s of [-1, 1]) box(bat, chain(J, M(s * 1.1, 0, 0.55)), 0.18, 1.8, 0.18, col);
        box(dark, chain(J, M(0, 0, 0.1)), 2.0, 1.7, 1.0, [1, 1, 1]);
        box(bat, chain(J, M(0, 0, 0.6)), 2.5, 0.75, 0.1, shade(col, 1.04));
        const roof = new THREE.CylinderGeometry(0.01, 1.6, 0.9, 4, 1);
        bat.add(roof, chain(J, M(0, 2.3, 0, Math.PI / 4, 1.1, 1, 0.7)), shade(col, 1.08), 'world');
      }
      // parapet with kangura merlons
      const py = 1.1 + H;
      for (const [ox, oz, lw, ld] of [[0, d / 2, w, 0.35], [0, -d / 2, w, 0.35], [w / 2, 0, 0.35, d], [-w / 2, 0, 0.35, d]]) {
        box(bat, chain(X, M(ox, py, oz)), lw, 0.9, ld, shade(col, 1.03));
      }
      if (rnd() < 0.55) {
        const nm = Math.floor(w / 1.4);
        for (let i = 0; i < nm; i++) box(bat, chain(X, M(-w / 2 + (i + 0.5) * (w / nm), py + 0.9, d / 2)), 0.5, 0.5, 0.35, col);
      }
      // roof variety
      const roll = rnd();
      if (roll < 0.22) chhatri(bat, gold, chain(X, M((rnd() - 0.5) * (w - 4), py, (rnd() - 0.5) * (d - 4))), 2.4 + rnd() * 1.2, shade(col, 1.04));
      else if (roll < 0.4) {
        // setback upper pavilion
        const pw = w * (0.4 + rnd() * 0.2), pd = d * (0.4 + rnd() * 0.2);
        const ox = (rnd() - 0.5) * (w - pw), oz = (rnd() - 0.5) * (d - pd);
        box(bat, chain(X, M(ox, py, oz)), pw, fh, pd, col);
        box(dark, chain(X, M(ox, py + 0.9, oz + pd / 2 + 0.02)), Math.min(1.2, pw - 1), 1.4, 0.06, [1, 1, 1]);
        box(bat, chain(X, M(ox, py + fh, oz)), pw + 0.9, 0.25, pd + 0.9, shade(col, 1.1));
      } else if (roll < 0.47) {
        const s = Math.min(w, d) * 0.45;
        const dome = new THREE.SphereGeometry(s / 2, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        box(bat, chain(X, M(0, py, 0)), s + 0.6, 1.2, s + 0.6, col);
        bat.add(dome, chain(X, M(0, py + 1.2, 0, 0, 1, 1.25, 1)), shade(col, 1.05), 'world');
        gold.add(CYL8, chain(X, M(0, py + 1.2 + s * 0.62, 0, 0, 0.12, 0.9, 0.12)), [1, 1, 1]);
      } else if (roll < 0.53 && near > 0.3) {
        // a house-shrine with a small shikhara
        const top = shikhara(bat, gold, chain(X, M(w * 0.2, py, 0)), 3.2 + rnd(), 4 + rnd() * 3, { color: shade(col, 1.03), proj: 0.1 });
        if (rnd() < 0.5) flags.push({ pos: new THREE.Vector3(w * 0.2, py + top + 1.2, 0).applyMatrix4(X), w: 1.6, h: 0.8, kind: 'small' });
      } else if (roll < 0.65) {
        // rooftop clutter: stairs hut, water pots, drying cloth
        box(bat, chain(X, M(w / 2 - 1.6, py, -d / 2 + 1.6)), 2.4, 2.4, 2.4, col);
        if (rnd() < 0.5) {
          const a = awn[Math.floor(rnd() * awn.length)];
          cloth.add(BOX, chain(X, M(-1, py + 1.6, 0, rnd(), 3, 1.1, 0.03)), a);
        }
      }
    }
}

function localTemple(B, flags, x, gy, z, ang, rnd) {
  const { stone, gold, dark } = B;
  const cc = shade(STONES[Math.floor(rnd() * 4)], 1.0 + rnd() * 0.1);
  const S = M(x, gy - 0.4, z, ang);
  const w = 6 + rnd() * 3.5;
  box(stone, S, w + 4, 1.8, w + 7, shade(cc, 0.9));
  box(stone, chain(S, M(0, 1.8 - 0.25, 0)), w + 4.4, 0.25, w + 7.4, shade(cc, 1.06));
  const wallH = 4 + rnd() * 2;
  rathaBox(stone, chain(S, M(0, 1.8, -1.5)), w, wallH, cc);
  box(dark, chain(S, M(0, 1.8, -1.5 + w / 2 + 1.25)), 1.3, 2.6, 0.08, [1, 1, 1]);
  rathaBox(stone, chain(S, M(0, 1.8 + wallH, -1.5)), w + 1.4, 0.45, shade(cc, 1.08));
  const hgt = 10 + rnd() * 14;
  const top = shikhara(stone, gold, chain(S, M(0, 1.8 + wallH + 0.45, -1.5)), w + 0.3, hgt, { color: cc, proj: 0.1 + rnd() * 0.05, curve: 1.4 + rnd() * 0.5 });
  // porch
  const P = chain(S, M(0, 1.8, w / 2 + 1.2));
  for (const [px, pz] of [[-1.8, -1.2], [1.8, -1.2], [-1.8, 1.4], [1.8, 1.4]]) pillar(stone, chain(P, M(px, 0, pz)), 3.4, 0.18, cc);
  box(stone, chain(P, M(0, 3.4, 0.1)), 4.8, 0.35, 4, shade(cc, 1.06));
  samvarana(stone, gold, chain(P, M(0, 3.75, 0.1)), 3.6, 3.2, 3 + Math.floor(rnd() * 2), cc);
  const fp = new THREE.Vector3(0, 1.8 + wallH + 0.45 + top + 2.2, -1.5).applyMatrix4(S);
  gold.add(CYL8, M(fp.x, fp.y - 1.2, fp.z, 0, 0.1, 3.4, 0.1), [1, 1, 1]);
  flags.push({ pos: fp, w: 2.6, h: 1.2, kind: 'small' });
}

// ---------------- ramparts ----------------
function ramparts(B, flags) {
  const { stone, stone2, gold, dark } = B;
  const rnd = mulberry32(99);
  const c = [0.95, 0.83, 0.7];
  const N = 360;
  const inset = 16;
  let towerAcc = 0;
  for (let i = 0; i < N; i++) {
    const t0 = (i / N) * Math.PI * 2, t1 = ((i + 1) / N) * Math.PI * 2;
    const tm = (t0 + t1) / 2;
    if (Math.abs(angDiff(tm, GHAT_TH)) < 0.19) continue;
    if (Math.abs(angDiff(tm, HARBOUR_TH)) < 0.13) continue;
    const r0 = islandRadius(t0) - inset, r1 = islandRadius(t1) - inset;
    const p0 = new THREE.Vector3(Math.cos(t0) * r0, 0, Math.sin(t0) * r0);
    const p1 = new THREE.Vector3(Math.cos(t1) * r1, 0, Math.sin(t1) * r1);
    const mid = p0.clone().add(p1).multiplyScalar(0.5);
    const len = p0.distanceTo(p1) + 0.2;
    const ang = -Math.atan2(p1.z - p0.z, p1.x - p0.x);
    const base = Math.min(groundHeight(mid.x, mid.z), 2) - 6;
    const top = 11.5;
    const X = M(mid.x, base, mid.z, ang);
    const k = 0.9 + rnd() * 0.12;
    // battered wall (wider at the base)
    box(stone2, X, len, top - base - 0.0, 7.5, shade(c, k * 0.92));
    box(stone2, chain(X, M(0, 0, 0)), len, 6, 10, shade(c, k * 0.82));
    box(stone2, chain(X, M(0, top - base, 0)), len, 0.5, 8.2, shade(c, 1.05));
    // merlons on the sea side, walkway parapet inside
    box(stone2, chain(X, M(0, top - base + 0.5, -3.7)), len * 0.55, 1.6, 0.8, shade(c, k));
    box(stone2, chain(X, M(0, top - base + 0.5, 3.8)), len, 0.9, 0.5, shade(c, k));
    // arrow slit
    if (i % 2 === 0) box(dark, chain(X, M(0, top - base - 3, -3.8)), 0.25, 1.4, 0.06, [1, 1, 1]);
    towerAcc += len;
    if (towerAcc > 52) {
      towerAcc = 0;
      // round bastion tower
      const tr = 5.5 + rnd() * 2.5;
      const th = top - base + 2.5 + rnd() * 5;
      const tp = mid.clone().add(new THREE.Vector3(Math.cos(tm), 0, Math.sin(tm)).multiplyScalar(2.5));
      if (rnd() < 0.3) {
        // square tower with machicolated gallery and pavilion roof
        const Q = M(tp.x, base, tp.z, ang);
        box(stone2, Q, tr * 1.8, th, tr * 1.8, shade(c, k * 0.93));
        box(stone2, chain(Q, M(0, th - 2, 0)), tr * 2.1, 2, tr * 2.1, shade(c, k));
        for (let m = 0; m < 4; m++) box(dark, chain(Q, M(0, th - 5, 0, (m * Math.PI) / 2)), 0.4, 1.6, tr * 1.82, [1, 1, 1]);
        box(stone2, chain(Q, M(0, th, 0)), tr * 2.2, 0.4, tr * 2.2, shade(c, 1.06));
        samvarana(stone2, gold, chain(Q, M(0, th + 0.4, 0)), tr * 1.3, tr * 1.3, 3 + Math.floor(rnd() * 3), shade(c, 1.02));
        continue;
      }
      stone2.add(CYL16, M(tp.x, base + th / 2, tp.z, 0, tr * 2, th, tr * 2), shade(c, k * 0.95), 'world');
      stone2.add(new THREE.CylinderGeometry(0.5, 0.56, 1, 20), M(tp.x, base + 3, tp.z, 0, tr * 2.1, 6, tr * 2.1), shade(c, k * 0.85), 'world');
      stone2.add(CYL16, M(tp.x, base + th + 0.3, tp.z, 0, tr * 2.25, 0.6, tr * 2.25), shade(c, 1.06), 'world');
      for (let m = 0; m < 12; m++) {
        const a = (m / 12) * Math.PI * 2;
        stone2.add(BOX, M(tp.x + Math.cos(a) * tr * 1.02, base + th + 1.2, tp.z + Math.sin(a) * tr * 1.02, -a, 0.8, 1.6, 1.6), shade(c, k), 'world');
      }
      if (rnd() < 0.55) {
        chhatri(stone2, gold, M(tp.x, base + th + 0.6, tp.z, rnd()), 4.2 + rnd(), shade(c, 1.03));
        if (rnd() < 0.5) flags.push({ pos: new THREE.Vector3(tp.x, base + th + 0.6 + 4.9 * 1.2 + 1.6, tp.z), w: 2.2, h: 1.0, kind: 'small' });
      }
    }
  }
}

// ---------------- ghats ----------------
function ghats(B, flags) {
  const { stone, gold, dark } = B;
  const c = [1.04, 0.9, 0.76];
  const R = islandRadius(GHAT_TH);
  const cx = Math.cos(GHAT_TH) * (R + 6), cz = Math.sin(GHAT_TH) * (R + 6);
  const ang = -GHAT_TH; // local +x points out to sea
  const G = M(cx, 0, cz, ang);
  const width = 150;
  const topY = 4.2;
  const steps = 18;
  for (let i = 0; i < steps; i++) {
    const y = topY - i * ((topY + 2.6) / steps);
    box(stone, chain(G, M(-28 + i * 1.7, -6, 0)), 1.75, y + 6, width - i * 0.8, shade(c, 0.93 + 0.08 * (i % 2)));
  }
  // top terrace back to the city
  box(stone, chain(G, M(-46, -6, 0)), 36, topY + 6, width + 10, shade(c, 0.95));
  // landing platforms projecting into the water with shrines
  for (const s of [-1, 0, 1]) {
    const L = chain(G, M(4, 0, s * 52));
    box(stone, chain(L, M(0, -6, 0)), 14, 6 + 0.9, 12, shade(c, 0.9));
    box(stone, chain(L, M(0, 0.9, 0)), 14.6, 0.3, 12.6, shade(c, 1.04));
    if (s !== 0) chhatri(stone, gold, chain(L, M(2, 1.2, 0)), 5.5, c);
    else {
      // small water shrine
      rathaBox(stone, chain(L, M(1, 1.2, 0)), 6, 4, c);
      shikhara(stone, gold, chain(L, M(1, 5.2, 0)), 6.2, 9, { color: c });
      flags.push({ pos: new THREE.Vector3(1, 17.5, 0).applyMatrix4(L), w: 2.6, h: 1.2, kind: 'small' });
    }
  }
  // flanking towers where the ramparts end
  for (const s of [-1, 1]) {
    const T = chain(G, M(-20, -6, s * (width / 2 + 8)));
    stone.add(CYL16, chain(T, M(0, 13, 0, 0, 16, 26, 16)), shade(c, 0.9), 'world');
    stone.add(CYL16, chain(T, M(0, 26.3, 0, 0, 17.6, 0.6, 17.6)), shade(c, 1.05), 'world');
    chhatri(stone, gold, chain(T, M(0, 26.6, 0)), 7.5, c);
    box(dark, chain(T, M(-8.05, 18, 0)), 0.1, 2.2, 1.0, [1, 1, 1]);
  }
  // riverside pavilions on the top terrace
  for (let i = -3; i <= 3; i++) {
    if (i === 0) continue;
    const P = chain(G, M(-40, topY, i * 19));
    for (const [px, pz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) pillar(stone, chain(P, M(px, 0, pz)), 4.5, 0.26, c);
    box(stone, chain(P, M(0, 4.5, 0)), 8, 0.45, 8, shade(c, 1.06));
    samvarana(stone, gold, chain(P, M(0, 4.95, 0)), 6, 6, 4 + (Math.abs(i) % 3), c);
  }
}

// ---------------- harbour ----------------
function harbour(B) {
  const { stone2, wood, dark } = B;
  const c = [0.9, 0.78, 0.64];
  const R = islandRadius(HARBOUR_TH);
  const cx = Math.cos(HARBOUR_TH) * (R + 2), cz = Math.sin(HARBOUR_TH) * (R + 2);
  const H = M(cx, 0, cz, -HARBOUR_TH);
  // quay along the shore
  box(stone2, chain(H, M(-6, -6, 0)), 30, 8.2, 110, shade(c, 0.9));
  box(stone2, chain(H, M(-6, 2.2, 0)), 30.5, 0.3, 110.5, shade(c, 1.04));
  // two piers reaching into the sea
  for (const s of [-1, 1]) {
    const P = chain(H, M(60, -6, s * 38));
    box(stone2, P, 120, 7.8, 9, shade(c, 0.88));
    box(stone2, chain(P, M(0, 7.8, 0)), 120.4, 0.3, 9.4, shade(c, 1.02));
    // bollards
    for (let i = 0; i < 12; i++) stone2.add(CYL8, chain(P, M(-55 + i * 10, 8.6, -s * 4)), shade(c, 0.8), 'world');
    // lighthouse-like tower at the end
    const L = chain(P, M(62, 0, 0));
    if (s > 0) {
      box(stone2, L, 12, 22, 12, shade(c, 0.9));
      box(stone2, chain(L, M(0, 19, 0)), 13.4, 2.2, 13.4, shade(c, 0.98));
      for (let m = 0; m < 4; m++) box(dark, chain(L, M(0, 15, 0, (m * Math.PI) / 2)), 1.0, 2.2, 12.1, [1, 1, 1]);
      box(stone2, chain(L, M(0, 22, 0)), 14, 0.5, 14, shade(c, 1.06));
      samvarana(stone2, B.gold, chain(L, M(0, 22.5, 0)), 9, 9, 6, shade(c, 1.02));
      continue;
    }
    stone2.add(new THREE.CylinderGeometry(0.42, 0.5, 1, 24), chain(L, M(0, 8, 0, 0, 14, 16, 14)), shade(c, 0.92), 'world');
    stone2.add(CYL16, chain(L, M(0, 16.3, 0, 0, 13.2, 0.6, 13.2)), shade(c, 1.06), 'world');
    for (let m = 0; m < 14; m++) { const a = (m / 14) * Math.PI * 2; stone2.add(BOX, chain(L, M(Math.cos(a) * 6.1, 17.3, Math.sin(a) * 6.1, -a, 0.7, 1.4, 1.4)), shade(c, 0.95), 'world'); }
    chhatri(stone2, B.gold, chain(L, M(0, 16.6, 0)), 5, shade(c, 1.04));
    dark.add(BOX, chain(L, M(-5.75, 11, 0, 0, 0.1, 1.8, 0.9)), [1, 1, 1]);
  }
  // warehouses on the quay
  const rnd = mulberry32(31);
  for (let i = 0; i < 6; i++) {
    const W = chain(H, M(-14, 2.5, -45 + i * 18));
    const w = 10 + rnd() * 3;
    box(stone2, W, 12, 6 + rnd() * 2, w, shade(c, 0.95 + rnd() * 0.1));
    dark.add(BOX, chain(W, M(6.05, 1.6, 0, 0, 0.1, 3.2, 3)), [1, 1, 1]);
    wood.add(BOX, chain(W, M(8, 0.3, (rnd() - 0.5) * 6, rnd(), 1.4, 1.2, 1.4)), [1, 1, 1]);
    wood.add(BOX, chain(W, M(9.5, 0.3, (rnd() - 0.5) * 6, rnd(), 1.2, 0.9, 1.0)), [1, 1, 1]);
  }
}

// ---------------- torana ----------------
// Gujarati kirti-torana (Vadnagar / Modhera type): two tall carved pillars joined by a
// cusped (multi-lobed) arch, a heavy architrave, and a crest of miniature pediments.
function torana(B) {
  const { stone, gold } = B;
  const c = [1.08, 0.94, 0.8];
  const r = PRECINCT + 46;
  const x = Math.cos(GHAT_TH) * r, z = Math.sin(GHAT_TH) * r;
  const T = M(x, groundHeight(x, z) - 0.3, z, -GHAT_TH + Math.PI / 2);
  const span = 4.6, H = 10.5;
  for (const s of [-1, 1]) {
    const P = chain(T, M(s * span, 0, 0));
    // stepped base
    box(stone, P, 2.6, 0.6, 2.6, shade(c, 0.9));
    box(stone, chain(P, M(0, 0.6, 0)), 2.2, 0.8, 2.2, shade(c, 0.97));
    // shaft changes from square to octagonal to round, with banded carving
    box(stone, chain(P, M(0, 1.4, 0)), 1.5, H * 0.35, 1.5, c);
    stone.add(new THREE.CylinderGeometry(0.72, 0.72, H * 0.3, 8), chain(P, M(0, 1.4 + H * 0.35 + H * 0.15, 0)), shade(c, 1.02), 'world');
    stone.add(new THREE.CylinderGeometry(0.6, 0.66, H * 0.25, 16), chain(P, M(0, 1.4 + H * 0.65 + H * 0.125, 0)), c, 'world');
    for (const by of [0.12, 0.35, 0.5, 0.65, 0.78, 0.9]) stone.add(new THREE.CylinderGeometry(0.82, 0.82, 0.22, 16), chain(P, M(0, 1.4 + H * by, 0)), shade(c, 1.08), 'world');
    // bracket capital (ghata-pallava) and bracket arms toward the arch
    stone.add(new THREE.CylinderGeometry(0.95, 0.6, 0.9, 16), chain(P, M(0, 1.4 + H + 0.45, 0)), shade(c, 1.04), 'world');
    box(stone, chain(P, M(-s * 0.6, 1.4 + H + 0.9, 0)), 2.6, 0.5, 1.4, shade(c, 1.06));
  }
  // cusped arch: seven lobes between the pillars
  const archY = 1.4 + H - 0.4;
  const pts = [];
  const lobes = 7;
  for (let i = 0; i <= 140; i++) {
    const t = i / 140;
    const xx = -span + 0.7 + t * (2 * span - 1.4);
    const base = Math.sin(Math.PI * t) * 2.8; // overall arch rise
    const lobe = Math.abs(Math.sin(Math.PI * t * lobes)) * 0.45;
    pts.push(new THREE.Vector3(xx, archY - 3.0 + base + lobe, 0));
  }
  const arch = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.22, 6, false);
  arch.applyMatrix4(new THREE.Matrix4().makeScale(1, 1, 2.2));
  stone.add(arch, T, shade(c, 1.05), 'world');
  // architrave with carved bands
  const ay = 1.4 + H + 1.15;
  box(stone, chain(T, M(0, ay, 0)), 2 * span + 3.2, 1.3, 1.5, c);
  box(stone, chain(T, M(0, ay + 1.3, 0)), 2 * span + 3.6, 0.3, 1.7, shade(c, 1.1));
  for (let i = 0; i < 9; i++) box(stone, chain(T, M(-span - 0.9 + i * ((2 * span + 1.8) / 8), ay + 0.3, 0.78)), 0.55, 0.75, 0.1, shade(c, i % 2 ? 1.1 : 0.9));
  // crest: miniature temple pediments (udgama), the central one tallest
  for (let i = -2; i <= 2; i++) {
    const hgt = i === 0 ? 3.2 : 1.9 - Math.abs(i) * 0.3;
    const g = new THREE.ConeGeometry(0.9 - Math.abs(i) * 0.1, hgt, 4, 1);
    stone.add(g, chain(T, M(i * 2.3, ay + 1.6 + hgt / 2, 0, Math.PI / 4, 1, 1, 0.6)), shade(c, 1.04), 'world');
  }
  gold.add(new THREE.ConeGeometry(0.22, 1.1, 8), chain(T, M(0, ay + 1.6 + 3.2 + 0.5, 0)), [1, 1, 1]);
}
