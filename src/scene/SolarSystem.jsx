import { Suspense, useMemo, useRef, useState } from 'react';
import { Html, Line, Stars, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Box3, DoubleSide, Object3D, Quaternion, Vector3 } from 'three';
import { PLANETS, SUN, COMETS } from '../data/solarSystem';
import { MOONS, MOONS_BY_PARENT } from '../data/moons';
import { LANDMARKS_BY_BODY } from '../data/landmarks';
import { UNITS_PER_AU } from '../data/scale';
import { orbitPoints, latLonToVector3 } from '../lib/orbits';
import { radialGlowTexture } from '../lib/textures';
import { useProgressiveTexture } from '../lib/progressiveTextures';
import { createAtmosphereMaterial, createCloudMaterial, createEarthMaterial, createSunMaterial } from './materials';
import { ApolloFootprint, ApolloLander, PerseveranceRover } from './NasaSurface';
import { HyperionModel, MinorMoonRock, PhobosModel } from './MoonModels';
import { SurveyRover } from './LunarRover';
import { useFlightStore } from '../state/useFlightStore';
import { updateWorld, worldState } from '../state/worldState';

const DEG = Math.PI / 180;
const publicPath = (path) => (path?.startsWith('/') ? path : `/${path}`);

const OCCLUDERS = [SUN, ...PLANETS, ...MOONS.filter((moon) => moon.major)].map((body) => ({
  id: body.id,
  radius: body.visualRadius,
}));

function isOccluded(cameraPosition, target, skipId, scratch) {
  scratch.ray.subVectors(target, cameraPosition);
  const lengthSq = scratch.ray.lengthSq();
  if (lengthSq < 1e-8) return false;
  for (const occluder of OCCLUDERS) {
    if (occluder.id === skipId) continue;
    const center = worldState.positions.get(occluder.id);
    if (!center) continue;
    scratch.toCenter.subVectors(center, cameraPosition);
    const t = scratch.toCenter.dot(scratch.ray) / lengthSq;
    if (t <= 0 || t >= 0.985) continue;
    scratch.closest.copy(cameraPosition).addScaledVector(scratch.ray, t);
    const radius = occluder.radius * 0.995;
    if (scratch.closest.distanceToSquared(center) < radius * radius) return true;
  }
  return false;
}

function GatedHtml({ maxDistance, occludeId, children, ...props }) {
  const anchor = useRef();
  const [visible, setVisible] = useState(false);
  const selectorOpen = useFlightStore((state) => state.selector.open);
  const temp = useMemo(() => new Vector3(), []);
  const scratch = useRef({
    ray: new Vector3(),
    toCenter: new Vector3(),
    closest: new Vector3(),
    view: new Vector3(),
  }).current;
  useFrame(({ camera }) => {
    if (!anchor.current) return;
    if (selectorOpen) {
      if (visible) setVisible(false);
      return;
    }
    anchor.current.getWorldPosition(temp);
    camera.getWorldDirection(scratch.view);
    const inFront = scratch.view.dot(scratch.ray.subVectors(temp, camera.position)) > 0;
    const show =
      inFront &&
      camera.position.distanceTo(temp) < maxDistance &&
      !isOccluded(camera.position, temp, occludeId, scratch);
    if (show !== visible) setVisible(show);
  });
  return <group ref={anchor}>{visible && !selectorOpen ? <Html {...props}>{children}</Html> : null}</group>;
}

function GatedModel({ maxDistance = Infinity, children }) {
  const anchor = useRef();
  const [visible, setVisible] = useState(false);
  const temp = useMemo(() => new Vector3(), []);
  const scratch = useRef({
    ray: new Vector3(),
    toCenter: new Vector3(),
    closest: new Vector3(),
    view: new Vector3(),
  }).current;
  useFrame(({ camera }) => {
    if (!anchor.current) return;
    anchor.current.getWorldPosition(temp);
    camera.getWorldDirection(scratch.view);
    const offset = scratch.ray.subVectors(temp, camera.position);
    const distance = offset.length();
    const alignment = distance > 0 ? scratch.view.dot(offset) / distance : 0;
    const show = distance < maxDistance && alignment > 0.998 && !isOccluded(camera.position, temp, null, scratch);
    if (show !== visible) setVisible(show);
  });
  return <group ref={anchor}>{visible ? <Suspense fallback={null}>{children}</Suspense> : null}</group>;
}

