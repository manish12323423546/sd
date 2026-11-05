import * as THREE from 'three';
import { mulberry32, fbm, islandRadius } from './shared.js';
import { Batch, M, chain, BOX, CYL8 } from './build.js';
const noGround = (fn) => { const g = Batch.ground; Batch.ground = null; const r = fn(); Batch.ground = g; return r; };
import { groundHeight, GHAT_TH, HARBOUR_TH, PRECINCT, TEMPLE_ROT, AVENUES, RINGS } from './city.js';

// ---------------- boats ----------------
function hullGeometry(L, W, D, sheer = 0.7) {
  const nu = 22, nv = 12;
  const pos = [], idx = [];
  for (let i = 0; i <= nu; i++) {
    const u = i / nu;
    const x = (u - 0.5) * L;
    const width = W * Math.pow(Math.sin(Math.PI * u), 0.55);
    const sh = D * sheer * Math.pow(2 * u - 1, 4);
    const depth = D * (0.35 + 0.65 * Math.pow(Math.sin(Math.PI * u), 0.4));
    for (let j = 0; j <= nv; j++) {
      const v = j / nv;
      const phi = (v - 0.5) * Math.PI;
      const y = -depth * Math.cos(phi) * 0.9 + sh + D * 0.1;
      const z = (width / 2) * Math.sin(phi) * (0.9 + 0.1 * Math.cos(phi));
      pos.push(x, y, z);
    }
  }
  for (let i = 0; i < nu; i++)
    for (let j = 0; j < nv; j++) {
      const a = i * (nv + 1) + j, b = a + nv + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function sailGeometry(w, h, billow, lateen = true) {
  // triangular lateen sail hung from a slanted yard, billowing downwind (+z local)
  const n = 10;
  const pos = [], idx = [], uv = [];
  for (let i = 0; i <= n; i++)
    for (let j = 0; j <= n; j++) {
      const u = i / n, v = j / n; // u along the yard, v down toward the clew
      const tri = 1 - v;
      const x = (u - 0.5) * w * (lateen ? tri + v * 0.15 : 1) + (lateen ? v * w * 0.3 : 0);
      const y = -v * h + (lateen ? (u - 0.5) * h * 0.55 * tri : 0);
      const z = billow * Math.sin(Math.PI * u) * Math.sin(Math.PI * Math.min(1, v * 1.1)) * (0.6 + 0.4 * tri);
      pos.push(x, y, z); uv.push(u * 2, v * 2);
    }
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const a = i * (n + 1) + j, b = a + n + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

const SAILS = [[0.78, 0.36, 0.16], [0.86, 0.55, 0.22], [0.62, 0.22, 0.12], [0.85, 0.72, 0.52], [0.7, 0.42, 0.2]];
const HULLS = [[0.42, 0.26, 0.15], [0.33, 0.2, 0.12], [0.5, 0.3, 0.16], [0.28, 0.16, 0.1]];

function boat(wood, cloth, paint, mtx, rnd, sailing) {
  const L = 12 + rnd() * 14;
  const W = L * (0.24 + rnd() * 0.05);
  const D = L * 0.13;
  const hc = HULLS[Math.floor(rnd() * HULLS.length)];
  wood.add(hullGeometry(L, W, D, 0.6 + rnd() * 0.5), mtx, hc);
  // painted sheer strake
  const strake = hullGeometry(L * 0.98, W * 1.02, D * 0.25, 0.9);
  paint.add(strake, chain(mtx, M(0, D * 0.62, 0)), [[0.7, 0.18, 0.08], [0.15, 0.32, 0.36], [0.85, 0.6, 0.12]][Math.floor(rnd() * 3)]);
  // deck
  wood.add(BOX, chain(mtx, M(0, D * 0.05, 0, 0, L * 0.8, 0.12, W * 0.8)), [0.45, 0.3, 0.18]);
  // small cabin aft on bigger boats
  if (L > 18) wood.add(BOX, chain(mtx, M(-L * 0.28, D * 0.35, 0, 0, L * 0.18, D * 0.9, W * 0.6)), hc);
  const mh = L * (0.9 + rnd() * 0.25);
  wood.add(CYL8, chain(mtx, M(L * 0.08, mh / 2, 0, 0, 0.28, mh, 0.28)), [0.35, 0.24, 0.15]);
  const yardLen = L * 1.1;
  if (sailing) {
    const S = chain(mtx, M(L * 0.08, mh * 0.95, 0, 0.35 + rnd() * 0.3, 1, 1, 1, 0, -0.35));
    wood.add(CYL8, chain(S, M(0, 0, 0, 0, 0.18, yardLen, 0.18, 0, Math.PI / 2)), [0.35, 0.24, 0.15]);
    const sc = SAILS[Math.floor(rnd() * SAILS.length)];
    cloth.add(sailGeometry(yardLen * 0.95, mh * 0.9, 1.6 + rnd(), true), chain(S, M(0, -0.2, 0.2, 0, 1, 1, 1, 0, 0.35)), sc);
  } else {
    // furled sail along a lowered yard
    const S = chain(mtx, M(L * 0.05, mh * 0.55, 0, 0, 1, 1, 1, 0, -0.25));
    wood.add(CYL8, chain(S, M(0, 0, 0, 0, 0.16, yardLen * 0.9, 0.16, 0, Math.PI / 2)), [0.35, 0.24, 0.15]);
    const sc = SAILS[Math.floor(rnd() * SAILS.length)];
    cloth.add(CYL8, chain(S, M(0, -0.25, 0, 0, 0.6, yardLen * 0.7, 0.6, 0, Math.PI / 2)), sc);
  }
  // rigging lines
  wood.add(BOX, chain(mtx, M(L * 0.3, mh * 0.48, 0, 0, 0.04, mh * 1.02, 0.04, 0, -0.55)), [0.2, 0.15, 0.1]);
  wood.add(BOX, chain(mtx, M(-L * 0.15, mh * 0.48, 0, 0, 0.04, mh * 1.0, 0.04, 0, 0.45)), [0.2, 0.15, 0.1]);
}

export function buildBoats(mats) { return noGround(() => buildBoats_(mats)); }
function buildBoats_(mats) {
  const wood = new Batch(), cloth = new Batch(), paint = new Batch();
  const rnd = mulberry32(808);
  const R = islandRadius(HARBOUR_TH);
  const H = M(Math.cos(HARBOUR_TH) * (R + 2), 0, Math.sin(HARBOUR_TH) * (R + 2), -HARBOUR_TH);
  // moored along the piers, bows out
  for (const s of [-1, 1])
    for (let i = 0; i < 9; i++) {
      if (rnd() < 0.15) continue;
      const x = 15 + i * 11 + rnd() * 3;
      boat(wood, cloth, paint, chain(H, M(x, -0.1, s * 26 + (rnd() - 0.5) * 3, (rnd() - 0.5) * 0.15 + (s > 0 ? 0 : Math.PI), 1, 1, 1, (rnd() - 0.5) * 0.04)), rnd, false);
      if (rnd() < 0.5) boat(wood, cloth, paint, chain(H, M(x + 4, -0.1, s * 50 + (rnd() - 0.5) * 3, Math.PI / 2 + (rnd() - 0.5) * 0.3, 0.8, 0.8, 0.8)), rnd, false);
    }
  // inner basin
  for (let i = 0; i < 6; i++) boat(wood, cloth, paint, chain(H, M(40 + rnd() * 60, -0.1, (rnd() - 0.5) * 40, rnd() * 6.28, 0.85, 0.85, 0.85)), rnd, rnd() < 0.3);
  // sailing out at sea (no two alike)
  const sea = [[-700, -230], [-640, 120], [-760, 40], [-560, -380], [180, -700], [-260, -720], [760, 260], [620, 640], [-900, -500], [-520, 520], [880, -120], [350, 760]];
  for (const [x, z] of sea) {
    const s = 0.85 + rnd() * 0.5;
    boat(wood, cloth, paint, M(x + (rnd() - 0.5) * 60, -0.15, z + (rnd() - 0.5) * 60, rnd() * 6.28, s, s, s, (rnd() - 0.5) * 0.06, (rnd() - 0.5) * 0.05), rnd, true);
  }
  const g = new THREE.Group();
  for (const [b, m] of [[wood, mats.hull], [cloth, mats.sail], [paint, mats.paint]]) { const o = b.build(m); if (o) g.add(o); }
  return g;
}

// ---------------- palms & trees ----------------
export function buildVegetation(mats) {
  const bark = new Batch(), fronds = new Batch(), canopy = new Batch();
  const rnd = mulberry32(4242);
  const spots = [];
  const R = (th) => islandRadius(th);
  // along the ghat terrace & shore band inside the walls
  for (let i = 0; i < 260; i++) {
    const th = rnd() * Math.PI * 2;
    const r = R(th) - 24 - rnd() * 14;
    if (Math.abs(Math.atan2(Math.sin(th - HARBOUR_TH), Math.cos(th - HARBOUR_TH))) < 0.2) continue;
    spots.push([Math.cos(th) * r, Math.sin(th) * r, 'palm']);
  }
  // ghat terrace rows
  {
    const Rg = R(GHAT_TH);
    for (let i = 0; i < 26; i++) {
      const lat = (i / 25 - 0.5) * 170;
      const out = Rg + 6 - 60 - rnd() * 18;
      const c = Math.cos(GHAT_TH), s = Math.sin(GHAT_TH);
      spots.push([c * out - s * lat, s * out + c * lat, 'palm']);
    }
  }
  // gardens / courtyards scattered in the city
  for (let i = 0; i < 520; i++) {
    const x = (rnd() - 0.5) * 820, z = (rnd() - 0.5) * 820;
    const r = Math.hypot(x, z), th = Math.atan2(z, x);
    if (r > R(th) - 32 || r < PRECINCT * 1.25) continue;
    const g = fbm(x * 0.008 + 3, z * 0.008, 3, 8);
    let ok = g > 0.6 || rnd() < 0.08;
    for (const a of AVENUES) { const d = Math.atan2(Math.sin(th - a), Math.cos(th - a)); if (Math.cos(d) > 0 && Math.abs(Math.sin(d)) * r < 13) ok = false; }
    for (const rr of RINGS) if (Math.abs(r - rr) < 4) ok = false;
    if (ok) spots.push([x, z, rnd() < 0.55 ? 'palm' : 'tree']);
  }
  // precinct trees
  for (const [lx, lz] of [[-80, -82], [-80, 82], [10, -84], [10, 84], [84, -40], [84, 40]]) {
    const c = Math.cos(TEMPLE_ROT), s = Math.sin(TEMPLE_ROT);
    spots.push([lx * c + lz * s, -lx * s + lz * c, 'tree']);
  }

  for (const [x, z, kind] of spots) {
    const gy = groundHeight(x, z);
    if (gy < 1.5) continue;
    if (kind === 'palm') palm(bark, fronds, x, gy, z, rnd);
    else tree(bark, canopy, x, gy, z, rnd);
  }
  const g = new THREE.Group();
  for (const [b, m, o] of [[bark, mats.bark, {}], [fronds, mats.frond, {}], [canopy, mats.canopy, {}]]) { const r = b.build(m, o); if (r) g.add(r); }
  return g;
}

const frondGeoCache = [];
function frondGeo(rnd) {
  if (frondGeoCache.length < 6) {
    const len = 4.2 + rnd() * 1.6, w = 1.5;
    const g = new THREE.PlaneGeometry(w, len, 2, 8);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i) + len / 2; // 0..len
      const t = y / len;
      const x = p.getX(i);
      // arch then droop, slight V fold along rachis
      p.setXYZ(i, x, t * len * 0.85, -Math.pow(t, 2.0) * len * 0.75 + Math.abs(x) * 0.35);
    }
    g.computeVertexNormals();
    frondGeoCache.push(g);
    return g;
  }
  return frondGeoCache[Math.floor(rnd() * frondGeoCache.length)];
}

function palm(bark, fronds, x, y, z, rnd) {
  const date = rnd() < 0.3;
  const h = date ? 4 + rnd() * 4 : 9 + rnd() * 10;
  const lean = date ? rnd() * 0.06 : rnd() * 0.28;
  const la = rnd() * Math.PI * 2;
  const segs = 10;
  const trunk = new THREE.CylinderGeometry(date ? 0.36 : 0.2, date ? 0.42 : 0.36, h, 7, segs);
  const p = trunk.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const yy = p.getY(i) + h / 2;
    const t = yy / h;
    const off = Math.sin(t * Math.PI * 0.5) * lean * h * 0.5;
    // ring scars
    const ring = 1 + 0.06 * Math.sin(yy * 9);
    p.setXYZ(i, p.getX(i) * ring + Math.cos(la) * off, yy, p.getZ(i) * ring + Math.sin(la) * off);
  }
  trunk.computeVertexNormals();
  const tone = 0.8 + rnd() * 0.3;
  bark.add(trunk, M(x, y - 0.3, z), [0.5 * tone, 0.4 * tone, 0.3 * tone]);
  const topX = x + Math.cos(la) * lean * h * 0.5, topZ = z + Math.sin(la) * lean * h * 0.5, topY = y - 0.3 + h;
  const n = date ? 20 + Math.floor(rnd() * 8) : 13 + Math.floor(rnd() * 7);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd() * 0.4;
    const tilt = -0.2 + rnd() * 0.9; // upright to drooping
    const g = frondGeo(rnd);
    const c = 0.75 + rnd() * 0.45;
    const dead = rnd() < 0.1;
    const fs = date ? 0.7 : 1.15 + rnd() * 0.3;
    const up = date ? -0.3 + rnd() * 1.2 : tilt;
    fronds.add(g, M(topX, topY, topZ, a, fs, fs, fs, Math.PI / 2 - 0.9 - up * 0.6), dead ? [1.3, 1.0, 0.55] : date ? [c * 0.9, c * 1.0, c * 0.95] : [c, c, c * 0.9]);
  }
  // coconut cluster
  bark.add(new THREE.IcosahedronGeometry(0.6, 0), M(topX, topY - 0.4, topZ), [0.35, 0.3, 0.12]);
}

