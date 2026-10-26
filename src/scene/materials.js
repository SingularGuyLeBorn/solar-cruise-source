import * as THREE from 'three';
import { NOISE_GLSL } from './shaders/noise';

const VERTEX_WORLD = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vWorldPos;
void main() {
  vUv = uv;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export function createSunMaterial(map = null) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uMap: { value: map },
      uHasMap: { value: map ? 1 : 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vPos;
      varying vec3 vNormal;
      varying vec2 vUv;
      void main() {
        vPos = position;
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform sampler2D uMap;
      uniform float uHasMap;
      varying vec3 vPos;
      varying vec3 vNormal;
      varying vec2 vUv;
      ${NOISE_GLSL}
      void main() {
        vec3 p = normalize(vPos);
        float n = fbm3(p * 3.4 + vec3(0.0, uTime * 0.008, 0.0));
        float granule = fbm3(p * 26.0 + uTime * 0.05);
        vec3 photo = texture2D(uMap, vUv).rgb;
        vec3 fallback = mix(vec3(1.0, 0.26, 0.03), vec3(1.0, 0.7, 0.2), n * 0.72 + granule * 0.28);
        vec3 base = mix(fallback, photo * 1.18 + vec3(0.18, 0.06, 0.0), uHasMap);
        float spot = smoothstep(0.55, 0.68, fbm3(p * 1.8 + vec3(8.0, 2.0, 4.0)));
        float fixedSpots = smoothstep(0.2, 0.08, distance(p, normalize(vec3(0.55, 0.22, 0.78))))
          + smoothstep(0.16, 0.06, distance(p, normalize(vec3(-0.42, 0.42, 0.62))))
          + smoothstep(0.12, 0.04, distance(p, normalize(vec3(0.18, -0.5, 0.72))));
        base *= 1.0 - spot * 0.55 - min(0.85, fixedSpots) * 0.42;
        float limb = pow(1.0 - abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0))), 1.2);
        base += vec3(1.0, 0.42, 0.08) * limb * 0.35;
        gl_FragColor = vec4(base * 1.18, 1.0);
      }
    `,
    toneMapped: false,
  });
}

export function createEarthMaterial(dayMap, nightMap) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uDay: { value: dayMap },
      uNight: { value: nightMap },
      uSun: { value: new THREE.Vector3(1, 0, 0) },
    },
    vertexShader: VERTEX_WORLD,
    fragmentShader: /* glsl */ `
      uniform sampler2D uDay;
      uniform sampler2D uNight;
      uniform vec3 uSun;
      varying vec2 vUv;
      varying vec3 vNormalW;
      varying vec3 vWorldPos;
      void main() {
        float light = dot(normalize(vNormalW), normalize(uSun));
        float day = smoothstep(-0.18, 0.32, light);
        vec3 dayColor = texture2D(uDay, vUv).rgb;
        vec3 nightColor = texture2D(uNight, vUv).rgb;
        vec3 color = mix(nightColor * 1.5, dayColor, day);
        gl_FragColor = vec4(color, 1.0);
      }
    `,
    toneMapped: false,
  });
}

export function createCloudMaterial(cloudMap) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: cloudMap },
      uSun: { value: new THREE.Vector3(1, 0, 0) },
    },
    vertexShader: VERTEX_WORLD,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform vec3 uSun;
      varying vec2 vUv;
      varying vec3 vNormalW;
      varying vec3 vWorldPos;
      void main() {
        vec4 tex = texture2D(uMap, vUv);
        float cloud = max(max(tex.r, tex.g), tex.b);
        float light = smoothstep(-0.15, 0.4, dot(normalize(vNormalW), normalize(uSun)));
        gl_FragColor = vec4(vec3(0.9, 0.96, 1.0) * (0.25 + light * 0.9), cloud * 0.62);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
}

export function createAtmosphereMaterial(color = '#8fd3ff', strength = 1) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uStrength: { value: strength },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormalW;
      varying vec3 vViewDir;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vViewDir = normalize(cameraPosition - world.xyz);
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uStrength;
      varying vec3 vNormalW;
      varying vec3 vViewDir;
      void main() {
        float fresnel = pow(1.0 - abs(dot(normalize(vNormalW), normalize(vViewDir))), 2.4);
        gl_FragColor = vec4(uColor, fresnel * 0.55 * uStrength);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
}