function BodyLabel({ body, onClick, small = false }) {
  const maxDistance =
    body.type === 'star'
      ? 8_000_000
      : body.type === 'planet'
        ? 2_000_000
        : body.type === 'dwarf'
          ? 1_000_000
          : 1_000_000;
  return (
    <GatedHtml
      maxDistance={maxDistance}
      occludeId={body.id}
      center
      zIndexRange={[20, 0]}
      style={{ pointerEvents: 'auto' }}
    >
      <button
        className={`body-label ${small ? 'body-label--small' : ''}`}
        type="button"
        onClick={onClick}
        style={{ transform: 'translateY(-34px)' }}
      >
        <span>{body.en ?? body.name}</span>
        <em>{body.name}</em>
      </button>
    </GatedHtml>
  );
}

function Orbit({ body, color, opacity = 0.2 }) {
  const points = useMemo(() => orbitPoints(body, 320), [body]);
  return <Line points={points} color={color} transparent opacity={opacity} lineWidth={1} depthWrite={false} />;
}

function TexturedSphere({ path, radius, bodyId, color }) {
  const { texture } = useProgressiveTexture({
    url: publicPath(path),
    positionId: bodyId,
    radius,
  });
  return (
    <mesh>
      <sphereGeometry args={[radius, radius > 15 ? 56 : 40, radius > 15 ? 36 : 26]} />
      <meshStandardMaterial map={texture} color={texture ? '#ffffff' : color} roughness={0.9} metalness={0.02} />
    </mesh>
  );
}

function EarthSphere({ body, radius }) {
  const { texture: day } = useProgressiveTexture({
    url: publicPath(body.texture),
    positionId: body.id,
    radius,
    immediate: true,
    hiResScale: 26,
  });
  const { texture: night } = useProgressiveTexture({
    url: publicPath(body.nightTexture),
    positionId: body.id,
    radius,
    immediate: true,
    hiResScale: 26,
  });
  const { texture: clouds } = useProgressiveTexture({
    url: publicPath(body.cloudTexture),
    positionId: body.id,
    radius,
    immediate: true,
    hiResScale: 26,
  });
  const material = useMemo(() => (day && night ? createEarthMaterial(day, night) : null), [day, night]);
  const cloudMaterial = useMemo(() => (clouds ? createCloudMaterial(clouds) : null), [clouds]);
  const sunDirection = useMemo(() => new Vector3(1, 0, 0), []);

  useFrame(() => {
    const planetPos = worldState.positions.get(body.id);
    if (planetPos) sunDirection.copy(planetPos).multiplyScalar(-1).normalize();
    if (material) material.uniforms.uSun.value.copy(sunDirection);
    if (cloudMaterial) cloudMaterial.uniforms.uSun.value.copy(sunDirection);
  });

  return (
    <group>
      {material ? (
        <mesh>
          <sphereGeometry args={[radius, 64, 40]} />
          <primitive object={material} attach="material" />
        </mesh>
      ) : (
        <mesh>
          <sphereGeometry args={[radius, 48, 32]} />
          <meshStandardMaterial map={day} color={day ? '#ffffff' : body.color} roughness={0.82} metalness={0.02} />
        </mesh>
      )}
      {cloudMaterial && (
        <mesh scale={1.012}>
          <sphereGeometry args={[radius, 64, 40]} />
          <primitive object={cloudMaterial} attach="material" />
        </mesh>
      )}
    </group>
  );
}

function MarsSphere({ body, radius }) {
  const { texture: map, quality: mapQuality } = useProgressiveTexture({
    url: publicPath(body.texture),
    positionId: body.id,
    radius,
    hiResScale: 22,
  });
  const { texture: displacement, quality: displacementQuality } = useProgressiveTexture({
    url: publicPath(body.displacementTexture),
    positionId: body.id,
    radius,
    hiResScale: 22,
  });
  const detailed = map && displacement && mapQuality >= 2 && displacementQuality >= 2;
  return (
    <mesh>
      <sphereGeometry args={[radius, detailed ? 128 : 48, detailed ? 64 : 32]} />
      <meshStandardMaterial
        map={map}
        color={map ? '#ffffff' : body.color}
        displacementMap={detailed ? displacement : null}
        displacementScale={body.displacementScale ?? 0.04}
        displacementBias={-0.02}
        roughness={0.95}
        metalness={0.01}
      />
    </mesh>
  );
}

