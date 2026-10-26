import { Suspense, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending } from 'three';
import { useFlightStore } from '../state/useFlightStore';
import { flightState } from '../state/flightState';
import { createHexShieldLayers } from './hexShield';
import { HelionShip } from './HelionShip';
import { HelionCockpit } from './HelionCockpit';
import { ShipDetails } from './ShipDetails';

function IonShield() {
  const group = useRef();
  const layers = useMemo(() => createHexShieldLayers(14), []);
  useEffect(
    () => () => {
      layers.surface.dispose();
      layers.edges.dispose();
      layers.surfaceMaterial.dispose();
      layers.edgeMaterial.dispose();
    },
    [layers],
  );
  useFrame(({ clock }) => {
    const shieldOn = useFlightStore.getState().shield;
    const uniforms = layers.uniforms;
    uniforms.uTime.value = performance.now() / 1000;
    uniforms.uActive.value = shieldOn ? 1 : 0;
    for (let index = 0; index < 4; index += 1) {
      const hit = flightState.impact.log[index];
      uniforms.uImpactPos.value[index].copy(hit?.dir ?? hit?.point ?? { x: 0, y: 0, z: 0 });
      uniforms.uImpactTime.value[index] = hit?.time ?? -1000;
      uniforms.uImpactStrength.value[index] = hit?.strength ?? 0;
    }
    if (group.current) {
      group.current.rotation.y = clock.elapsedTime * 0.03;
      group.current.visible = shieldOn;
    }
  });
  return (
    <group ref={group} scale={5.3}>
      <mesh geometry={layers.surface} material={layers.surfaceMaterial} renderOrder={10} />
      <lineSegments geometry={layers.edges} material={layers.edgeMaterial} renderOrder={11} />
    </group>
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
  const selectorOpen = useFlightStore((state) => state.selector.open);
  useFrame(() => {
    if (!group.current) return;
    group.current.position.copy(flightState.position);
    group.current.quaternion.copy(flightState.quaternion);
    if (shipBody.current) shipBody.current.visible = viewMode !== 'cockpit';
  });
  return (
    <group ref={group}>
      <group ref={shipBody}>
        {viewMode !== 'cockpit' && (
          <Suspense fallback={null}>
            <HelionShip />
            <ShipDetails />
          </Suspense>
        )}
      </group>
      <WarpStreaks />
      {shield && viewMode !== 'cockpit' && <IonShield />}
      <Suspense fallback={null}>
        <HelionCockpit visible={viewMode === 'cockpit' && !selectorOpen} />
      </Suspense>
    </group>
  );
}

export { IonShield };
