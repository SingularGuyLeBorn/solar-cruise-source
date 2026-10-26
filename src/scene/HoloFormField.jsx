import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, ShaderMaterial } from 'three';
import { HOLO_FORM_BY_ID, HOLO_PALETTES } from '../data/holoForms';
import { HOLO_ARTIFACT_BY_ID } from '../data/holoArtifacts';
import { generateHoloPositions } from '../lib/holoShapes';
import { loadArtifactPositions } from '../lib/holoArtifacts';
import { useFlightStore } from '../state/useFlightStore';

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uSize;
  attribute vec3 aColor;
  attribute float aSeed;
  attribute float aSize;
  varying vec3 vColor;
  varying float vSeed;
  void main() {
    vColor = aColor;
    vSeed = aSeed;
    vec4 viewPos = modelViewMatrix * vec4(position, 1.0);
    float flicker = 0.82 + 0.18 * sin(uTime * 2.4 + aSeed * 47.0);
    gl_PointSize = clamp(uSize * aSize * uPixelRatio * flicker, 1.0, 5.0 * uPixelRatio);
    gl_Position = projectionMatrix * viewPos;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vSeed;
  void main() {
    vec2 point = gl_PointCoord - 0.5;
    float distanceToCenter = length(point);
    if (distanceToCenter > 0.5) discard;
    float disc = smoothstep(0.5, 0.06, distanceToCenter);
    float shimmer = 0.8 + 0.2 * sin(uTime * 1.9 + vSeed * 59.0);
    gl_FragColor = vec4(vColor, disc * uOpacity * shimmer);
  }
`;

function hashSeed(id) {
  let hash = 2166136261;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function normalizePositions(raw, count) {
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  for (let index = 0; index < count; index += 1) {
    const x = raw[index * 3];
    const y = raw[index * 3 + 1];
    const z = raw[index * 3 + 2];
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (z < minZ) minZ = z;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (z > maxZ) maxZ = z;
  }
  const centerX = (minX + maxX) * 0.5;
  const centerY = (minY + maxY) * 0.5;
  const centerZ = (minZ + maxZ) * 0.5;
  const halfExtent = Math.max(maxX - minX, maxY - minY, maxZ - minZ, 0.0001) * 0.5;
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    positions[index * 3] = (raw[index * 3] - centerX) / halfExtent;
    positions[index * 3 + 1] = (raw[index * 3 + 1] - centerY) / halfExtent;
    positions[index * 3 + 2] = (raw[index * 3 + 2] - centerZ) / halfExtent;
  }
  return positions;
}

function buildColors(positions, count, form, kind, palette) {
  const colors = new Float32Array(count * 3);
  const white = new Color('#ffffff');
  let lows;
  let highs;
  if (kind === 'artifact') {
    lows = (form.colors ?? ['#1b6b76', '#5fd4e2', '#e0aa48', '#efffff']).map((value) => new Color(value));
  } else {
    const override = HOLO_PALETTES.find((entry) => entry.id === palette)?.colors;
    lows = override ?? form.colors ?? ['#9fe6ff', '#ffffff'];
    highs = [new Color(lows[0]), new Color(lows[lows.length - 1])];
  }
  const random = mulberry32(hashSeed(`${form.id}:${palette}`));
  for (let index = 0; index < count; index += 1) {
    const y = positions[index * 3 + 1];
    let color;
    if (kind === 'artifact') {
      const band = Math.min(lows.length - 1, Math.max(0, Math.floor((y + 0.6) * lows.length * 0.7 + random() * 0.7)));
      color = lows[band].clone();
      if (random() > 0.9) color.lerp(white, 0.48);
    } else {
      const mix = Math.min(1, Math.max(0, 0.5 + y * 0.55 + (random() - 0.5) * 0.5));
      color = highs[0].clone().lerp(highs[1], mix);
      if (random() > 0.93) color.lerp(white, 0.55);
    }
    const gain = 0.85 + random() * 0.35;
    colors[index * 3] = Math.min(1, color.r * gain);
    colors[index * 3 + 1] = Math.min(1, color.g * gain);
    colors[index * 3 + 2] = Math.min(1, color.b * gain);
  }
  return colors;
}

function mulberry32(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function useFormGeometry(count) {
  return useMemo(() => {
    const geometry = new BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const sizes = new Float32Array(count);
    for (let index = 0; index < count; index += 1) {
      seeds[index] = Math.random();
      sizes[index] = 0.7 + Math.random() * 0.75;
    }
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setAttribute('aColor', new BufferAttribute(colors, 3));
    geometry.setAttribute('aSeed', new BufferAttribute(seeds, 1));
    geometry.setAttribute('aSize', new BufferAttribute(sizes, 1));
    return geometry;
  }, [count]);
}

export function HoloFormField({
  form,
  kind = 'form',
  palette = 'preset',
  count = 2600,
  scale = 0.08,
  pointSize = 1.8,
  opacity = 0.95,
  tilt = -0.82,
  preview = false,
}) {
  const spin = useRef();
  const geometry = useFormGeometry(count);
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
  const morph = useRef({
    currentPositions: null,
    currentColors: null,
    fromPositions: null,
    fromColors: null,
    targetPositions: null,
    targetColors: null,
    startedAt: 0,
    duration: preview ? 1.15 : 1.35,
  });

  useEffect(() => {
    let cancelled = false;
    const state = morph.current;
    if (!state.currentPositions || state.currentPositions.length !== count * 3) {
      state.currentPositions = null;
      state.currentColors = null;
      state.fromPositions = null;
      state.fromColors = null;
      state.targetPositions = null;
      state.targetColors = null;
    }

    const apply = (positions, colors) => {
      if (cancelled) return;
      state.targetPositions = positions;
      state.targetColors = colors;
      if (!state.currentPositions) {
        state.currentPositions = positions.slice();
        state.currentColors = colors.slice();
        geometry.attributes.position.array.set(positions);
        geometry.attributes.aColor.array.set(colors);
        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.aColor.needsUpdate = true;
        return;
      }
      state.fromPositions = state.currentPositions.slice();
      state.fromColors = state.currentColors.slice();
      state.startedAt = performance.now() / 1000;
    };

    if (kind === 'artifact') {
      loadArtifactPositions(form, count)
        .then((raw) => {
          if (cancelled) return;
          const positions = normalizePositions(raw, count);
          apply(positions, buildColors(positions, count, form, kind, palette));
        })
        .catch(() => {});
    } else {
      const raw = generateHoloPositions(form.layout ?? 'orb', count, hashSeed(`${form.id}:${palette}`));
      const positions = normalizePositions(raw, count);
      apply(positions, buildColors(positions, count, form, kind, palette));
    }

    return () => {
      cancelled = true;
    };
  }, [form, kind, palette, count, geometry]);

  useEffect(
    () => () => {
      geometry.dispose();
    },
    [geometry],
  );

  useEffect(
    () => () => {
      material.dispose();
    },
    [material],
  );

  useFrame(({ clock, gl }, delta) => {
    material.uniforms.uTime.value = clock.elapsedTime;
    material.uniforms.uPixelRatio.value = Math.min(2, gl.getPixelRatio());
    if (spin.current) {
      spin.current.rotation.y += delta * (preview ? 0.28 : 0.16);
      spin.current.position.y = Math.sin(clock.elapsedTime * 0.8) * (preview ? 0.018 : 0.008);
    }
    const state = morph.current;
    if (!state.targetPositions || !state.currentPositions) return;
    if (!state.fromPositions) return;
    const elapsed = performance.now() / 1000 - state.startedAt;
    const progress = Math.min(1, elapsed / state.duration);
    const eased = 1 - (1 - progress) ** 3;
    const positions = geometry.attributes.position.array;
    const colors = geometry.attributes.aColor.array;
    for (let index = 0; index < count * 3; index += 1) {
      positions[index] =
        state.fromPositions[index] + (state.targetPositions[index] - state.fromPositions[index]) * eased;
      colors[index] = state.fromColors[index] + (state.targetColors[index] - state.fromColors[index]) * eased;
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.aColor.needsUpdate = true;
    if (progress >= 1) {
      state.currentPositions = state.targetPositions.slice();
      state.currentColors = state.targetColors.slice();
      state.fromPositions = null;
      state.fromColors = null;
    }
  });

  return (
    <group scale={scale}>
      <group rotation={[tilt, 0, 0]}>
        <group ref={spin}>
          <points geometry={geometry} material={material} frustumCulled={false} />
        </group>
      </group>
    </group>
  );
}

export function useHoloFormSelection() {
  const formKind = useFlightStore((state) => state.holo.formKind);
  const formId = useFlightStore((state) => state.holo.formId);
  const palette = useFlightStore((state) => state.holo.formPalette);
  const form =
    (formKind === 'artifact' ? HOLO_ARTIFACT_BY_ID.get(formId) : HOLO_FORM_BY_ID.get(formId)) ??
    HOLO_FORM_BY_ID.get('orb');
  return { form, kind: formKind, palette };
}

export function ProjectorHoloForm(props) {
  const { form, kind, palette } = useHoloFormSelection();
  return <HoloFormField form={form} kind={kind} palette={palette} {...props} />;
}