function RingSystem({ body, radius }) {
  const { texture } = useProgressiveTexture({
    url: publicPath(body.ringTexture),
    positionId: body.id,
    radius,
    previewScale: 40,
    hiResScale: 12,
  });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <ringGeometry args={[radius * 1.35, radius * 2.35, 160, 1]} />
      <meshBasicMaterial
        map={texture}
        color={texture ? '#ffffff' : (body.ringColor ?? '#cbb894')}
        transparent
        side={DoubleSide}
        opacity={texture ? 0.92 : 0.16}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

function ThinRings({ radius, rings, color }) {
  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      {rings.map((scale, index) => (
        <mesh key={scale}>
          <ringGeometry args={[radius * scale, radius * (scale + 0.012), 128, 1]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.36 - index * 0.06}
            side={DoubleSide}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function SurfaceMarker({ landmark, radius, bodyId }) {
  const position = useMemo(() => latLonToVector3(landmark.lat, landmark.lon, radius * 1.01), [landmark, radius]);
  const quaternion = useMemo(() => {
    const normal = position.clone().normalize();
    return new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), normal);
  }, [position]);

  const hasLander = landmark.id === 'apollo11' || landmark.id === 'apollo17';
  const labelLift =
    {
      apollo11: 70,
      apollo17: 98,
      luna21: 126,
      change4: 70,
      survey: 70,
      curiosity: 54,
      perseverance: 54,
    }[landmark.id] ?? 26;
  const labelShift =
    {
      apollo17: 170,
      luna21: -170,
      change4: 90,
      survey: 150,
      curiosity: -70,
      perseverance: 70,
    }[landmark.id] ?? 0;

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

      {landmark.kind === 'footprints' && (
        <group position={[radius * 0.3, 0, -radius * 0.16]}>
          <ApolloFootprint size={radius * 0.14} />
        </group>
      )}
      {hasLander && (
        <GatedModel maxDistance={radius * 1.8}>
          <group position={[radius * 0.08, 0, radius * 0.04]}>
            <ApolloLander size={radius * 0.2} rotation={0.4} />
          </group>
        </GatedModel>
      )}
      {landmark.kind === 'rover' && bodyId === 'moon' && landmark.id === 'survey' && (
        <GatedModel maxDistance={radius * 1.8}>
          <group position={[0, 0, 0]} rotation={[0, 2.1, 0]}>
            <SurveyRover size={radius * 0.24} />
          </group>
        </GatedModel>
      )}
      {landmark.kind === 'rover' && bodyId === 'mars' && landmark.id === 'perseverance' && (
        <GatedModel maxDistance={radius * 1.8}>
          <group position={[0, 0.004, 0]} rotation={[0, 0.6, 0]}>
            <PerseveranceRover size={radius * 0.11} />
          </group>
        </GatedModel>
      )}

      <GatedHtml maxDistance={radius * 22} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
        <div className="surface-label" style={{ transform: `translate(${labelShift}px, -${labelLift}px)` }}>
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
          <SurfaceMarker key={item.id} landmark={item} radius={radius} bodyId={body.id} />
        ))}
    </>
  );
}

function TexturedMoon({ moon }) {
  const { texture } = useProgressiveTexture({
    url: publicPath(moon.texture),
    positionId: moon.id,
    radius: moon.visualRadius,
  });
  return (
    <mesh>
      <sphereGeometry args={[moon.visualRadius, moon.major ? 48 : 24, moon.major ? 32 : 16]} />
      <meshStandardMaterial
        map={texture}
        color={texture ? '#ffffff' : (moon.color ?? '#8b8177')}
        roughness={0.92}
        metalness={0.01}
      />
    </mesh>
  );
}

function MoonSurface({ moon }) {
  if (moon.id === 'phobos') return <PhobosModel moon={moon} />;
  if (moon.id === 'hyperion') return <HyperionModel moon={moon} />;
  if (moon.texture) return <TexturedMoon moon={moon} />;
  return <MinorMoonRock moon={moon} />;
}

