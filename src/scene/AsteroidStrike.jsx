import { Suspense, useCallback, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { AdditiveBlending, Box3, Quaternion, Vector3 } from 'three';
import { radialGlowTexture } from '../lib/textures';
import { flightState, triggerShieldImpact } from '../state/flightState';
import { useFlightStore } from '../state/useFlightStore';

const SHIELD_RADIUS = 5.25;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
const HAZARD_MIN_DELAY = 120;
const HAZARD_RANGE = 120;

function StrikeRock() {
  const { scene } = useGLTF('/models/helion/asteroid_0.glb');
  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.updateMatrixWorld(true);
    const box = new Box3().setFromObject(clone);
    const size = box.getSize(new Vector3());
    clone.scale.setScalar(1.1 / (Math.max(size.x, size.y, size.z) || 1));
    clone.updateMatrixWorld(true);
    const scaled = new Box3().setFromObject(clone);
    clone.position.sub(scaled.getCenter(new Vector3()));
    return clone;
  }, [scene]);
  return <primitive object={model} />;
}

export function AsteroidStrike() {
  const strikePulse = useFlightStore((state) => state.strikePulse);
  const strikeMode = useFlightStore((state) => state.strikeMode);
  const asteroid = useRef();
  const flash = useRef();
  const flashMaterial = useRef();
  const nextHazard = useRef(0);
  const state = useRef({
    active: false,
    mode: 'impact',
    startedAt: 0,
    start: new Vector3(),
    pass: new Vector3(),
    side: 1,
    flashAt: -100,
    lastHud: 0,
    size: 1,
    mass: 1,
    duration: 0.95,
    velocity: new Vector3(),
  });
  const hazardsEnabled = useMemo(() => {
    if (typeof window === 'undefined') return true;
    return new URLSearchParams(window.location.search).get('hazards') !== '0';
  }, []);
  const scratch = useMemo(
    () => ({
      ship: new Vector3(),
      forward: new Vector3(),
      right: new Vector3(),
      up: new Vector3(),
      target: new Vector3(),
      impactDir: new Vector3(),
      push: new Vector3(),
      previous: new Vector3(),
      relative: new Vector3(),
      localNormal: new Vector3(),
      localVelocity: new Vector3(),
      tangential: new Vector3(),
      torque: new Vector3(),
      inverseQuaternion: new Quaternion(),
    }),
    [],
  );
  const flashTexture = useMemo(() => radialGlowTexture('rgba(220, 250, 255, 1)', 'rgba(80, 190, 255, 0)'), []);

  const launch = useCallback(
    (mode = 'impact') => {
      if (state.current.active) return;
      const store = useFlightStore.getState();
      if (store.earthMode) return;
      const now = performance.now() / 1000;
      const q = flightState.quaternion;
      scratch.forward.set(0, 0, -1).applyQuaternion(q);
      scratch.right.set(1, 0, 0).applyQuaternion(q);
      scratch.up.set(0, 1, 0).applyQuaternion(q);
      const side = Math.random() < 0.5 ? 1 : -1;
      const start = state.current.start
        .copy(flightState.position)
        .addScaledVector(scratch.forward, 14 + Math.random() * 8)
        .addScaledVector(scratch.right, side * (5.5 + Math.random() * 2.5))
        .addScaledVector(scratch.up, 1.2 + Math.random() * 2.4);
      state.current.pass
        .copy(flightState.position)
        .addScaledVector(scratch.right, side * (7.8 + Math.random() * 2.6))
        .addScaledVector(scratch.up, (Math.random() - 0.5) * 1.4);
      state.current.active = true;
      state.current.mode = mode;
      state.current.startedAt = now;
      state.current.side = side;
      state.current.lastHud = 0;
      state.current.size = 0.55 + Math.random() * 0.9;
      state.current.mass = state.current.size ** 3;
      state.current.duration = 1.25 + Math.random() * 0.5;
      state.current.velocity.set(0, 0, 0);
      if (asteroid.current) {
        asteroid.current.visible = true;
        asteroid.current.position.copy(start);
        asteroid.current.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
        asteroid.current.scale.set(state.current.size * 0.9, state.current.size * 0.65, state.current.size * 0.8);
      }
      store.setHazard({
        mayday: true,
        kind: mode,
        distance: start.distanceTo(flightState.position),
        eta: state.current.duration,
      });
      store.addLog(
        mode === 'near' ? '警告：小行星将从近距掠过，保持航向。' : '警告：高速小行星接近，护盾进入受击预警。',
      );
      if (store.autopilot.enabled) store.disengageAutopilot('impact');
    },
    [scratch],
  );

  useEffect(() => {
    nextHazard.current = performance.now() / 1000 + HAZARD_MIN_DELAY + Math.random() * HAZARD_RANGE;
  }, []);

  useEffect(() => {
    if (strikePulse === 0) return;
    launch(strikeMode);
  }, [strikePulse, strikeMode, launch]);

  const resolve = useCallback(
    (distance) => {
      const store = useFlightStore.getState();
      const mode = state.current.mode;
      if (asteroid.current) asteroid.current.visible = false;
      state.current.active = false;
      store.setHazard({ mayday: false, kind: 'none', distance: 0, eta: 0 });
      if (mode === 'impact') {
        scratch.impactDir.copy(asteroid.current.position).sub(flightState.position).normalize();
        scratch.push.copy(flightState.position).sub(asteroid.current.position).normalize();
        scratch.relative.copy(state.current.velocity).sub(flightState.velocity);
        const relativeSpeed = scratch.relative.length();
        const normalSpeed = Math.max(0, -scratch.relative.dot(scratch.impactDir));
        const angleFactor = relativeSpeed > 0.001 ? clamp(normalSpeed / relativeSpeed, 0, 1) : 1;
        const mass = state.current.mass;
        const energy = 0.5 * mass * relativeSpeed * relativeSpeed;
        const referenceEnergy = 0.5 * 12 * 12;
        const energyFactor = Math.min(1, energy / referenceEnergy);
        const severity = clamp(
          0.08 + 0.38 * energyFactor + 0.34 * angleFactor + 0.2 * Math.min(1, normalSpeed / 14),
          0.12,
          1,
        );
        const impulse = clamp(1.2 + mass * normalSpeed * 0.55, 2.2, 9.5);
        scratch.inverseQuaternion.copy(flightState.quaternion).invert();
        scratch.localNormal.copy(scratch.impactDir).applyQuaternion(scratch.inverseQuaternion);
        scratch.localVelocity.copy(scratch.relative).applyQuaternion(scratch.inverseQuaternion);
        scratch.tangential
          .copy(scratch.localVelocity)
          .addScaledVector(scratch.localNormal, -scratch.localVelocity.dot(scratch.localNormal));
        scratch.torque.crossVectors(scratch.localNormal, scratch.tangential).multiplyScalar(mass * 0.2);
        triggerShieldImpact(scratch.impactDir, {
          impulse,
          push: scratch.push,
          severity,
          normalSpeed,
          relativeSpeed,
          angleFactor,
          mass,
          torque: scratch.torque,
          pan: scratch.localNormal.x,
        });
        if (flash.current) {
          flash.current.visible = true;
          flash.current.position.copy(asteroid.current.position);
          flash.current.scale.setScalar(0.9 + severity * 1.2);
        }
        if (flashMaterial.current) flashMaterial.current.opacity = 0.75 + severity * 0.25;
        state.current.flashAt = performance.now() / 1000;
        store.registerShieldImpact();
        store.addLog(
          flightState.shield
            ? `护盾吸收小行星动能：相对速度 ${relativeSpeed.toFixed(1)} u/s · 法向撞击 ${Math.round(angleFactor * 100)}%。`
            : `护盾未展开，船体受到小行星直接冲击：相对速度 ${relativeSpeed.toFixed(1)} u/s。`,
        );
      } else {
        const speed = state.current.velocity.length();
        const severity = clamp((speed / 28) * (1 - distance / 20), 0.04, 0.28);
        flightState.cameraShake = Math.min(1, flightState.cameraShake + severity * 0.5);
        store.addLog(`小行星以 ${distance.toFixed(1)} u 距离掠过，未接触护盾。`);
      }
    },
    [scratch],
  );

  useFrame((_, delta) => {
    const now = performance.now() / 1000;

    if (flash.current?.visible) {
      const age = now - state.current.flashAt;
      const life = 0.45;
      if (age >= life) {
        flash.current.visible = false;
      } else {
        const k = age / life;
        flash.current.scale.setScalar(1.2 + k * 5.2);
        if (flashMaterial.current) flashMaterial.current.opacity = 0.9 * (1 - k);
      }
    }

    if (!state.current.active) {
      if (!hazardsEnabled) return;
      const store = useFlightStore.getState();
      if (store.earthMode) return;
      if (now > nextHazard.current) {
        launch(Math.random() < 0.76 ? 'near' : 'impact');
        nextHazard.current = now + HAZARD_MIN_DELAY + Math.random() * HAZARD_RANGE;
      }
      return;
    }
    if (!asteroid.current) return;

    const mode = state.current.mode;
    const t = Math.min(1, (now - state.current.startedAt) / state.current.duration);
    const eased = t * t * (3 - 2 * t);
    scratch.previous.copy(asteroid.current.position);
    scratch.target.copy(mode === 'near' ? state.current.pass : flightState.position);
    asteroid.current.position.lerpVectors(state.current.start, scratch.target, eased);
    asteroid.current.position.y += Math.sin(t * Math.PI) * 0.7;
    asteroid.current.position.x += state.current.side * Math.sin(t * Math.PI) * 0.6;
    asteroid.current.rotation.x += delta * 1.8;
    asteroid.current.rotation.y += delta * 2.4;
    if (delta > 0.0001) {
      scratch.relative.copy(asteroid.current.position).sub(scratch.previous).divideScalar(delta);
      state.current.velocity.lerp(scratch.relative, 0.4);
    }
    const distance = asteroid.current.position.distanceTo(flightState.position);

    if (now - state.current.lastHud > 0.15) {
      state.current.lastHud = now;
      useFlightStore.getState().setHazard({
        mayday: true,
        kind: mode,
        distance,
        eta: Math.max(0, (1 - t) * state.current.duration),
      });
    }

    if (t >= 1) {
      resolve(distance);
    } else if (mode === 'impact' && distance < SHIELD_RADIUS) {
      resolve(distance);
    }
  });

  return (
    <group>
      <group ref={asteroid} visible={false}>
        <Suspense fallback={null}>
          <StrikeRock />
        </Suspense>
      </group>
      <sprite ref={flash} visible={false}>
        <spriteMaterial
          ref={flashMaterial}
          map={flashTexture}
          color="#bdeaff"
          transparent
          opacity={0.9}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>
    </group>
  );
}
