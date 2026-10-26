import { useMemo } from 'react';
import { useGLTF, useTexture } from '@react-three/drei';
import { Box3, DoubleSide, Vector3 } from 'three';

function normalizeModel(scene, targetSize) {
  const clone = scene.clone(true);
  const box = new Box3().setFromObject(clone);
  const size = box.getSize(new Vector3());
  const scale = targetSize / Math.max(size.x, size.y, size.z);
  clone.scale.setScalar(scale);
  clone.updateMatrixWorld(true);

  const scaledBox = new Box3().setFromObject(clone);
  const center = scaledBox.getCenter(new Vector3());
  clone.position.x -= center.x;
  clone.position.z -= center.z;
  clone.position.y -= scaledBox.min.y;
  return clone;
}

export function PerseveranceRover({ size = 0.12, rotation = 0 }) {
  const { scene } = useGLTF('/models/nasa/perseverance.glb');
  const model = useMemo(() => normalizeModel(scene, size), [scene, size]);
  return <primitive object={model} rotation={[0, rotation, 0]} />;
}

export function ApolloLander({ size = 0.22, rotation = 0 }) {
  const { scene } = useGLTF('/models/nasa/apollo-lunar-module.glb');
  const model = useMemo(() => normalizeModel(scene, size), [scene, size]);
  return <primitive object={model} rotation={[0, rotation, 0]} />;
}

export function ApolloFootprint({ size = 0.075 }) {
  const texture = useTexture('/textures/apollo-footprint.png');
  return (
    <mesh rotation={[-Math.PI / 2, 0, Math.PI / 4]} position={[0, 0.008, 0]}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial map={texture} transparent opacity={0.92} depthWrite={false} side={DoubleSide} />
    </mesh>
  );
}

useGLTF.preload('/models/nasa/perseverance.glb');
useGLTF.preload('/models/nasa/apollo-lunar-module.glb');
