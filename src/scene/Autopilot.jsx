import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { BODY_BY_ID } from '../data/solarSystem';
import { MOON_BY_ID } from '../data/moons';
import { getPosition } from '../state/worldState';
import { flightState } from '../state/flightState';
import { useFlightStore } from '../state/useFlightStore';

const MASS = 1400;
const BALL_RADIUS = 1.6;
const SPEED_SCALE = 60;
const MAX_SPEED = 24;
const MAX_CLOSURE = 15;
const MAX_ACCEL = 26;
const POS_KP = 0.85;
const POS_KD = 1.35;
const ATT_KP = 8.5;
const ATT_KD = 4.4;
const BASE_RANGE = 450;
const DEG = 180 / Math.PI;

const WORLD_UP = new Vector3(0, 1, 0);
const FALLBACK_UP = new Vector3(0, 0, 1);

function clampLength(vector, max) {
  const length = vector.length();
  if (length > max && length > 1e-8) vector.multiplyScalar(max / length);
  return vector;
}

function shortestQuaternionError(current, desired, scratch) {
  scratch.errorQuat.copy(desired).multiply(scratch.inverseQuat.copy(current).invert());
  if (scratch.errorQuat.w < 0) {
    scratch.errorQuat.x *= -1;
    scratch.errorQuat.y *= -1;
    scratch.errorQuat.z *= -1;
    scratch.errorQuat.w *= -1;
  }
  const w = Math.max(-1, Math.min(1, scratch.errorQuat.w));
  const angle = 2 * Math.acos(w);
  const sinHalf = Math.sqrt(Math.max(0, 1 - w * w));
  if (sinHalf < 1e-5 || angle < 1e-4) {
    scratch.errorAxis.set(0, 0, 0);
    return 0;
  }
  scratch.errorAxis.set(scratch.errorQuat.x / sinHalf, scratch.errorQuat.y / sinHalf, scratch.errorQuat.z / sinHalf);
  return angle;
}

