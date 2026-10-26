import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from 'three';
import { buildFighter } from '../vendor/threejs-vehicles/fighter.js';
import { enginePanelTexture } from '../lib/textures';
import { flightState } from '../state/flightState';
import { SHIP_VARIANT } from '../state/shipVariant';
import { useFlightStore } from '../state/useFlightStore';

const FORMATION = [
  { offset: [-7.4, 0.75, -7.5], seedOffset: 101, scale: 0.55 },
  { offset: [7.4, 0.75, -7.5], seedOffset: 907, scale: 0.55 },
];
const FORWARD = new Vector3(0, 0, -1);

function toGeometry(mesh) {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(mesh.position, 3));
  geometry.setAttribute('normal', new BufferAttribute(mesh.normal, 3));
  geometry.setAttribute('color', new BufferAttribute(mesh.color, 3));
  geometry.setIndex(new BufferAttribute(mesh.index, 1));
  geometry.rotateY(Math.PI);
  geometry.computeBoundingSphere();
  return geometry;
}

export function EscortSquadron() {
  const groups = useRef([]);
  const panelTexture = useMemo(enginePanelTexture, []);
  const darkMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: '#1b232a',
        metalness: 0.8,
        roughness: 0.36,
        envMapIntensity: 1.2,
      }),
    [],
  );
  const navRed = useMemo(() => new MeshBasicMaterial({ color: '#ff4a34', toneMapped: false }), []);
  const navGreen = useMemo(() => new MeshBasicMaterial({ color: '#4dffa0', toneMapped: false }), []);

  const escorts = useMemo(
    () =>
      FORMATION.map((config, index) => {
        const seed = SHIP_VARIANT.seed * 17 + config.seedOffset;
        const fighter = buildFighter(seed, { length: 8.2 + index * 0.35 });
        const geometry = toGeometry(fighter.mesh);
        const material = new MeshStandardMaterial({
          vertexColors: true,
          metalness: 0.58,
          roughness: 0.42,
          flatShading: true,
          envMapIntensity: 1.35,
          side: DoubleSide,
        });
        const glowMaterial = new MeshBasicMaterial({
          map: panelTexture,
          color: fighter.palette.glow,
          transparent: true,
          opacity: 0.5,
          blending: AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        });
        return {
          seed,
          geometry,
          material,
          glowMaterial,
          style: fighter.style,
          palette: fighter.palette,
          exhausts: fighter.exhausts.map((exhaust) => ({
            x: -exhaust.position[0],
            y: exhaust.position[1],
            z: -exhaust.position[2],
            radius: exhaust.radius,
          })),
          navLights: fighter.navLights.map((light) => ({
            x: -light.position[0],
            y: light.position[1],
            z: -light.position[2],
            color: light.color,
          })),
        };
      }),
    [panelTexture],
  );

  useEffect(
    () => () => {
      for (const escort of escorts) {
        escort.geometry.dispose();
        escort.material.dispose();
        escort.glowMaterial.dispose();
      }
      panelTexture.dispose();
      darkMaterial.dispose();
      navRed.dispose();
      navGreen.dispose();
    },
    [escorts, panelTexture, darkMaterial, navRed, navGreen],
  );

  const scratch = useMemo(
    () => ({
      offset: new Vector3(),
      desired: new Vector3(),
      roll: new Quaternion(),
    }),
    [],
  );

  useFrame(({ clock }, delta) => {
    const state = useFlightStore.getState();
    const shipQuaternion = flightState.quaternion;
    const time = clock.elapsedTime;
    const dt = Math.min(delta, 0.05);
    const warp = Math.min(1, flightState.warp / 9);

    escorts.forEach((escort, index) => {
      const group = groups.current[index];
      if (!group) return;
      const config = FORMATION[index];
      scratch.offset.set(...config.offset).applyQuaternion(shipQuaternion);
      scratch.desired.copy(flightState.position).add(scratch.offset);
      scratch.desired.y += Math.sin(time * 1.2 + index * 1.9) * 0.05;

      if (flightState.jump.active) {
        group.visible = false;
        group.position.copy(scratch.desired);
        return;
      }
      group.visible = !state.earthMode;
      if (group.position.distanceToSquared(scratch.desired) > 3600) group.position.copy(scratch.desired);
      group.position.lerp(scratch.desired, 1 - Math.exp(-dt * 4.5));
      group.quaternion.slerp(shipQuaternion, 1 - Math.exp(-dt * 6));

      const bank = flightState.steerX * 0.22 + Math.sin(time * 0.9 + index * 2.4) * 0.04;
      scratch.roll.setFromAxisAngle(FORWARD, bank);
      group.quaternion.multiply(scratch.roll);

      const power = flightState.engineOn ? 0.2 + flightState.throttle * 0.5 : 0.05;
      escort.glowMaterial.opacity = Math.min(
        0.8,
        0.2 + power * 0.8 + warp * 0.12 + Math.sin(time * 3.4 + index * 1.7) * 0.06,
      );
    });
  }, 0);

  return (
    <group>
      {escorts.map((escort, index) => (
        <group
          key={escort.seed}
          name={`escort-${index}`}
          userData={{ style: escort.style, palette: escort.palette.name, seed: escort.seed }}
          scale={FORMATION[index].scale}
          ref={(element) => {
            groups.current[index] = element;
          }}
        >
          <mesh geometry={escort.geometry} material={escort.material} />
          {escort.exhausts.map((exhaust, exhaustIndex) => (
            <group key={exhaustIndex}>
              <mesh position={[exhaust.x, exhaust.y, exhaust.z]} material={darkMaterial}>
                <boxGeometry args={[exhaust.radius * 3.15, exhaust.radius * 1.8, 0.05]} />
              </mesh>
              <mesh position={[exhaust.x, exhaust.y, exhaust.z + 0.04]}>
                <planeGeometry args={[exhaust.radius * 2.9, exhaust.radius * 1.55]} />
                <primitive object={escort.glowMaterial} attach="material" />
              </mesh>
            </group>
          ))}
          {escort.navLights.map((light, lightIndex) => (
            <mesh
              key={lightIndex}
              position={[light.x, light.y, light.z]}
              material={light.color.startsWith('#ff') ? navRed : navGreen}
            >
              <sphereGeometry args={[0.045, 8, 6]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}
