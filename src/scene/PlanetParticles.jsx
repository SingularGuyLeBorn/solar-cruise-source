import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, ShaderMaterial } from 'three';
import { SUN } from '../data/solarSystem';
import { thumbPath, useStaticTexture } from '../lib/progressiveTextures';

const publicPath = (path) => (path?.startsWith('/') ? path : `/${path}`);
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const PIXEL_CACHE = new Map();
const CLOUD_CACHE = new Map();

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uSize;
  attribute vec3 aColor;
  attribute vec3 aNormal;
  attribute float aSeed;
  attribute float aAlpha;
  attribute float aKind;
  attribute float aSize;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vSeed;
  varying float vFacing;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vec3 normal = normalize(mat3(modelMatrix) * aNormal);
    vec3 view = normalize(cameraPosition - world.xyz);
    vFacing = mix(clamp(dot(normal, view), 0.0, 1.0), 1.0, aKind);
    vColor = aColor;
    vAlpha = aAlpha;
    vSeed = aSeed;
    vec4 viewPos = viewMatrix * world;
    float flicker = 0.88 + 0.12 * sin(uTime * 2.1 + aSeed * 37.0);
    gl_PointSize = clamp(
      uSize * aSize * uPixelRatio * flicker / max(0.2, -viewPos.z),
      1.0,
      7.0 * uPixelRatio
    );
    gl_Position = projectionMatrix * viewPos;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vSeed;
  varying float vFacing;
  void main() {
    vec2 point = gl_PointCoord - 0.5;
    float distanceToCenter = length(point);
    if (distanceToCenter > 0.5) discard;
    float disc = smoothstep(0.5, 0.08, distanceToCenter);
    float shimmer = 0.82 + 0.18 * sin(uTime * 1.7 + vSeed * 53.0);
    float alpha = disc * uOpacity * vAlpha * (0.2 + 0.8 * vFacing) * shimmer;
    vec3 color = vColor * (0.78 + 0.4 * vFacing);
    gl_FragColor = vec4(color, alpha);
  }
