import { useMemo, useRef, useState } from 'react';
import { Html, Line, Stars, useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  DodecahedronGeometry,
  DoubleSide,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  Vector3,
} from 'three';
import { PLANETS, SUN, COMETS } from '../data/solarSystem';
import { MOONS_BY_PARENT } from '../data/moons';
import { LANDMARKS_BY_BODY } from '../data/landmarks';
import { orbitPoints, latLonToVector3 } from '../lib/orbits';
import { footprintTexture, radialGlowTexture, stormTexture } from '../lib/textures';
import { createAtmosphereMaterial, createCloudMaterial, createEarthMaterial, createSunMaterial } from './materials';
import { useFlightStore } from '../state/useFlightStore';
import { updateWorld, worldState } from '../state/worldState';

const DEG = Math.PI / 180;
const publicPath = (path) => (path?.startsWith('/') ? path : `/${path}`);

function GatedHtml({ maxDistance, children, ...props }) {
  const anchor = useRef();
  const [visible, setVisible] = useState(false);
  const temp = useMemo(() => new Vector3(), []);
  useFrame(({ camera }) => {
    if (!anchor.current) return;
    anchor.current.getWorldPosition(temp);
    const show = camera.position.distanceTo(temp) < maxDistance;
    if (show !== visible) setVisible(show);
  });
  return <group ref={anchor}>{visible ? <Html {...props}>{children}</Html> : null}</group>;
}

function BodyLabel({ body, onClick, small = false }) {
  return (
    <Html center zIndexRange={[20, 0]} style={{ pointerEvents: 'auto' }}>
      <button className={`body-label ${small ? 'body-label--small' : ''}`} type="button" onClick={onClick}>
        <span>{body.en ?? body.name}</span>
        <em>{body.name}</em>
      </button>
    </Html>
  );
}

function Orbit({ body, color, opacity = 0.2 }) {
  const points = useMemo(() => orbitPoints(body, 320), [body]);
  return <Line points={points} color={color} transparent opacity={opacity} lineWidth={1} depthWrite={false} />;
}

function TexturedSphere({ path, radius }) {
  const texture = useTexture(publicPath(path));
  return (
    <mesh>
      <sphereGeometry args={[radius, 72, 48]} />
      <meshStandardMaterial map={texture} roughness={0.9} metalness={0.02} />
    </mesh>
  );
}

function EarthSphere({ body, radius }) {
  const [day, night, clouds] = useTexture([
    publicPath(body.texture),
    publicPath(body.nightTexture),
    publicPath(body.cloudTexture),
  ]);
  const material = useMemo(() => createEarthMaterial(day, night), [day, night]);
  const cloudMaterial = useMemo(() => createCloudMaterial(clouds), [clouds]);
  const sunDirection = useMemo(() => new Vector3(1, 0, 0), []);

  useFrame(() => {
    const planetPos = worldState.positions.get(body.id);
    if (planetPos) sunDirection.copy(planetPos).multiplyScalar(-1).normalize();
    material.uniforms.uSun.value.copy(sunDirection);
    cloudMaterial.uniforms.uSun.value.copy(sunDirection);
  });

  return (
    <group>
      <mesh>
        <sphereGeometry args={[radius, 96, 64]} />
        <primitive object={material} attach="material" />
      </mesh>
      <mesh scale={1.012}>
        <sphereGeometry args={[radius, 96, 64]} />
        <primitive object={cloudMaterial} attach="material" />
      </mesh>
    </group>
  );
}

function ProceduralSphere({ body, radius }) {
  return (
    <mesh>
      <sphereGeometry args={[radius, 48, 32]} />
      <meshStandardMaterial color={body.color} roughness={0.95} metalness={0.01} />
    </mesh>
  );
}

function RingSystem({ body, radius }) {
  const texture = useTexture(publicPath(body.ringTexture));
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <ringGeometry args={[radius * 1.35, radius * 2.35, 160, 1]} />
      <meshBasicMaterial
        map={texture}
        transparent
        side={DoubleSide}
        opacity={0.92}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

function FootprintMarker({ size = 0.1 }) {
  const texture = useMemo(() => footprintTexture(), []);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial map={texture} transparent opacity={0.82} depthWrite={false} />
    </mesh>
  );
}

