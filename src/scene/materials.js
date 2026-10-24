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

export function createSunMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vPos;
      varying vec3 vNormal;
      void main() {
        vPos = position;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec3 vPos;
      varying vec3 vNormal;
      ${NOISE_GLSL}
      void main() {
        vec3 p = normalize(vPos);
        float n = fbm3(p * 3.4 + vec3(0.0, uTime * 0.008, 0.0));
        float granule = fbm3(p * 26.0 + uTime * 0.05);
        float spot = smoothstep(0.55, 0.68, fbm3(p * 1.8 + vec3(8.0, 2.0, 4.0)));
        vec3 base = mix(vec3(1.0, 0.26, 0.03), vec3(1.0, 0.7, 0.2), n * 0.72 + granule * 0.28);
        float fixedSpots = smoothstep(0.2, 0.08, distance(p, normalize(vec3(0.55, 0.22, 0.78))))
          + smoothstep(0.16, 0.06, distance(p, normalize(vec3(-0.42, 0.42, 0.62))))
          + smoothstep(0.12, 0.04, distance(p, normalize(vec3(0.18, -0.5, 0.72))));
        base *= 1.0 - spot * 0.72 - min(0.85, fixedSpots) * 0.62;
        float limb = pow(1.0 - abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0))), 1.2);
        base += vec3(1.0, 0.42, 0.08) * limb * 0.35;
        gl_FragColor = vec4(base * 1.3, 1.0);
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

export function createShieldMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uActive: { value: 1 },
      uImpactDir: { value: new THREE.Vector3(0, 1, 0) },
      uImpactTime: { value: -100 },
      uColor: { value: new THREE.Color('#56d9ff') },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vNormalW;
      varying vec3 vViewDir;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vUv = uv;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vViewDir = normalize(cameraPosition - world.xyz);
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uActive;
      uniform vec3 uImpactDir;
      uniform float uImpactTime;
      uniform vec3 uColor;
      varying vec2 vUv;
      varying vec3 vNormalW;
      varying vec3 vViewDir;
      void main() {
        vec2 gridUv = vUv * vec2(48.0, 24.0);
        vec2 cell = fract(gridUv) - 0.5;
        float hex = smoothstep(0.34, 0.48, max(abs(cell.x) * 0.866 + abs(cell.y) * 0.5, abs(cell.y)));
        float fresnel = pow(1.0 - abs(dot(normalize(vNormalW), normalize(vViewDir))), 1.8);
        float impactAge = max(0.0, uTime - uImpactTime);
        float angle = acos(clamp(dot(normalize(vNormalW), normalize(uImpactDir)), -1.0, 1.0));
        float wave = sin(angle * 28.0 - impactAge * 12.0) * exp(-angle * 3.2 - impactAge * 1.9);
        wave = max(wave, 0.0) * step(0.001, impactAge) * step(impactAge, 3.5);
        float alpha = (hex * 0.012 + fresnel * 0.03 + wave * 0.8) * uActive;
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(uColor + vec3(wave * 0.6), alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
}

export function createPlumeMaterial(color = '#5fc8ff') {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPower: { value: 0 },
      uColor: { value: new THREE.Color(color) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uPower;
      uniform vec3 uColor;
      varying vec2 vUv;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() {
        float along = clamp(vUv.y, 0.0, 1.0);
        float flicker = 0.76 + 0.24 * sin(uTime * 35.0 + vUv.y * 24.0) * hash(vUv * 18.0);
        float core = pow(1.0 - along, 1.8);
        float edge = pow(1.0 - abs(vUv.x - 0.5) * 2.0, 1.5);
        vec3 hot = mix(uColor, vec3(1.0), core * 0.9);
        float alpha = core * edge * flicker * uPower;
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(hot, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
}