`;

function srgbToLinear(value) {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function texturePixels(texture) {
  let pixels = PIXEL_CACHE.get(texture.uuid);
  if (pixels) return pixels;
  const width = 512;
  const height = 256;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context || !texture.image) return null;
  context.drawImage(texture.image, 0, 0, width, height);
  pixels = context.getImageData(0, 0, width, height).data;
  PIXEL_CACHE.set(texture.uuid, { pixels, width, height });
  return PIXEL_CACHE.get(texture.uuid);
}

function pushPoint(arrays, position, normal, color, seed, alpha, kind, size) {
  arrays.position.push(position[0], position[1], position[2]);
  arrays.normal.push(normal[0], normal[1], normal[2]);
  arrays.color.push(color.r, color.g, color.b);
  arrays.seed.push(seed);
  arrays.alpha.push(alpha);
  arrays.kind.push(kind);
  arrays.size.push(size);
}

function buildSunCloud(count) {
  const cacheKey = `sun:${count}`;
  const cached = CLOUD_CACHE.get(cacheKey);
  if (cached) return cached;
  const arrays = {
    position: [],
    normal: [],
    color: [],
    seed: [],
    alpha: [],
    kind: [],
    size: [],
  };
  const deep = new Color('#ff4f0f');
  const warm = new Color('#ff9d32');
  const bright = new Color('#ffe3a1');
  const spot = new Color('#54200e');
  for (let index = 0; index < count; index += 1) {
    const y = 1 - ((index + 0.5) / count) * 2;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const angle = index * GOLDEN_ANGLE + Math.random() * 0.16;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    let color;
    if (Math.random() < 0.045) color = spot;
    else {
      color = deep.clone().lerp(warm, Math.pow(Math.random(), 0.7));
      if (Math.random() > 0.9) color.lerp(bright, 0.72);
    }
    pushPoint(arrays, [x, y, z], [x, y, z], color, Math.random(), 1, 0, 0.75 + Math.random() * 0.6);
  }
  const haloCount = Math.max(80, Math.round(count * 0.14));
  for (let index = 0; index < haloCount; index += 1) {
    const y = Math.random() * 2 - 1;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const angle = Math.random() * Math.PI * 2;
    const distance = 1.04 + Math.random() * 0.16;
    pushPoint(
      arrays,
      [Math.cos(angle) * radius * distance, y * distance, Math.sin(angle) * radius * distance],
      [0, 1, 0],
      warm,
      Math.random(),
      0.26,
      1,
      0.7 + Math.random() * 0.8,
    );
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(arrays.position), 3));
  geometry.setAttribute('aNormal', new BufferAttribute(new Float32Array(arrays.normal), 3));
  geometry.setAttribute('aColor', new BufferAttribute(new Float32Array(arrays.color), 3));
  geometry.setAttribute('aSeed', new BufferAttribute(new Float32Array(arrays.seed), 1));
  geometry.setAttribute('aAlpha', new BufferAttribute(new Float32Array(arrays.alpha), 1));
  geometry.setAttribute('aKind', new BufferAttribute(new Float32Array(arrays.kind), 1));
  geometry.setAttribute('aSize', new BufferAttribute(new Float32Array(arrays.size), 1));
  geometry.computeBoundingSphere();
  CLOUD_CACHE.set(cacheKey, geometry);
  return geometry;
}

function buildPlanetCloud(body, texture, count, withRings) {
  const cacheKey = `${body.id}:${texture?.uuid ?? 'none'}:${count}:${withRings ? 1 : 0}`;
  const cached = CLOUD_CACHE.get(cacheKey);
  if (cached) return cached;
  const pixels = texture ? texturePixels(texture) : null;
  const arrays = {
    position: [],
    normal: [],
    color: [],
    seed: [],
    alpha: [],
    kind: [],
    size: [],
  };
  const fallback = new Color(body.color ?? '#c6d5d7');
  for (let index = 0; index < count; index += 1) {
    const y = 1 - ((index + 0.5) / count) * 2;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const angle = index * GOLDEN_ANGLE + Math.random() * 0.14;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    let color = fallback;
    if (pixels) {
      const u = (Math.atan2(z, x) / (Math.PI * 2) + 1) % 1;
      const v = 0.5 - Math.asin(y) / Math.PI;
      const pixelX = Math.min(pixels.width - 1, Math.floor(u * pixels.width));
      const pixelY = Math.min(pixels.height - 1, Math.floor(v * pixels.height));
      const offset = (pixelY * pixels.width + pixelX) * 4;
      const shade = 0.92 + Math.random() * 0.2;
      color = new Color(
        srgbToLinear(pixels.pixels[offset] / 255) * shade + 0.008,
        srgbToLinear(pixels.pixels[offset + 1] / 255) * shade + 0.008,
        srgbToLinear(pixels.pixels[offset + 2] / 255) * shade + 0.008,
      );
    }
    const shell = 1 + (Math.random() - 0.5) * 0.022;
    pushPoint(
      arrays,
      [x * shell, y * shell, z * shell],
      [x, y, z],
      color,
      Math.random(),
      1,
      0,
      0.78 + Math.random() * 0.5,
    );
  }

  const haloCount = Math.max(40, Math.round(count * 0.09));
  const haloColor = new Color(body.color ?? '#9fe6ff');
  for (let index = 0; index < haloCount; index += 1) {
    const y = Math.random() * 2 - 1;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const angle = Math.random() * Math.PI * 2;
    const distance = 1.05 + Math.random() * 0.14;
    pushPoint(
      arrays,
      [Math.cos(angle) * radius * distance, y * distance, Math.sin(angle) * radius * distance],
      [0, 1, 0],
      haloColor,
      Math.random(),
      0.2,
      1,
      0.7 + Math.random() * 0.8,
    );
  }

  if (withRings && (body.ringTexture || body.thinRings)) {
    const ringColor = new Color(body.ringColor ?? '#d6c5a5');
    const ringCount = Math.round(count * 0.45);
    for (let index = 0; index < ringCount; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 1.42 + Math.random() * 0.78;
      pushPoint(
        arrays,
        [Math.cos(angle) * distance, (Math.random() - 0.5) * 0.018, Math.sin(angle) * distance],
        [0, 1, 0],
        ringColor,
        Math.random(),
        0.38,
        1,
        0.65 + Math.random() * 0.9,
      );
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(arrays.position), 3));
  geometry.setAttribute('aNormal', new BufferAttribute(new Float32Array(arrays.normal), 3));
  geometry.setAttribute('aColor', new BufferAttribute(new Float32Array(arrays.color), 3));
  geometry.setAttribute('aSeed', new BufferAttribute(new Float32Array(arrays.seed), 1));
  geometry.setAttribute('aAlpha', new BufferAttribute(new Float32Array(arrays.alpha), 1));
  geometry.setAttribute('aKind', new BufferAttribute(new Float32Array(arrays.kind), 1));
  geometry.setAttribute('aSize', new BufferAttribute(new Float32Array(arrays.size), 1));
  geometry.computeBoundingSphere();
  CLOUD_CACHE.set(cacheKey, geometry);
  return geometry;
}

function useParticleMaterial(pointSize = 1.4, opacity = 1) {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uPixelRatio: { value: 1 },
          uSize: { value: pointSize },
          uOpacity: { value: opacity },
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
    [pointSize, opacity],
  );
  useEffect(
    () => () => {
      material.dispose();
    },
    [material],
  );
  useFrame(({ clock, gl }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
    material.uniforms.uPixelRatio.value = Math.min(2, gl.getPixelRatio());
  });
  return material;
}

function TexturedPlanetParticles({ body, count, pointSize, opacity, rings, scale }) {
  const texture = useStaticTexture(thumbPath(publicPath(body.texture)));
  const geometry = useMemo(() => buildPlanetCloud(body, texture, count, rings), [body, texture, count, rings]);
  const material = useParticleMaterial(pointSize, opacity);
  return <points geometry={geometry} material={material} scale={scale} />;
}

function SunParticles({ count, pointSize, opacity, scale }) {
  const geometry = useMemo(() => buildSunCloud(count), [count]);
  const material = useParticleMaterial(pointSize, opacity);
  return <points geometry={geometry} material={material} scale={scale} />;
}

export function PlanetParticles({ body, count = 400, pointSize = 1.4, opacity = 0.95, rings = false, scale = 1 }) {
  if (body.id === SUN.id) {
    return <SunParticles count={count} pointSize={pointSize} opacity={opacity} scale={scale} />;
  }
  return (
    <TexturedPlanetParticles
      body={body}
      count={count}
      pointSize={pointSize}
      opacity={opacity}
      rings={rings}
      scale={scale}
    />
  );
}
