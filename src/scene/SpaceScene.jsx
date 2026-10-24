import { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { SolarSystem } from './SolarSystem';
import { Ship } from './Ship';
import { FlightCamera, FlightController } from './FlightController';
import { Cockpit } from './Cockpit';

export function SpaceScene({ active = true }) {
  return (
    <Canvas
      className="space-canvas"
      dpr={[1, 1.7]}
      camera={{ position: [0, 30, 300], fov: 60, near: 0.05, far: 5000 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMappingExposure = 1.1;
      }}
    >
      <Suspense fallback={null}>
        <FlightController />
        <FlightCamera />
        <SolarSystem />
        <Ship />
        <EffectComposer multisampling={0}>
          <Bloom intensity={0.95} luminanceThreshold={0.55} luminanceSmoothing={0.2} mipmapBlur />
          <Vignette offset={0.18} darkness={0.55} />
        </EffectComposer>
      </Suspense>
    </Canvas>
  );
}

export function CockpitOverlay() {
  return (
    <Canvas
      className="cockpit-overlay"
      dpr={[1, 1.7]}
      camera={{ position: [0, 1.18, 1.15], fov: 72, near: 0.05, far: 120 }}
      gl={{ alpha: true, antialias: true }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
    >
      <ambientLight intensity={0.25} />
      <Cockpit visible compact />
    </Canvas>
  );
}
