import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { Box3, DoubleSide, Vector3 } from 'three';
import { useProgressiveTexture } from '../lib/progressiveTextures';
import { assetPath } from '../lib/assetPath';

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
  const { scene } = useGLTF(assetPath('/models/nasa/perseverance.glb'));
  const model = useMemo(() => normalizeModel(scene, size), [scene, size]);
  return <primitive object={model} rotation={[0, rotation, 0]} />;
}

export function ApolloLander({ size = 0.22, rotation = 0 }) {
  const { scene } = useGLTF(assetPath('/models/nasa/apollo-lunar-module.glb'));
  const model = useMemo(() => normalizeModel(scene, size), [scene, size]);
  return <primitive object={model} rotation={[0, rotation, 0]} />;
}

export function ApolloFootprint({ size = 0.075 }) {
  const { texture } = useProgressiveTexture({
    url: assetPath('/textures/apollo-footprint.png'),
    positionId: 'moon',
    radius: 0.76,
    previewScale: 6,
    hiResScale: 3,
  });
  return (
    <mesh rotation={[-Math.PI / 2, 0, Math.PI / 4]} position={[0, 0.008, 0]}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial
        key={texture ? 'textured' : 'flat'}
        map={texture}
        color={texture ? '#ffffff' : '#8b8177'}
        transparent
        opacity={texture ? 0.92 : 0.18}
        depthWrite={false}
        side={DoubleSide}
      />
    </mesh>
  );
}
