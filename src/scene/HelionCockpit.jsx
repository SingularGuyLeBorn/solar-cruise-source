import { useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { CockpitScreen } from '../ui/CockpitScreens';
import { HoloProjector } from './HoloProjector';
import { flightState } from '../state/flightState';
import { useFlightStore } from '../state/useFlightStore';

export function HelionCockpit({ visible = true, compact = false }) {
  const { scene } = useGLTF('/models/helion/cockpit.glb');
  const cockpitRoot = useRef();
  const viewportWidth = useThree((state) => state.size.width);
  const showInstruments = !compact && viewportWidth >= 900;
  const cockpit = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((object) => {
      if (!object.isMesh) return;
      object.castShadow = true;
      object.receiveShadow = true;
      const source = Array.isArray(object.material) ? object.material : [object.material];
      const materials = source.map((material) => {
        const next = material.clone();
        const name = (material.name || '').toLowerCase();
        next.map = null;
        if (name.includes('panel')) {
          next.color.set('#2a5566');
          next.emissive?.set('#0d3442');
          next.emissiveIntensity = 0.55;
          next.roughness = 0.18;
          next.metalness = 0.15;
          next.transparent = true;
          next.opacity = 0.1;
          next.depthWrite = false;
        } else if (name.includes('dark')) {
          next.color.set('#0d2029');
          next.roughness = 0.2;
          next.metalness = 0.3;
          next.transparent = true;
          next.opacity = 0.05;
          next.depthWrite = false;
        } else if (name.includes('frame')) {
          next.color.set('#12303c');
          next.roughness = 0.22;
          next.metalness = 0.45;
          next.transparent = true;
          next.opacity = 0.12;
          next.depthWrite = false;
        } else if (name.includes('accent')) {
          next.color.set('#6fe3ff');
          next.emissive?.set('#2d8aa8');
          next.emissiveIntensity = 0.5;
        } else if (name.includes('glowamber') || name.includes('lamp_a') || name.includes('needle')) {
          next.color.set('#ffbd72');
          next.emissive?.set('#ff9a3c');
          next.emissiveIntensity = 1.1;
          next.toneMapped = false;
        } else if (name.includes('lamp_r')) {
          next.color.set('#ff5b4a');
          next.emissive?.set('#ff3a2a');
          next.emissiveIntensity = 1.2;
          next.toneMapped = false;
        } else if (name.includes('screen')) {
          next.color.set('#1b5b73');
          next.emissive?.set('#2a8fb3');
          next.emissiveIntensity = 0.9;
          next.toneMapped = false;
          next.transparent = true;
          next.opacity = 0.78;
          next.depthWrite = false;
        } else if (name.includes('gauge')) {
          next.color.set('#0c1a22');
          next.emissive?.set('#123340');
          next.emissiveIntensity = 0.4;
          next.transparent = true;
          next.opacity = 0.14;
          next.depthWrite = false;
        } else {
          next.color.set('#22333f');
          next.roughness = 0.5;
          next.metalness = 0.5;
          next.transparent = true;
          next.opacity = 0.08;
          next.depthWrite = false;
        }
        next.needsUpdate = true;
        return next;
      });
      object.material = Array.isArray(object.material) ? materials : materials[0];
      if (compact) {
        object.visible = false;
      }
    });
    return clone;
  }, [scene, compact]);
  const nodes = useMemo(() => {
    let yokeNode = null;
    let throttleNode = null;
    cockpit.traverse((object) => {
      if (object.name === 'YokeWheel' || object.name === 'Yoke') yokeNode = object;
      if (object.name === 'Throttle') throttleNode = object;
    });
    return { yokeNode, throttleNode };
  }, [cockpit]);

  useFrame(() => {
    if (cockpitRoot.current) {
      const now = performance.now() / 1000;
      const shake = flightState.cockpitShake;
      const age = now - shake.startedAt;
      if (shake.severity > 0 && age >= 0 && age < shake.duration) {
        const envelope = (1 - age / shake.duration) ** 2;
        const amp = shake.severity * envelope;
        const seed = shake.seed;
        cockpitRoot.current.position.set(
          Math.sin(age * 87 + seed) * amp * 0.006 + Math.sin(age * 53 + seed * 2) * amp * 0.003,
          -0.06 + Math.sin(age * 101 + seed) * amp * 0.008,
          0.14 + Math.cos(age * 73 + seed) * amp * 0.004,
        );
        cockpitRoot.current.rotation.set(
          Math.sin(age * 91 + seed) * amp * 0.009,
          Math.cos(age * 67 + seed) * amp * 0.006,
          Math.sin(age * 79 + seed) * amp * 0.012,
        );
      } else {
        cockpitRoot.current.position.set(0, -0.06, 0.14);
        cockpitRoot.current.rotation.set(0, 0, 0);
      }
    }
    if (nodes.yokeNode) {
      nodes.yokeNode.rotation.z = flightState.steerX * 0.35;
      nodes.yokeNode.rotation.x = flightState.steerY * 0.22;
    }
    if (nodes.throttleNode) {
      nodes.throttleNode.rotation.x = -0.18 + flightState.throttle * 0.5;
    }
  });

  return (
    <group visible={visible}>
      <group ref={cockpitRoot} name="helion-cockpit-root" position={[0, -0.06, 0.14]} scale={0.8}>
        <primitive object={cockpit} />
        {!compact && (
          <>
            {showInstruments && (
              <>
                <mesh position={[0, 0.18, -0.52]}>
                  <boxGeometry args={[1.35, 0.38, 0.035]} />
                  <meshStandardMaterial
                    color="#09141c"
                    roughness={0.2}
                    metalness={0.2}
                    emissive="#06131a"
                    emissiveIntensity={0.5}
                    transparent
                    opacity={0.06}
                    depthWrite={false}
                  />
                </mesh>
                <CockpitScreen
                  kind="nav"
                  position={[-0.4, 0.17, -0.495]}
                  rotation={[-0.1, 0.06, 0]}
                  size={[0.36, 0.23]}
                />
                <CockpitScreen kind="flight" position={[0, 0.19, -0.5]} rotation={[-0.1, 0, 0]} size={[0.4, 0.26]} />
                <CockpitScreen
                  kind="systems"
                  position={[0.4, 0.17, -0.495]}
                  rotation={[-0.1, -0.06, 0]}
                  size={[0.36, 0.23]}
                />
                <CockpitScreen
                  kind="scan"
                  position={[-0.62, -0.08, -0.4]}
                  rotation={[-0.18, 0.18, 0]}
                  size={[0.26, 0.17]}
                />
                <CockpitScreen
                  kind="solar"
                  position={[0.62, -0.08, -0.4]}
                  rotation={[-0.18, -0.18, 0]}
                  size={[0.26, 0.17]}
                />
              </>
            )}
            <HoloProjector />
            <pointLight position={[0, 0.55, 0.15]} intensity={2.6} distance={3.4} color="#8fdcff" />
            <pointLight position={[0, -0.2, -0.5]} intensity={0.25} distance={2.2} color="#ffb15a" />
          </>
        )}
      </group>
    </group>
  );
}

useGLTF.preload('/models/helion/cockpit.glb');
