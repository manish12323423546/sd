import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { SUN_DIR, SUN_COLOR, installFog } from './shared.js';
import { makeSky } from './sky.js';
import { makeWater } from './water.js';
import { makeStone, makeGround, makeFrond, makeCloth, makePlaster } from './textures.js';
import { buildCity, groundHeight, AVENUES, RINGS, PRECINCT, TEMPLE_ROT } from './city.js';
import { buildBoats, buildVegetation, buildFlags, flagMaterial, buildBirds, buildPeople } from './props.js';
import { SHOTS } from './shots.js';

installFog();

const params = new URLSearchParams(location.search);
const W = +(params.get('w') || window.innerWidth), Hh = +(params.get('h') || window.innerHeight);
const shotIndex = params.has('shot') ? +params.get('shot') : null;

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(W, Hh);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const FOG_DENSITY = 0.00038;
scene.fog = new THREE.FogExp2(0xd99a5e, FOG_DENSITY);

const camera = new THREE.PerspectiveCamera(40, W / Hh, 0.5, 30000);
const uniforms = { uTime: { value: 12.0 } };

// ---------- sky + environment lighting ----------
const sky = makeSky();
scene.add(sky);
{
  const pm = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.add(makeSky());
  const env = pm.fromScene(envScene, 0, 1, 20000);
  scene.environment = env.texture;
  scene.environmentIntensity = 0.7;
}

// ---------- lights ----------
const sun = new THREE.DirectionalLight(SUN_COLOR, 3.4);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.6;
scene.add(sun, sun.target);
const hemi = new THREE.HemisphereLight(0x6f8cc8, 0x6a4026, 0.5);
scene.add(hemi);

function fitShadow(center, radius) {
  sun.target.position.copy(center);
  sun.position.copy(center).addScaledVector(SUN_DIR, 1500);
  const c = sun.shadow.camera;
  c.left = -radius; c.right = radius; c.top = radius; c.bottom = -radius;
  c.near = 100; c.far = 3200;
  c.updateProjectionMatrix();
  sun.shadow.normalBias = 0.25 + radius / 900;
}

// ---------- materials ----------
const s1 = makeStone(11, { base: [0.66, 0.42, 0.22] });
const s2 = makeStone(29, { base: [0.62, 0.40, 0.23], courses: 10 });
const gr = makeGround();
const pl = makePlaster();
const clothTex = makeCloth();
const mats = {
  stone: new THREE.MeshStandardMaterial({ map: s1.map, normalMap: s1.normalMap, normalScale: new THREE.Vector2(0.9, 0.9), vertexColors: true, roughness: 0.82, metalness: 0 }),
  stone2: new THREE.MeshStandardMaterial({ map: s2.map, normalMap: s2.normalMap, normalScale: new THREE.Vector2(1, 1), vertexColors: true, roughness: 0.88, metalness: 0 }),
  plaster: new THREE.MeshStandardMaterial({ map: pl.map, normalMap: pl.normalMap, normalScale: new THREE.Vector2(0.7, 0.7), vertexColors: true, roughness: 0.9, metalness: 0 }),
  gold: new THREE.MeshStandardMaterial({ color: new THREE.Color(1.0, 0.7, 0.32), metalness: 1.0, roughness: 0.3, vertexColors: false }),
  dark: new THREE.MeshStandardMaterial({ color: new THREE.Color(0.035, 0.022, 0.016), roughness: 0.95 }),
  cloth: new THREE.MeshStandardMaterial({ map: clothTex, vertexColors: true, roughness: 0.9, side: THREE.DoubleSide }),
  wood: new THREE.MeshStandardMaterial({ color: new THREE.Color(0.22, 0.13, 0.07), roughness: 0.85, vertexColors: true }),
  terrain: new THREE.MeshStandardMaterial({ map: gr.map, normalMap: gr.normalMap, vertexColors: true, roughness: 0.95 }),
  hull: new THREE.MeshStandardMaterial({ map: s2.map, vertexColors: true, roughness: 0.7, side: THREE.DoubleSide, color: new THREE.Color(0.55, 0.45, 0.4) }),
  sail: new THREE.MeshStandardMaterial({ map: clothTex, vertexColors: true, roughness: 0.85, side: THREE.DoubleSide }),
  paint: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, side: THREE.DoubleSide }),
  bark: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, color: new THREE.Color(0.6, 0.5, 0.4) }),
  frond: new THREE.MeshStandardMaterial({ map: makeFrond(), vertexColors: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.75 }),
  canopy: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, color: new THREE.Color(0.17, 0.2, 0.08), flatShading: true }),
  people: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide }),
};