function tree(bark, canopy, x, y, z, rnd) {
  const h = 4 + rnd() * 4;
  bark.add(new THREE.CylinderGeometry(0.3, 0.5, h, 6), M(x, y + h / 2 - 0.3, z), [0.4, 0.32, 0.24]);
  const blobs = 4 + Math.floor(rnd() * 4);
  const base = 3.5 + rnd() * 3;
  for (let i = 0; i < blobs; i++) {
    const g = new THREE.IcosahedronGeometry(base * (0.6 + rnd() * 0.5), 1);
    const p = g.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const vx = p.getX(k), vy = p.getY(k), vz = p.getZ(k);
      const n = 0.8 + 0.4 * fbm(vx * 0.6 + i * 5, vz * 0.6 + vy * 0.3, 2, 3);
      p.setXYZ(k, vx * n, vy * n * 0.75, vz * n);
    }
    g.computeVertexNormals();
    const c = 0.8 + rnd() * 0.35;
    canopy.add(g, M(x + (rnd() - 0.5) * base * 1.4, y + h + (rnd() - 0.2) * base * 0.8, z + (rnd() - 0.5) * base * 1.4), [c * 0.95, c, c * 0.8]);
  }
}

// ---------------- flags (wind-animated) ----------------
export function buildFlags(list, mat) {
  const parts = [];
  for (const f of list) {
    const g = new THREE.PlaneGeometry(1, 1, 16, 6);
    g.translate(0.5, -0.5, 0);
    const p = g.attributes.position;
    const col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i), v = -p.getY(i);
      // triangular pennant tapering toward the fly end
      const taper = f.kind === 'great' ? 1 - u * 0.55 : 1 - u * 0.85;
      p.setXYZ(i, u * f.w, -(v - 0.5) * taper * f.h - f.h * 0.5 + f.h * 0.5, 0);
      let c;
      if (f.kind === 'great') {
        const band = Math.floor(v * 5);
        c = [[0.85, 0.32, 0.05], [0.95, 0.62, 0.1], [0.75, 0.12, 0.06], [0.95, 0.62, 0.1], [0.85, 0.32, 0.05]][band % 5];
      } else c = (Math.round(f.pos.x * 7 + f.pos.z * 3) % 2 === 0) ? [0.88, 0.36, 0.06] : [0.72, 0.1, 0.05];
      col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    // store flutter weight (u) in uv.x, per-flag phase in uv.y
    const uv = g.attributes.uv;
    const ph = f.pos.x * 0.37 + f.pos.z * 0.21;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i), ph);
    g.rotateY(-0.42); // streaming downwind (sea breeze from the west-south-west)
    g.translate(f.pos.x, f.pos.y, f.pos.z);
    parts.push(g);
  }
  const merged = mergeAll(parts);
  const mesh = new THREE.Mesh(merged, mat);
  mesh.castShadow = true;
  return mesh;
}
function mergeAll(parts) {
  let n = 0, ni = 0;
  for (const p of parts) { n += p.attributes.position.count; ni += p.index.count; }
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3), uv = new Float32Array(n * 2), idx = new Uint32Array(ni);
  let o = 0, oi = 0;
  for (const p of parts) {
    pos.set(p.attributes.position.array, o * 3);
    nor.set(p.attributes.normal.array, o * 3);
    col.set(p.attributes.color.array, o * 3);
    uv.set(p.attributes.uv.array, o * 2);
    for (let i = 0; i < p.index.count; i++) idx[oi + i] = p.index.array[i] + o;
    o += p.attributes.position.count; oi += p.index.count;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  return g;
}