function MoonObject({ moon }) {
  const group = useRef();
  const spin = useRef();
  useFrame(({ camera }) => {
    const local = worldState.localPositions.get(moon.id);
    if (local && group.current) group.current.position.copy(local);
    if (group.current && !moon.major) {
      const world = worldState.positions.get(moon.id);
      group.current.visible =
        Boolean(world) && camera.position.distanceTo(world) < Math.max(90, moon.visualRadius * 160);
    }
    if (spin.current) {
      const local = worldState.localPositions.get(moon.id);
      if (moon.id === 'moon' && local) {
        spin.current.rotation.y = Math.atan2(local.z, -local.x);
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
            occludeId={moon.id}
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
          <group scale={body.shapeScale ?? [1, 1, 1]}>
            {body.id === 'earth' ? (
              <EarthSphere body={body} radius={body.visualRadius} />
            ) : body.displacementTexture ? (
              <MarsSphere body={body} radius={body.visualRadius} />
            ) : (
              <TexturedSphere path={body.texture} radius={body.visualRadius} bodyId={body.id} color={body.color} />
            )}
            <Landmarks body={body} radius={body.visualRadius} />
          </group>
        </group>
        {atmosphereMaterial && (
          <mesh scale={1.025}>
            <sphereGeometry args={[body.visualRadius, 48, 32]} />
            <primitive object={atmosphereMaterial} attach="material" />
          </mesh>
        )}
        {body.ringTexture && <RingSystem body={body} radius={body.visualRadius} />}
        {body.thinRings && <ThinRings radius={body.visualRadius} rings={body.thinRings} color={body.ringColor} />}
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
  const { texture } = useProgressiveTexture({
    url: publicPath(SUN.texture),
    positionId: SUN.id,
    radius: SUN.visualRadius,
    immediate: true,
    hiResScale: 20,
  });
  const material = useMemo(() => createSunMaterial(texture), [texture]);
  const glow = useMemo(() => radialGlowTexture(), []);
  const flares = useMemo(() => Array.from({ length: 4 }, (_, index) => index), []);

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <group>
      <mesh>
        <sphereGeometry args={[SUN.visualRadius, 64, 40]} />
        <primitive object={material} attach="material" />
      </mesh>
      <sprite scale={[SUN.visualRadius * 1.4, SUN.visualRadius * 1.4, 1]}>
        <spriteMaterial
          map={glow}
          color="#ff9a3c"
          transparent
          opacity={0.5}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>
      <sprite scale={[SUN.visualRadius * 2, SUN.visualRadius * 2, 1]}>
        <spriteMaterial
          map={glow}
          color="#ff5a12"
          transparent
          opacity={0.12}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>
      {flares.map((index) => (
        <SunFlare key={index} index={index} texture={glow} />
      ))}
      <pointLight color="#ffd4a0" intensity={3.4} distance={0} decay={0} />
      <GatedHtml
        maxDistance={Infinity}
        occludeId="sun"
        center
        distanceFactor={50}
        zIndexRange={[20, 0]}
        style={{ pointerEvents: 'auto' }}
      >
        <button
          className="body-label body-label--sun"
          type="button"
          onClick={() => useFlightStore.getState().setTarget('sun')}
        >
          <span>THE SUN</span>
          <em>太阳</em>
        </button>
      </GatedHtml>
    </group>
  );
}

function CometNucleus({ comet }) {
  const { scene } = useGLTF(comet.id === 'churyumov' ? '/models/comets/67p.glb' : '/models/comets/tempel1.glb');
  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.updateMatrixWorld(true);
    const box = new Box3().setFromObject(clone);
    const size = box.getSize(new Vector3());
    clone.scale.setScalar(0.86 / (Math.max(size.x, size.y, size.z) || 1));
    clone.updateMatrixWorld(true);
    const scaled = new Box3().setFromObject(clone);
    clone.position.sub(scaled.getCenter(new Vector3()));
    return clone;
  }, [comet.id, scene]);
  return <primitive object={model} />;
}

function Comet({ comet }) {
  const group = useRef();
  const tail = useRef();
  const nucleusRef = useRef();
  const nearRef = useRef(false);
  const [showNucleus, setShowNucleus] = useState(false);
  const glow = useMemo(() => radialGlowTexture(), []);
  const tailPositions = useMemo(() => {
    let seed = 7331;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    const positions = new Float32Array(240 * 3);
    for (let i = 0; i < 240; i++) {
      const distance = 0.3 + random() * 6.2;
      const spread = distance * 0.09;
      positions[i * 3] = (random() - 0.5) * spread;
      positions[i * 3 + 1] = distance;
      positions[i * 3 + 2] = (random() - 0.5) * spread;
    }
    return positions;
  }, []);
  useFrame(({ camera }, delta) => {
    const position = worldState.positions.get(comet.id);
    if (position && group.current) {
      group.current.position.copy(position);
      if (nucleusRef.current) nucleusRef.current.rotation.y += delta * 0.035;
      if (tail.current) {
        const away = position.clone().normalize();
        tail.current.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), away);
      }
      const near = camera.position.distanceTo(position) < Math.max(comet.visualRadius * 600, 120);
      if (near !== nearRef.current) {
        nearRef.current = near;
        setShowNucleus(near);
      }
    }
  });
  return (
    <group ref={group}>
      <group ref={nucleusRef}>
        {showNucleus && (
          <Suspense fallback={null}>
            <CometNucleus comet={comet} />
          </Suspense>
        )}
      </group>
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
        <points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[tailPositions, 3]} />
          </bufferGeometry>
          <pointsMaterial
            color={comet.tailColor}
            size={0.07}
            transparent
            opacity={0.42}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </points>
      </group>
      <BodyLabel body={comet} onClick={() => useFlightStore.getState().setTarget(comet.id)} small />
    </group>
  );
}

