import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { Box3, Vector3 } from 'three';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { assetPath } from '../lib/assetPath';

export function SurveyRover({ size = 0.16, rotation = 0 }) {
  const { scene } = useGLTF(assetPath('/models/lunar/survey-rover.glb'));
  const model = useMemo(() => {
    const clone = cloneSkeleton(scene);
    clone.updateMatrixWorld(true);
    const box = new Box3().setFromObject(clone);
    const dimensions = box.getSize(new Vector3());
    const scale = size / Math.max(dimensions.x, dimensions.y, dimensions.z);
    clone.scale.setScalar(scale);
    clone.updateMatrixWorld(true);
    const scaled = new Box3().setFromObject(clone);
    const center = scaled.getCenter(new Vector3());
    clone.position.set(-center.x, -scaled.min.y, -center.z);
    clone.traverse((object) => {
      if (!object.isMesh) return;
      object.castShadow = true;
      object.receiveShadow = true;
    });
    return clone;
  }, [scene, size]);
  return <primitive object={model} rotation={[0, rotation, 0]} />;
}
