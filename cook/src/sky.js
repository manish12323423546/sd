import * as THREE from 'three';
import { SKY_GLSL, NOISE_GLSL } from './shared.js';

export function makeSky() {
  const geo = new THREE.SphereGeometry(12000, 64, 32);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main(){
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
        gl_Position.z = gl_Position.w; // far plane
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec3 vWorld;
      ${SKY_GLSL}
      ${NOISE_GLSL}
      // cloud layer: thin altocumulus/altostratus banks lit from below by the low sun
      vec4 clouds(vec3 d){
        if (d.y <= 0.0) return vec4(0.0);
        vec2 p = d.xz / (d.y + 0.06) * 1.1;
        p += vec2(uTime * 0.004, uTime * 0.0015);
        // stretched along the wind
        vec2 q = vec2(p.x * 0.55 + p.y * 0.25, p.y * 1.25 - p.x * 0.1);
        // domain-warped base gives rounded, heaped cloud masses rather than pure streaks
        vec2 wq = q * 0.55 + 3.1;
        wq += vec2(fbm2(wq * 0.8 + 1.7, 3), fbm2(wq * 0.8 - 4.2, 3)) * 0.9;
        float base = fbm2(wq, 6);
        float detail = fbm2(q * 3.2 - 7.0, 5);
        float streak = fbm2(vec2(q.x * 0.25, q.y * 3.0) + 11.0, 4);
        float dens = base * 1.0 + detail * 0.22 + streak * 0.25;
        dens = smoothstep(0.1, 0.7, dens);
        // fewer clouds right above the sun, a band at mid-height
        float band = smoothstep(0.015, 0.09, d.y) * (1.0 - smoothstep(0.35, 0.75, d.y));
        dens *= band;
        // second, higher wispy layer
        vec2 p2 = d.xz / (d.y + 0.15) * 0.6 + vec2(uTime * 0.002, 0.0);
        float cirrus = smoothstep(0.15, 0.7, fbm2(vec2(p2.x * 0.4, p2.y * 2.4) + 40.0, 6)) * smoothstep(0.08, 0.3, d.y) * 0.5;
        float sd = max(dot(d, SUN_DIR), 0.0);
        float az = max(dot(normalize(vec3(d.x, 0.0, d.z)), normalize(vec3(SUN_DIR.x, 0.0, SUN_DIR.z))), 0.0);
        // underside lit warm gold toward the sun, dusky mauve away from it
        vec3 lit = mix(vec3(0.62, 0.40, 0.30), vec3(1.75, 0.86, 0.36), pow(az, 2.0));
        lit += SUN_COL * pow(sd, 18.0) * 2.4; // silver lining near the sun
        vec3 shade = mix(vec3(0.20, 0.15, 0.15), vec3(0.62, 0.32, 0.17), pow(az, 2.0));
        float thick = smoothstep(0.2, 0.9, dens);
        vec3 col = mix(lit, shade, thick * 0.75);
        // thin edges glow (forward scattering) when backlit
        col += SUN_COL * (1.0 - thick) * pow(sd, 5.0) * 0.9;
        float a = clamp(dens * 0.92 + cirrus * (1.0 - dens), 0.0, 1.0);
        vec3 ccol = mix(mix(lit, vec3(1.5, 0.8, 0.4), pow(az, 3.0)) , col, dens / max(a, 1e-3));
        // horizon haze swallows distant clouds
        float haze = smoothstep(0.0, 0.08, d.y);
        return vec4(ccol, a * haze);
      }
      void main(){
        vec3 d = normalize(vWorld - cameraPosition);
        vec3 col = skyBase(d);
        vec4 c = clouds(d);
        col += sunDisk(d) * (1.0 - c.a);
        col = mix(col, c.rgb, c.a);
        // tiny dither against banding
        col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  return mesh;
}
