import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { AdditiveBlending, BufferAttribute, BufferGeometry, MathUtils, PointsMaterial, Vector3 } from 'three';
import { BODY_BY_ID, PLANETS } from '../data/solarSystem';
import { generateHoloPositions } from '../lib/holoShapes';
import { useFlightStore } from '../state/useFlightStore';
import { PlanetParticles } from './PlanetParticles';
import { SolarHoloRing } from './SolarHoloRing';

const DEG = Math.PI / 180;

function PreviewPlanet({ body, count }) {
  return (
    <group rotation={[0, 0, -(body.axialTilt ?? 0) * DEG]}>
      <PlanetParticles body={body} count={count} pointSize={1.55} opacity={1} rings scale={0.086} />
    </group>
  );
}

export function HoloSelector3D() {
  const open = useFlightStore((state) => state.selector.open);
  const previewId = useFlightStore((state) => state.selector.previewId);
  const root = useRef();
  const content = useRef();
  const globe = useRef();
  const particles = useRef();
  const body = BODY_BY_ID.get(previewId) ?? PLANETS[0];
  const camera = useThree((state) => state.camera);
  const scene = useThree((state) => state.scene);
  const viewportWidth = useThree((state) => state.size.width);
  const viewportHeight = useThree((state) => state.size.height);
  const compact = viewportWidth < 900;
  const landscape = viewportWidth > viewportHeight && viewportHeight < 540;
  const particleMaterial = useMemo(
    () =>
      new PointsMaterial({
        color: body.color ?? '#9fe6ff',
        size: 0.0046,
        transparent: true,
        opacity: 0.8,
        blending: AdditiveBlending,
        depthWrite: false,
        depthTest: false,
        toneMapped: false,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const particleGeometry = useMemo(() => {
    const positions = generateHoloPositions('galaxy', 620);
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    return geometry;
  }, []);

  useEffect(() => {
    const group = root.current;
    if (!group) return undefined;
    scene.add(camera);
    camera.add(group);
    return () => {
      camera.remove(group);
    };
  }, [camera, scene]);

  useEffect(() => {
    particleMaterial.color.set(body.color ?? '#9fe6ff');
  }, [body.color, particleMaterial]);

  useEffect(
    () => () => {
      particleGeometry.dispose();
      particleMaterial.dispose();
    },
    [particleGeometry, particleMaterial],
  );

  useFrame(({ clock }, delta) => {
    if (!root.current) return;
    root.current.visible = open;
    if (!open) return;
    const distance = 0.72;
    const height = 2 * Math.tan(MathUtils.degToRad(camera.fov) / 2) * distance;
    root.current.position.set(0, 0, -distance);
    root.current.quaternion.identity();
    root.current.scale.setScalar(height);
    if (content.current) {
      const fit = landscape ? 0.66 : compact ? 0.68 : 1;
      content.current.scale.setScalar(fit);
      content.current.position.y = landscape ? 0.15 : compact ? 0.14 : 0;
    }
    if (globe.current) {
      globe.current.rotation.y += delta * 0.16;
      globe.current.position.y = 0.02 + Math.sin(clock.elapsedTime * 0.8) * 0.004;
    }
    if (particles.current) particles.current.rotation.z += delta * 0.08;
  });

  return (
    <group ref={root} name="holo-selector-root" visible={false}>
      <mesh name="holo-selector-backdrop" position={[0, 0, -2]} renderOrder={1} raycast={() => null}>
        <planeGeometry args={[12, 7]} />
        <meshBasicMaterial color="#020506" toneMapped={false} />
      </mesh>
      <group ref={content} name="holo-selector-content">
        <group position={[0, -0.008, 0]}>
          <SolarHoloRing radius={0.3} tilt={1.02} nodeScale={0.96} spin={0.032} />
        </group>
        <group ref={globe} position={[0, 0.02, 0]}>
          <PreviewPlanet body={body} count={compact ? 3200 : 6000} />
        </group>
        <mesh position={[0, 0.006, 0]} rotation={[1.16, 0.2, 0.24]}>
          <torusGeometry args={[0.145, 0.0012, 4, 96]} />
          <meshBasicMaterial
            color={body.color ?? '#e8d5b5'}
            transparent
            opacity={0.26}
            blending={AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[0, 0.006, 0]} rotation={[1.34, -0.18, -0.12]}>
          <torusGeometry args={[0.18, 0.0008, 4, 96]} />
          <meshBasicMaterial
            color="#c8d9d8"
            transparent
            opacity={0.13}
            blending={AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        {viewportWidth >= 1100 && (
          <group position={[0.4, -0.22, 0.02]} rotation={[0.62, 0.18, 0]} scale={0.28}>
            <points ref={particles} geometry={particleGeometry} material={particleMaterial} />
          </group>
        )}
      </group>
    </group>
  );
}