export function Autopilot() {
  const enabled = useFlightStore((state) => state.autopilot.enabled);
  const rapier = useRef(null);
  const initStarted = useRef(false);
  const engine = useRef({
    sessionKey: '',
    origin: new Vector3(),
    holdPosition: new Vector3(),
    holdQuaternion: new Quaternion(),
    approachOffset: new Vector3(),
    targetVelocity: new Vector3(),
    previousTarget: new Vector3(),
    targetSeen: false,
    arrived: false,
    lastUi: 0,
  });
  const scratch = useMemo(
    () => ({
      shipPosition: new Vector3(),
      targetPosition: new Vector3(),
      desiredPosition: new Vector3(),
      targetVelocity: new Vector3(),
      relativeVelocity: new Vector3(),
      error: new Vector3(),
      velocity: new Vector3(),
      desiredVelocity: new Vector3(),
      force: new Vector3(),
      torque: new Vector3(),
      errorAxis: new Vector3(),
      angularVelocity: new Vector3(),
      currentQuaternion: new Quaternion(),
      desiredQuaternion: new Quaternion(),
      errorQuat: new Quaternion(),
      inverseQuat: new Quaternion(),
      lookMatrix: new Matrix4(),
    }),
    [],
  );

  useEffect(() => {
    if (!enabled || rapier.current || initStarted.current) return undefined;
    initStarted.current = true;
    let cancelled = false;

    (async () => {
      try {
        const RAPIER = (await import('@dimforge/rapier3d-compat')).default;
        await RAPIER.init();
        if (cancelled) return;
        const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
        world.timestep = 1 / 60;
        const body = world.createRigidBody(
          RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(0, 0, 0)
            .setLinearDamping(0.06)
            .setAngularDamping(0.9)
            .setCcdEnabled(true),
        );
        world.createCollider(RAPIER.ColliderDesc.ball(BALL_RADIUS).setMass(MASS), body);
        rapier.current = { world, body };
      } catch (error) {
        console.error('Rapier autopilot failed to initialize', error);
        useFlightStore.getState().setAutopilotStatus({ phase: 'error' });
        useFlightStore.getState().disengageAutopilot('error');
      }
    })();

    return () => {
      cancelled = true;
      if (!rapier.current) initStarted.current = false;
    };
  }, [enabled]);

  useFrame((_, delta) => {
    const state = useFlightStore.getState();
    const autopilot = state.autopilot;
    if (!autopilot.enabled) {
      engine.current.sessionKey = '';
      return;
    }
    if (flightState.jump.active || flightState.jumpRequest) {
      state.disengageAutopilot('jump');
      return;
    }
    if (!rapier.current) {
      if (autopilot.phase !== 'initializing' && autopilot.phase !== 'error') {
        state.setAutopilotStatus({ phase: 'initializing' });
      }
      return;
    }

    const targetBody = BODY_BY_ID.get(state.targetId) ?? MOON_BY_ID.get(state.targetId);
    const targetWorld = targetBody ? getPosition(targetBody.id) : null;
    const sessionKey = `${autopilot.session}|${autopilot.mode}|${state.targetId}`;

    if (engine.current.sessionKey !== sessionKey) {
      engine.current.sessionKey = sessionKey;
      const body = rapier.current.body;
      engine.current.origin.copy(flightState.position);
      engine.current.holdPosition.copy(flightState.position);
      engine.current.holdQuaternion.copy(flightState.quaternion);
      body.setTranslation({ x: 0, y: 0, z: 0 }, true);
      body.setRotation(flightState.quaternion, true);
      const initialSpeed = Math.max(0, Math.min(MAX_SPEED * 1.35, flightState.speedC * SPEED_SCALE));
      scratch.error.set(0, 0, -1).applyQuaternion(flightState.quaternion).multiplyScalar(initialSpeed);
      body.setLinvel({ x: scratch.error.x, y: scratch.error.y, z: scratch.error.z }, true);
      body.setAngvel({ x: 0, y: 0, z: 0 }, true);
      engine.current.arrived = false;
      engine.current.approachOffset.set(0, 0, 0);
      engine.current.targetVelocity.set(0, 0, 0);
      engine.current.targetSeen = false;

      if (autopilot.mode === 'approach' && targetWorld) {
        scratch.error.copy(flightState.position).sub(targetWorld);
        if (scratch.error.lengthSq() < 1e-6) scratch.error.set(0, 0, 1);
        scratch.error.normalize();
        const standoff = Math.max((targetBody.visualRadius ?? 1) * 2.8, 2.6);
        engine.current.approachOffset.copy(scratch.error).multiplyScalar(standoff);
        const rangeLimit = Math.max(BASE_RANGE, (targetBody.visualRadius ?? 1) * 8);
        state.setAutopilotStatus({
          phase: flightState.position.distanceTo(targetWorld) > rangeLimit ? 'too-far' : 'slewing',
        });
      } else if (autopilot.mode === 'point' && targetWorld) {
        state.setAutopilotStatus({ phase: 'slewing' });
      } else {
        state.setAutopilotStatus({ phase: 'holding' });
      }

      flightState.warp = 0;
      flightState.throttle = 0;
      flightState.speedC = 0;
      if (!flightState.engineOn) {
        flightState.engineOn = true;
        useFlightStore.setState({ engineOn: true });
      }
    }

    const dt = Math.min(Math.max(delta, 0), 0.05);
    if (dt <= 0) return;

    if (targetWorld) {
      if (engine.current.targetSeen) {
        scratch.targetVelocity.copy(targetWorld).sub(engine.current.previousTarget).divideScalar(dt);
        clampLength(scratch.targetVelocity, 48);
        engine.current.targetVelocity.lerp(scratch.targetVelocity, 0.35);
      }
      engine.current.previousTarget.copy(targetWorld);
      engine.current.targetSeen = true;
    } else {
      engine.current.targetVelocity.set(0, 0, 0);
      engine.current.targetSeen = false;
    }

    const { world, body } = rapier.current;
    const bodyPosition = body.translation();
    scratch.shipPosition.set(
      engine.current.origin.x + bodyPosition.x,
      engine.current.origin.y + bodyPosition.y,
      engine.current.origin.z + bodyPosition.z,
    );

    let targetDistance = Infinity;
    let phase = autopilot.phase;
    const rangeLimit = Math.max(BASE_RANGE, (targetBody?.visualRadius ?? 1) * 8);
    const tooFar =
      autopilot.mode === 'approach' && targetWorld ? scratch.shipPosition.distanceTo(targetWorld) > rangeLimit : false;

    if (autopilot.mode === 'approach' && targetWorld) {
      scratch.targetPosition.copy(targetWorld);
      scratch.desiredPosition.copy(targetWorld).add(engine.current.approachOffset);
      targetDistance = scratch.shipPosition.distanceTo(targetWorld);
      const standoff = Math.max((targetBody.visualRadius ?? 1) * 2.8, 2.6);
      if (targetDistance < standoff + 0.35) {
        scratch.error.copy(scratch.shipPosition).sub(targetWorld);
        if (scratch.error.lengthSq() > 1e-6) {
          scratch.error.normalize();
          engine.current.approachOffset.copy(scratch.error).multiplyScalar(standoff);
          scratch.desiredPosition.copy(targetWorld).add(engine.current.approachOffset);
        }
      }
      if (tooFar) phase = 'too-far';
    } else if (autopilot.mode === 'point' && targetWorld) {
      scratch.desiredPosition.copy(engine.current.holdPosition);
      targetDistance = scratch.shipPosition.distanceTo(targetWorld);
    } else {
      scratch.desiredPosition.copy(engine.current.holdPosition);
      if (targetWorld) targetDistance = scratch.shipPosition.distanceTo(targetWorld);
    }

    if (autopilot.mode !== 'hold' && targetWorld) {
      const direction = scratch.error.copy(targetWorld).sub(scratch.shipPosition);
      if (direction.lengthSq() < 1e-8) direction.set(0, 0, 1);
      direction.normalize();
      const up = Math.abs(direction.dot(WORLD_UP)) > 0.985 ? FALLBACK_UP : WORLD_UP;
      scratch.lookMatrix.lookAt(scratch.shipPosition, scratch.targetPosition.copy(targetWorld), up);
      scratch.desiredQuaternion.setFromRotationMatrix(scratch.lookMatrix);
    } else {
      scratch.desiredQuaternion.copy(engine.current.holdQuaternion);
    }

    const bodyRotation = body.rotation();
    scratch.currentQuaternion.set(bodyRotation.x, bodyRotation.y, bodyRotation.z, bodyRotation.w);
    const attitudeError = shortestQuaternionError(scratch.currentQuaternion, scratch.desiredQuaternion, scratch);

    const angular = body.angvel();
    scratch.angularVelocity.set(angular.x, angular.y, angular.z);
    scratch.torque
      .copy(scratch.errorAxis)
      .multiplyScalar(attitudeError * ATT_KP * MASS)
      .addScaledVector(scratch.angularVelocity, -ATT_KD * MASS);
    clampLength(scratch.torque, MASS * 120);
    body.applyTorqueImpulse({ x: scratch.torque.x * dt, y: scratch.torque.y * dt, z: scratch.torque.z * dt }, true);

    scratch.error.copy(scratch.desiredPosition).sub(scratch.shipPosition);
    const positionError = scratch.error.length();
    if (autopilot.mode === 'point' || tooFar) {
      scratch.desiredVelocity.set(0, 0, 0);
    } else {
      scratch.desiredVelocity.copy(scratch.error).multiplyScalar(POS_KP);
      clampLength(scratch.desiredVelocity, MAX_CLOSURE);
      if (autopilot.mode === 'approach') scratch.desiredVelocity.add(engine.current.targetVelocity);
      const speedLimit = Math.max(MAX_SPEED, engine.current.targetVelocity.length() + MAX_CLOSURE);
      clampLength(scratch.desiredVelocity, speedLimit);
    }

    const linear = body.linvel();
    scratch.velocity.set(linear.x, linear.y, linear.z);
    const relativeSpeed = scratch.relativeVelocity.copy(scratch.velocity).sub(engine.current.targetVelocity).length();
    if (positionError < 0.03 && scratch.velocity.length() < 0.05) {
      scratch.velocity.set(0, 0, 0);
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }
    scratch.force
      .copy(scratch.desiredVelocity)
      .sub(scratch.velocity)
      .multiplyScalar(MASS * POS_KD);
    clampLength(scratch.force, MASS * MAX_ACCEL);
    body.applyImpulse({ x: scratch.force.x * dt, y: scratch.force.y * dt, z: scratch.force.z * dt }, true);

    world.timestep = dt;
    world.step();

    const nextPosition = body.translation();
    const nextRotation = body.rotation();
    flightState.position.set(
      engine.current.origin.x + nextPosition.x,
      engine.current.origin.y + nextPosition.y,
      engine.current.origin.z + nextPosition.z,
    );
    flightState.quaternion.set(nextRotation.x, nextRotation.y, nextRotation.z, nextRotation.w);

    if (targetWorld && targetBody) {
      const minDistance = Math.max(targetBody.visualRadius * 1.04 + 0.25, 0.4);
      scratch.error.copy(flightState.position).sub(targetWorld);
      const distance = scratch.error.length();
      if (distance < minDistance && distance > 1e-5) {
        scratch.error.multiplyScalar(minDistance / distance);
        flightState.position.copy(targetWorld).add(scratch.error);
        body.setTranslation(
          {
            x: flightState.position.x - engine.current.origin.x,
            y: flightState.position.y - engine.current.origin.y,
            z: flightState.position.z - engine.current.origin.z,
          },
          true,
        );
        body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      }
    }

    const nextVelocity = body.linvel();
    const speed = Math.hypot(nextVelocity.x, nextVelocity.y, nextVelocity.z);
    flightState.speedC = Math.min(0.9, speed / SPEED_SCALE);
    flightState.warp = 0;
    flightState.throttle = Math.min(1, scratch.force.length() / (MASS * MAX_ACCEL));
    flightState.steerX = Math.max(-1, Math.min(1, scratch.errorAxis.z * attitudeError));
    flightState.steerY = Math.max(-1, Math.min(1, scratch.errorAxis.x * attitudeError));

    if (autopilot.mode === 'approach' && !tooFar && engine.current.arrived) {
      phase = 'holding';
    } else if (autopilot.mode === 'approach' && !tooFar) {
      if (positionError < 0.7 && relativeSpeed < 0.9) {
        engine.current.arrived = true;
        phase = 'holding';
        engine.current.lastUi = 0;
        state.addLog(`自动驾驶已抵达 ${targetBody?.name ?? '目标'} 保持点。`);
      } else {
        phase = relativeSpeed > 1.2 ? 'cruising' : 'braking';
      }
    } else if (!tooFar && phase !== 'holding' && autopilot.mode !== 'approach') {
      phase = attitudeError > 0.04 ? 'slewing' : 'holding';
    }

    const now = performance.now();
    if (now - engine.current.lastUi > 120) {
      engine.current.lastUi = now;
      state.setAutopilotStatus({
        phase,
        distance: Number.isFinite(targetDistance) ? targetDistance : 0,
        speed,
        relativeSpeed: autopilot.mode === 'approach' ? relativeSpeed : speed,
        positionError,
        attitudeError: attitudeError * DEG,
        throttle: flightState.throttle,
      });
      useFlightStore.setState({ speedC: flightState.speedC, throttle: flightState.throttle });
    }
  }, 0);

  return null;
}
