import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { SKY_GLSL, NOISE_GLSL, ISLAND_GLSL } from './shared.js';

// Planar-reflection sea with procedural multi-scale wave normals, Fresnel,
// sun glitter, shoreline foam and fog that matches the rest of the scene.
export function makeWater(renderer, fogDensity) {
  const shader = {
    name: 'DuskSea',
    uniforms: {
      color: { value: null },
      tDiffuse: { value: null },
      textureMatrix: { value: null },
      uTime: { value: 0 },
      uFogDensity: { value: fogDensity },
    },
    vertexShader: /* glsl */ `
      uniform mat4 textureMatrix;
      varying vec4 vUvR;
      varying vec3 vWorld;
      void main(){
        vUvR = textureMatrix * vec4(position, 1.0);
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse;
      uniform float uTime;
      uniform float uFogDensity;
      varying vec4 vUvR;
      varying vec3 vWorld;
      ${SKY_GLSL}
      ${NOISE_GLSL}
      ${ISLAND_GLSL}

      // directional swell (analytic gradient)
      vec2 swell(vec2 p, vec2 dir, float k, float amp, float spd){
        float ph = dot(p, dir) * k + uTime * spd;
        return dir * (cos(ph) * k * amp);
      }
      float hgt(vec2 p, float t){
        float h = 0.0;
        h += snoise(p * 0.045 + vec2(t * 0.020, t * 0.012)) * 0.50;
        h += snoise(p * 0.11  - vec2(t * 0.035, -t * 0.02)) * 0.24;
        h += snoise(p * 0.29  + vec2(-t * 0.05, t * 0.06)) * 0.10;
        h += snoise(p * 0.73  + vec2(t * 0.09, t * 0.07)) * 0.045;
        h += snoise(p * 1.9   - vec2(t * 0.16, -t * 0.12)) * 0.012;
        return h;
      }
      vec3 waveNormal(vec2 p, float dist){
        float e = 0.05 + dist * 0.0018;
        float t = uTime;
        float h0 = hgt(p, t);
        float hx = hgt(p + vec2(e, 0.0), t);
        float hz = hgt(p + vec2(0.0, e), t);
        vec2 g = vec2(hx - h0, hz - h0) / e;
        g += swell(p, normalize(vec2(0.9, 0.42)), 0.052, 0.55, 0.9);
        g += swell(p, normalize(vec2(0.6, -0.8)), 0.083, 0.22, 1.2);
        g += swell(p, normalize(vec2(0.97, 0.2)), 0.21, 0.06, 2.1);
        // flatten toward the horizon to avoid shimmer, but keep enough for the glitter lane
        float atten = 1.0 / (1.0 + dist * 0.0015);
        g *= mix(0.3, 1.0, atten);
        return normalize(vec3(-g.x, 1.0, -g.y));
      }

      void main(){
        vec3 V = cameraPosition - vWorld;
        float dist = length(V);
        V /= dist;
        vec3 n = waveNormal(vWorld.xz, dist);

        // reflection (planar, distorted by wave normals)
        vec4 uv = vUvR;
        // reflections smear vertically (long streaks), only slightly sideways
        float distort = 0.6 * (1.0 / (1.0 + dist * 0.004)) + 0.08;
        vec3 nl = normalize(mix(vec3(0.0, 1.0, 0.0), n, 0.6));
        uv.x += nl.x * distort * uv.w * 0.10;
        uv.y += (nl.z * 0.5 + abs(nl.x) * 0.3) * distort * uv.w * 0.22;
        vec3 R = reflect(-V, n);
        R.y = abs(R.y);
        vec3 skyR = skyBase(R);
        vec3 refl = texture2DProj(tDiffuse, uv).rgb;
        // where the reflection texture sees only sky, blend analytic sky for smoothness
        refl = mix(refl, skyR, 0.1);

        float cosT = max(dot(n, V), 0.0);
        float fres = 0.02 + 0.98 * pow(1.0 - cosT, 5.0);
        fres = clamp(fres * 1.05, 0.0, 1.0);

        // body colour: deep teal-bronze, warmed by subsurface light toward the sun
        float az = max(dot(normalize(vec3(-V.x, 0.0, -V.z)), normalize(vec3(SUN_DIR.x, 0.0, SUN_DIR.z))), 0.0);
        vec3 deep = vec3(0.016, 0.030, 0.032);
        vec3 sss = vec3(0.10, 0.085, 0.040) * (0.4 + 0.6 * pow(az, 3.0)) * (0.6 + 0.6 * max(n.x * SUN_DIR.x + n.z * SUN_DIR.z, 0.0));
        vec3 body = deep + sss * 0.55;

        // shallow water around the island picks up the sandy bottom
        float th = atan(vWorld.z, vWorld.x);
        float rr = length(vWorld.xz);
        float sdist = rr - islandRadius(th);
        float shallow = 1.0 - smoothstep(0.0, 55.0, sdist);
        body = mix(body, vec3(0.06, 0.075, 0.05), shallow * 0.55);

        vec3 col = mix(body, refl, fres);

        // sun glitter: tight specular + broader sheen
        float sdot = max(dot(R, SUN_DIR), 0.0);
        col += SUN_COL * (pow(sdot, 900.0) * 55.0 + pow(sdot, 120.0) * 4.0 + pow(sdot, 14.0) * 0.18);

        // breaking foam along the shore / sea wall
        float wave = sin(sdist * 0.22 - uTime * 1.3 + snoise(vWorld.xz * 0.02) * 4.0);
        float fn = snoise(vWorld.xz * 0.35 + uTime * 0.2) * 0.5 + snoise(vWorld.xz * 1.3 - uTime * 0.3) * 0.25 + 0.5;
        float foam = (1.0 - smoothstep(0.0, 4.0 + 6.0 * (wave * 0.5 + 0.5), sdist)) * smoothstep(-3.0, 0.0, sdist);
        foam *= smoothstep(0.35, 0.75, fn + wave * 0.25);
        float foam2 = (1.0 - smoothstep(6.0, 22.0, sdist)) * smoothstep(0.62, 0.9, fn) * 0.35 * smoothstep(0.4, 1.0, wave);
        vec3 foamCol = vec3(0.95, 0.72, 0.52) * 0.85 + SUN_COL * 0.25;
        col = mix(col, foamCol, clamp(foam + foam2, 0.0, 1.0) * 0.85);

        // fog (same model as scene fog)
        float hAvg = max(0.5 * (vWorld.y + cameraPosition.y), 0.0);
        float ff = 1.0 - exp(-uFogDensity * uFogDensity * dist * dist * exp(-hAvg / 140.0));
        vec3 fd = -V;
        vec3 fcol = skyBase(normalize(vec3(fd.x, 0.012, fd.z))) * 0.92;
        col = mix(col, fcol, clamp(ff, 0.0, 1.0));

        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  };

  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const geo = new THREE.PlaneGeometry(30000, 30000);
  const water = new Reflector(geo, {
    shader,
    textureWidth: Math.round(size.x),
    textureHeight: Math.round(size.y),
    clipBias: 0.002,
    multisample: 4,
  });
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0;
  water.material.toneMapped = true;
  return water;
}
