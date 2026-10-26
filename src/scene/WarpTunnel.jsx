import { useMemo, useRef } from 'react';
import { ChromaticAberration } from '@react-three/postprocessing';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, DoubleSide, MathUtils, ShaderMaterial, Vector2, Vector3 } from 'three';
import { flightState } from '../state/flightState';
import { useFlightStore } from '../state/useFlightStore';

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uStrength;
  uniform float uJump;
  uniform float uAspect;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float tunnel(vec2 p) {
    float r = length(p);
    float a = atan(p.y, p.x);
    float flow = uTime * (1.0 + uJump * 1.4);
    float streak = noise(vec2(a * 5.0 + r * 2.5, r * 7.0 - flow * 1.6));
    streak = pow(streak, 2.6);
    float rays = pow(0.5 + 0.5 * sin(a * 58.0 + sin(a * 9.0) * 4.0 - flow * 2.6), 9.0);
    float rings = 0.5 + 0.5 * sin(r * 46.0 - flow * 11.0 + a * 2.0);
    float spokes = 0.5 + 0.5 * sin(a * 19.0 + r * 5.0 - flow * 5.0);
    return streak * 0.8 + rays * 0.6 + rings * spokes * 0.18;
  }

  void main() {
    vec2 p = vec2((vUv.x * 2.0 - 1.0) * uAspect, vUv.y * 2.0 - 1.0);
    float r = length(p);
    float disp = (0.032 + uJump * 0.06) * (0.35 + uStrength * 0.65);
    float ca = cos(disp * 2.2);
    float sa = sin(disp * 2.2);
    mat2 bendRight = mat2(ca, -sa, sa, ca);
    mat2 bendLeft = mat2(ca, sa, -sa, ca);

    float red = tunnel(bendRight * p * (1.0 + disp));
    float green = tunnel(p);
    float blue = tunnel(bendLeft * p * (1.0 - disp));

    vec3 color = vec3(0.35, 0.8, 1.0) * green;
    color += vec3(1.0, 0.22, 0.72) * red * 0.85;
    color += vec3(0.22, 0.45, 1.0) * blue * 0.8;

    float core = exp(-r * 3.2) * (0.3 + uJump * 0.8);
    color += vec3(1.0, 0.82, 0.6) * core;

    float mask = smoothstep(0.04, 0.3, r) * smoothstep(1.6, 0.8, r);
    float alpha = (green * 0.72 + red * 0.42 + blue * 0.5 + 0.12) * mask * uStrength;
    alpha *= 0.2 + smoothstep(0.0, 0.7, r) * 0.8;

    if (alpha < 0.003) discard;
    gl_FragColor = vec4(color, alpha);
  }
`;

export function WarpTunnel() {
  const mesh = useRef();
  const smooth = useRef(0);
  const direction = useMemo(() => new Vector3(), []);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uStrength: { value: 0 },
          uJump: { value: 0 },
          uAspect: { value: 1 },
        },
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
        toneMapped: false,
      }),
    [],
  );

  useFrame(({ camera }, delta) => {
    const state = useFlightStore.getState();
    const jump = flightState.jump.active ? 1 : 0;
    const target = state.earthMode ? 0 : Math.min(1, flightState.warp / 9 + jump);
    smooth.current += (target - smooth.current) * (1 - Math.exp(-delta * 5.5));
    const strength = smooth.current;

    material.uniforms.uStrength.value = strength;
    material.uniforms.uTime.value += delta;
    material.uniforms.uJump.value = jump;
    material.uniforms.uAspect.value = camera.aspect;
    material.visible = strength > 0.012;

    if (!mesh.current) return;
    mesh.current.visible = strength > 0.012;
    if (!mesh.current.visible) return;

    const height = 2 * Math.tan(MathUtils.degToRad(camera.fov) / 2) * 0.9;
    camera.getWorldDirection(direction);
    mesh.current.position.copy(camera.position).addScaledVector(direction, 0.9);
    mesh.current.quaternion.copy(camera.quaternion);
    mesh.current.scale.set(height * camera.aspect, height, 1);
  }, 3);

  return (
    <mesh ref={mesh} renderOrder={999} frustumCulled={false} visible={false}>
      <planeGeometry args={[1, 1]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

export function WarpPostEffects() {
  const effect = useRef(null);
  const offset = useMemo(() => new Vector2(0, 0), []);

  useFrame(() => {
    const state = useFlightStore.getState();
    const intensity = state.earthMode ? 0 : Math.min(1, flightState.warp / 9 + (flightState.jump.active ? 1 : 0));
    if (effect.current?.offset) {
      const amount = intensity * 0.0075;
      effect.current.offset.set(amount, amount * 0.72);
    }
  }, 4);

  return <ChromaticAberration ref={effect} offset={offset} radialModulation modulationOffset={0.35} />;
}
