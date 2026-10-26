import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Euler, Matrix4, Quaternion, Vector3 } from 'three';
import { BODY_BY_ID, PLANETS, SUN } from '../data/solarSystem';
import { MOONS } from '../data/moons';
import { MOON_BY_ID } from '../data/moons';
import { flightState, beginJump, triggerShieldImpact } from '../state/flightState';
import { useFlightStore } from '../state/useFlightStore';
import { getPosition, nearestPlanet, worldState } from '../state/worldState';
import { gammaFromSpeedC } from '../lib/relativity';

const C_UNITS_PER_SECOND = 60;
const FORWARD = new Vector3(0, 0, -1);
const UP = new Vector3(0, 1, 0);
const RIGHT = new Vector3(1, 0, 0);

function warpUnits(warp) {
  return warp > 0 ? C_UNITS_PER_SECOND * Math.pow(2.6, warp) : 0;
}

export function FlightController() {
  const keys = useRef({});
  const mouse = useRef({ dx: 0, dy: 0 });
  const uiTick = useRef(0);
  const nearestTick = useRef(0);
  const lastCollision = useRef({ id: null, at: 0 });
  const dragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const lastView = useRef(null);
  const lastPosition = useRef(flightState.position.clone());
  const tempQuat = useMemo(() => new Quaternion(), []);
  const tempVec = useMemo(() => new Vector3(), []);

  useEffect(() => {
    const down = (event) => {
      const modalState = useFlightStore.getState();
      if (modalState.holo.formGalleryOpen) {
        if (event.code === 'Escape') {
          modalState.closeFormGallery();
          event.preventDefault();
        }
        return;
      }
      keys.current[event.code] = true;
      if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyW', 'KeyS', 'KeyA', 'KeyD'].includes(
          event.code,
        )
      ) {
        event.preventDefault();
      }
      if (event.code === 'KeyV') {
        const store = useFlightStore.getState();
        store.setView(store.viewMode === 'cockpit' ? 'chase' : 'cockpit');
      }
      if (event.code === 'KeyH') useFlightStore.getState().toggleShield();
      if (event.code === 'KeyE') useFlightStore.getState().toggleEngine();
      if (event.code === 'KeyJ') useFlightStore.getState().toggleSelector();
      if (event.code === 'KeyO') useFlightStore.getState().toggleHolo();
      if (event.code === 'KeyP') useFlightStore.getState().toggleHelp();
      if (event.code === 'KeyM') useFlightStore.getState().toggleAudio();
      if (event.code === 'KeyG') {
        const store = useFlightStore.getState();
        if (store.autopilot.enabled && store.autopilot.mode === 'hold') store.disengageAutopilot('toggle');
        else store.engageAutopilot('hold');
      }
      if (event.code === 'KeyF') {
        const store = useFlightStore.getState();
        if (store.autopilot.enabled && store.autopilot.mode === 'approach') store.disengageAutopilot('toggle');
        else store.engageAutopilot('approach');
      }
      if (
        [
          'KeyW',
          'KeyS',
          'KeyA',
          'KeyD',
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
          'ShiftLeft',
          'ShiftRight',
          'ControlLeft',
          'ControlRight',
          'Space',
          'KeyX',
          'Digit0',
          'Digit1',
          'Digit2',
          'Digit3',
          'Digit4',
          'Digit5',
          'Digit6',
          'Digit7',
          'Digit8',
          'Digit9',
        ].includes(event.code)
      ) {
        const store = useFlightStore.getState();
        if (store.autopilot.enabled) store.disengageAutopilot('manual');
      }
      if (event.code === 'KeyT') useFlightStore.getState().cycleSimSpeed();
      if (event.code === 'KeyR') useFlightStore.getState().scanNearby();
      if (event.code === 'KeyC') useFlightStore.getState().setEarthMode(true);
      if (event.code === 'KeyK') useFlightStore.getState().triggerImpactTest();
      if (event.code === 'KeyX') {
        useFlightStore.getState().setThrottle(0);
        useFlightStore.getState().setWarp(0);
      }
      if (event.code === 'Space') {
        const store = useFlightStore.getState();
        if (store.jumpOpen) return;
        if (store.selector.open) {
          store.jumpTo(store.selector.previewId);
          store.closeSelector();
          return;
        }
        store.jumpTo(store.targetId);
      }
      if (/^Digit[0-9]$/.test(event.code)) {
        useFlightStore.getState().setWarp(Number(event.code.slice(5)));
      }
    };
    const up = (event) => {
      keys.current[event.code] = false;
    };
    const mouseMove = (event) => {
      if (document.pointerLockElement || dragging.current) {
        mouse.current.dx += event.movementX;
        mouse.current.dy += event.movementY;
      }
    };
    const pointerDown = (event) => {
      if (event.target?.tagName !== 'CANVAS') return;
      dragging.current = true;
      lastPointer.current = { x: event.clientX, y: event.clientY };
    };
    const pointerMove = (event) => {
      if (!dragging.current) return;
      if (event.pointerType === 'touch' || event.pointerType === 'pen') {
        mouse.current.dx += (event.clientX - lastPointer.current.x) * 1.5;
        mouse.current.dy += (event.clientY - lastPointer.current.y) * 1.5;
        lastPointer.current = { x: event.clientX, y: event.clientY };
        event.preventDefault();
      }
    };
    const pointerUp = () => {
      dragging.current = false;
    };
    const wheel = (event) => {
      if (event.target?.closest?.('button, input, textarea, select, .panel, .modal')) return;
      const store = useFlightStore.getState();
      const hologramActive = store.selector.open || (store.viewMode === 'cockpit' && store.holo.open);
      if (!hologramActive) return;
      event.preventDefault();
      store.cycleActiveProjector(event.deltaY >= 0 ? 1 : -1);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('mousemove', mouseMove);
    window.addEventListener('pointerdown', pointerDown);
    window.addEventListener('pointermove', pointerMove, { passive: false });
    window.addEventListener('pointerup', pointerUp);
    window.addEventListener('pointercancel', pointerUp);
    window.addEventListener('wheel', wheel, { passive: false });
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('mousemove', mouseMove);
      window.removeEventListener('pointerdown', pointerDown);
      window.removeEventListener('pointermove', pointerMove);
      window.removeEventListener('pointerup', pointerUp);
      window.removeEventListener('pointercancel', pointerUp);
      window.removeEventListener('wheel', wheel);
    };
  }, []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const store = useFlightStore.getState();
    if (store.earthMode) return;

    if (lastView.current !== store.viewMode) {
      lastView.current = store.viewMode;
      flightState.lookYaw = 0;
      flightState.lookPitch = 0;
    }

    const q = flightState.quaternion;
    const looking = store.viewMode === 'cockpit';
    if (looking) {
      flightState.lookYaw += mouse.current.dx * 0.0024;
      if (flightState.lookYaw > Math.PI) flightState.lookYaw -= Math.PI * 2;
      if (flightState.lookYaw < -Math.PI) flightState.lookYaw += Math.PI * 2;
      flightState.lookPitch = Math.max(-1.54, Math.min(1.54, flightState.lookPitch - mouse.current.dy * 0.0024));
    }
    const autopilotActive = Boolean(store.autopilot?.enabled);
    const touchPitch = autopilotActive ? 0 : flightState.touchPitch || 0;
    const touchYaw = autopilotActive ? 0 : flightState.touchYaw || 0;
    const touchRoll = autopilotActive ? 0 : flightState.touchRoll || 0;
    const pitchInput = autopilotActive
      ? 0
      : (keys.current.ArrowDown ? 1 : 0) -
        (keys.current.ArrowUp ? 1 : 0) +
        touchPitch +
        (looking ? 0 : mouse.current.dy * 0.0022);
    const yawInput = autopilotActive
      ? 0
      : (keys.current.ArrowLeft ? 1 : 0) -
        (keys.current.ArrowRight ? 1 : 0) +
        touchYaw +
        (looking ? 0 : -mouse.current.dx * 0.0022);
    const rollInput = autopilotActive ? 0 : (keys.current.KeyA ? 1 : 0) - (keys.current.KeyD ? 1 : 0) + touchRoll;
    if (!autopilotActive) {
      flightState.steerX = yawInput;
      flightState.steerY = pitchInput;
    }
    mouse.current.dx = 0;
    mouse.current.dy = 0;

    let throttle = flightState.throttle;
    if (!autopilotActive) {
      const turnScale = flightState.warp > 0 ? 0.45 : 1;
      q.multiply(tempQuat.setFromAxisAngle(RIGHT, pitchInput * 0.9 * turnScale * dt));
      q.multiply(tempQuat.setFromAxisAngle(UP, yawInput * 0.75 * turnScale * dt));
      q.multiply(tempQuat.setFromAxisAngle(FORWARD, rollInput * 1.2 * turnScale * dt));
      q.normalize();

      const throttleUp = keys.current.KeyW || keys.current.ShiftLeft || keys.current.ShiftRight;
      const throttleDown = keys.current.KeyS || keys.current.ControlLeft || keys.current.ControlRight;
      if (throttleUp) throttle = Math.min(1, throttle + dt * (keys.current.ShiftLeft ? 0.9 : 0.38));
      if (throttleDown) throttle = Math.max(-1, throttle - dt * 0.5);
      if (throttle !== flightState.throttle) {
        if (throttle < 0 && flightState.warp !== 0) {
          flightState.warp = 0;
          store.setWarp(0);
        }
        flightState.throttle = throttle;
        store.setThrottle(throttle);
      }

      if (!flightState.engineOn) {
        flightState.throttle = 0;
        throttle = 0;
      }

      const targetSpeedC = flightState.engineOn ? throttle * 0.995 : 0;
      const accel = targetSpeedC > flightState.speedC ? 0.9 : 1.4;
      flightState.speedC +=
        Math.sign(targetSpeedC - flightState.speedC) *
        Math.min(Math.abs(targetSpeedC - flightState.speedC), accel * dt);

      const cruiseUnits = C_UNITS_PER_SECOND * flightState.speedC;
      const warpSpeed = flightState.warp > 0 ? warpUnits(flightState.warp) : 0;
      const currentUnits = flightState.engineOn
        ? flightState.speedC < 0
          ? cruiseUnits
          : Math.max(cruiseUnits, warpSpeed)
        : 0;
      const units = currentUnits;

      FORWARD.copy(new Vector3(0, 0, -1).applyQuaternion(q));
      flightState.position.addScaledVector(FORWARD, units * dt);
    } else {
      throttle = flightState.throttle;
    }

    if (flightState.externalVelocity.lengthSq() > 1e-6) {
      flightState.position.addScaledVector(flightState.externalVelocity, dt);
      flightState.externalVelocity.multiplyScalar(Math.exp(-dt * 1.5));
      if (flightState.externalVelocity.lengthSq() < 1e-4) flightState.externalVelocity.set(0, 0, 0);
    }
    if (flightState.externalAngular.lengthSq() > 1e-6) {
      const angular = flightState.externalAngular.length();
      tempQuat.setFromAxisAngle(tempVec.copy(flightState.externalAngular).normalize(), angular * dt);
      q.multiply(tempQuat);
      q.normalize();
      flightState.externalAngular.multiplyScalar(Math.exp(-dt * 1.8));
      if (flightState.externalAngular.lengthSq() < 1e-5) flightState.externalAngular.set(0, 0, 0);
    }

    if (flightState.jumpRequest) {
      const targetId = flightState.jumpRequest;
      flightState.jumpRequest = null;
      const target = BODY_BY_ID.get(targetId) ?? MOON_BY_ID.get(targetId);
      const targetPos = getPosition(targetId);
      if (target && targetPos) {
        const offset = Math.max((target.visualRadius ?? 1) * 3, 2.2);
        const desired = targetPos.clone().add(new Vector3(0, offset * 0.3, offset));
        const lookMatrix = new Matrix4().lookAt(desired, targetPos, new Vector3(0, 1, 0));
        beginJump(desired, new Quaternion().setFromRotationMatrix(lookMatrix));
        flightState.jump.targetId = targetId;
        store.addLog(`曲率泡已形成，正在跃迁至 ${target.name}。`);
      }
    }

    if (flightState.jump.active) {
      const now = performance.now() / 1000;
      let t = (now - flightState.jump.startedAt) / flightState.jump.duration;
      t = Math.min(1, Math.max(0, t));
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      flightState.position.lerpVectors(flightState.jump.fromPosition, flightState.jump.toPosition, eased);
      flightState.quaternion.copy(flightState.jump.fromQuaternion).slerp(flightState.jump.toQuaternion, eased);
      flightState.speedC = 0;
      if (t >= 1) {
        flightState.jump.active = false;
        const target = BODY_BY_ID.get(flightState.jump.targetId) ?? MOON_BY_ID.get(flightState.jump.targetId);
        if (target) store.addLog(`已抵达 ${target.name} 附近空域。`);
      }
    }

    if (!flightState.jump.active) {
      flightState.velocity.set(
        (flightState.position.x - lastPosition.current.x) / Math.max(dt, 0.0001),
        (flightState.position.y - lastPosition.current.y) / Math.max(dt, 0.0001),
        (flightState.position.z - lastPosition.current.z) / Math.max(dt, 0.0001),
      );
    } else {
      flightState.velocity.set(0, 0, 0);
    }
    lastPosition.current.copy(flightState.position);

    // Shield / collision response against planets and the Sun.
    const now = performance.now() / 1000;
    if (!autopilotActive) {
      const bodies = [SUN, ...PLANETS, ...MOONS.filter((moon) => moon.major)];
      for (const body of bodies) {
        const pos = getPosition(body.id);
        if (!pos) continue;
        const distance = flightState.position.distanceTo(pos);
        const minDistance = body.id === 'sun' ? body.visualRadius + 2 : (body.visualRadius ?? 1) * 1.015 + 0.03;
        if (distance < minDistance) {
          tempVec.copy(flightState.position).sub(pos).normalize();
          flightState.position.copy(pos).addScaledVector(tempVec, minDistance);
          if (lastCollision.current.id !== body.id || now - lastCollision.current.at > 2) {
            const incomingSpeed = flightState.velocity.length();
            const normalSpeed = Math.max(0, -flightState.velocity.dot(tempVec));
            const angleFactor = incomingSpeed > 0.001 ? Math.min(1, normalSpeed / incomingSpeed) : 1;
            const severity = Math.min(0.82, 0.16 + normalSpeed / 70 + angleFactor * 0.2);
            triggerShieldImpact(tempVec, {
              impulse: Math.min(9, 2.4 + normalSpeed * 0.08),
              push: tempVec,
              severity,
              normalSpeed,
              relativeSpeed: incomingSpeed,
              angleFactor,
              mass: 1,
            });
            store.addLog(`警告：${body.name} 引力边界，护盾吸收冲击。`);
            lastCollision.current = { id: body.id, at: now };
          }
        }
      }
    }

    const gamma = gammaFromSpeedC(flightState.speedC);
    const externalDelta = dt;
    const shipDelta = flightState.warp > 0 ? dt : dt / gamma;
    flightState.externalSeconds += externalDelta;
    flightState.shipSeconds += shipDelta;

    if (now - uiTick.current > 0.12) {
      uiTick.current = now;
      store.setThrottle(throttle);
      store.setWarp(flightState.warp);
      useFlightStore.setState({
        speedC: flightState.speedC,
        gamma,
        externalSeconds: flightState.externalSeconds,
        shipSeconds: flightState.shipSeconds,
        engineOn: flightState.engineOn,
        shield: flightState.shield,
      });
    }

    if (now - nearestTick.current > 0.25) {
      nearestTick.current = now;
      const nearest = nearestPlanet(flightState.position);
      if (nearest) {
        const state = useFlightStore.getState();
        if (state.nearId !== nearest.body.id || Math.abs(state.nearDistance - nearest.distance) > 0.2) {
          state.setNear(nearest.body.id, nearest.distance);
        }
      }
    }

    flightState.cameraShake = Math.max(0, flightState.cameraShake - dt * 1.8);
    void state;
  }, -1);

  return null;
}

