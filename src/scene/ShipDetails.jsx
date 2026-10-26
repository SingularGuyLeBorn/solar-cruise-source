import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  SpriteMaterial,
} from 'three';
import { createHatchDecal, createRoundelTexture, createWingDecal } from '../lib/shipDecals';
import { enginePanelTexture, radialGlowTexture } from '../lib/textures';
import { flightState } from '../state/flightState';
import { SHIP_VARIANT, mulberry32 } from '../state/shipVariant';

function createDetailMaterials(accent) {
  return {
    dark: new MeshStandardMaterial({
      color: '#222b33',
      metalness: 0.88,
      roughness: 0.34,
      envMapIntensity: 1.35,
    }),
    mid: new MeshStandardMaterial({
      color: '#69757d',
      metalness: 0.78,
      roughness: 0.38,
      envMapIntensity: 1.25,
    }),
    paint: new MeshStandardMaterial({
      color: '#d2d4cf',
      metalness: 0.16,
      roughness: 0.46,
      envMapIntensity: 1.1,
    }),
    accent: new MeshStandardMaterial({
      color: accent,
      metalness: 0.28,
      roughness: 0.42,
      envMapIntensity: 1.15,
    }),
    heat: new MeshStandardMaterial({
      color: '#241f1b',
      metalness: 0.9,
      roughness: 0.36,
      emissive: '#3a1308',
      emissiveIntensity: 0.5,
      envMapIntensity: 1.2,
    }),
    navRed: new MeshStandardMaterial({
      color: '#1a0200',
      emissive: '#ff2d18',
      emissiveIntensity: 4,
      roughness: 0.3,
      toneMapped: false,
    }),
    navGreen: new MeshStandardMaterial({
      color: '#00170a',
      emissive: '#33ff8a',
      emissiveIntensity: 4,
      roughness: 0.3,
      toneMapped: false,
    }),
    strobe: new MeshStandardMaterial({
      color: '#ffffff',
      emissive: '#ffffff',
      emissiveIntensity: 8,
      roughness: 0.25,
      toneMapped: false,
    }),
    beacon: new MeshStandardMaterial({
      color: '#200200',
      emissive: '#ff3a1a',
      emissiveIntensity: 3,
      roughness: 0.3,
      toneMapped: false,
    }),
  };
}

function createWingGreebles(seed) {
  const random = mulberry32(seed + 1709);
  const items = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 20; i++) {
      items.push({
        x: side * (1.45 + random() * 0.55),
        z: 1.25 + random() * 1.95,
        sx: 0.03 + random() * 0.1,
        sy: 0.012 + random() * 0.035,
        sz: 0.03 + random() * 0.13,
        yaw: random() * Math.PI,
      });
    }
  }
  for (let i = 0; i < 10; i++) {
    items.push({
      x: -0.35 + random() * 0.7,
      z: 2.6 + random() * 0.6,
      sx: 0.04 + random() * 0.1,
      sy: 0.015 + random() * 0.03,
      sz: 0.04 + random() * 0.1,
      yaw: random() * Math.PI,
      deck: true,
    });
  }
  return items;
}

function WingGreebles({ material, seed }) {
  const items = useMemo(() => createWingGreebles(seed), [seed]);
  const mesh = useRef();
  const dummy = useMemo(() => new Object3D(), []);
  const color = useMemo(() => new Color(), []);

  useLayoutEffect(() => {
    if (!mesh.current) return;
    items.forEach((item, index) => {
      dummy.position.set(item.x, (item.deck ? 0.265 : -0.295) + item.sy / 2, item.z);
      dummy.rotation.set(0, item.yaw, 0);
      dummy.scale.set(item.sx, item.sy, item.sz);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(index, dummy.matrix);
      const shade = 0.42 + (index % 5) * 0.09;
      color.setRGB(shade, shade * 1.04, shade * 1.08);
      mesh.current.setColorAt(index, color);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  }, [dummy, color, items]);

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, items.length]}>
      <boxGeometry args={[1, 1, 1]} />
      <primitive object={material} attach="material" />
    </instancedMesh>
  );
}

