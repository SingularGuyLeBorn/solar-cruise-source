import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, DoubleSide, ShaderMaterial } from 'three';

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uMode;
  uniform float uSeed;
  uniform float uOpacity;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;
  varying vec2 vUv;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {
      value += amp * noise(p);
      p = mat2(1.6, 1.2, -1.2, 1.6) * p;
      amp *= 0.5;
    }
    return value;
  }

  void main() {
    vec2 uv = vUv;
    vec2 p = uv * 2.0 - 1.0;
    float t = uTime * 0.32 + uSeed;

    float band = floor(uv.y * 16.0);
    float glitch = step(0.9, hash21(vec2(band, floor(uTime * 6.0 + uSeed * 4.0))));
    float shift = (hash21(vec2(band, 7.7)) - 0.5) * 0.16 * glitch;
    vec2 q = p;
    q.x += shift;

    vec2 warp = vec2(
      fbm(q * 2.1 + vec2(t, -t * 0.6)),
      fbm(q * 2.1 + vec2(5.2, t * 0.8))
    );
    float field = fbm(q * 3.0 + warp * 1.8 + vec2(0.0, t * 0.45));

    float contour = abs(fract(field * 7.0 + t * 0.3) - 0.5);
    float iso = smoothstep(0.075, 0.0, contour);
    float waveY = 0.5 + 0.16 * sin(uv.x * 17.0 + t * 3.0) + 0.06 * sin(uv.x * 43.0 - t * 2.2);
    float wave = smoothstep(0.018, 0.0, abs(uv.y - waveY));

    float radius = length(p);
    float rings = smoothstep(0.93, 1.0, sin(radius * 22.0 - uTime * 2.7 + field * 6.0));
    float spokes = smoothstep(0.86, 1.0, sin(atan(p.y, p.x) * 20.0 + uTime * 0.7));
    float solar = smoothstep(0.0, 1.0, uMode);
    float circular = smoothstep(1.2, 0.24, radius);

    float bars = smoothstep(0.9, 1.0, sin(uv.x * 68.0 + uTime * 1.9));
    bars *= smoothstep(0.3, 0.0, uv.y);
    float edge = smoothstep(0.022, 0.0, min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y)));
    edge *= 1.0 - solar;

    float split = 0.004 + glitch * 0.035;
    float redField = fbm(q * 3.0 + warp * 1.8 + vec2(split, 0.0) + vec2(0.0, t * 0.45));
    float blueField = fbm(q * 3.0 + warp * 1.8 - vec2(split, 0.0) + vec2(0.0, t * 0.45));
    vec3 color =
      uColorA * (0.35 + redField * 0.9) +
      uColorB * (0.12 + blueField * 0.72) +
      uColorC * (iso * 0.8 + wave * 1.15 + bars * 0.5 + edge * 0.55) +
      uColorC * (rings * 0.35 * (1.0 - solar) + spokes * 0.35 * solar);

    float mask = mix(smoothstep(1.25, 0.3, length(p)), circular, solar);
    float alpha = uOpacity * mask * (
      0.08 +
      iso * 0.48 +
      wave * 0.42 +
      bars * 0.36 +
      edge * 0.5 +
      (rings * 0.4 * (1.0 - solar) + spokes * 0.28 * solar)
    );
    alpha *= 0.78 + 0.22 * (0.5 + 0.5 * sin(uv.y * 230.0 - uTime * 9.0));

    gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.9));
  }
`;

export function HoloSignalField({
  width = 1,
  height = 1,
  mode = 'collection',
  palette = ['#0b6f86', '#e0a253', '#bff7ff'],
  opacity = 0.55,
  seed = 0,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}) {
  const paletteKey = palette.join('|');
  const material = useMemo(() => {
    const [a, b, c] = palette;
    return new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMode: { value: mode === 'solar' ? 1 : 0 },
        uSeed: { value: seed },
        uOpacity: { value: opacity },
        uColorA: { value: new Color(a) },
        uColorB: { value: new Color(b) },
        uColorC: { value: new Color(c) },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      blending: AdditiveBlending,
      toneMapped: false,
    });
    // paletteKey intentionally captures palette changes without recreating on array identity churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, paletteKey, opacity, seed]);

  useEffect(() => () => material.dispose(), [material]);
  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <mesh position={position} rotation={rotation} renderOrder={-1}>
      <planeGeometry args={[width, height]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

export function FeedbackEcho({
  geometry,
  color = '#9fe6ff',
  size = 0.008,
  opacity = 0.16,
  scale = 1.03,
  speed = 0.08,
  offset = [0, 0, 0],
}) {
  const ref = useRef();
  useFrame(({ clock }, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * speed;
    const pulse = 0.7 + 0.3 * Math.sin(clock.elapsedTime * 1.1 + speed * 30);
    ref.current.material.opacity = opacity * pulse;
  });
  return (
    <points ref={ref} geometry={geometry} position={offset} scale={scale}>
      <pointsMaterial
        color={color}
        size={size}
        sizeAttenuation
        transparent
        opacity={opacity}
        blending={AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
}

export function SignalTicks({
  radius = 0.3,
  count = 64,
  color = '#f0c78f',
  opacity = 0.24,
  length = 0.02,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}) {
  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 6);
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2;
      const inner = index % 4 === 0 ? radius + length * 1.6 : radius;
      positions[index * 6] = Math.cos(angle) * inner;
      positions[index * 6 + 1] = Math.sin(angle) * inner;
      positions[index * 6 + 2] = 0;
      positions[index * 6 + 3] = Math.cos(angle) * (radius + length);
      positions[index * 6 + 4] = Math.sin(angle) * (radius + length);
      positions[index * 6 + 5] = 0;
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(positions, 3));
    return geo;
  }, [count, length, radius]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <lineSegments geometry={geometry} position={position} rotation={rotation}>
      <lineBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        blending={AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </lineSegments>
  );
}

export function SignalNetwork({ nodes, color = '#7fe9ff', opacity = 0.2 }) {
  const geometry = useMemo(() => {
    const segments = [];
    nodes.forEach((node, index) => {
      const next = nodes[(index + 1) % nodes.length];
      segments.push(node.x, node.y, -0.0015, next.x, next.y, -0.0015);
    });
    const stride = Math.max(2, Math.floor(nodes.length / 4));
    for (let index = 2; index < nodes.length; index += stride) {
      const target = nodes[index];
      segments.push(nodes[0].x, nodes[0].y, -0.0015, target.x, target.y, -0.0015);
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(new Float32Array(segments), 3));
    return geo;
  }, [nodes]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        blending={AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </lineSegments>
  );
}

export function SignalCore({ radius = 0.04, color = '#d8b6ff', opacity = 0.28 }) {
  const ref = useRef();
  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.x += delta * 0.11;
    ref.current.rotation.y += delta * 0.17;
  });
  return (
    <mesh ref={ref}>
      <icosahedronGeometry args={[radius, 0]} />
      <meshBasicMaterial
        color={color}
        wireframe
        transparent
        opacity={opacity}
        blending={AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