export function flagMaterial(clothTex, uniforms) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.85, map: clothTex });
  m.onBeforeCompile = (s) => {
    s.uniforms.uTime = uniforms.uTime;
    s.vertexShader = 'uniform float uTime;\n' + s.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       float fu = uv.x;
       float ph = uv.y;
       float w = sin(fu * 6.0 - uTime * 4.2 + ph) * 0.5 + sin(fu * 11.0 - uTime * 6.3 + ph * 1.7) * 0.18;
       transformed.z += w * fu * 0.9 * (0.6 + 0.4 * sin(ph));
       transformed.y += sin(fu * 4.0 - uTime * 3.0 + ph) * fu * 0.2;`
    );
  };
  return m;
}

// ---------------- distant mainland & headlands ----------------
export function buildDistantLand(mat) {
  const g = new THREE.BufferGeometry();
  const segA = 220, segR = 18;
  const pos = [], col = [], idx = [];
  const a0 = -1.1, a1 = 1.25; // eastern arc (mainland coast)
  for (let i = 0; i <= segA; i++) {
    const a = a0 + (a1 - a0) * (i / segA);
    const coast = 3000 + 600 * fbm(a * 3, 1.3, 4, 77);
    for (let j = 0; j <= segR; j++) {
      const t = j / segR;
      const r = coast + t * 5000;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const ridge = fbm(x * 0.0006, z * 0.0006, 5, 12);
      let h = -10 + Math.pow(t, 0.6) * (60 + 260 * ridge);
      const edge = Math.min((a - a0) / 0.25, (a1 - a) / 0.25, 1);
      h = h * Math.max(0, edge) - (1 - Math.max(0, edge)) * 20;
      pos.push(x, h, z);
      const k = 0.7 + 0.3 * ridge;
      col.push(0.55 * k, 0.42 * k, 0.32 * k);
    }
  }
  for (let i = 0; i < segA; i++)
    for (let j = 0; j < segR; j++) {
      const a = i * (segR + 1) + j, b = a + segR + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat);
  m.receiveShadow = false;
  return m;
}

// ---------------- birds ----------------
export function buildBirds(mat, uniforms) {
  const rnd = mulberry32(17);
  const pos = [], ph = [];
  const flocks = [[-300, 120, -260], [200, 90, 300], [-520, 70, 80], [60, 150, -420]];
  for (const [cx, cy, cz] of flocks) {
    const n = 7 + Math.floor(rnd() * 9);
    for (let i = 0; i < n; i++) {
      const x = cx + (rnd() - 0.5) * 60, y = cy + (rnd() - 0.5) * 18, z = cz + (rnd() - 0.5) * 60;
      const s = 0.7 + rnd() * 0.4, p = rnd() * 6.28;
      // body + two wings (wing tips flagged with phase for flapping)
      const tri = [[-0.9, 0, 0, 1], [0, 0, 0.25, 0], [0, 0, -0.25, 0], [0.9, 0, 0, 1], [0, 0, -0.25, 0], [0, 0, 0.25, 0]];
      for (const [vx, vy, vz, tip] of tri) { pos.push(x + vx * s, y + vy * s, z + vz * s); ph.push(p, tip); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aPh', new THREE.Float32BufferAttribute(ph, 2));
  const m = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: { uTime: uniforms.uTime },
    vertexShader: `attribute vec2 aPh; uniform float uTime; void main(){ vec3 p = position; p.y += aPh.y * sin(uTime * 7.0 + aPh.x) * 0.55; p.x += uTime * 2.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
    fragmentShader: `void main(){ gl_FragColor = vec4(0.05, 0.035, 0.03, 1.0); }`,
  });
  return new THREE.Mesh(g, m);
}