function Rover({ scale = 1, accent = '#ffb04a' }) {
  return (
    <group scale={scale}>
      <mesh position={[0, 0.16, 0]}>
        <boxGeometry args={[0.42, 0.18, 0.62]} />
        <meshStandardMaterial color="#d7d1c2" roughness={0.55} metalness={0.45} />
      </mesh>
      <mesh position={[0, 0.27, -0.06]}>
        <boxGeometry args={[0.28, 0.03, 0.36]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.2} roughness={0.35} />
      </mesh>
      <mesh position={[0.16, 0.36, -0.1]}>
        <cylinderGeometry args={[0.02, 0.02, 0.36, 8]} />
        <meshStandardMaterial color="#c8c4b8" />
      </mesh>
      <mesh position={[0.16, 0.55, -0.1]}>
        <sphereGeometry args={[0.07, 12, 8]} />
        <meshStandardMaterial color="#9ad9ff" emissive="#4bb6e8" emissiveIntensity={0.5} />
      </mesh>
      {[-0.22, 0.22].map((x) =>
        [-0.2, 0.2].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 0.1, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.11, 0.11, 0.06, 12]} />
            <meshStandardMaterial color="#3e3a35" roughness={0.9} metalness={0.2} />
          </mesh>
        )),
      )}
    </group>
  );
}

function StormMarker({ scale, radius, id = 'grs' }) {
  const texture = useMemo(() => stormTexture(id), [id]);
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.01, 0]}
      scale={[radius * 0.9 * scale, radius * 0.42 * scale, 1]}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} opacity={0.95} toneMapped={false} />
    </mesh>
  );
}

function SurfaceMarker({ landmark, radius }) {
  const position = useMemo(() => latLonToVector3(landmark.lat, landmark.lon, radius * 1.01), [landmark, radius]);
  const quaternion = useMemo(() => {
    const normal = position.clone().normalize();
    return new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), normal);
  }, [position]);

  return (
    <group position={position} quaternion={quaternion}>
      <mesh position={[0, radius * 0.04, 0]}>
        <cylinderGeometry args={[0.006, 0.006, radius * 0.08, 6]} />
        <meshBasicMaterial color="#ffbd72" transparent opacity={0.7} toneMapped={false} />
      </mesh>
      <mesh position={[0, radius * 0.085, 0]}>
        <sphereGeometry args={[0.014, 8, 6]} />
        <meshBasicMaterial color="#ffbd72" toneMapped={false} />
      </mesh>
      {landmark.kind === 'footprints' && <FootprintMarker size={radius * 0.075} />}
      {landmark.kind === 'rover' && (
        <group position={[0, 0.004, 0]}>
          <Rover
            scale={radius * 0.022 * (landmark.scale ?? 1)}
            accent={landmark.id === 'curiosity' ? '#ffb04a' : '#78d8ff'}
          />
        </group>
      )}
      {landmark.kind === 'volcano' && (
        <group>
          <mesh position={[0, radius * 0.06, 0]}>
            <cylinderGeometry args={[radius * 0.06, radius * 0.22, radius * 0.12, 48]} />
            <meshStandardMaterial color="#9b4c30" roughness={0.95} />
          </mesh>
          <mesh position={[0, radius * 0.125, 0]}>
            <cylinderGeometry args={[radius * 0.02, radius * 0.032, radius * 0.01, 24]} />
            <meshStandardMaterial color="#351812" roughness={1} />
          </mesh>
        </group>
      )}
      {landmark.kind === 'storm' && <StormMarker scale={landmark.scale ?? 1} radius={radius} id={landmark.id} />}
      <GatedHtml maxDistance={radius * 22} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
        <div className="surface-label">
          <strong>{landmark.name}</strong>
          <span>{landmark.en}</span>
        </div>
      </GatedHtml>
    </group>
  );
}

function Landmarks({ body, radius }) {
  const list = LANDMARKS_BY_BODY.get(body.id);
  if (!list) return null;
  return (
    <>
      {list
        .filter((item) => item.kind !== 'rings')
        .map((item) => (
          <SurfaceMarker key={item.id} landmark={item} radius={radius} />
        ))}
    </>
  );
}

function TexturedMoon({ moon }) {
  const texture = useTexture(publicPath(moon.texture));
  return (
    <mesh>
      <sphereGeometry args={[moon.visualRadius, 48, 32]} />
      <meshStandardMaterial map={texture} roughness={0.92} metalness={0.01} />
    </mesh>
  );
}

function MoonSurface({ moon }) {
  if (moon.texture) return <TexturedMoon moon={moon} />;
  return (
    <mesh>
      <sphereGeometry args={[moon.visualRadius, moon.major ? 48 : 16, moon.major ? 32 : 12]} />
      <meshStandardMaterial color={moon.color} roughness={0.96} metalness={0.01} />
    </mesh>
  );
}

