import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { SolarSystem } from './SolarSystem';
import { Ship } from './Ship';
import { FlightCamera, FlightController } from './FlightController';
import { HelionCockpit } from './HelionCockpit';
import { SpaceEnvironment } from './SpaceEnvironment';
import { WarpPostEffects, WarpTunnel } from './WarpTunnel';
import { AsteroidStrike } from './AsteroidStrike';
import { SolarWeather } from './SolarWeather';
import { HoloSelector3D } from './HoloSelector3D';
import { Autopilot } from './Autopilot';
import { COCKPIT_EYE_OFFSET } from '../state/flightState';

export function SpaceScene() {
  return (
    <Canvas
      className="space-canvas"
      dpr={[1, 1.35]}
      camera={{ position: [0, 400, 1600], fov: 60, near: 0.05, far: 20000 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMappingExposure = 1.05;
      }}
    >
      <FlightController />
      <Autopilot />
      <FlightCamera />
      <SpaceEnvironment />
      <Suspense fallback={null}>
        <SolarSystem />
      </Suspense>
      <Suspense fallback={null}>
        <Ship />
      </Suspense>
      <AsteroidStrike />
      <SolarWeather />
      <HoloSelector3D />
      <WarpTunnel />
      <EffectComposer multisampling={0}>
        <Bloom intensity={0.62} luminanceThreshold={0.74} luminanceSmoothing={0.18} mipmapBlur />
        <WarpPostEffects />
        <Vignette offset={0.18} darkness={0.55} />
      </EffectComposer>
    </Canvas>
  );
}

export function CockpitOverlay() {
  return (
    <Canvas
      className="cockpit-overlay"
      dpr={[1, 1.35]}
      camera={{ position: COCKPIT_EYE_OFFSET.toArray(), fov: 72, near: 0.05, far: 120 }}
      gl={{ alpha: true, antialias: true }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
    >
      <ambientLight intensity={0.25} />
      <Suspense fallback={null}>
        <HelionCockpit visible compact />
      </Suspense>
    </Canvas>
  );
}
