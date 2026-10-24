import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { DoubleSide, Quaternion, Vector3 } from 'three';
import { Html } from '@react-three/drei';
import { CockpitScreen } from '../ui/CockpitScreens';
import { useFlightStore } from '../state/useFlightStore';
import { flightState } from '../state/flightState';

const FRAME = '#0b1219';
const PANEL = '#182533';
const PANEL_DARK = '#0d151e';
const CYAN = '#6fe3ff';
const AMBER = '#ffb15a';
const ORANGE = '#ff8a3c';

function Beam({ start, end, thickness = 0.075, color = FRAME }) {
  const { position, quaternion, length } = useMemo(() => {
    const a = new Vector3(...start);
    const b = new Vector3(...end);
    const direction = b.clone().sub(a);
    const len = direction.length();
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const quat = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction.normalize());
    return { position: mid, quaternion: quat, length: len };
  }, [start, end]);
  return (
    <mesh position={position} quaternion={quaternion}>
      <boxGeometry args={[thickness, length, thickness]} />
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.75} />
    </mesh>
  );
}

function Panel({
  position,
  rotation = [0, 0, 0],
  size,
  color = PANEL,
  emissive = '#07131c',
  emissiveIntensity = 0.55,
}) {
  return (
    <mesh position={position} rotation={rotation}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        roughness={0.5}
        metalness={0.55}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
      />
    </mesh>
  );
}

function HoloGlobe() {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = clock.elapsedTime * 0.35;
      ref.current.rotation.x = 0.3;
    }
  });
  return (
    <group position={[1.48, 0.03, -0.9]}>
      <mesh ref={ref}>
        <icosahedronGeometry args={[0.11, 1]} />
        <meshBasicMaterial color="#78e8ff" wireframe transparent opacity={0.55} toneMapped={false} />
      </mesh>
      <pointLight color="#66d8ff" intensity={0.22} distance={1.2} />
    </group>
  );
}

function Button({ position, color = CYAN, onClick, labelText }) {
  return (
    <group position={position}>
      <mesh onClick={onClick} onPointerOver={(event) => event.stopPropagation()}>
        <boxGeometry args={[0.12, 0.05, 0.08]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} toneMapped={false} />
      </mesh>
      {labelText && (
        <Html position={[0, 0.09, 0]} center distanceFactor={4} zIndexRange={[4, 0]} style={{ pointerEvents: 'none' }}>
          <span className="cockpit-label">{labelText}</span>
        </Html>
      )}
    </group>
  );
}

function ThrottleLever() {
  const lever = useRef();
  useFrame(() => {
    if (lever.current) lever.current.rotation.x = -0.55 + flightState.throttle * 0.95;
  });
  return (
    <group position={[0.84, -0.2, -0.94]} scale={0.6}>
      <mesh position={[0, -0.07, 0]}>
        <boxGeometry args={[0.42, 0.1, 0.32]} />
        <meshStandardMaterial color={PANEL_DARK} roughness={0.4} metalness={0.7} />
      </mesh>
      <group ref={lever}>
        <mesh position={[0, 0.28, 0]}>
          <cylinderGeometry args={[0.035, 0.05, 0.55, 12]} />
          <meshStandardMaterial color="#8898a8" roughness={0.3} metalness={0.9} />
        </mesh>
        <mesh position={[0, 0.58, 0]}>
          <sphereGeometry args={[0.1, 16, 12]} />
          <meshStandardMaterial color={ORANGE} emissive={ORANGE} emissiveIntensity={0.9} roughness={0.3} />
        </mesh>
      </group>
    </group>
  );
}

function Joystick() {
  return (
    <group position={[0, -0.12, -0.95]}>
      <mesh>
        <cylinderGeometry args={[0.18, 0.22, 0.1, 24]} />
        <meshStandardMaterial color={PANEL_DARK} roughness={0.4} metalness={0.7} />
      </mesh>
      <mesh position={[0, 0.23, -0.06]} rotation={[-0.28, 0, 0]}>
        <cylinderGeometry args={[0.035, 0.05, 0.48, 12]} />
        <meshStandardMaterial color="#a0b4c4" roughness={0.3} metalness={0.9} />
      </mesh>
      <mesh position={[0, 0.49, -0.1]}>
        <sphereGeometry args={[0.1, 16, 12]} />
        <meshStandardMaterial color={CYAN} emissive={CYAN} emissiveIntensity={0.9} />
      </mesh>
    </group>
  );
}

