import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { AdditiveBlending } from 'three';
import { SolarHoloRing } from './SolarHoloRing';
import { CollectionHoloCloud } from './CollectionHoloCloud';
import { useFlightStore } from '../state/useFlightStore';

const HOLO_COLOR = '#9fe6ff';
const ACTIVE_COLOR = '#e8c79a';

function ProjectorBase({ active, color, onClick, children }) {
  return (
    <group
      onClick={(event) => {
        event.stopPropagation();
        onClick?.();
      }}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = '';
      }}
    >
      <mesh position={[0, 0.002, 0]}>
        <cylinderGeometry args={[0.115, 0.14, 0.024, 32]} />
        <meshStandardMaterial color="#1b262b" metalness={0.78} roughness={0.32} envMapIntensity={1.1} />
      </mesh>
      <mesh position={[0, 0.016, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.102, 0.0045, 8, 48]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={active ? 0.92 : 0.5}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 0.435, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.158, 0.0013, 4, 56]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={active ? 0.42 : 0.14}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <group position={[0, 0.45, 0]}>{children}</group>
      <pointLight position={[0, 0.5, 0.02]} color={color} intensity={active ? 0.6 : 0.35} distance={1.2} decay={2} />
    </group>
  );
}

function PhysicalHoloProjector() {
  const holoOpen = useFlightStore((state) => state.holo.open);
  const selectorOpen = useFlightStore((state) => state.selector.open);
  const activeProjector = useFlightStore((state) => state.holo.activeProjector);
  const setActiveProjector = useFlightStore((state) => state.setActiveProjector);
  const root = useRef();

  useFrame(() => {
    if (root.current) root.current.visible = holoOpen && !selectorOpen;
  });

  return (
    <group ref={root} position={[0, 0, 0]}>
      <group position={[-0.74, 0.02, -0.47]} scale={0.55}>
        <ProjectorBase
          active={activeProjector === 'collection'}
          color={activeProjector === 'collection' ? ACTIVE_COLOR : HOLO_COLOR}
          onClick={() => setActiveProjector('collection')}
        >
          <group position={[0, 0.22, 0]} rotation={[0, 0.3, 0]}>
            <CollectionHoloCloud count={5000} scale={0.32} showFrame signal active={activeProjector === 'collection'} />
          </group>
        </ProjectorBase>
      </group>

      <group position={[0.74, 0.02, -0.47]} scale={0.55}>
        <ProjectorBase
          active={activeProjector === 'solar'}
          color={activeProjector === 'solar' ? ACTIVE_COLOR : HOLO_COLOR}
          onClick={() => setActiveProjector('solar')}
        >
          <group position={[0, 0.06, 0]} rotation={[0, -0.24, 0]}>
            <SolarHoloRing radius={0.185} tilt={-1.02} nodeScale={1.02} spin={0.05} signal />
          </group>
        </ProjectorBase>
      </group>
    </group>
  );
}

export function HoloProjector() {
  const viewportWidth = useThree((state) => state.size.width);
  if (viewportWidth < 900) return null;
  return <PhysicalHoloProjector />;
}
