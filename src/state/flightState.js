import { Matrix4, Quaternion, Vector3 } from 'three';
import { START_DAYS } from '../lib/relativity';
import { getPosition, updateWorld } from './worldState';

updateWorld(START_DAYS);

const earthPosition = getPosition('earth');
const sunward = earthPosition.clone().normalize();
const startPosition = earthPosition
  .clone()
  .addScaledVector(sunward, -13)
  .add(new Vector3(0, 3.6, 0));
const startMatrix = new Matrix4().lookAt(startPosition, earthPosition, new Vector3(0, 1, 0));
const startQuaternion = new Quaternion().setFromRotationMatrix(startMatrix);

export const flightState = {
  position: startPosition,
  quaternion: startQuaternion,
  throttle: 0,
  warp: 0,
  speedC: 0,
  engineOn: true,
  shield: true,
  shieldEnergy: 1,
  shieldFlashUntil: 0,
  externalSeconds: 0,
  shipSeconds: 0,
  cameraShake: 0,
  velocity: new Vector3(),
  cockpitShake: {
    severity: 0,
    startedAt: -100,
    duration: 0,
    seed: 0,
  },
  externalVelocity: new Vector3(),
  externalAngular: new Vector3(),
  steerX: 0,
  steerY: 0,
  touchPitch: 0,
  touchYaw: 0,
  touchRoll: 0,
  lookYaw: 0,
  lookPitch: 0,
  impact: {
    point: new Vector3(0, 1, 0),
    time: -100,
    strength: 0,
    severity: 0,
    normalSpeed: 0,
    relativeSpeed: 0,
    angleFactor: 0,
    mass: 0,
    log: [],
  },
  jump: {
    active: false,
    targetId: null,
    startedAt: 0,
    duration: 2.6,
    fromPosition: new Vector3(),
    fromQuaternion: new Quaternion(),
    toPosition: new Vector3(),
    toQuaternion: new Quaternion(),
  },
  jumpRequest: null,
  scanPulse: -100,
};

export function flashShield(duration = 3.4) {
  flightState.shieldFlashUntil = performance.now() / 1000 + duration;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function applyImpactImpulse(direction, impulse, torque = null) {
  const length = Math.hypot(direction.x, direction.y, direction.z) || 1;
  flightState.externalVelocity.x += (direction.x / length) * impulse;
  flightState.externalVelocity.y += (direction.y / length) * impulse;
  flightState.externalVelocity.z += (direction.z / length) * impulse;
  if (torque) {
    flightState.externalAngular.add(torque);
  } else {
    const local = direction.clone().applyQuaternion(flightState.quaternion.clone().invert());
    flightState.externalAngular.x += -local.y * impulse * 0.05;
    flightState.externalAngular.y += local.x * impulse * 0.05;
    flightState.externalAngular.z += local.x * impulse * 0.02;
  }
  flightState.externalAngular.clampLength(0, 3);
}

export function triggerShieldImpact(point, options = {}) {
  const {
    impulse = 0,
    push = null,
    torque = null,
    severity: requestedSeverity,
    normalSpeed = 0,
    relativeSpeed = 0,
    angleFactor = 1,
    mass = 1,
    pan = 0,
  } = options;
  const source = point.clone ? point.clone() : new Vector3(point.x, point.y, point.z);
  const localDirection = source.clone().applyQuaternion(flightState.quaternion.clone().invert()).normalize();
  const now = performance.now() / 1000;
  const severity = clamp(requestedSeverity ?? 0.3 + impulse * 0.1, 0.12, 1);
  flightState.impact.point.copy(localDirection);
  flightState.impact.time = now;
  flightState.impact.strength = severity;
  flightState.impact.severity = severity;
  flightState.impact.normalSpeed = Math.max(0, normalSpeed);
  flightState.impact.relativeSpeed = Math.max(0, relativeSpeed);
  flightState.impact.angleFactor = clamp(angleFactor, 0, 1);
  flightState.impact.mass = Math.max(0, mass);
  flightState.impact.log = [{ dir: localDirection, time: now, strength: severity }, ...flightState.impact.log].slice(
    0,
    4,
  );
  flightState.shieldFlashUntil = now + 3.4;
  flightState.cameraShake = Math.min(1.2, flightState.cameraShake + 0.3 + severity * 0.75);
  flightState.cockpitShake = {
    severity,
    startedAt: now,
    duration: 0.45 + severity * 1.15,
    seed: Math.random() * 1000,
  };
  if (impulse > 0) applyImpactImpulse(push ?? source, impulse, torque);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('cruise:impact', {
        detail: {
          severity,
          normalSpeed: flightState.impact.normalSpeed,
          relativeSpeed: flightState.impact.relativeSpeed,
          angleFactor: flightState.impact.angleFactor,
          mass,
          pan: pan || localDirection.x * 0.7,
        },
      }),
    );
  }
}

export function beginJump(targetPosition, targetQuaternion) {
  flightState.externalVelocity.set(0, 0, 0);
  flightState.externalAngular.set(0, 0, 0);
  flightState.jump.active = true;
  flightState.jump.startedAt = performance.now() / 1000;
  flightState.jump.fromPosition.copy(flightState.position);
  flightState.jump.fromQuaternion.copy(flightState.quaternion);
  flightState.jump.toPosition.copy(targetPosition);
  flightState.jump.toQuaternion.copy(targetQuaternion);
  flightState.throttle = 0;
  flightState.warp = 0;
  flightState.speedC = 0;
}

export function snapToPosition(position, quaternion) {
  flightState.externalVelocity.set(0, 0, 0);
  flightState.externalAngular.set(0, 0, 0);
  flightState.position.copy(position);
  if (quaternion) flightState.quaternion.copy(quaternion);
  flightState.speedC = 0;
  flightState.throttle = 0;
  flightState.warp = 0;
}