function Seat({ position, rotation = [0, 0, 0] }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, -0.18, 0]}>
        <boxGeometry args={[0.62, 0.12, 0.62]} />
        <meshStandardMaterial color="#111a22" roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.22, 0.34]} rotation={[-0.18, 0, 0]}>
        <boxGeometry args={[0.66, 1.0, 0.14]} />
        <meshStandardMaterial color="#18232d" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.76, 0.37]}>
        <boxGeometry args={[0.42, 0.22, 0.12]} />
        <meshStandardMaterial color="#22313d" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.22, 0.34]} rotation={[-0.18, 0, 0]}>
        <boxGeometry args={[0.08, 0.94, 0.16]} />
        <meshStandardMaterial color={CYAN} emissive={CYAN} emissiveIntensity={0.35} />
      </mesh>
    </group>
  );
}

function GlassCanopy() {
  return (
    <group>
      <mesh position={[0, 0.62, -2.55]} rotation={[-0.06, 0, 0]}>
        <planeGeometry args={[4.7, 2.5]} />
        <meshPhysicalMaterial
          color="#a7eaff"
          transparent
          opacity={0.055}
          roughness={0.02}
          metalness={0.05}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[-2.25, 0.55, -1.05]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[2.1, 2.2]} />
        <meshPhysicalMaterial
          color="#a7eaff"
          transparent
          opacity={0.045}
          roughness={0.04}
          metalness={0.05}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[2.25, 0.55, -1.05]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[2.1, 2.2]} />
        <meshPhysicalMaterial
          color="#a7eaff"
          transparent
          opacity={0.045}
          roughness={0.04}
          metalness={0.05}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