function MoonObject({ moon }) {
  const group = useRef();
  const spin = useRef();
  useFrame(() => {
    const local = worldState.localPositions.get(moon.id);
    if (local && group.current) group.current.position.copy(local);
    if (spin.current) {
      const local = worldState.localPositions.get(moon.id);
      if (moon.id === 'moon' && local) {
        spin.current.rotation.y = Math.atan2(local.x, local.z) + Math.PI;
      } else {
        const period = Math.abs(moon.periodDays) || 1;
        spin.current.rotation.y = (worldState.days / period) * Math.PI * 2 * (moon.retrograde ? -1 : 1);
      }
    }
  });
  return (
    <>
      <group ref={group}>
        <group ref={spin}>
          <MoonSurface moon={moon} />
          {moon.id === 'moon' && <Landmarks body={{ id: 'moon' }} radius={moon.visualRadius} />}
        </group>
        {moon.major && (
          <GatedHtml
            maxDistance={moon.visualRadius * 20 + 8}
            center
            zIndexRange={[8, 0]}
            style={{ pointerEvents: 'auto' }}
          >
            <button className="moon-label" type="button" onClick={() => useFlightStore.getState().setTarget(moon.id)}>
              {moon.name}
            </button>
          </GatedHtml>
        )}
      </group>
      {moon.major && (
        <Line
          points={Array.from({ length: 129 }, (_, index) => {
            const angle = (index / 128) * Math.PI * 2;
            return new Vector3(Math.cos(angle) * moon.orbitRadius, 0, Math.sin(angle) * moon.orbitRadius);
          })}
          color="#4f6b82"
          transparent
          opacity={0.15}
          lineWidth={0.7}
          depthWrite={false}
        />
      )}
    </>
  );
}

function Moons({ body }) {
  const moons = MOONS_BY_PARENT.get(body.id);
  if (!moons?.length) return null;
  return (
    <>
      {moons.map((moon) => (
        <MoonObject key={moon.id} moon={moon} />
      ))}
    </>
  );
}

function Planet({ body }) {
  const group = useRef();
  const spin = useRef();
  const atmosphereMaterial = useMemo(
    () => (body.atmosphere ? createAtmosphereMaterial(body.atmosphere.color, body.atmosphere.strength) : null),
    [body],
  );

  useFrame(() => {
    const position = worldState.positions.get(body.id);
    if (position && group.current) group.current.position.copy(position);
  });

  const rotationHours = body.rotationHours || 24;
  const direction = rotationHours < 0 ? -1 : 1;
  useFrame(() => {
    if (spin.current) {
      spin.current.rotation.y = (worldState.days / (Math.abs(rotationHours) / 24)) * Math.PI * 2 * direction;
    }
  });

  return (
    <group ref={group}>
      <group rotation={[0, 0, (body.axialTilt ?? 0) * DEG]}>
        <group ref={spin}>
          {body.id === 'earth' ? (
            <EarthSphere body={body} radius={body.visualRadius} />
          ) : body.texture ? (
            <TexturedSphere path={body.texture} radius={body.visualRadius} />
          ) : (
            <ProceduralSphere body={body} radius={body.visualRadius} />
          )}
          <Landmarks body={body} radius={body.visualRadius} />
        </group>
        {atmosphereMaterial && (
          <mesh scale={1.025}>
            <sphereGeometry args={[body.visualRadius, 48, 32]} />
            <primitive object={atmosphereMaterial} attach="material" />
          </mesh>
        )}
        {body.ringTexture && <RingSystem body={body} radius={body.visualRadius} />}
      </group>
      <Moons body={body} />
      <BodyLabel body={body} onClick={() => useFlightStore.getState().setTarget(body.id)} />
    </group>
  );
}

function SunFlare({ index, texture }) {
  const ref = useRef();
  const position = useMemo(() => {
    const angle = index * 2.1 + 0.7;
    const height = Math.sin(index * 1.7) * 0.8;
    return new Vector3(
      Math.cos(angle) * SUN.visualRadius * 1.05,
      height * SUN.visualRadius,
      Math.sin(angle) * SUN.visualRadius * 1.05,
    );
  }, [index]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 0.22 + index * 1.7;
    const pulse = Math.max(0, Math.sin(t) - 0.72) / 0.28;
    if (ref.current) {
      const scale = SUN.visualRadius * (0.7 + pulse * 1.7);
      ref.current.scale.set(scale, scale, 1);
      ref.current.material.opacity = pulse * 0.42;
    }
  });
  return (
    <sprite ref={ref} position={position}>
      <spriteMaterial
        map={texture}
        color="#ffb050"
        transparent
        opacity={0}
        blending={AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </sprite>
  );
}