// ---------------- people, stalls, carts ----------------
const SKIN = [[0.42, 0.26, 0.17], [0.36, 0.22, 0.14], [0.5, 0.32, 0.21], [0.3, 0.18, 0.12]];
const GARB = [[0.92, 0.85, 0.72], [0.85, 0.35, 0.08], [0.7, 0.12, 0.08], [0.95, 0.65, 0.12], [0.18, 0.25, 0.5], [0.15, 0.4, 0.35], [0.6, 0.2, 0.35], [0.9, 0.9, 0.85]];
function person(b, x, y, z, rnd) {
  const h = 1.5 + rnd() * 0.32;
  const a = rnd() * Math.PI * 2;
  const P = M(x, y, z, a);
  const skin = SKIN[Math.floor(rnd() * SKIN.length)];
  const g1 = GARB[Math.floor(rnd() * GARB.length)], g2 = GARB[Math.floor(rnd() * GARB.length)];
  const woman = rnd() < 0.45;
  if (woman) {
    b.add(new THREE.ConeGeometry(0.34, h * 0.62, 8, 1, true), chain(P, M(0, h * 0.31, 0)), g1); // sari skirt
    b.add(new THREE.CylinderGeometry(0.15, 0.2, h * 0.28, 7), chain(P, M(0, h * 0.72, 0)), g1);
    b.add(new THREE.BoxGeometry(0.44, 0.5, 0.06), chain(P, M(0.06, h * 0.68, 0.08, 0, 1, 1, 1, 0.1, 0.5)), g2); // pallu
  } else {
    for (const s of [-1, 1]) b.add(new THREE.CylinderGeometry(0.07, 0.06, h * 0.46, 5), chain(P, M(s * 0.1, h * 0.23, 0, 0, 1, 1, 1, s * 0.12 * rnd())), skin);
    b.add(new THREE.CylinderGeometry(0.2, 0.26, h * 0.3, 7), chain(P, M(0, h * 0.4, 0)), g1); // dhoti
    b.add(new THREE.CylinderGeometry(0.17, 0.15, h * 0.28, 7), chain(P, M(0, h * 0.68, 0)), rnd() < 0.5 ? skin : g2); // torso
    if (rnd() < 0.5) b.add(new THREE.BoxGeometry(0.5, 0.06, 0.2), chain(P, M(0, h * 0.8, 0, 0, 1, 1, 1, 0, 0.6)), g2); // shawl
  }
  for (const s of [-1, 1]) b.add(new THREE.CylinderGeometry(0.045, 0.04, h * 0.33, 5), chain(P, M(s * 0.21, h * 0.67, 0, 0, 1, 1, 1, 0, s * 0.18)), skin);
  b.add(new THREE.IcosahedronGeometry(0.11, 1), chain(P, M(0, h * 0.9, 0)), skin);
  if (!woman && rnd() < 0.55) b.add(new THREE.CylinderGeometry(0.12, 0.13, 0.12, 8), chain(P, M(0, h * 0.97, 0)), GARB[1 + Math.floor(rnd() * 4)]); // turban
  if (rnd() < 0.15) b.add(new THREE.CylinderGeometry(0.13, 0.1, 0.24, 8), chain(P, M(0, h * 1.07, 0)), [0.55, 0.3, 0.14]); // pot on head
}

