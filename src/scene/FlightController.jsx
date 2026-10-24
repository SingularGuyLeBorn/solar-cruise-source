import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { BODY_BY_ID, PLANETS, SUN } from '../data/solarSystem';
import { MOONS } from '../data/moons';
import { MOON_BY_ID } from '../data/moons';
import { flightState, beginJump, triggerShieldImpact } from '../state/flightState';
import { useFlightStore } from '../state/useFlightStore';
import { getPosition, nearestPlanet, worldState } from '../state/worldState';
import { gammaFromSpeedC } from '../lib/relativity';

const C_UNITS_PER_SECOND = 6;
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
  const tempQuat = useMemo(() => new Quaternion(), []);
  const tempVec = useMemo(() => new Vector3(), []);

  useEffect(() => {
    const down = (event) => {
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
      if (event.code === 'KeyJ') useFlightStore.getState().toggleJump();
      if (event.code === 'KeyP') useFlightStore.getState().toggleHelp();
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
      if (document.pointerLockElement) {
        mouse.current.dx += event.movementX;
        mouse.current.dy += event.movementY;
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('mousemove', mouseMove);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('mousemove', mouseMove);
    };
  }, []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const store = useFlightStore.getState();
    if (store.earthMode) return;

    const q = flightState.quaternion;
    const pitchInput = (keys.current.ArrowDown ? 1 : 0) - (keys.current.ArrowUp ? 1 : 0) + mouse.current.dy * 0.0022;
    const yawInput = (keys.current.ArrowLeft ? 1 : 0) - (keys.current.ArrowRight ? 1 : 0) - mouse.current.dx * 0.0022;
    const rollInput = (keys.current.KeyA ? 1 : 0) - (keys.current.KeyD ? 1 : 0);
    flightState.steerX = yawInput;
    flightState.steerY = pitchInput;
    mouse.current.dx = 0;
    mouse.current.dy = 0;

    const turnScale = flightState.warp > 0 ? 0.45 : 1;
    q.multiply(tempQuat.setFromAxisAngle(RIGHT, pitchInput * 0.9 * turnScale * dt));
    q.multiply(tempQuat.setFromAxisAngle(UP, yawInput * 0.75 * turnScale * dt));
    q.multiply(tempQuat.setFromAxisAngle(FORWARD, rollInput * 1.2 * turnScale * dt));
    q.normalize();

    let throttle = flightState.throttle;
    const throttleUp = keys.current.KeyW || keys.current.ShiftLeft || keys.current.ShiftRight;
    const throttleDown = keys.current.KeyS || keys.current.ControlLeft || keys.current.ControlRight;
    if (throttleUp) throttle = Math.min(1, throttle + dt * (keys.current.ShiftLeft ? 0.9 : 0.38));
    if (throttleDown) throttle = Math.max(0, throttle - dt * 0.5);
    if (throttle !== flightState.throttle) {
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
      Math.sign(targetSpeedC - flightState.speedC) * Math.min(Math.abs(targetSpeedC - flightState.speedC), accel * dt);

    const cruiseUnits = C_UNITS_PER_SECOND * Math.max(0.0001, flightState.speedC);
    const warpSpeed = warpUnits(flightState.warp);
    const currentUnits = flightState.engineOn ? Math.max(cruiseUnits, warpSpeed) : 0;
    const units = currentUnits;

    FORWARD.copy(new Vector3(0, 0, -1).applyQuaternion(q));
    flightState.position.addScaledVector(FORWARD, units * dt);

    if (flightState.jumpRequest) {
      const targetId = flightState.jumpRequest;
      flightState.jumpRequest = null;
      const target = BODY_BY_ID.get(targetId) ?? MOON_BY_ID.get(targetId);
      const targetPos = getPosition(targetId);
      if (target && targetPos) {
        const offset = Math.max((target.visualRadius ?? 1) * 5.2, 8);
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

    // Shield / collision response against planets and the Sun.
    const now = performance.now() / 1000;
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
          triggerShieldImpact(tempVec);
          store.addLog(`警告：${body.name} 引力边界，护盾吸收冲击。`);
          lastCollision.current = { id: body.id, at: now };
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
  const { camera } = useThree();
  const currentFov = useRef(72);

  useFrame((_, delta) => {
    const { viewMode } = useFlightStore.getState();
    const q = flightState.quaternion;
    const shake = flightState.cameraShake;
    const shakeOffset = shake > 0 ? Math.sin(performance.now() * 0.04) * shake * 0.08 : 0;

    if (viewMode === 'cockpit') {
      const offset = new Vector3(0, 1.18 + shakeOffset, 1.15).applyQuaternion(q);
      camera.position.copy(flightState.position).add(offset);
      camera.quaternion.copy(q);
      if (currentFov.current !== 72) {
        camera.fov = 72;
        camera.updateProjectionMatrix();
        currentFov.current = 72;
      }
    } else {
      const desired = new Vector3(0, 3.4 + shakeOffset, 12.5).applyQuaternion(q).add(flightState.position);
      camera.position.lerp(desired, 1 - Math.exp(-delta * 5));
      camera.lookAt(flightState.position);
      if (currentFov.current !== 56) {
        camera.fov = 56;
        camera.updateProjectionMatrix();
        currentFov.current = 56;
      }
    }
    camera.near = 0.05;
    camera.far = 5000;
    camera.updateProjectionMatrix();
  }, 1);

  return null;
}
