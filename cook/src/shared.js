import * as THREE from 'three';

// ---------- world constants ----------
// Sun low in the west-north-west, ~6 degrees above the horizon: late golden hour.
export const SUN_DIR = new THREE.Vector3(-0.93, 0.105, -0.36).normalize();
export const SUN_COLOR = new THREE.Color(1.0, 0.66, 0.38);
export const SEA_LEVEL = 0;

// Island outline: radius as a function of polar angle. Mirrored in GLSL (ISLAND_GLSL).
const H = [
  [3, 26, 1.1],
  [5, 15, 2.3],
  [8, 7, 0.4],
  [13, 3.5, 4.1],
  [4, 28, -4.0], // headlands and bays; nodes fall on the ghats and harbour
  [8, 10, -8.0],
];
export function islandRadius(theta) {
  let r = 430;
  for (const [k, a, p] of H) r += a * Math.sin(k * theta + p);
  return r;
}
export const ISLAND_GLSL = /* glsl */ `
float islandRadius(float th){
  float r = 430.0;
  ${H.map(([k, a, p]) => `r += ${a.toFixed(3)} * sin(${k.toFixed(1)} * th + ${p.toFixed(3)});`).join('\n  ')}
  return r;
}`;

// ---------- seeded random ----------
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- CPU value noise ----------
function hash2(x, y, s = 0) {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const fade = (t) => t * t * (3 - 2 * t);
export function vnoise(x, y, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = fade(xf), v = fade(yf);
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s);
  const c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x, y, oct = 5, s = 0) {
  let f = 0, amp = 0.5, n = 0;
  for (let i = 0; i < oct; i++) {
    f += amp * vnoise(x, y, s + i * 17);
    n += amp;
    x *= 2.03; y *= 2.03; amp *= 0.5;
  }
  return f / n;
}
// tileable value noise (period p)
export function tnoise(x, y, p, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = fade(xf), v = fade(yf);
  const m = (i) => ((i % p) + p) % p;
  const a = hash2(m(xi), m(yi), s), b = hash2(m(xi + 1), m(yi), s);
  const c = hash2(m(xi), m(yi + 1), s), d = hash2(m(xi + 1), m(yi + 1), s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function tfbm(x, y, p, oct = 5, s = 0) {
  let f = 0, amp = 0.5, n = 0;
  for (let i = 0; i < oct; i++) {
    f += amp * tnoise(x, y, p, s + i * 31);
    n += amp; x *= 2; y *= 2; p *= 2; amp *= 0.5;
  }
  return f / n;
}

// ---------- GLSL noise ----------
export const NOISE_GLSL = /* glsl */ `
vec3 _perm(vec3 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = _perm(_perm(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m; m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
float fbm2(vec2 p, int oct){
  float f = 0.0, a = 0.5;
  mat2 r = mat2(0.8, 0.6, -0.6, 0.8);
  for(int i = 0; i < 8; i++){
    if(i >= oct) break;
    f += a * snoise(p);
    p = r * p * 2.02; a *= 0.5;
  }
  return f;
}`;

const v3 = (v) => `vec3(${v.x.toFixed(5)}, ${v.y.toFixed(5)}, ${v.z.toFixed(5)})`;
const c3 = (c) => `vec3(${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)})`;

// Analytic dusk sky (linear HDR). Shared by the sky dome, water fallback and fog.
export const SKY_GLSL = /* glsl */ `
const vec3 SUN_DIR = ${v3(SUN_DIR)};
const vec3 SUN_COL = ${c3(SUN_COLOR)};
vec3 skyBase(vec3 d){
  float h = d.y;
  float sd = max(dot(d, SUN_DIR), 0.0);
  float az = max(dot(normalize(vec3(d.x, 0.0, d.z) + 1e-5), normalize(vec3(SUN_DIR.x, 0.0, SUN_DIR.z))), 0.0);
  vec3 zenith  = vec3(0.085, 0.075, 0.125);
  vec3 upper   = vec3(0.36, 0.30, 0.26);
  vec3 low     = vec3(1.08, 0.58, 0.24);
  vec3 horizon = vec3(1.55, 0.80, 0.33);
  // anti-sun side is dimmer, peach rather than grey
  float side = 0.4 + 0.6 * pow(az, 1.4);
  vec3 hz = mix(vec3(0.80, 0.50, 0.34), horizon, side);
  // anti-sun: rosy Belt of Venus above the horizon rather than grey
  vec3 lw = mix(vec3(0.66, 0.40, 0.36), low, side);
  upper = mix(vec3(0.34, 0.26, 0.28), upper, side);
  float t = max(h, 0.0);
  vec3 col = mix(hz, lw, smoothstep(0.0, 0.07, t));
  col = mix(col, upper, smoothstep(0.04, 0.22, t));
  col = mix(col, zenith, smoothstep(0.16, 0.7, t));
  // forward-scatter glow around the sun
  col += SUN_COL * (pow(sd, 6.0) * 0.55 + pow(sd, 40.0) * 1.1 + pow(sd, 400.0) * 3.0) * (1.0 - 0.6 * smoothstep(0.0, 0.4, t));
  // below horizon: hazy sea-mist colour
  if (h < 0.0) col = mix(hz, hz * 0.55, smoothstep(0.0, -0.25, h));
  return col;
}
vec3 sunDisk(vec3 d){
  float sd = dot(d, SUN_DIR);
  float disk = smoothstep(0.99985, 0.99993, sd);
  // horizon extinction: sun gets redder & dimmer as it sinks
  return vec3(1.0, 0.62, 0.32) * disk * 26.0;
}`;

// Direction- and height-aware fog, injected into every built-in material.
export function installFog() {
  THREE.ShaderChunk.fog_pars_vertex = `#ifdef USE_FOG
  varying vec3 vFogWorld;
#endif`;
  THREE.ShaderChunk.fog_vertex = `#ifdef USE_FOG
  {
    vec4 fw = vec4(transformed, 1.0);
    #ifdef USE_INSTANCING
      fw = instanceMatrix * fw;
    #endif
    vFogWorld = (modelMatrix * fw).xyz;
  }
#endif`;
  THREE.ShaderChunk.fog_pars_fragment = `#ifdef USE_FOG
  uniform vec3 fogColor;
  varying vec3 vFogWorld;
  #ifdef FOG_EXP2
    uniform float fogDensity;
  #else
    uniform float fogNear; uniform float fogFar;
  #endif
  ${SKY_GLSL.replace(/const vec3 SUN_DIR/, 'const vec3 SUN_DIR').replace(/vec3 skyBase/, 'vec3 skyBase')}
#endif`;
  THREE.ShaderChunk.fog_fragment = `#ifdef USE_FOG
  {
    vec3 fv = vFogWorld - cameraPosition;
    float dist = length(fv);
    vec3 fd = fv / max(dist, 1e-3);
    float hAvg = max(0.5 * (vFogWorld.y + cameraPosition.y), 0.0);
    float hf = exp(-hAvg / 140.0);
    #ifdef FOG_EXP2
      float fogFactor = 1.0 - exp(-fogDensity * fogDensity * dist * dist * hf);
    #else
      float fogFactor = smoothstep(fogNear, fogFar, dist);
    #endif
    vec3 fcol = skyBase(normalize(vec3(fd.x, max(fd.y, 0.0) * 0.35 + 0.012, fd.z))) * 0.92;
    gl_FragColor.rgb = mix(gl_FragColor.rgb, fcol, clamp(fogFactor, 0.0, 1.0));
  }
#endif`;
}