function Sun() {
  const material = useMemo(() => createSunMaterial(), []);
  const glow = useMemo(() => radialGlowTexture(), []);
  const flares = useMemo(() => Array.from({ length: 4 }, (_, index) => index), []);

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <group>
      <mesh>
        <sphereGeometry args={[SUN.visualRadius, 96, 64]} />
        <primitive object={material} attach="material" />
      </mesh>
      <sprite scale={[SUN.visualRadius * 4.5, SUN.visualRadius * 4.5, 1]}>
        <spriteMaterial
          map={glow}
          color="#ff9a3c"
          transparent
          opacity={0.62}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>
      <sprite scale={[SUN.visualRadius * 9, SUN.visualRadius * 9, 1]}>
        <spriteMaterial
          map={glow}
          color="#ff5a12"
          transparent
          opacity={0.18}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>
      {flares.map((index) => (
        <SunFlare key={index} index={index} texture={glow} />
      ))}
      <pointLight color="#ffd4a0" intensity={3.4} distance={0} decay={0} />
      <Html center distanceFactor={50} zIndexRange={[20, 0]} style={{ pointerEvents: 'auto' }}>
        <button
          className="body-label body-label--sun"
          type="button"
          onClick={() => useFlightStore.getState().setTarget('sun')}
        >
          <span>THE SUN</span>
          <em>太阳</em>
        </button>
      </Html>
    </group>
  );
}

function Comet({ comet }) {
  const group = useRef();
  const tail = useRef();
  const glow = useMemo(() => radialGlowTexture(), []);
  useFrame(() => {
    const position = worldState.positions.get(comet.id);
    if (position && group.current) {
      group.current.position.copy(position);
      if (tail.current) {
        const away = position.clone().normalize();
        tail.current.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), away);
      }
    }
  });
  return (
    <group ref={group}>
      <mesh>
        <sphereGeometry args={[0.28, 16, 12]} />
        <meshStandardMaterial color="#d9e9f2" emissive="#9ed8ff" emissiveIntensity={1.4} />
      </mesh>
      <sprite scale={[3.2, 3.2, 1]}>
        <spriteMaterial
          map={glow}
          color={comet.color}
          transparent
          opacity={0.55}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </sprite>
      <group ref={tail}>
        <mesh position={[0, 3.2, 0]}>
          <coneGeometry args={[0.55, 6.4, 16, 1, true]} />
          <meshBasicMaterial
            color={comet.tailColor}
            transparent
            opacity={0.16}
            side={DoubleSide}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>
      <BodyLabel body={comet} onClick={() => useFlightStore.getState().setTarget(comet.id)} small />
    </group>
  );
}

function AsteroidBelt() {
  const mesh = useRef();
  const count = 1400;
  const material = useMemo(() => new MeshStandardMaterial({ color: '#817262', roughness: 1, metalness: 0.05 }), []);
  const geometry = useMemo(() => new DodecahedronGeometry(0.11, 0), []);
  const dummy = useMemo(() => new Object3D(), []);
  const instances = useMemo(() => {
    const seeds = [];
    let seed = 8128;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    for (let i = 0; i < count; i++) {
      seeds.push({
        angle: random() * Math.PI * 2,
        radius: 196 + random() * 42,
        y: (random() - 0.5) * 7,
        scale: 0.35 + random() * 1.8,
        tilt: random() * Math.PI,
      });
    }
    return seeds;
  }, []);

  useFrame(() => {
    if (!mesh.current) return;
    instances.forEach((item, index) => {
      const angle = item.angle + worldState.days * 0.00007;
      dummy.position.set(Math.cos(angle) * item.radius, item.y, Math.sin(angle) * item.radius);
      dummy.scale.setScalar(item.scale);
      dummy.rotation.set(item.tilt, angle * 0.7, 0);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(index, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={mesh} args={[geometry, material, count]} />;
}

export function SolarSystem() {
  useFrame((_, delta) => {
    const store = useFlightStore.getState();
    if (store.earthMode) return;
    const simSpeed = store.simSpeedValue();
    worldState.days += simSpeed * Math.min(delta, 0.05);
    updateWorld(worldState.days);
  }, -2);

  return (
    <>
      <color attach="background" args={['#01030a']} />
      <ambientLight intensity={0.12} />
      <Stars radius={1300} depth={180} count={9000} factor={5} saturation={0} fade speed={0.25} />
      <Sun />
      {PLANETS.map((planet) => (
        <group key={planet.id}>
          <Orbit body={planet} color={planet.color} />
          <Planet body={planet} />
        </group>
      ))}
      {COMETS.map((comet) => (
        <group key={comet.id}>
          <Orbit body={comet} color={comet.tailColor} opacity={0.16} />
          <Comet comet={comet} />
        </group>
      ))}
      <AsteroidBelt />
    </>
  );
}
