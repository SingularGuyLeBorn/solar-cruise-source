import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { Box3, MeshStandardMaterial, Vector3 } from 'three';

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

export function PhobosModel({ moon }) {
  const { scene } = useGLTF('/models/nasa/phobos.glb');
  const model = useMemo(() => fitModel(scene, moon.visualRadius * 2.05, moon.color), [scene, moon]);
  return <primitive object={model} />;
}

export function HyperionModel({ moon }) {
  const { scene } = useGLTF('/models/comets/67p.glb');
  const model = useMemo(() => fitModel(scene, moon.visualRadius * 2.1, '#7a6654', { tint: true }), [scene, moon]);
  return <primitive object={model} />;
}

export function MinorMoonRock({ moon }) {
  const { scene } = useGLTF('/models/helion/asteroid_0.glb');
  const model = useMemo(() => {
    const clone = fitModel(scene, moon.visualRadius * 2, moon.color, { tint: true });
    const squash = 0.68 + ((moon.visualRadius * 731) % 0.3);
    clone.scale.y *= squash;
    return clone;
  }, [scene, moon]);
  return <primitive object={model} />;
}

useGLTF.preload('/models/nasa/phobos.glb');
useGLTF.preload('/models/comets/67p.glb');