// anti-tiling + world-space macro variation for masonry
function weather(m, scale) {
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vWP;
      float vh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(vh(i), vh(i+vec2(1,0)), f.x), mix(vh(i+vec2(0,1)), vh(i+vec2(1,1)), f.x), f.y); }`)
      .replace('#include <map_fragment>', `
      vec4 t1 = texture2D(map, vMapUv);
      vec4 t2 = texture2D(map, vMapUv * 0.371 + vec2(0.13, 0.57));
      float bl = vn(vWP.xz * 0.05 + vWP.y * 0.03);
      vec4 sampledDiffuseColor = mix(t1, t2, 0.35 * bl);
      float macro = vn(vWP.xz * ${(0.02 * scale).toFixed(4)}) * 0.6 + vn(vWP.xz * 0.11 + 7.0) * 0.4;
      sampledDiffuseColor.rgb *= mix(vec3(0.84, 0.82, 0.86), vec3(1.08, 1.02, 0.94), macro);
      // vertical rain streaks
      sampledDiffuseColor.rgb *= 0.9 + 0.1 * vn(vec2(vWP.x * 1.7 + vWP.z * 1.7, vWP.y * 0.15));
      diffuseColor *= sampledDiffuseColor;`);
  };
}
weather(mats.stone, 1); weather(mats.stone2, 1.3); weather(mats.plaster, 0.8);

// streets & courtyards: dressed flagstones with dust in the joints (analytic street mask)
{
  const av = AVENUES.map((a) => a.toFixed(5)).join(',');
  mats.terrain.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vWP;
      float ph(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float streetMask(vec2 p){
        float r = length(p), th = atan(p.y, p.x), m = 0.0;
        float A[8] = float[8](${av});
        if (r > ${(PRECINCT * 0.9).toFixed(1)}) for (int i = 0; i < 8; i++){ float d = th - A[i]; d = atan(sin(d), cos(d)); if (cos(d) > 0.0) m = max(m, 1.0 - smoothstep(5.5, 7.5, abs(sin(d)) * r)); }
        ${RINGS.map((rr) => `m = max(m, 1.0 - smoothstep(4.0, 6.0, abs(r - ${rr.toFixed(1)})));`).join(' ')}
        vec2 q = vec2(p.x * ${Math.cos(TEMPLE_ROT).toFixed(5)} - p.y * ${Math.sin(TEMPLE_ROT).toFixed(5)}, p.x * ${Math.sin(TEMPLE_ROT).toFixed(5)} + p.y * ${Math.cos(TEMPLE_ROT).toFixed(5)});
        m = max(m, 1.0 - smoothstep(${(PRECINCT - 2).toFixed(1)}, ${PRECINCT.toFixed(1)}, max(abs(q.x), abs(q.y))));
        return m;
      }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
      {
        float sm = streetMask(vWP.xz);
        if (sm > 0.01) {
          vec2 g = vWP.xz / vec2(1.3, 0.9);
          float row = floor(g.y);
          g.x += ph(vec2(row, 3.0)) * 1.0;
          vec2 cell = floor(g), f = fract(g);
          float edge = min(min(f.x, 1.0 - f.x) * 1.3, min(f.y, 1.0 - f.y) * 0.9);
          float joint = smoothstep(0.02, 0.07, edge);
          float tint = ph(cell);
          vec3 slab = vec3(0.62, 0.47, 0.32) * (0.82 + 0.3 * tint) * (0.9 + 0.1 * sampledDiffuseColor.r / 0.5);
          slab = mix(vec3(0.33, 0.24, 0.16), slab, joint);
          diffuseColor.rgb = mix(diffuseColor.rgb, slab, sm * 0.9);
        }
      }`);
  };
}

// ---------- world ----------
const city = buildCity(mats);
city.group.getObjectByName('terrain').material = mats.terrain;
scene.add(city.group);
scene.add(buildBoats(mats));
scene.add(buildVegetation(mats));
scene.add(buildPeople(mats));
scene.add(buildFlags(city.flags, flagMaterial(clothTex, uniforms)));
scene.add(buildBirds(null, uniforms));

const water = makeWater(renderer, FOG_DENSITY);
scene.add(water);

// ---------- camera ----------
let controls = null;
function applyShot(i) {
  const s = SHOTS[i];
  camera.fov = s.fov;
  camera.position.set(...s.pos);
  camera.lookAt(new THREE.Vector3(...s.target));
  camera.updateProjectionMatrix();
  fitShadow(new THREE.Vector3(...(s.shadow?.c || s.target)), s.shadow?.r || 500);
  if (s.exposure) renderer.toneMappingExposure = s.exposure;
}
if (shotIndex !== null) applyShot(shotIndex);
else {
  applyShot(0);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(...SHOTS[0].target);
  controls.update();
}

function setTime(t) {
  uniforms.uTime.value = t;
  sky.material.uniforms.uTime.value = t;
  water.material.uniforms.uTime.value = t;
}

// ---------- post: HDR -> bloom (sun/glitter only) -> ACES -> grade ----------
const rt = new THREE.WebGLRenderTarget(W, Hh, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W, Hh), 0.22, 0.55, 2.2);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uRes: { value: new THREE.Vector2(W, Hh) }, uSeed: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uSeed; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uSeed) * 43758.5453); }
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      // gentle S-curve for depth in the shadows
      c = mix(c, c * c * (3.0 - 2.0 * c), 0.35);
      // shadows lean warm umber, highlights lean gold; keep mids natural
      c *= mix(vec3(0.90, 0.94, 1.04), vec3(1.0), smoothstep(0.0, 0.4, l));
      c = mix(c, c * vec3(1.04, 0.99, 0.9), smoothstep(0.55, 1.0, l));
      // saturation
      float l2 = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l2), c, 1.07);
      // vignette
      vec2 d = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
      c *= 1.0 - 0.32 * smoothstep(0.35, 1.1, length(d));
      // film grain
      c += (h(vUv * uRes) - 0.5) * 0.018;
      gl_FragColor = vec4(c, 1.0);
    }`,
});
composer.addPass(grade);
function render() { composer.render(); }

window.__scene = { scene, camera, renderer, applyShot, setTime, SHOTS, groundHeight, render };

setTime(12.0);
let frames = 0;
function loop() {
  if (shotIndex === null) setTime(performance.now() / 1000);
  render();
  frames++;
  if (frames === 2) window.__ready = true;
  if (shotIndex === null || frames < 3) requestAnimationFrame(loop);
}
loop();
