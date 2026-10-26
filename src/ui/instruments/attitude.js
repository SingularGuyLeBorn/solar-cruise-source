import { Quaternion, Vector3 } from 'three';

export const COCKPIT_FOV = 72;
export const DEG = 180 / Math.PI;

const WORLD_UP = new Vector3(0, 1, 0);
const WORLD_RIGHT = new Vector3(1, 0, 0);

export function createAttitudeScratch() {
  return {
    yaw: new Quaternion(),
    pitch: new Quaternion(),
    camera: new Quaternion(),
    forward: new Vector3(),
    up: new Vector3(),
    right: new Vector3(),
    shipForward: new Vector3(),
    eye: new Vector3(0, 0.38, 0.55),
    cameraPosition: new Vector3(),
    toPoint: new Vector3(),
    pitchDeg: 0,
    rollDeg: 0,
    headingDeg: 0,
    tanHalfFov: Math.tan((COCKPIT_FOV * Math.PI) / 360),
  };
}

export function sampleAttitude(scratch, shipQuaternion, shipPosition, lookYaw, lookPitch) {
  scratch.yaw.setFromAxisAngle(WORLD_UP, -lookYaw);
  scratch.pitch.setFromAxisAngle(WORLD_RIGHT, lookPitch);
  scratch.camera.copy(shipQuaternion).multiply(scratch.yaw).multiply(scratch.pitch);

  scratch.forward.set(0, 0, -1).applyQuaternion(scratch.camera);
  scratch.up.set(0, 1, 0).applyQuaternion(scratch.camera);
  scratch.right.set(1, 0, 0).applyQuaternion(scratch.camera);
  scratch.shipForward.set(0, 0, -1).applyQuaternion(shipQuaternion);
  scratch.cameraPosition.copy(shipPosition).add(scratch.eye.set(0, 0.38, 0.55).applyQuaternion(shipQuaternion));

  scratch.pitchDeg = Math.asin(Math.max(-1, Math.min(1, scratch.forward.y))) * DEG;
  scratch.rollDeg = Math.atan2(scratch.right.y, scratch.up.y) * DEG;
  scratch.headingDeg = (Math.atan2(scratch.forward.x, -scratch.forward.z) * DEG + 360) % 360;
}

export function projectDirection(scratch, direction, aspect) {
  const z = direction.dot(scratch.forward);
  if (z <= 0.12) return null;
  const tanHalfX = scratch.tanHalfFov * aspect;
  const x = direction.dot(scratch.right) / z / tanHalfX;
  const y = direction.dot(scratch.up) / z / scratch.tanHalfFov;
  if (Math.abs(x) > 1.2 || Math.abs(y) > 1.2) return null;
  return { x: 50 + x * 50, y: 50 - y * 50 };
}

export function projectWorldPoint(scratch, worldPoint, aspect) {
  scratch.toPoint.copy(worldPoint).sub(scratch.cameraPosition);
  const distance = scratch.toPoint.length();
  if (distance < 1e-6) return null;
  scratch.toPoint.divideScalar(distance);
  const projected = projectDirection(scratch, scratch.toPoint, aspect);
  return projected ? { ...projected, distance } : null;
}

export function cardinal(heading) {
  const names = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return names[Math.round(heading / 45) % 8];
}
