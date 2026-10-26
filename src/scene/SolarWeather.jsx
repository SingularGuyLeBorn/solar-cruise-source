import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, BufferAttribute, BufferGeometry, PointsMaterial, Vector3 } from 'three';
import { flightState } from '../state/flightState';
import { useFlightStore } from '../state/useFlightStore';

const COUNT = 260;
const SPREAD = 34;

export function SolarWeather() {
  const points = useRef();
  const group = useRef();
  const geo = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT * 3; i++) positions[i] = (Math.random() - 0.5) * SPREAD * 2;
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    return geometry;
  }, []);
  const material = useMemo(
    () =>
      new PointsMaterial({
        color: '#f0d0a8',
        size: 0.075,
        transparent: true,
        opacity: 0.12,
        blending: AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );
  const cycle = useRef({
    initialized: false,
    nextFlare: 0,
    flareStart: -100,
    lastUpdate: 0,
  });
  const scratch = useMemo(() => ({ ship: new Vector3(), sunDir: new Vector3() }), []);
  const startWithFlare = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('solarFlare') === '1';
  }, []);

  useEffect(() => {
    geo.dispose = geo.dispose.bind(geo);
    return () => {
      geo.dispose();
      material.dispose();
    };
  }, [geo, material]);

  useFrame(({ clock }, delta) => {
    const now = clock.elapsedTime;
    const state = cycle.current;
    if (!state.initialized) {
      state.initialized = true;
      state.nextFlare = startWithFlare ? now + 1.2 : now + 22 + Math.random() * 26;
    }
    if (now >= state.nextFlare) {
      state.flareStart = now;
      state.nextFlare = now + 42 + Math.random() * 28;
      useFlightStore.getState().addLog('太阳耀斑爆发：日冕物质抛射抵达航线，预计出现电磁干扰。');
    }
    const age = now - state.flareStart;
    const flare = age >= 0 && age < 14 ? Math.sin((Math.min(1, age / 14) * Math.PI) / 2) : 0;
    const interference = age >= 0 && age < 16 ? Math.max(0, 1 - age / 16) * 0.58 : 0.025;
    const activity = 0.28 + flare * 0.62;
    const wind = Math.round(400 + flare * 520);

    if (now - state.lastUpdate > 0.2) {
      state.lastUpdate = now;
      useFlightStore.getState().setSolar({
        activity,
        flare,
        flareClass: flare > 0.68 ? 'X' : flare > 0.32 ? 'M' : flare > 0.02 ? 'C' : '—',
        wind,
        sunspots: 3 + Math.round(activity * 9),
        interference,
        event: flare > 0.05 ? 'FLARE' : 'QUIET',
      });
      if (material) {
        material.opacity = 0.07 + interference * 0.32;
        material.size = 0.06 + interference * 0.08;
      }
    }

    scratch.ship.copy(flightState.position);
    if (group.current) group.current.position.copy(scratch.ship);
    const attr = geo.getAttribute('position');
    const array = attr.array;
    scratch.sunDir.copy(scratch.ship).normalize();
    const speed = wind * 0.075;
    for (let i = 0; i < COUNT; i++) {
      const offset = i * 3;
      array[offset] += scratch.sunDir.x * speed * delta;
      array[offset + 1] += scratch.sunDir.y * speed * delta;
      array[offset + 2] += scratch.sunDir.z * speed * delta;
      const along =
        array[offset] * scratch.sunDir.x + array[offset + 1] * scratch.sunDir.y + array[offset + 2] * scratch.sunDir.z;
      if (along > SPREAD) {
        array[offset] -= scratch.sunDir.x * SPREAD * 2;
        array[offset + 1] -= scratch.sunDir.y * SPREAD * 2;
        array[offset + 2] -= scratch.sunDir.z * SPREAD * 2;
      }
    }
    attr.needsUpdate = true;
  });

  return (
    <group ref={group}>
      <points ref={points} geometry={geo} material={material} />
    </group>
  );
}
