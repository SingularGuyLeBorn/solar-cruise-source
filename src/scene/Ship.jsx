import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, DoubleSide } from 'three';
import { useFlightStore } from '../state/useFlightStore';
import { flightState } from '../state/flightState';
import { createPlumeMaterial, createShieldMaterial } from './materials';
import { Cockpit } from './Cockpit';

const WHITE = '#e9f0f6';
const BLUE = '#4b8fe8';
const ORANGE = '#ff8a3c';
const DARK = '#111a25';
const GLASS = '#8fdcff';

function ShipModel() {
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry args={[0.82, 4.6, 8, 24]} />
        <meshStandardMaterial
          color={WHITE}
          roughness={0.42}
          metalness={0.3}
          emissive="#16242d"
          emissiveIntensity={0.35}
        />
      </mesh>
      <mesh position={[0, 0, -3.7]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.82, 1.9, 24]} />
        <meshStandardMaterial
          color={WHITE}
          roughness={0.4}
          metalness={0.3}
          emissive="#16242d"
          emissiveIntensity={0.35}
        />
      </mesh>
      <mesh position={[0, 0.74, -1.7]} scale={[0.72, 0.42, 1.18]}>
        <sphereGeometry args={[1, 32, 16]} />
        <meshPhysicalMaterial
          color={GLASS}
          transparent
          opacity={0.34}
          roughness={0.08}
          metalness={0.15}
          transmission={0.2}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 0.7, -1.7]} scale={[0.74, 0.08, 1.2]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={DARK} roughness={0.55} metalness={0.6} />
      </mesh>

      {[-1, 1].map((side) => (
        <group key={side} position={[side * 1.4, -0.05, 0.25]}>
          <mesh rotation={[0, side * 0.14, 0]}>
            <boxGeometry args={[2.7, 0.14, 1.9]} />
            <meshStandardMaterial color={WHITE} roughness={0.35} metalness={0.55} />
          </mesh>
          <mesh position={[side * 1.5, -0.02, 0.28]} rotation={[0.08, side * 0.14, 0]}>
            <boxGeometry args={[1.3, 0.1, 0.72]} />
            <meshStandardMaterial
              color={ORANGE}
              roughness={0.4}
              metalness={0.35}
              emissive={ORANGE}
              emissiveIntensity={0.35}
            />
          </mesh>
          <mesh position={[side * 1.72, 0.25, 0.75]} rotation={[0, side * 0.14, side * 0.5]}>
            <boxGeometry args={[0.08, 0.7, 0.65]} />
            <meshStandardMaterial color={BLUE} roughness={0.35} metalness={0.5} />
          </mesh>
          <mesh position={[side * 0.95, -0.25, 1.4]}>
            <boxGeometry args={[0.08, 0.12, 1.1]} />
            <meshStandardMaterial color={ORANGE} emissive={ORANGE} emissiveIntensity={0.85} />
          </mesh>
        </group>
      ))}

      {[-1, 1].map((side) => (
        <group key={`engine-${side}`} position={[side * 1.28, -0.15, 2.6]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.4, 0.55, 2.2, 24]} />
            <meshStandardMaterial color={DARK} roughness={0.3} metalness={0.8} />
          </mesh>
          <mesh position={[0, 0, 1.05]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.48, 0.055, 12, 28]} />
            <meshStandardMaterial color={BLUE} emissive={BLUE} emissiveIntensity={1.6} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0, 1.18]}>
            <circleGeometry args={[0.16, 24]} />
            <meshBasicMaterial color="#58b6d8" toneMapped={false} />
          </mesh>
        </group>
      ))}

      <mesh position={[0, 0.95, 1.9]} rotation={[0.35, 0, 0]}>
        <boxGeometry args={[0.08, 1.1, 0.95]} />
        <meshStandardMaterial color={BLUE} roughness={0.4} metalness={0.4} />
      </mesh>
      <mesh position={[0, -0.75, 1.55]}>
        <boxGeometry args={[0.55, 0.22, 0.8]} />
        <meshStandardMaterial color={DARK} roughness={0.45} metalness={0.7} />
      </mesh>
      <pointLight position={[0, 0.2, -1.4]} intensity={0.7} distance={5} color="#8fd8ff" />
      <pointLight position={[0, 2.2, 2.5]} intensity={2.6} distance={22} color="#9bd7ff" />
      <pointLight position={[0, 1.2, 1.2]} intensity={1.4} distance={10} color="#c8f0ff" />
      <pointLight position={[0, -1.2, -1.0]} intensity={0.8} distance={12} color="#ff9a5a" />
    </group>
  );
}

