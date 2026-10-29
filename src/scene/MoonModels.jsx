import { Suspense, useMemo, useRef, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Box3, Vector3 } from 'three';
import { worldState } from '../state/worldState';
import { assetPath } from '../lib/assetPath';

function fitModel(scene, targetSize, color, { tint = false } = {}) {
  const clone = scene.clone(true);
  clone.updateMatrixWorld(true);
  const box = new Box3().setFromObject(clone);
  const size = box.getSize(new Vector3());
  const max = Math.max(size.x, size.y, size.z) || 1;
  clone.scale.multiplyScalar(targetSize / max);
  clone.updateMatrixWorld(true);
  const scaled = new Box3().setFromObject(clone);
  const center = scaled.getCenter(new Vector3());
  clone.position.sub(center);
  clone.traverse((object) => {
    if (!object.isMesh) return;
    const source = Array.isArray(object.material) ? object.material[0] : object.material;
    const material = source.clone();
    material.roughness = 0.96;
    material.metalness = 0.01;
    if (tint && color) material.color.set(color);
    object.material = material;
  });
  return clone;
}

function useNearbyMoon(moon, factor = 300, minDistance = 20) {
  const [near, setNear] = useState(false);
  const nearRef = useRef(false);
  useFrame(({ camera }) => {
    const position = worldState.positions.get(moon.id);
    if (!position) return;
    const next = camera.position.distanceTo(position) < Math.max(moon.visualRadius * factor, minDistance);
    if (next !== nearRef.current) {
      nearRef.current = next;
      setNear(next);
    }
  });
  return near;
}

function PhobosGLB({ moon }) {
  const { scene } = useGLTF(assetPath('/models/nasa/phobos.glb'));
  const model = useMemo(() => fitModel(scene, moon.visualRadius * 2.05, moon.color), [scene, moon]);
  return <primitive object={model} />;
}

function HyperionGLB({ moon }) {
  const { scene } = useGLTF(assetPath('/models/comets/67p.glb'));
  const model = useMemo(() => fitModel(scene, moon.visualRadius * 2.1, '#7a6654'), [scene, moon]);
  return <primitive object={model} />;
}

function AsteroidGLB({ moon }) {
  const { scene } = useGLTF(assetPath('/models/helion/asteroid_0.glb'));
  const model = useMemo(() => fitModel(scene, moon.visualRadius * 2, moon.color, { tint: true }), [scene, moon]);
  return <primitive object={model} />;
}

export function PhobosModel({ moon }) {
  const near = useNearbyMoon(moon);
  if (!near) return null;
  return (
    <Suspense fallback={null}>
      <PhobosGLB moon={moon} />
    </Suspense>
  );
}

export function HyperionModel({ moon }) {
  const near = useNearbyMoon(moon);
  if (!near) return null;
  return (
    <Suspense fallback={null}>
      <HyperionGLB moon={moon} />
    </Suspense>
  );
}

export function MinorMoonRock({ moon }) {
  const near = useNearbyMoon(moon, 220, 18);
  if (!near) return null;
  return (
    <Suspense fallback={null}>
      <AsteroidGLB moon={moon} />
    </Suspense>
  );
}
