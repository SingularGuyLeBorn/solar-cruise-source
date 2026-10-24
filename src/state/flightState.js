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
  steerX: 0,
  steerY: 0,
  impact: {
    point: new Vector3(0, 1, 0),
    time: -100,
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

export function triggerShieldImpact(point) {
  flightState.impact.point.copy(point).normalize();
  flightState.impact.time = performance.now() / 1000;
  flightState.shieldFlashUntil = performance.now() / 1000 + 3.4;
  flightState.cameraShake = Math.min(1, flightState.cameraShake + 0.55);
}

export function beginJump(targetPosition, targetQuaternion) {
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
  flightState.position.copy(position);
  if (quaternion) flightState.quaternion.copy(quaternion);
  flightState.speedC = 0;
  flightState.throttle = 0;
  flightState.warp = 0;
}