function EngineDetail({ side, materials, glow, glowRef, panelMaterial }) {
  return (
    <group position={[side * 0.95, -0.12, 0]}>
      <mesh position={[0, 0, 4.86]} material={materials.heat}>
        <torusGeometry args={[0.34, 0.032, 10, 36]} />
      </mesh>
      <mesh position={[0, 0, 5.02]} material={materials.dark}>
        <torusGeometry args={[0.4, 0.022, 8, 36]} />
      </mesh>
      <mesh position={[0, 0, 4.99]} material={materials.dark}>
        <boxGeometry args={[0.74, 0.42, 0.035]} />
      </mesh>
      <mesh position={[0, 0, 5.02]}>
        <planeGeometry args={[0.62, 0.33]} />
        <primitive object={panelMaterial} attach="material" />
      </mesh>
      <sprite ref={glowRef} position={[0, 0, 5.07]} scale={[0.42, 0.42, 1]}>
        <spriteMaterial
          map={glow}
          color="#9fe9ff"
          transparent
          opacity={0.12}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>
      {Array.from({ length: 6 }, (_, index) => {
        const angle = (index / 6) * Math.PI * 2;
        return (
          <mesh
            key={index}
            position={[Math.cos(angle) * 0.47, Math.sin(angle) * 0.47, 4.94]}
            material={materials.dark}
            scale={[0.05, 0.05, 0.24]}
          >
            <boxGeometry />
          </mesh>
        );
      })}
      <mesh position={[0, 0.32, 4.1]} rotation={[Math.PI / 2, 0, 0]} material={materials.mid}>
        <cylinderGeometry args={[0.022, 0.022, 0.95, 8]} />
      </mesh>
    </group>
  );
}