function EnginePlume() {
  const refs = useRef([]);
  const lights = useRef([]);
  const materials = useMemo(() => [createPlumeMaterial('#5fc8ff'), createPlumeMaterial('#b8ecff')], []);
  const time = useRef(0);

  useFrame((_, delta) => {
    time.current += delta;
    const { engineOn } = useFlightStore.getState();
    const throttle = flightState.throttle;
    const warp = flightState.warp;
    const power = engineOn ? 0.08 + throttle * 1.18 + (warp > 0 ? 0.4 : 0) : 0;
    const length = engineOn ? 0.9 + throttle * 5.4 + (warp > 0 ? 1.4 : 0) : 0.2;
    refs.current.forEach((mesh) => {
      if (!mesh) return;
      mesh.scale.set(1 + power * 0.15, length, 1 + power * 0.15);
      mesh.position.z = 3.7 + length * 0.36;
      mesh.rotation.x = Math.PI / 2 + (flightState.steerY || 0) * 0.12;
      mesh.rotation.y = (flightState.steerX || 0) * 0.12;
    });
    lights.current.forEach((light) => {
      if (light) light.intensity = power * 2.2;
    });
    materials.forEach((material) => {
      material.uniforms.uTime.value = time.current;
      material.uniforms.uPower.value = power;
    });
  });

  return (
    <>
      {[-1, 1].map((side, index) => (
        <group key={side}>
          <mesh
            ref={(element) => (refs.current[index] = element)}
            position={[side * 1.28, -0.15, 4.5]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <coneGeometry args={[0.34, 1, 20, 1, true]} />
            <primitive object={materials[0]} attach="material" />
          </mesh>
          <mesh position={[side * 1.28, -0.15, 4.15]} rotation={[Math.PI / 2, 0, 0]} scale={[0.55, 1.5, 0.55]}>
            <coneGeometry args={[0.22, 1, 16, 1, true]} />
            <primitive object={materials[1]} attach="material" />
          </mesh>
          <pointLight
            ref={(element) => (lights.current[index] = element)}
            position={[side * 1.28, -0.15, 4.2]}
            color="#7bd8ff"
            intensity={1.3}
            distance={9}
          />
        </group>
      ))}
    </>
  );
}

function IonShield() {
  const mesh = useRef();
  const material = useMemo(() => createShieldMaterial(), []);
  useFrame(({ clock }) => {
    const now = performance.now() / 1000;
    const shieldOn = useFlightStore.getState().shield;
    material.uniforms.uTime.value = clock.elapsedTime;
    material.uniforms.uActive.value = shieldOn ? 1 : 0;
    material.uniforms.uImpactDir.value.copy(flightState.impact.point).normalize();
    material.uniforms.uImpactTime.value = flightState.impact.time;
    if (mesh.current) {
      mesh.current.rotation.y = clock.elapsedTime * 0.05;
      mesh.current.visible = shieldOn && now < flightState.shieldFlashUntil;
    }
  });
  return (
    <mesh ref={mesh} scale={5.3} renderOrder={10}>
      <icosahedronGeometry args={[1, 4]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

function WarpStreaks() {
  const ref = useRef();
  const count = 520;
  const positions = useMemo(() => new Float32Array(count * 6), []);
  const stars = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * 170,
        y: (Math.random() - 0.5) * 170,
        z: -220 + Math.random() * 240,
      })),
    [],
  );

  useFrame((_, delta) => {
    const mesh = ref.current;
    if (!mesh) return;
    const warp = flightState.warp;
    const jumping = flightState.jump.active;
    const strength = Math.max(warp, jumping ? 7 : 0);
    mesh.visible = strength > 0;
    if (!mesh.visible) return;
    const speed = 25 + strength * 45;
    const length = 0.8 + strength * 3.6;
    for (let i = 0; i < count; i++) {
      const star = stars[i];
      star.z += speed * delta;
      if (star.z > 20) {
        star.z = -220;
        star.x = (Math.random() - 0.5) * 170;
        star.y = (Math.random() - 0.5) * 170;
      }
      const offset = i * 6;
      positions[offset] = star.x;
      positions[offset + 1] = star.y;
      positions[offset + 2] = star.z;
      positions[offset + 3] = star.x;
      positions[offset + 4] = star.y;
      positions[offset + 5] = star.z + length;
    }
    mesh.geometry.attributes.position.needsUpdate = true;
    mesh.material.opacity = Math.min(0.72, 0.12 + strength * 0.08);
  });

  return (
    <lineSegments ref={ref} frustumCulled={false} visible={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial
        color="#bfe9ff"
        transparent
        opacity={0.5}
        blending={AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </lineSegments>
  );
}

export function Ship() {
  const group = useRef();
  const shipBody = useRef();
  const viewMode = useFlightStore((state) => state.viewMode);
  const shield = useFlightStore((state) => state.shield);
  useFrame(() => {
    if (!group.current) return;
    group.current.position.copy(flightState.position);
    group.current.quaternion.copy(flightState.quaternion);
    if (shipBody.current) shipBody.current.visible = viewMode !== 'cockpit';
  });
  return (
    <group ref={group}>
      <group ref={shipBody}>
        <ShipModel />
        <EnginePlume />
      </group>
      <WarpStreaks />
      {shield && viewMode !== 'cockpit' && <IonShield />}
      <Cockpit visible={viewMode === 'cockpit'} />
    </group>
  );
}

export { ShipModel, EnginePlume, IonShield };