function AsteroidBelt() {
  const mesh = useRef();
  const count = 240;
  const beltInnerAu = 2.08;
  const beltOuterAu = 3.28;
  const { scene } = useGLTF('/models/helion/asteroid_0.glb');
  const { geometry, material } = useMemo(() => {
    let sourceGeometry = null;
    let sourceMaterial = null;
    scene.traverse((object) => {
      if (object.isMesh && !sourceGeometry) {
        sourceGeometry = object.geometry.clone();
        sourceMaterial = object.material;
      }
    });
    if (sourceGeometry) {
      sourceGeometry.computeBoundingSphere();
      const radius = sourceGeometry.boundingSphere?.radius || 1;
      const scale = 0.55 / radius;
      sourceGeometry.scale(scale, scale, scale);
      sourceGeometry.computeBoundingSphere();
    }
    return { geometry: sourceGeometry, material: sourceMaterial };
  }, [scene]);
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
        radius: (beltInnerAu + random() * (beltOuterAu - beltInnerAu)) * UNITS_PER_AU,
        y: (random() - 0.5) * 1400,
        scale: 0.5 + random() * 1.5,
        tilt: random() * Math.PI,
      });
    }
    return seeds;
  }, []);
  const dust = useMemo(() => {
    let seed = 591;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    const positions = new Float32Array(1200 * 3);
    for (let i = 0; i < 2400; i++) {
      const angle = random() * Math.PI * 2;
      const radius = (beltInnerAu + random() * (beltOuterAu - beltInnerAu)) * UNITS_PER_AU;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = (random() - 0.5) * 1800;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    return positions;
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

  if (!geometry || !material) return null;
  return (
    <>
      <instancedMesh ref={mesh} args={[geometry, material, count]} />
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[dust, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#8a7a64" size={0.28} transparent opacity={0.5} depthWrite={false} />
      </points>
    </>
  );
}

function KuiperBelt() {
  const positions = useMemo(() => {
    let seed = 4211;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    const points = new Float32Array(1600 * 3);
    for (let i = 0; i < 1600; i++) {
      const angle = random() * Math.PI * 2;
      const radius = (30 + random() * 20) * UNITS_PER_AU;
      points[i * 3] = Math.cos(angle) * radius;
      points[i * 3 + 1] = (random() - 0.5) * 260;
      points[i * 3 + 2] = Math.sin(angle) * radius;
    }
    return points;
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#8098a4" size={0.42} transparent opacity={0.2} depthWrite={false} />
    </points>
  );
}

function Starfield() {
  const ref = useRef();
  useFrame(({ camera }) => {
    if (ref.current) ref.current.position.copy(camera.position);
  }, 2);
  return (
    <group ref={ref}>
      <Stars radius={1300} depth={180} count={9000} factor={5} saturation={0} fade speed={0.25} />
    </group>
  );
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
      <ambientLight intensity={0.3} />
      <Starfield />
      <Sun />
      {PLANETS.map((planet) => (
        <group key={planet.id}>
          {planet.type === 'planet' && <Orbit body={planet} color={planet.color} opacity={0.12} />}
          <Planet body={planet} />
        </group>
      ))}
      {COMETS.map((comet) => (
        <group key={comet.id}>
          <Comet comet={comet} />
        </group>
      ))}
      <Suspense fallback={null}>
        <AsteroidBelt />
      </Suspense>
      <KuiperBelt />
    </>
  );
}
