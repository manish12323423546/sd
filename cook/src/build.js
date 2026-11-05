import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Collects transformed geometries per material and merges them into a few draw calls.
export class Batch {
  static ground = null; // (x,z) => terrain height, set by city.js
  constructor() { this.parts = []; }
  add(geo, matrix, color = [1, 1, 1], uvScale = null) {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
    if (matrix) g.applyMatrix4(matrix);
    if (uvScale === 'world') worldUV(g);
    const n = g.attributes.position.count;
    const c = new Float32Array(n * 3);
    const pa = g.attributes.position.array;
    const gf = Batch.ground;
    for (let i = 0; i < n; i++) {
      let k = 1, kb = 1;
      if (gf) {
        const x = pa[i * 3], y = pa[i * 3 + 1], z = pa[i * 3 + 2];
        // ambient occlusion + dust/grime gradient near the ground
        const above = y - gf(x, z);
        const t = Math.min(1, Math.max(0, above / 3.0));
        k = 0.62 + 0.38 * t * t * (3 - 2 * t);
        // dark wet tide band on stone near sea level
        if (y < 1.6) { const w = Math.min(1, (1.6 - y) / 1.2); k *= 1 - 0.45 * w; kb = 1 - 0.1 * w; }
      }
      c[i * 3] = color[0] * k; c[i * 3 + 1] = color[1] * k; c[i * 3 + 2] = color[2] * k * kb;
    }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    this.parts.push(g);
    return g;
  }
  build(material, { cast = true, receive = true } = {}) {
    if (!this.parts.length) return null;
    const out = [];
    // chunk to keep buffers reasonable
    for (let i = 0; i < this.parts.length; i += 3000) {
      const m = mergeGeometries(this.parts.slice(i, i + 3000), false);
      const mesh = new THREE.Mesh(m, material);
      mesh.castShadow = cast; mesh.receiveShadow = receive;
      out.push(mesh);
    }
    const grp = new THREE.Group();
    out.forEach((o) => grp.add(o));
    return grp;
  }
}

// Box-projected UVs in world metres (1 texture repeat = 4 m) so stone courses stay true to scale.
export function worldUV(g) {
  const p = g.attributes.position, nrm = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const nx = Math.abs(nrm.getX(i)), ny = Math.abs(nrm.getY(i)), nz = Math.abs(nrm.getZ(i));
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    let u, v;
    if (ny > nx && ny > nz) { u = x; v = z; }
    else if (nx > nz) { u = z; v = y; }
    else { u = x; v = y; }
    uv.setXY(i, u / 4, v / 4);
  }
  uv.needsUpdate = true;
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();
const _e = new THREE.Euler();
export function M(x, y, z, ry = 0, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) {
  _e.set(rx, ry, rz);
  _q.setFromEuler(_e);
  return new THREE.Matrix4().compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
}
export function chain(parent, child) { return new THREE.Matrix4().multiplyMatrices(parent, child); }

export const BOX = new THREE.BoxGeometry(1, 1, 1);
export const CYL8 = new THREE.CylinderGeometry(0.5, 0.5, 1, 10, 1);
export const CYL16 = new THREE.CylinderGeometry(0.5, 0.5, 1, 20, 1);

// Box sitting on y=0 (pivot at bottom centre).
export function box(batch, mtx, w, h, d, col) {
  return batch.add(BOX, chain(mtx, M(0, h / 2, 0, 0, w, h, d)), col, 'world');
}

// ---------- Nagara shikhara ----------
// Pancharatha cross-section: square with two stepped projections per side.
function rathaShape(w, proj = 0.12, steps = 2) {
  const s = new THREE.Shape();
  const half = w / 2;
  const pts = [];
  // one side (from corner to corner), mirrored around
  const seg = [];
  const k = steps;
  // offsets along the side in [−half, half]
  const breaks = [];
  for (let i = 0; i <= k; i++) breaks.push(-half + (i / (k * 2 + 1)) * w);
  for (let i = k; i >= 0; i--) breaks.push(half - (i / (k * 2 + 1)) * w);
  for (let i = 0; i < breaks.length - 1; i++) {
    const level = Math.min(i, breaks.length - 2 - i); // 0 at corners, rising to centre
    const off = half + level * proj * w * 0.5;
    seg.push([breaks[i], off], [breaks[i + 1], off]);
  }
  for (let side = 0; side < 4; side++) {
    const a = (-side * Math.PI) / 2;
    const ca = Math.cos(a), sa = Math.sin(a);
    for (const [t, o] of seg) pts.push(new THREE.Vector2(t * ca - o * sa, t * sa + o * ca));
  }
  s.setFromPoints(pts);
  return s;
}

