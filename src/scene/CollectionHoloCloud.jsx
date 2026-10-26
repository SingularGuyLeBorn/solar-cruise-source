import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  LinearFilter,
  ShaderMaterial,
  SRGBColorSpace,
} from 'three';
import { HOLO_ARTIFACTS, HOLO_ARTIFACT_BY_ID } from '../data/holoArtifacts';
import { SUN, PLANETS } from '../data/solarSystem';
import { loadArtifactPositions } from '../lib/holoArtifacts';
import { useFlightStore } from '../state/useFlightStore';

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uSize;
  uniform float uReveal;
  attribute vec3 aColor;
  attribute float aSeed;
  attribute float aSize;
  varying vec3 vColor;
  varying float vSeed;
  void main() {
    vColor = aColor;
    vSeed = aSeed;
    vec4 viewPos = modelViewMatrix * vec4(position, 1.0);
    float flicker = 0.8 + 0.2 * sin(uTime * 2.6 + aSeed * 47.0);
    gl_PointSize = clamp(uSize * aSize * uPixelRatio * flicker * (0.55 + 0.45 * uReveal), 1.0, 6.5 * uPixelRatio);
    gl_Position = projectionMatrix * viewPos;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform float uReveal;
  varying vec3 vColor;
  varying float vSeed;
  void main() {
    vec2 point = gl_PointCoord - 0.5;
    float dist = length(point);
    if (dist > 0.5) discard;
    float disc = smoothstep(0.5, 0.05, dist);
    float shimmer = 0.78 + 0.22 * sin(uTime * 1.9 + vSeed * 59.0);
    gl_FragColor = vec4(vColor, disc * uOpacity * shimmer * uReveal);
  }
`;

function mulberry32(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function buildColors(artifact, count) {
  const colors = new Float32Array(count * 3);
  const palette = (artifact.colors ?? ['#1b6b76', '#5fd4e2', '#e0aa48', '#efffff']).map((value) => new Color(value));
  const white = new Color('#ffffff');
  const random = mulberry32(hashString(`${artifact.id}:cloud`));
  for (let index = 0; index < count; index += 1) {
    const band = Math.max(0, Math.min(palette.length - 1, Math.floor(random() * palette.length)));
    const color = palette[band].clone();
    if (random() > 0.9) color.lerp(white, 0.5);
    const gain = 0.8 + random() * 0.4;
    colors[index * 3] = Math.min(1, color.r * gain);
    colors[index * 3 + 1] = Math.min(1, color.g * gain);
    colors[index * 3 + 2] = Math.min(1, color.b * gain);
  }
  return colors;
}

function drawGlassFrame(canvas, artifact, index, total, active) {
  const width = canvas.width;
  const height = canvas.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const main = artifact.colors?.[1] ?? '#5fd4e2';
  const pale = artifact.colors?.[3] ?? '#efffff';
  const accent = active ? '#f0c78f' : main;
  const pad = Math.round(width * 0.05);

  ctx.clearRect(0, 0, width, height);
  const glass = ctx.createLinearGradient(0, 0, width, height);
  glass.addColorStop(0, 'rgba(5, 16, 19, 0.38)');
  glass.addColorStop(0.5, 'rgba(4, 12, 15, 0.16)');
  glass.addColorStop(1, 'rgba(2, 8, 11, 0.34)');
  ctx.beginPath();
  ctx.roundRect(pad, pad, width - pad * 2, height - pad * 2, Math.round(width * 0.03));
  ctx.fillStyle = glass;
  ctx.fill();
  ctx.strokeStyle = `${accent}99`;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = main;
  for (let x = pad; x <= width - pad; x += width * 0.05) {
    ctx.beginPath();
    ctx.moveTo(x, pad);
    ctx.lineTo(x, height - pad);
    ctx.stroke();
  }
  for (let y = pad; y <= height - pad; y += width * 0.05) {
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(width - pad, y);
    ctx.stroke();
  }
  ctx.restore();

  const tick = Math.round(width * 0.025);
  ctx.strokeStyle = `${pale}aa`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pad, pad + tick);
  ctx.lineTo(pad, pad);
  ctx.lineTo(pad + tick, pad);
  ctx.moveTo(width - pad - tick, pad);
  ctx.lineTo(width - pad, pad);
  ctx.lineTo(width - pad, pad + tick);
  ctx.moveTo(pad, height - pad - tick);
  ctx.lineTo(pad, height - pad);
  ctx.lineTo(pad + tick, height - pad);
  ctx.moveTo(width - pad - tick, height - pad);
  ctx.lineTo(width - pad, height - pad);
  ctx.lineTo(width - pad, height - pad - tick);
  ctx.stroke();

  ctx.fillStyle = `${main}cc`;
  ctx.font = `500 ${Math.round(width * 0.026)}px "Consolas", monospace`;
  ctx.fillText('REAL SCAN / SANXINGDUI ARCHIVE', pad * 1.6, pad * 2.4);

  ctx.fillStyle = pale;
  const nameSize = artifact.name.length > 7 ? width * 0.07 : width * 0.088;
  ctx.font = `600 ${Math.round(nameSize)}px "Microsoft YaHei", "Noto Sans SC", sans-serif`;
  ctx.fillText(artifact.name, pad * 1.6, height * 0.13);

  ctx.fillStyle = `${main}bb`;
  ctx.font = `400 ${Math.round(width * 0.03)}px "Microsoft YaHei", "Noto Sans SC", sans-serif`;
  ctx.fillText(artifact.era ?? '', pad * 1.6, height * 0.175);

  ctx.fillStyle = `${pale}99`;
  ctx.font = `400 ${Math.round(width * 0.026)}px "Consolas", monospace`;
  ctx.fillText(
    `${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`,
    pad * 1.6,
    height - pad * 1.8,
  );
  ctx.textAlign = 'right';
  ctx.fillStyle = `${accent}aa`;
  ctx.fillText('HOLOGRAPHIC COLLECTION · SC', width - pad * 1.6, height - pad * 1.8);
  ctx.textAlign = 'left';
}

export function CollectionHoloCloud({ count = 3200, scale = 0.3, showFrame = false, active = false, pointSize = 2.3 }) {
  const formId = useFlightStore((state) => state.holo.formId);
  const artifact = HOLO_ARTIFACT_BY_ID.get(formId) ?? HOLO_ARTIFACTS[0];
  const artifactIndex = Math.max(
    0,
    HOLO_ARTIFACTS.findIndex((item) => item.id === artifact.id),
  );
  const spin = useRef();
  const scan = useRef();
  const ring = useRef();
  const reveal = useRef(0);
  const extent = scale * 0.5;

  const geometry = useMemo(() => {
    const geo = new BufferGeometry();
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const sizes = new Float32Array(count);
    const random = mulberry32(hashString(`geom:${count}`));
    for (let index = 0; index < count; index += 1) {
      seeds[index] = random();
      sizes[index] = 0.65 + random() * 0.8;
    }
    geo.setAttribute('position', new BufferAttribute(positions, 3));
    geo.setAttribute('aColor', new BufferAttribute(buildColors(artifact, count), 3));
    geo.setAttribute('aSeed', new BufferAttribute(seeds, 1));
    geo.setAttribute('aSize', new BufferAttribute(sizes, 1));
    return geo;
    // Colors are refreshed on artifact change in the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uPixelRatio: { value: 1 },
          uSize: { value: pointSize },
          uOpacity: { value: 0.96 },
          uReveal: { value: 0 },
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
    [pointSize],
  );

  useEffect(() => () => material.dispose(), [material]);

  const frame = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 800;
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.minFilter = LinearFilter;
    texture.magFilter = LinearFilter;
    return { canvas, texture };
  }, []);

  useEffect(() => () => frame.texture.dispose(), [frame]);

  useEffect(() => {
    let cancelled = false;
    reveal.current = 0;
    const colors = buildColors(artifact, count);
    geometry.attributes.aColor.array.set(colors);
    geometry.attributes.aColor.needsUpdate = true;
    drawGlassFrame(frame.canvas, artifact, artifactIndex, HOLO_ARTIFACTS.length, active);
    frame.texture.needsUpdate = true;
    loadArtifactPositions(artifact, count)
      .then((positions) => {
        if (cancelled) return;
        const target = geometry.attributes.position.array;
        for (let index = 0; index < positions.length; index += 1) {
          target[index] = positions[index] * scale;
        }
        geometry.attributes.position.needsUpdate = true;
        geometry.computeBoundingSphere();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [artifact, artifactIndex, active, count, geometry, frame, scale]);

  useFrame(({ clock, gl }, delta) => {
    const time = clock.elapsedTime;
    material.uniforms.uTime.value = time;
    material.uniforms.uPixelRatio.value = Math.min(2, gl.getPixelRatio());
    material.uniforms.uReveal.value += (1 - material.uniforms.uReveal.value) * Math.min(1, delta * 3.4);
    if (spin.current) {
      spin.current.rotation.y += delta * 0.16;
      spin.current.position.y = Math.sin(time * 0.9) * scale * 0.025;
      const breathe = 1 + Math.sin(time * 1.25) * 0.012;
      spin.current.scale.setScalar(breathe);
    }
    if (scan.current) {
      const travel = ((time * 0.22) % 1) * 2 - 1;
      scan.current.position.y = travel * extent;
      scan.current.material.opacity = 0.1 + 0.12 * Math.sin(time * 2.4);
    }
    if (ring.current) {
      ring.current.rotation.z = time * 0.35;
      ring.current.material.opacity = 0.2 + Math.sin(time * 1.7) * 0.06;
    }
  });

  const accent = active ? '#efc78f' : '#9fe6ff';

  return (
    <group>
      {showFrame ? (
        <mesh position={[0, 0, -scale * 0.62]}>
          <planeGeometry args={[scale * 1.42, scale * 1.78]} />
          <meshBasicMaterial
            map={frame.texture}
            transparent
            depthWrite={false}
            side={DoubleSide}
            toneMapped={false}
            opacity={0.92}
          />
        </mesh>
      ) : null}
      <group ref={spin}>
        <points geometry={geometry}>
          <primitive object={material} attach="material" />
        </points>
        <mesh ref={scan} position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[scale * 1.15, scale * 0.09]} />
          <meshBasicMaterial
            color={accent}
            transparent
            opacity={0.16}
            depthWrite={false}
            side={DoubleSide}
            blending={AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
        <mesh ref={ring} position={[0, -extent - scale * 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[extent * 0.52, extent * 0.66, 64]} />
          <meshBasicMaterial
            color={accent}
            transparent
            opacity={0.24}
            depthWrite={false}
            side={DoubleSide}
            blending={AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
}

export function MiniOrrery({ selectedId }) {
  const group = useRef();
  const bodies = useMemo(() => [SUN, ...PLANETS], []);
  const { geometry, marker } = useMemo(() => {
    const positions = new Float32Array(bodies.length * 3);
    const colors = new Float32Array(bodies.length * 3);
    const maxAu = 30;
    bodies.forEach((body, index) => {
      const au = body.semiMajorAu ?? 0;
      const radius =
        body.id === SUN.id ? 0 : 0.22 + (Math.log10(1 + Math.min(au, maxAu)) / Math.log10(1 + maxAu)) * 0.7;
      const angle = -Math.PI / 2 + (index / bodies.length) * Math.PI * 2;
      positions[index * 3] = Math.cos(angle) * radius;
      positions[index * 3 + 1] = Math.sin(angle * 2) * 0.05;
      positions[index * 3 + 2] = Math.sin(angle) * radius;
      const color = new Color(body.color ?? '#b9e6f2');
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
    });
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(positions, 3));
    geo.setAttribute('color', new BufferAttribute(colors, 3));
    const selectedIndex = Math.max(
      0,
      bodies.findIndex((body) => body.id === selectedId),
    );
    const ring = new BufferGeometry();
    const point = new Float32Array([
      positions[selectedIndex * 3],
      positions[selectedIndex * 3 + 1],
      positions[selectedIndex * 3 + 2],
    ]);
    ring.setAttribute('position', new BufferAttribute(point, 3));
    return { geometry: geo, marker: ring };
  }, [bodies, selectedId]);

  useFrame(({ clock }) => {
    if (group.current) group.current.rotation.y = clock.elapsedTime * 0.28;
  });

  return (
    <group ref={group} rotation={[0.42, 0, 0.08]}>
      <points geometry={geometry}>
        <pointsMaterial
          size={0.085}
          sizeAttenuation
          vertexColors
          transparent
          opacity={0.95}
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </points>
      <points geometry={marker}>
        <pointsMaterial
          size={0.2}
          sizeAttenuation
          color="#f0c78f"
          transparent
          opacity={0.95}
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </points>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.97, 1, 72]} />
        <meshBasicMaterial
          color="#9fe6ff"
          transparent
          opacity={0.24}
          depthWrite={false}
          side={DoubleSide}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