export function FlightCamera() {
  const { camera, scene, gl } = useThree();
  const perf = useRef({ frames: 0, elapsed: 0, fps: 0 });
  const shakeVector = useMemo(() => new Vector3(), []);
  const shakeEuler = useMemo(() => new Euler(0, 0, 0, 'YXZ'), []);
  const shakeQuat = useMemo(() => new Quaternion(), []);
  useFrame((_, delta) => {
    if (typeof window !== 'undefined' && window.__cruise) {
      window.__cruise.camera = camera;
      window.__cruise.scene = scene;
      window.__cruise.renderer = gl;
      const stats = perf.current;
      stats.frames += 1;
      stats.elapsed += delta;
      if (stats.elapsed >= 0.5) {
        stats.fps = stats.frames / stats.elapsed;
        stats.frames = 0;
        stats.elapsed = 0;
        window.__cruise.fps = stats.fps;
      }
    }
    const { viewMode } = useFlightStore.getState();
    const q = flightState.quaternion;
    const shake = flightState.cameraShake;
    const shakeSeed = flightState.cockpitShake.seed || 1;
    const now = performance.now() / 1000;
    const impact = flightState.impact;
    const shakeX =
      Math.sin(now * 43 + shakeSeed) * shake * 0.045 +
      Math.sin(now * 71 + shakeSeed * 1.7) * shake * 0.018 +
      impact.point.x * shake * 0.03;
    const shakeY =
      Math.sin(now * 57 + shakeSeed * 0.7) * shake * 0.07 +
      Math.sin(now * 89 + shakeSeed) * shake * 0.02 +
      impact.point.y * shake * 0.025;
    const shakeZ = Math.cos(now * 37 + shakeSeed) * shake * 0.025;
    shakeVector.set(shakeX, shakeY, shakeZ);

    if (viewMode === 'cockpit') {
      const offset = shakeVector
        .clone()
        .add(new Vector3(0, 0.38, 0.55))
        .applyQuaternion(q);
      camera.position.copy(flightState.position).add(offset);
      const yaw = new Quaternion().setFromAxisAngle(UP, -flightState.lookYaw);
      const pitch = new Quaternion().setFromAxisAngle(RIGHT, flightState.lookPitch);
      camera.quaternion.copy(q).multiply(yaw).multiply(pitch);
      if (shake > 0.005) {
        shakeEuler.set(
          Math.sin(now * 53 + shakeSeed) * shake * 0.006 + impact.point.y * shake * 0.004,
          Math.cos(now * 61 + shakeSeed) * shake * 0.005 + impact.point.x * shake * 0.004,
          Math.sin(now * 47 + shakeSeed) * shake * 0.007,
          'YXZ',
        );
        shakeQuat.setFromEuler(shakeEuler);
        camera.quaternion.multiply(shakeQuat);
      }
    } else {
      const desired = new Vector3(0, 3.4, 12.5)
        .addScaledVector(shakeVector, 0.7)
        .applyQuaternion(q)
        .add(flightState.position);
      const followRate = 5 + flightState.warp * 14;
      const follow = flightState.warp >= 1.5 ? 1 : 1 - Math.exp(-delta * followRate);
      camera.position.lerp(desired, follow);
      camera.lookAt(flightState.position);
    }
    const baseFov = viewMode === 'cockpit' ? 72 : 56;
    const warpStretch = flightState.warp * (viewMode === 'cockpit' ? 0.8 : 1.4) + (flightState.jump.active ? 6 : 0);
    const targetFov = baseFov + warpStretch;
    if (Math.abs(camera.fov - targetFov) > 0.02) {
      camera.fov += (targetFov - camera.fov) * (1 - Math.exp(-delta * 5));
      camera.updateProjectionMatrix();
    }
    camera.near = 0.05;
    camera.far = 8_000_000;
  }, 1);

  return null;
}
