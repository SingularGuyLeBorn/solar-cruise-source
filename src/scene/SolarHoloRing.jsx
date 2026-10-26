import { useMemo, useRef } from 'react';
import { AdditiveBlending, BufferAttribute, BufferGeometry } from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { PLANETS, SUN } from '../data/solarSystem';
import { useFlightStore } from '../state/useFlightStore';
import { PlanetParticles } from './PlanetParticles';

const MAX_PLANET_RADIUS = 69911;
const TAIL_COUNT = 160;
const RING_BODIES = [SUN, ...PLANETS];

function nodeRadius(body) {
  if (body.id === SUN.id) return 0.016;
  const ratio = Math.sqrt((body.radiusKm ?? 1000) / MAX_PLANET_RADIUS);
  return body.type === 'dwarf' ? 0.0068 + ratio * 0.004 : 0.008 + ratio * 0.011;
}

function PlanetNode({ item, x, y, selected, scale, onSelect, particleCount }) {
  const glow = useRef();
  const pulse = useRef();
  const radius = nodeRadius(item) * scale;
  const color = item.color ?? '#b9e6f2';
  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    if (glow.current) {
      const beat = 1.08 + Math.sin(time * 2.4 + x * 20) * 0.08;
      glow.current.scale.setScalar(beat);
    }
    if (pulse.current) pulse.current.rotation.z = time * 0.5;
  });
  return (
    <group position={[x, y, 0]}>
      {selected && (
        <>
          <mesh ref={glow} position={[0, 0, 0.006]}>
            <ringGeometry args={[radius * 1.7, radius * 1.92, 40]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.34}
              blending={AdditiveBlending}
              depthWrite={false}
              side={2}
              toneMapped={false}
            />
          </mesh>
          <mesh ref={pulse} position={[0, 0, 0.009]}>
            <ringGeometry args={[radius * 2.25, radius * 2.5, 40]} />
            <meshBasicMaterial
              color="#f4e2c4"
              transparent
              opacity={0.8}
              blending={AdditiveBlending}
              depthWrite={false}
              side={2}
              toneMapped={false}
            />
          </mesh>
          <mesh position={[0, 0, 0.014]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.0007, 0.0007, 0.028, 5]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.4}
              blending={AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          <group position={[0, 0, 0.03]}>
            <PlanetParticles
              body={item}
              count={particleCount * 2}
              pointSize={1.6}
              opacity={0.95}
              scale={radius * 1.6}
            />
          </group>
        </>
      )}
      {!selected && (
        <PlanetParticles body={item} count={particleCount} pointSize={1.28} opacity={0.92} scale={radius * 1.15} />
      )}
      <mesh
        onClick={(event) => {
          event.stopPropagation();
          onSelect(item.id);
        }}
        onPointerOver={() => {
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = '';
        }}
      >
        <sphereGeometry args={[Math.max(0.022, radius * 2.6), 10, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>
    </group>
  );
}

export function SolarHoloRing({ radius = 0.24, tilt = 1.04, nodeScale = 1, spin = 0.05 }) {
  const previewId = useFlightStore((state) => state.selector.previewId);
  const setSelectorPreview = useFlightStore((state) => state.setSelectorPreview);
  const viewportWidth = useThree((state) => state.size.width);
  const compact = viewportWidth < 760;
  const spinGroup = useRef();
  const nodeParticleCount = compact ? 190 : 370;
  const sunParticleCount = compact ? 360 : 700;
  const nodes = useMemo(
    () =>
      RING_BODIES.map((body, index) => {
        const angle = Math.PI / 2 + (index / RING_BODIES.length) * Math.PI * 2;
        return {
          item: body,
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
        };
      }),
    [radius],
  );
  const dustGeometry = useMemo(() => {
    const positions = new Float32Array(TAIL_COUNT * 3);
    for (let index = 0; index < TAIL_COUNT; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const distance = radius * (0.82 + Math.random() * 0.34);
      positions[index * 3] = Math.cos(angle) * distance;
      positions[index * 3 + 1] = Math.sin(angle) * distance;
      positions[index * 3 + 2] = (Math.random() - 0.5) * 0.026;
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    return geometry;
  }, [radius]);

  useFrame(({ clock }, delta) => {
    if (spinGroup.current) spinGroup.current.rotation.z += delta * spin;
  });

  return (
    <group>
      <group ref={spinGroup} rotation={[tilt, 0, 0]}>
        <mesh>
          <torusGeometry args={[radius, 0.0011, 4, 160]} />
          <meshBasicMaterial
            color="#7ddcf3"
            transparent
            opacity={0.3}
            blending={AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <mesh>
          <torusGeometry args={[radius * 0.72, 0.0007, 4, 140]} />
          <meshBasicMaterial
            color="#82c8d8"
            transparent
            opacity={0.12}
            blending={AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <points geometry={dustGeometry}>
          <pointsMaterial
            color="#9fe6ff"
            size={0.0016}
            transparent
            opacity={0.42}
            blending={AdditiveBlending}
            depthWrite={false}
            sizeAttenuation
            toneMapped={false}
          />
        </points>
        {nodes.map(({ item, x, y }) => (
          <PlanetNode
            key={item.id}
            item={item}
            x={x}
            y={y}
            selected={item.id === previewId}
            scale={nodeScale}
            onSelect={setSelectorPreview}
            particleCount={nodeParticleCount}
          />
        ))}
      </group>
    </group>
  );
}