export function Cockpit({ visible = true, compact = false }) {
  const shield = useFlightStore((state) => state.shield);
  const engineOn = useFlightStore((state) => state.engineOn);
  const toggleShield = useFlightStore((state) => state.toggleShield);
  const toggleEngine = useFlightStore((state) => state.toggleEngine);

  return (
    <group visible={visible}>
      <GlassCanopy />

      <Beam start={[-2.15, -0.5, -2.0]} end={[-1.75, 1.65, -0.95]} thickness={0.085} />
      <Beam start={[2.15, -0.5, -2.0]} end={[1.75, 1.65, -0.95]} thickness={0.085} />
      <Beam start={[-1.75, 1.65, -0.95]} end={[1.75, 1.65, -0.95]} thickness={0.085} />
      <Beam start={[0, 1.65, -0.95]} end={[0, 1.35, -1.35]} thickness={0.04} />
      <Beam start={[-2.15, -0.5, -2.0]} end={[2.15, -0.5, -2.0]} thickness={0.09} />
      <Beam start={[-2.15, -0.5, -2.0]} end={[-2.2, 1.62, -0.55]} thickness={0.075} />
      <Beam start={[2.15, -0.5, -2.0]} end={[2.2, 1.62, -0.55]} thickness={0.075} />
      <Beam start={[-2.2, 1.62, -0.55]} end={[2.2, 1.62, -0.55]} thickness={0.075} />

      {/* Floor and rear bulkhead */}
      {!compact && (
        <>
          <mesh position={[0, -0.92, 0.3]}>
            <boxGeometry args={[4.7, 0.14, 4.8]} />
            <meshStandardMaterial
              color="#111c25"
              roughness={0.72}
              metalness={0.4}
              emissive="#071820"
              emissiveIntensity={0.65}
            />
          </mesh>
          {[-1.35, 0, 1.35].map((z) => (
            <mesh key={`floor-panel-${z}`} position={[0, -0.84, z + 0.3]}>
              <boxGeometry args={[3.9, 0.035, 1.0]} />
              <meshStandardMaterial
                color="#172732"
                roughness={0.65}
                metalness={0.5}
                emissive="#0b2731"
                emissiveIntensity={0.55}
              />
            </mesh>
          ))}
          {[-1.5, 1.5].map((x) => (
            <mesh key={`floor-strip-${x}`} position={[x, -0.805, 0.3]}>
              <boxGeometry args={[0.035, 0.02, 3.6]} />
              <meshStandardMaterial color={CYAN} emissive={CYAN} emissiveIntensity={0.8} toneMapped={false} />
            </mesh>
          ))}
          {[-0.8, 0.8].map((z) => (
            <mesh key={`floor-cross-${z}`} position={[0, -0.805, z + 0.3]}>
              <boxGeometry args={[3.5, 0.015, 0.03]} />
              <meshStandardMaterial color={AMBER} emissive={AMBER} emissiveIntensity={0.35} toneMapped={false} />
            </mesh>
          ))}
        </>
      )}
      {!compact && (
        <>
          <Panel position={[0, 0.35, 2.45]} size={[4.6, 2.5, 0.16]} color="#0c141c" emissiveIntensity={0.3} />
          <Panel
            position={[-2.32, 0.4, 0.7]}
            rotation={[0, 0.08, 0]}
            size={[0.1, 2.5, 3.2]}
            color="#0e1922"
            emissiveIntensity={0.25}
          />
          <Panel
            position={[2.32, 0.4, 0.7]}
            rotation={[0, -0.08, 0]}
            size={[0.1, 2.5, 3.2]}
            color="#0e1922"
            emissiveIntensity={0.25}
          />
          <Panel
            position={[0, 1.72, 0.7]}
            rotation={[0.04, 0, 0]}
            size={[4.5, 0.08, 3.2]}
            color="#0e1922"
            emissiveIntensity={0.3}
          />
          <Panel position={[0, 0.0, -1.4]} rotation={[-0.26, 0, 0]} size={[3.8, 0.09, 0.58]} color={PANEL} />

          {!compact && <></>}
          {/* Main dashboard */}
          <Panel position={[0, -0.3, -1.45]} rotation={[-0.32, 0, 0]} size={[3.75, 0.62, 0.5]} color={PANEL_DARK} />
          <Panel position={[-1.55, -0.36, -1.58]} rotation={[-0.3, 0.22, 0]} size={[1.03, 0.34, 0.66]} color={PANEL} />
          <Panel position={[1.55, -0.36, -1.58]} rotation={[-0.3, -0.22, 0]} size={[1.03, 0.34, 0.66]} color={PANEL} />
          <Panel position={[0, -0.54, -1.62]} rotation={[-0.3, 0, 0]} size={[1.2, 0.3, 0.42]} color={PANEL} />
          <Panel position={[0, -0.42, -1.18]} rotation={[-0.25, 0, 0]} size={[2.1, 0.2, 0.42]} color={PANEL_DARK} />
          {Array.from({ length: 12 }, (_, index) => (
            <mesh key={`pedestal-${index}`} position={[-0.72 + index * 0.13, -0.32, -1.05]} rotation={[-0.25, 0, 0]}>
              <boxGeometry args={[0.055, 0.018, 0.04]} />
              <meshStandardMaterial
                color={index % 3 === 0 ? AMBER : CYAN}
                emissive={index % 3 === 0 ? AMBER : CYAN}
                emissiveIntensity={0.8}
                toneMapped={false}
              />
            </mesh>
          ))}

          <CockpitScreen kind="nav" position={[-1.35, 0.14, -1.25]} rotation={[-0.32, 0.2, 0]} size={[1.0, 0.62]} />
          <CockpitScreen kind="flight" position={[0, 0.18, -1.28]} rotation={[-0.31, 0, 0]} size={[1.2, 0.74]} />
          <CockpitScreen kind="systems" position={[1.35, 0.14, -1.25]} rotation={[-0.32, -0.2, 0]} size={[1.0, 0.62]} />
          <CockpitScreen kind="scan" position={[0, -0.08, -1.0]} rotation={[-0.24, 0, 0]} size={[0.64, 0.4]} />
          <CockpitScreen kind="nav" position={[-1.94, 0.08, -0.9]} rotation={[-0.2, 0.58, 0]} size={[0.58, 0.36]} />
          <CockpitScreen kind="systems" position={[1.94, 0.08, -0.9]} rotation={[-0.2, -0.58, 0]} size={[0.58, 0.36]} />
          <group position={[1.42, 0.05, -0.95]} scale={0.85}>
            <HoloGlobe />
          </group>

          {/* Side consoles */}
          <Panel
            position={[-2.02, -0.28, -0.55]}
            rotation={[0, 0.32, -0.16]}
            size={[0.82, 0.18, 1.5]}
            color={PANEL_DARK}
          />
          <Panel
            position={[2.02, -0.28, -0.55]}
            rotation={[0, -0.32, 0.16]}
            size={[0.82, 0.18, 1.5]}
            color={PANEL_DARK}
          />
          {Array.from({ length: 8 }, (_, index) => (
            <mesh key={`left-${index}`} position={[-1.94, -0.16, -1.05 + index * 0.14]} rotation={[0, 0.32, -0.16]}>
              <boxGeometry args={[0.1, 0.025, 0.07]} />
              <meshStandardMaterial
                color={index % 3 === 0 ? AMBER : CYAN}
                emissive={index % 3 === 0 ? AMBER : CYAN}
                emissiveIntensity={0.7}
              />
            </mesh>
          ))}
          {Array.from({ length: 8 }, (_, index) => (
            <mesh key={`right-${index}`} position={[1.94, -0.16, -1.05 + index * 0.14]} rotation={[0, -0.32, 0.16]}>
              <boxGeometry args={[0.1, 0.025, 0.07]} />
              <meshStandardMaterial
                color={index % 2 === 0 ? CYAN : ORANGE}
                emissive={index % 2 === 0 ? CYAN : ORANGE}
                emissiveIntensity={0.7}
              />
            </mesh>
          ))}

          {/* Overhead */}
          <Panel position={[0, 1.62, -0.3]} rotation={[0.1, 0, 0]} size={[3.4, 0.18, 0.85]} color={PANEL_DARK} />
          {Array.from({ length: 7 }, (_, index) => (
            <mesh key={`overhead-${index}`} position={[-1.2 + index * 0.4, 1.52, -0.28]}>
              <boxGeometry args={[0.09, 0.03, 0.08]} />
              <meshStandardMaterial
                color={index % 2 ? CYAN : AMBER}
                emissive={index % 2 ? CYAN : AMBER}
                emissiveIntensity={0.9}
              />
            </mesh>
          ))}

          <group position={[-0.84, -0.2, -0.92]} scale={0.6}>
            <Joystick />
          </group>
          <ThrottleLever />
          <Button
            position={[-1.28, -0.08, -1.0]}
            color={shield ? CYAN : '#6b4a3a'}
            onClick={toggleShield}
            labelText="SHIELD"
          />
          <Button
            position={[1.28, -0.08, -1.0]}
            color={engineOn ? ORANGE : '#5a4636'}
            onClick={toggleEngine}
            labelText="ENGINE"
          />

          <Seat position={[0.95, -0.42, 0.85]} rotation={[0, -0.12, 0]} />
          <Seat position={[-0.95, -0.42, 0.85]} rotation={[0, 0.12, 0]} />
          <Seat position={[0, -0.45, 0.85]} rotation={[0, 0, 0]} />
        </>
      )}

      {/* Emissive light strips */}
      <mesh position={[0, -0.86, -2.02]}>
        <boxGeometry args={[4.1, 0.035, 0.04]} />
        <meshStandardMaterial color={CYAN} emissive={CYAN} emissiveIntensity={1.2} toneMapped={false} />
      </mesh>
      <mesh position={[-2.24, 0.5, -1.1]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[1.7, 0.03, 0.035]} />
        <meshStandardMaterial color={AMBER} emissive={AMBER} emissiveIntensity={0.8} toneMapped={false} />
      </mesh>
      <mesh position={[2.24, 0.5, -1.1]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[1.7, 0.03, 0.035]} />
        <meshStandardMaterial color={AMBER} emissive={AMBER} emissiveIntensity={0.8} toneMapped={false} />
      </mesh>

      <pointLight position={[0, 0.75, -0.8]} intensity={1.8} distance={5.5} color="#7fdcff" />
      <pointLight position={[0, 0.1, -1.35]} intensity={1.1} distance={3.2} color="#ffb15a" />
      <pointLight position={[-1.6, 0.2, -0.5]} intensity={0.5} distance={2.6} color="#6fdcff" />
      <pointLight position={[1.6, 0.2, -0.5]} intensity={0.5} distance={2.6} color="#6fdcff" />
      <pointLight position={[-1.8, 0.3, 0.5]} intensity={0.5} distance={3.4} color="#ffb15a" />
      <pointLight position={[1.8, 0.3, 0.5]} intensity={0.5} distance={3.4} color="#ffb15a" />
    </group>
  );
}