// A curvilinear tower made of horizontal courses. Returns height reached.
export function shikhara(batch, gold, mtx, baseW, height, opt = {}) {
  const layers = opt.layers || Math.max(10, Math.round(height / 0.9));
  const proj = opt.proj ?? 0.13;
  const col = opt.color || [1, 1, 1];
  const lh = height / layers;
  const curve = opt.curve ?? 1.7;
  for (let i = 0; i < layers; i++) {
    const t = i / layers;
    // curvilinear profile: nearly vertical at base, rounding in toward the top
    const w = baseW * (1 - 0.62 * Math.pow(t, curve)) ;
    const band = i % 5 === 4; // bhumi-amalaka course
    const sh = rathaShape(band ? w * 1.06 : w, proj, opt.steps || 2);
    const g = new THREE.ExtrudeGeometry(sh, { depth: lh * (band ? 0.7 : 0.93), bevelEnabled: true, bevelThickness: lh * 0.05, bevelSize: w * 0.006, bevelSegments: 1, curveSegments: 1 });
    g.rotateX(-Math.PI / 2);
    batch.add(g, chain(mtx, M(0, i * lh, 0)), shade(col, band ? 1.06 : 0.97 + 0.06 * Math.sin(i * 1.7)), 'world');
  }
  const topW = baseW * 0.38;
  // griva (neck), amalaka (ribbed disc), kalasha (gilded pot), finial
  box(batch, chain(mtx, M(0, height, 0)), topW * 0.7, topW * 0.18, topW * 0.7, col);
  const amal = new THREE.CylinderGeometry(topW * 0.62, topW * 0.62, topW * 0.32, 28, 1);
  batch.add(amal, chain(mtx, M(0, height + topW * 0.34, 0)), shade(col, 1.04), 'world');
  const ribs = new THREE.TorusGeometry(topW * 0.6, topW * 0.13, 6, 28);
  ribs.rotateX(Math.PI / 2);
  batch.add(ribs, chain(mtx, M(0, height + topW * 0.34, 0)), col, 'world');
  const kalasha = new THREE.LatheGeometry(
    [[0, 0], [0.32, 0.02], [0.42, 0.18], [0.36, 0.36], [0.16, 0.5], [0.2, 0.62], [0.08, 0.72], [0.05, 1.05], [0, 1.2]].map(([x, y]) => new THREE.Vector2(x * topW, y * topW)),
    18
  );
  gold.add(kalasha, chain(mtx, M(0, height + topW * 0.5, 0)), [1, 1, 1]);
  return height + topW * 1.7;
}

// Stacked pyramidal roof (samvarana) over a mandapa.
export function samvarana(batch, gold, mtx, w, d, tiers, col) {
  let y = 0;
  for (let i = 0; i < tiers; i++) {
    const t = i / tiers;
    const s = 1 - 0.8 * t;
    const th = 0.9 * (1 - 0.25 * t);
    box(batch, chain(mtx, M(0, y, 0)), w * s, th * 0.35, d * s, shade(col, 0.95));
    box(batch, chain(mtx, M(0, y + th * 0.35, 0)), w * s * 1.04, th * 0.25, d * s * 1.04, shade(col, 1.05));
    box(batch, chain(mtx, M(0, y + th * 0.6, 0)), w * s * 0.93, th * 0.4, d * s * 0.93, col);
    y += th;
  }
  const bell = new THREE.LatheGeometry(
    [[0, 0], [0.5, 0], [0.48, 0.2], [0.36, 0.5], [0.2, 0.75], [0.12, 0.85], [0.14, 0.95], [0, 1.0]].map(([x, yy]) => new THREE.Vector2(x * w * 0.3, yy * w * 0.3)),
    20
  );
  batch.add(bell, chain(mtx, M(0, y, 0)), col, 'world');
  const k = new THREE.LatheGeometry([[0, 0], [0.3, 0.05], [0.35, 0.25], [0.12, 0.45], [0.05, 0.8], [0, 0.9]].map(([x, yy]) => new THREE.Vector2(x * w * 0.12, yy * w * 0.12)), 12);
  gold.add(k, chain(mtx, M(0, y + w * 0.3, 0)), [1, 1, 1]);
  return y + w * 0.4;
}

// Chhatri: four pillars, a chajja (eave) and a ribbed dome.
export function chhatri(batch, gold, mtx, s, col) {
  const ph = s * 1.1;
  for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) box(batch, chain(mtx, M(x * s * 0.4, 0, z * s * 0.4)), s * 0.12, ph, s * 0.12, col);
  box(batch, chain(mtx, M(0, ph, 0)), s * 1.15, s * 0.08, s * 1.15, shade(col, 1.05));
  box(batch, chain(mtx, M(0, ph + s * 0.08, 0)), s * 0.9, s * 0.1, s * 0.9, col);
  const dome = new THREE.LatheGeometry(
    [[0, 0], [0.5, 0], [0.5, 0.08], [0.47, 0.25], [0.38, 0.45], [0.22, 0.62], [0.08, 0.72], [0, 0.75]].map(([x, y]) => new THREE.Vector2(x * s, y * s)),
    16
  );
  batch.add(dome, chain(mtx, M(0, ph + s * 0.18, 0)), shade(col, 1.03), 'world');
  const fin = new THREE.LatheGeometry([[0, 0], [0.08, 0], [0.1, 0.1], [0.03, 0.2], [0.02, 0.35], [0, 0.38]].map(([x, y]) => new THREE.Vector2(x * s, y * s)), 8);
  gold.add(fin, chain(mtx, M(0, ph + s * 0.9, 0)), [1, 1, 1]);
}

// Pillar with base, fluted shaft, bracket capital.
export function pillar(batch, mtx, h, r, col) {
  box(batch, mtx, r * 2.6, h * 0.08, r * 2.6, shade(col, 0.95));
  batch.add(CYL8, chain(mtx, M(0, h * 0.08 + h * 0.36, 0, 0, r * 2, h * 0.72, r * 2)), col, 'world');
  box(batch, chain(mtx, M(0, h * 0.8, 0)), r * 2.2, h * 0.08, r * 2.2, shade(col, 1.04));
  box(batch, chain(mtx, M(0, h * 0.88, 0)), r * 3.4, h * 0.12, r * 1.6, col);
}

export function shade(c, k) { return [c[0] * k, c[1] * k, c[2] * k]; }
