import { Vector3 } from 'three';
import { PLANETS, SUN, COMETS } from '../data/solarSystem';
import { MOONS } from '../data/moons';
import { orbitalPosition } from '../lib/orbits';
import { START_DAYS } from '../lib/relativity';

export const worldState = {
  days: START_DAYS,
  positions: new Map(),
  localPositions: new Map(),
  lastNearestId: null,
};

worldState.positions.set(SUN.id, new Vector3(0, 0, 0));

export function updateWorld(days) {
  worldState.days = days;
  for (const planet of PLANETS) {
    const pos = orbitalPosition(planet, days, new Vector3());
    worldState.positions.set(planet.id, pos);
  }
  for (const comet of COMETS) {
    const pos = orbitalPosition(comet, days, new Vector3());
    worldState.positions.set(comet.id, pos);
  }
  for (const moon of MOONS) {
    const parent = worldState.positions.get(moon.parent) ?? new Vector3();
    const local = orbitalPosition(moon, days, new Vector3());
    worldState.localPositions.set(moon.id, local);
    worldState.positions.set(moon.id, parent.clone().add(local));
  }
}

export function getPosition(id) {
  return worldState.positions.get(id) ?? new Vector3();
}

export function nearestPlanet(position) {
  let best = null;
  let bestDistance = Infinity;
  for (const body of [SUN, ...PLANETS, ...COMETS, ...MOONS.filter((moon) => moon.major)]) {
    const pos = worldState.positions.get(body.id);
    if (!pos) continue;
    const distance = pos.distanceTo(position) - body.visualRadius;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = body;
    }
  }
  return best ? { body: best, distance: bestDistance } : null;
}