export function buildPeople(mats) {
  return noGround(() => {
    const b = new Batch(), st = new Batch();
    const rnd = mulberry32(2026);
    const put = (x, z, yOff = 0) => { if (Math.hypot(x + 46, z - 236) < 16) return; const y = groundHeight(x, z) + yOff; if (y > 0.3) person(b, x, y, z, rnd); };
    // avenues: people and market stalls along both kerbs
    for (const a of AVENUES) {
      const c = Math.cos(a), s = Math.sin(a);
      for (let r = PRECINCT * 1.2; r < islandRadius(a) - 40; r += 2 + rnd() * 5) {
        const lat = (rnd() - 0.5) * 13;
        put(c * r - s * lat, s * r + c * lat);
        if (rnd() < 0.08) {
          // stall: posts, cloth canopy, goods
          const side = rnd() < 0.5 ? -1 : 1, l2 = side * 6.2;
          const S = M(c * r - s * l2, groundHeight(c * r - s * l2, s * r + c * l2), s * r + c * l2, -a);
          for (const [px, pz] of [[-1.2, -0.9], [1.2, -0.9], [-1.2, 0.9], [1.2, 0.9]]) st.add(BOX, chain(S, M(px, 1.1, pz, 0, 0.08, 2.2, 0.08)), [0.35, 0.22, 0.12]);
          st.add(BOX, chain(S, M(0, 2.3, 0, 0, 3, 0.05, 2.4, 0, side * 0.15)), GARB[1 + Math.floor(rnd() * 6)]);
          st.add(BOX, chain(S, M(0, 0.45, 0, 0, 2.4, 0.9, 1.6)), [0.4, 0.26, 0.14]);
          for (let k = 0; k < 5; k++) st.add(new THREE.SphereGeometry(0.22, 6, 4), chain(S, M(-0.9 + k * 0.45, 1.0, (rnd() - 0.5) * 0.8)), [[0.9, 0.5, 0.1], [0.75, 0.15, 0.05], [0.6, 0.55, 0.12], [0.5, 0.3, 0.12]][Math.floor(rnd() * 4)]);
        }
        if (rnd() < 0.02) {
          // bullock cart
          const lat2 = (rnd() - 0.5) * 6;
          const x = c * r - s * lat2, z = s * r + c * lat2, y = groundHeight(x, z);
          const C = M(x, y, z, -a + (rnd() < 0.5 ? 0 : Math.PI));
          st.add(BOX, chain(C, M(0, 1.0, 0, 0, 3, 0.15, 1.6)), [0.38, 0.24, 0.13]);
          for (const sd of [-1, 1]) st.add(new THREE.TorusGeometry(0.65, 0.07, 5, 12), chain(C, M(-0.3, 0.68, sd * 0.85)), [0.3, 0.2, 0.1]);
          st.add(BOX, chain(C, M(0.2, 1.5, 0, 0, 2.2, 0.9, 1.5)), GARB[Math.floor(rnd() * GARB.length)]);
          st.add(BOX, chain(C, M(2.6, 0.95, 0, 0, 1.6, 0.8, 0.6)), [0.85, 0.82, 0.75]); // bullock body
          st.add(BOX, chain(C, M(3.5, 1.15, 0, 0, 0.5, 0.45, 0.4)), [0.85, 0.82, 0.75]);
          for (const [lx, lz] of [[2.0, -0.2], [2.0, 0.2], [3.2, -0.2], [3.2, 0.2]]) st.add(BOX, chain(C, M(lx, 0.3, lz, 0, 0.14, 0.6, 0.14)), [0.75, 0.72, 0.66]);
        }
      }
    }
    // pilgrims on the ghat steps and at the water
    {
      const c = Math.cos(GHAT_TH), s = Math.sin(GHAT_TH), Rg = islandRadius(GHAT_TH);
      for (let i = 0; i < 420; i++) {
        const along = Rg - 60 + rnd() * 66, lat = (rnd() - 0.5) * 140;
        const x = c * along - s * lat, z = s * along + c * lat;
        const t = (along - (Rg - 22.9)) / 31.5;
        const step = Math.min(1, Math.max(0, t));
        const y = along < Rg - 22.9 ? 4.2 : 4.2 - Math.floor(step * 18) * (6.8 / 18);
        if (y > -0.6) person(b, x, Math.max(y, -0.5), z, rnd);
      }
    }
    // temple courtyard
    for (let i = 0; i < 320; i++) {
      const lx = (rnd() - 0.5) * 180, lz = (rnd() - 0.5) * 180;
      if (Math.abs(lx) < 50 && Math.abs(lz) < 36) continue;
      const c = Math.cos(TEMPLE_ROT), s = Math.sin(TEMPLE_ROT);
      put(lx * c + lz * s, -lx * s + lz * c);
    }
    // harbour quay
    {
      const R = islandRadius(HARBOUR_TH);
      const H = M(Math.cos(HARBOUR_TH) * (R + 2), 0, Math.sin(HARBOUR_TH) * (R + 2), -HARBOUR_TH);
      for (let i = 0; i < 160; i++) {
        const onPier = rnd() < 0.5;
        const p = onPier ? new THREE.Vector3(5 + rnd() * 110, 0, (rnd() < 0.5 ? -1 : 1) * (38 + (rnd() - 0.5) * 7)) : new THREE.Vector3(-18 + rnd() * 26, 0, (rnd() - 0.5) * 100);
        p.applyMatrix4(H);
        person(b, p.x, onPier ? 1.95 : 2.35, p.z, rnd);
      }
    }
    const g = new THREE.Group();
    const o1 = b.build(mats.people, { cast: true, receive: true }); if (o1) g.add(o1);
    const o2 = st.build(mats.cloth, { cast: true, receive: true }); if (o2) g.add(o2);
    return g;
  });
}