export function ShipDetails() {
  const materials = useMemo(() => createDetailMaterials(SHIP_VARIANT.accent), []);
  const panelTexture = useMemo(enginePanelTexture, []);
  const enginePanelMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        map: panelTexture,
        color: '#6fd8ff',
        transparent: true,
        opacity: 0.38,
        blending: AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    [panelTexture],
  );
  const decalLeft = useMemo(() => createWingDecal('left', SHIP_VARIANT), []);
  const decalRight = useMemo(() => createWingDecal('right', SHIP_VARIANT), []);
  const roundel = useMemo(() => createRoundelTexture(SHIP_VARIANT), []);
  const hatch = useMemo(() => createHatchDecal(SHIP_VARIANT), []);
  const glow = useMemo(() => radialGlowTexture('rgba(255,255,255,0.95)', 'rgba(80,200,255,0)'), []);
  const dish = useRef();
  const strobeSprite = useRef();
  const beaconRef = useRef();
  const engineGlow = useRef([]);
  const engineLight = useRef();
  const rcs = useRef([]);

  const decalMaterialLeft = useMemo(
    () =>
      new MeshStandardMaterial({
        map: decalLeft,
        transparent: true,
        alphaTest: 0.02,
        roughness: 0.5,
        metalness: 0.1,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        depthWrite: false,
        side: DoubleSide,
      }),
    [decalLeft],
  );
  const decalMaterialRight = useMemo(
    () =>
      new MeshStandardMaterial({
        map: decalRight,
        transparent: true,
        alphaTest: 0.02,
        roughness: 0.5,
        metalness: 0.1,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        depthWrite: false,
        side: DoubleSide,
      }),
    [decalRight],
  );
  const hatchMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: hatch,
        transparent: true,
        alphaTest: 0.02,
        roughness: 0.52,
        metalness: 0.1,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        depthWrite: false,
        side: DoubleSide,
      }),
    [hatch],
  );
  const rcsMaterial = useMemo(
    () =>
      new SpriteMaterial({
        map: glow,
        color: '#d8f3ff',
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    [glow],
  );
  const roundelMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: roundel,
        transparent: true,
        alphaTest: 0.02,
        roughness: 0.55,
        metalness: 0.1,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        depthWrite: false,
        side: DoubleSide,
      }),
    [roundel],
  );

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    const strobeOn = time % 1.7 < 0.09;
    if (materials.strobe) materials.strobe.emissiveIntensity = strobeOn ? 10 : 0.2;
    if (strobeSprite.current) strobeSprite.current.material.opacity = strobeOn ? 0.95 : 0;
    const beaconOn = time % 1.15 < 0.5;
    if (materials.beacon) materials.beacon.emissiveIntensity = beaconOn ? 3.8 : 0.2;
    if (beaconRef.current) beaconRef.current.material.opacity = beaconOn ? 0.65 : 0;
    if (dish.current) dish.current.rotation.y = time * 0.28;
    const power = flightState.engineOn ? 0.12 + flightState.throttle * 0.88 : 0.03;
    const warp = Math.min(1, flightState.warp / 9);
    enginePanelMaterial.opacity = Math.min(0.95, 0.24 + power * 0.55 + warp * 0.15 + Math.sin(time * 3.2) * 0.04);
    enginePanelMaterial.color.set(warp > 0.2 ? '#b9a8ff' : '#9feaff');
    if (engineLight.current) {
      engineLight.current.intensity = 0.5 + power * 3.2 + warp * 1.2;
      engineLight.current.color.set(warp > 0.2 ? '#b9a8ff' : '#8feaff');
    }
    engineGlow.current.forEach((sprite) => {
      if (!sprite) return;
      const scale = 0.2 + power * 0.45;
      sprite.scale.set(scale, scale, 1);
      sprite.material.opacity = 0.02 + power * 0.18;
    });
    const rcsPower = Math.min(1, Math.abs(flightState.steerX) + Math.abs(flightState.steerY));
    rcsMaterial.opacity = rcsPower * (0.22 + ((time * 7.3) % 0.12));
    rcs.current.forEach((sprite) => {
      if (!sprite) return;
      const scale = 0.12 + rcsPower * 0.2;
      sprite.scale.set(scale, scale, 1);
    });
  });

  return (
    <group>
      <WingGreebles material={materials.dark} seed={SHIP_VARIANT.seed} />

      <group position={[-2.85, -0.29, 2.55]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh material={decalMaterialLeft}>
          <planeGeometry args={[1.45, 0.54]} />
        </mesh>
      </group>
      <mesh position={[-3.5, -0.33, 2.45]} rotation={[-Math.PI / 2, 0, 0]} material={roundelMaterial}>
        <planeGeometry args={[0.36, 0.36]} />
      </mesh>
      <mesh position={[3.5, -0.33, 2.45]} rotation={[-Math.PI / 2, 0, 0]} material={roundelMaterial}>
        <planeGeometry args={[0.36, 0.36]} />
      </mesh>
      <group position={[2.85, -0.29, 2.55]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh material={decalMaterialRight}>
          <planeGeometry args={[1.45, 0.54]} />
        </mesh>
      </group>

      {[-1, 1].map((side) => (
        <group key={`wing-hardware-${side}`}>
          {[1.5, 2.1, 2.8].map((z) => (
            <mesh key={z} position={[side * 1.6, -0.293, z]} material={materials.paint}>
              <boxGeometry args={[0.18, 0.02, 0.34]} />
            </mesh>
          ))}
          <mesh position={[side * 3.25, -0.277, 1.85]} material={materials.dark}>
            <boxGeometry args={[0.16, 0.075, 0.24]} />
          </mesh>
          <mesh position={[side * 3.2, -0.335, 3.25]} material={materials.paint}>
            <boxGeometry args={[0.45, 0.018, 0.28]} />
          </mesh>
          <sprite
            ref={(element) => {
              rcs.current[(side < 0 ? 0 : 2) + 0] = element;
            }}
            position={[side * 3.5, -0.277, 1.62]}
            scale={[0.12, 0.12, 1]}
            material={rcsMaterial}
          />
          <sprite
            ref={(element) => {
              rcs.current[(side < 0 ? 0 : 2) + 1] = element;
            }}
            position={[side * 3.5, -0.36, 1.9]}
            scale={[0.12, 0.12, 1]}
            material={rcsMaterial}
          />
          <mesh
            position={[side * 3.38, -0.277, 1.7]}
            rotation={[0, 0, (-side * Math.PI) / 2]}
            material={materials.dark}
          >
            <coneGeometry args={[0.035, 0.1, 8]} />
          </mesh>
          <mesh position={[side * 3.7, -0.35, 2.85]} material={materials.dark}>
            <boxGeometry args={[0.13, 0.035, 0.15]} />
          </mesh>
          <mesh position={[side * 3.7, -0.315, 2.85]} material={side < 0 ? materials.navRed : materials.navGreen}>
            <sphereGeometry args={[0.045, 12, 8]} />
          </mesh>
          <sprite position={[side * 3.7, -0.315, 2.85]} scale={[0.26, 0.26, 1]}>
            <spriteMaterial
              map={glow}
              color={side < 0 ? '#ff4a32' : '#4dffa0'}
              transparent
              opacity={0.5}
              blending={AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </sprite>
        </group>
      ))}

      <mesh position={[0, 0.36, 0.2]} material={materials.dark}>
        <boxGeometry args={[0.34, 0.09, 0.45]} />
      </mesh>
      <mesh position={[0.12, 0.407, 0.1]} material={materials.paint}>
        <boxGeometry args={[0.09, 0.012, 0.14]} />
      </mesh>

      {[-0.42, 0.42].map((x) => (
        <group key={`pipe-${x}`}>
          <mesh position={[x, 0.35, 1.35]} rotation={[Math.PI / 2, 0, 0]} material={materials.mid}>
            <cylinderGeometry args={[0.022, 0.022, 1.5, 10]} />
          </mesh>
          {[0.85, 1.3, 1.8].map((z) => (
            <mesh key={z} position={[x, 0.35, z]} material={materials.dark}>
              <boxGeometry args={[0.08, 0.04, 0.045]} />
            </mesh>
          ))}
        </group>
      ))}

      {Array.from({ length: 6 }, (_, index) => (
        <mesh key={`vent-${index}`} position={[-0.35 + index * 0.14, 0.272, 2.85]} material={materials.dark}>
          <boxGeometry args={[0.09, 0.012, 0.16]} />
        </mesh>
      ))}

      <group position={[0.62, 0.3, 1.55]}>
        <mesh position={[0, 0.38, 0]} material={materials.mid}>
          <cylinderGeometry args={[0.018, 0.026, 0.76, 8]} />
        </mesh>
        <mesh position={[0, 0.74, 0.03]} material={materials.dark}>
          <boxGeometry args={[0.22, 0.014, 0.014]} />
        </mesh>
        <mesh position={[0, 0.78, 0]} material={materials.beacon}>
          <sphereGeometry args={[0.032, 10, 8]} />
        </mesh>
        <sprite ref={beaconRef} position={[0, 0.78, 0]} scale={[0.22, 0.22, 1]}>
          <spriteMaterial
            map={glow}
            color="#ff3a1a"
            transparent
            opacity={0.6}
            blending={AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>
      </group>

      <group ref={dish} position={[-0.78, 0.3, 2.55]}>
        <mesh position={[0, 0.09, 0]} material={materials.mid}>
          <cylinderGeometry args={[0.035, 0.05, 0.18, 8]} />
        </mesh>
        <mesh position={[0, 0.24, 0]} rotation={[0, 0, 0]} material={materials.mid}>
          <cylinderGeometry args={[0.19, 0.045, 0.11, 16, 1, true]} />
        </mesh>
        <mesh position={[0, 0.33, 0]} material={materials.dark}>
          <cylinderGeometry args={[0.008, 0.008, 0.12, 6]} />
        </mesh>
      </group>

      <mesh position={[0, -0.075, 4.4]} material={materials.dark}>
        <boxGeometry args={[1.15, 0.025, 0.5]} />
      </mesh>
      <mesh position={[0, -0.06, 4.4]} rotation={[-Math.PI / 2, 0, 0]} material={hatchMaterial}>
        <planeGeometry args={[1.02, 0.4]} />
      </mesh>
      {[-0.42, 0.42].map((x) => (
        <mesh key={`latch-${x}`} position={[x, -0.048, 4.62]} material={materials.paint}>
          <boxGeometry args={[0.06, 0.016, 0.07]} />
        </mesh>
      ))}

      <mesh position={[0, 0.46, 3.1]} material={materials.dark}>
        <boxGeometry args={[0.035, 0.38, 0.66]} />
      </mesh>
      <mesh position={[0, 0.63, 3.32]} material={materials.accent}>
        <boxGeometry args={[0.04, 0.06, 0.22]} />
      </mesh>
      <mesh position={[0, 0.69, 3.25]} material={materials.strobe}>
        <sphereGeometry args={[0.035, 10, 8]} />
      </mesh>
      <sprite ref={strobeSprite} position={[0, 0.69, 3.25]} scale={[0.34, 0.34, 1]}>
        <spriteMaterial
          map={glow}
          color="#dff4ff"
          transparent
          opacity={0}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>

      <mesh position={[0, -0.205, -4.8]} rotation={[Math.PI / 2, 0, 0]} material={materials.mid}>
        <cylinderGeometry args={[0.008, 0.012, 0.36, 6]} />
      </mesh>
      <mesh position={[0, -0.205, -5.02]} material={materials.dark}>
        <sphereGeometry args={[0.02, 8, 6]} />
      </mesh>

      {[-1, 1].map((side) => (
        <EngineDetail
          key={`engine-${side}`}
          side={side}
          materials={materials}
          glow={glow}
          glowRef={(element) => {
            engineGlow.current[side < 0 ? 0 : 1] = element;
          }}
          panelMaterial={enginePanelMaterial}
        />
      ))}

      <mesh position={[-1.22, -0.15, 4.12]} material={materials.heat}>
        <torusGeometry args={[0.18, 0.02, 8, 24]} />
      </mesh>
      <mesh position={[1.22, -0.15, 4.12]} material={materials.heat}>
        <torusGeometry args={[0.18, 0.02, 8, 24]} />
      </mesh>

      <mesh position={[0, 0.02, 5.14]} material={materials.dark}>
        <boxGeometry args={[0.86, 0.3, 0.04]} />
      </mesh>
      <mesh position={[0, 0.02, 5.17]}>
        <planeGeometry args={[0.72, 0.22]} />
        <primitive object={enginePanelMaterial} attach="material" />
      </mesh>
      <pointLight ref={engineLight} position={[0, 0.02, 5.6]} color="#8feaff" intensity={0.6} distance={6} decay={2} />

      <pointLight position={[0, 2.6, -1.4]} color="#a9d8ff" intensity={3.4} distance={14} decay={2} />
    </group>
  );
}
