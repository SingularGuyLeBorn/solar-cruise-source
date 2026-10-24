import { Vector3 } from 'three';

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;

export function solveKepler(meanAnomaly, eccentricity) {
  let E = meanAnomaly;
  for (let i = 0; i < 6; i++) {
    const delta = (E - eccentricity * Math.sin(E) - meanAnomaly) / (1 - eccentricity * Math.cos(E));
    E -= delta;
    if (Math.abs(delta) < 1e-7) break;
  }
  return E;
}

export function orbitalPosition(body, days, target = new Vector3()) {
  const a = body.orbitRadius;
  const e = body.eccentricity ?? 0;
  const period = body.periodDays ?? 365.256;
  const direction = body.retrograde ? -1 : 1;
  const phase = body.phase ?? ((body.meanLongitude ?? 0) - (body.perihelion ?? 0)) * DEG;
  const M = phase + (TAU * days * direction) / period;
  const E = solveKepler(M, e);
  const trueAnomaly = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
  const radius = a * (1 - e * Math.cos(E));
  const x = radius * Math.cos(trueAnomaly);
  const z = radius * Math.sin(trueAnomaly);

  const inclination = (body.inclination ?? 0) * DEG;
  const node = (body.node ?? 0) * DEG;

  const y1 = z * Math.sin(inclination);
  const z1 = z * Math.cos(inclination);
  const x2 = x * Math.cos(node) + z1 * Math.sin(node);
  const z2 = -x * Math.sin(node) + z1 * Math.cos(node);

  return target.set(x2, y1, z2);
}

export function orbitPoints(body, segments = 256) {
  const points = [];
  const period = body.periodDays ?? 365.256;
  const startPhase = body.phase ?? ((body.meanLongitude ?? 0) - (body.perihelion ?? 0)) * DEG;
  for (let i = 0; i <= segments; i++) {
    const days = (i / segments) * period - (startPhase / TAU) * period;
    points.push(orbitalPosition(body, days, new Vector3()));
  }
  return points;
}

export function latLonToVector3(lat, lon, radius = 1, target = new Vector3()) {
  const phi = (90 - lat) * DEG;
  const theta = (lon + 180) * DEG;
  const sinPhi = Math.sin(phi);
  return target.set(-radius * sinPhi * Math.cos(theta), radius * Math.cos(phi), radius * sinPhi * Math.sin(theta));
}

export function surfaceQuaternion(normal, target) {
  const up = new Vector3(0, 1, 0);
  return target.setFromUnitVectors(up, normal.clone().normalize());
}

export function formatAu(value) {
  if (!Number.isFinite(value)) return '—';
  return `${value.toFixed(value < 10 ? 2 : 1)} AU`;
}

export function lightMinutes(au) {
  return au * 8.3167;
}
