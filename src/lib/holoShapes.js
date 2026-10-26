// Shape recipes adapted from Particle Field (particle-simulator), MIT.
// Upstream: D:\FunnyProjects\particle-simulator — home layouts expanded to 15 forms.

export const HOLO_SHAPES = [
  { id: 'orb', label: '球体', en: 'ORB' },
  { id: 'galaxy', label: '星系', en: 'GALAXY' },
  { id: 'helix', label: '双螺旋', en: 'HELIX' },
  { id: 'knot', label: '环面结', en: 'KNOT' },
  { id: 'saturn', label: '土星', en: 'SATURN' },
];

export const HOLO_COLORS = [
  { id: 'ice', label: '冰蓝', value: '#9fe6ff' },
  { id: 'amber', label: '琥珀', value: '#ffcf9a' },
  { id: 'violet', label: '紫罗兰', value: '#c8b4ff' },
  { id: 'mint', label: '薄荷', value: '#a8ffcf' },
  { id: 'rose', label: '玫瑰', value: '#ffb6c8' },
];

function mulberry32(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(random) {
  return (random() + random() + random() + random() - 2) * 0.5;
}

export function generateHoloPositions(shape = 'orb', count = 700, seed = 931) {
  const random = mulberry32(seed);
  const positions = new Float32Array(count * 3);
  const write = (index, x, y, z) => {
    positions[index * 3] = x;
    positions[index * 3 + 1] = y;
    positions[index * 3 + 2] = z;
  };

  for (let index = 0; index < count; index++) {
    if (shape === 'galaxy') {
      const arm = Math.floor(random() * 3);
      const radius = 0.055 + random() ** 0.7 * 0.17;
      const angle = (arm * Math.PI * 2) / 3 + radius * 22 + (random() - 0.5) * 0.55;
      const spread = radius * 0.08 + 0.006;
      write(
        index,
        Math.cos(angle) * radius + (random() - 0.5) * spread,
        (random() - 0.5) * (0.014 + radius * 0.08),
        Math.sin(angle) * radius + (random() - 0.5) * spread,
      );
      continue;
    }

    if (shape === 'helix') {
      const y = (random() - 0.5) * 0.42;
      const angle = y * 22;
      const strand = random() < 0.5 ? 0 : Math.PI;
      const rung = random() < 0.16;
      const t = random() * Math.PI;
      const a = rung ? angle + t : angle + strand;
      const radius = 0.075;
      write(
        index,
        Math.cos(a) * radius + (random() - 0.5) * 0.006,
        y + (random() - 0.5) * 0.006,
        Math.sin(a) * radius + (random() - 0.5) * 0.006,
      );
      continue;
    }

    if (shape === 'knot') {
      const t = random() * Math.PI * 2;
      const torusR = 0.115 + Math.cos(t * 3) * 0.03;
      write(
        index,
        torusR * Math.cos(t * 2) + (random() - 0.5) * 0.008,
        Math.sin(t * 3) * 0.035 + (random() - 0.5) * 0.008,
        torusR * Math.sin(t * 2) + (random() - 0.5) * 0.008,
      );
      continue;
    }

    if (shape === 'saturn') {
      if (random() < 0.72) {
        let radius = 0.13 + random() ** 0.9 * 0.085;
        if (radius > 0.164) radius += 0.008;
        const angle = random() * Math.PI * 2;
        write(index, Math.cos(angle) * radius, (random() - 0.5) * 0.006, Math.sin(angle) * radius);
      } else {
        const theta = Math.acos(random() * 2 - 1);
        const phi = random() * Math.PI * 2;
        const radius = 0.058 + random() * 0.008;
        write(
          index,
          Math.sin(theta) * Math.cos(phi) * radius,
          Math.cos(theta) * radius,
          Math.sin(theta) * Math.sin(phi) * radius,
        );
      }
      continue;
    }

    if (shape === 'vortex') {
      const t = random();
      const y = (t - 0.5) * 0.4;
      const radius = 0.018 + (1 - t) * 0.16 + random() * 0.006;
      const angle = t * 34 + (random() - 0.5) * 0.5;
      write(index, Math.cos(angle) * radius, y, Math.sin(angle) * radius);
      continue;
    }

    if (shape === 'disk') {
      const radius = 0.055 + random() ** 0.62 * 0.14;
      const angle = random() * Math.PI * 2;
      const lift = (random() - 0.5) * 0.007;
      const jet = random() < 0.035;
      write(index, Math.cos(angle) * radius, jet ? (random() - 0.5) * 0.28 : lift, Math.sin(angle) * radius);
      continue;
    }

    if (shape === 'mobius') {
      const u = random() * Math.PI * 2;
      const v = (random() - 0.5) * 0.075;
      const radius = 0.13;
      const width = radius + v * Math.cos(u / 2);
      write(
        index,
        width * Math.cos(u) + (random() - 0.5) * 0.004,
        v * Math.sin(u / 2) + (random() - 0.5) * 0.004,
        width * Math.sin(u) + (random() - 0.5) * 0.004,
      );
      continue;
    }

    if (shape === 'atom') {
      if (random() < 0.2) {
        const theta = Math.acos(random() * 2 - 1);
        const phi = random() * Math.PI * 2;
        const radius = 0.038 * random() ** 0.45;
        write(
          index,
          Math.sin(theta) * Math.cos(phi) * radius,
          Math.cos(theta) * radius,
          Math.sin(theta) * Math.sin(phi) * radius,
        );
      } else {
        const orbit = Math.floor(random() * 3);
        const angle = random() * Math.PI * 2;
        const radius = 0.13 + (random() - 0.5) * 0.004;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        const z = (random() - 0.5) * 0.006;
        if (orbit === 0) write(index, x, y, z);
        else if (orbit === 1) write(index, x, z, y);
        else write(index, z, x, y);
      }
      continue;
    }

    if (shape === 'ocean') {
      const radius = Math.sqrt(random()) * 0.19;
      const angle = random() * Math.PI * 2;
      const wave = Math.sin(radius * 56 + angle * 4) * 0.015 * (1 - radius / 0.22);
      write(index, Math.cos(angle) * radius, wave + (random() - 0.5) * 0.003, Math.sin(angle) * radius);
      continue;
    }

    if (shape === 'supernova') {
      const theta = Math.acos(random() * 2 - 1);
      const phi = random() * Math.PI * 2;
      const ray = random() < 0.18;
      const radius = ray ? 0.06 + random() ** 0.3 * 0.14 : 0.14 + random() ** 0.4 * 0.075 + Math.sin(phi * 7) * 0.008;
      write(
        index,
        Math.sin(theta) * Math.cos(phi) * radius,
        Math.cos(theta) * radius,
        Math.sin(theta) * Math.sin(phi) * radius,
      );
      continue;
    }

    if (shape === 'firefly') {
      const theta = Math.acos(random() * 2 - 1);
      const phi = random() * Math.PI * 2;
      let radius = random() ** 0.32 * 0.21;
      if (random() < 0.2) radius *= 0.45;
      write(
        index,
        Math.sin(theta) * Math.cos(phi) * radius,
        Math.cos(theta) * radius * 0.7,
        Math.sin(theta) * Math.sin(phi) * radius,
      );
      continue;
    }

    if (shape === 'portal') {
      const z = (random() - 0.5) * 0.4;
      const ring = 0.03 + ((z + 0.2) / 0.4) * 0.155;
      const angle = random() * Math.PI * 2 + z * 12;
      const radius = ring + (random() - 0.5) * 0.006;
      write(index, Math.cos(angle) * radius, Math.sin(angle) * radius, z);
      continue;
    }

    if (shape === 'cube') {
      const face = Math.floor(random() * 6);
      const u = (random() * 2 - 1) * 0.13;
      const v = (random() * 2 - 1) * 0.13;
      const edge = (random() - 0.5) * 0.004;
      if (face === 0) write(index, u, v, 0.13 + edge);
      else if (face === 1) write(index, u, v, -0.13 - edge);
      else if (face === 2) write(index, 0.13 + edge, u, v);
      else if (face === 3) write(index, -0.13 - edge, u, v);
      else if (face === 4) write(index, u, 0.13 + edge, v);
      else write(index, u, -0.13 - edge, v);
      continue;
    }

    if (shape === 'comet') {
      if (random() < 0.34) {
        const theta = Math.acos(random() * 2 - 1);
        const phi = random() * Math.PI * 2;
        const radius = random() ** 0.45 * 0.062;
        write(
          index,
          0.11 + Math.sin(theta) * Math.cos(phi) * radius,
          Math.cos(theta) * radius,
          Math.sin(theta) * Math.sin(phi) * radius,
        );
      } else {
        const t = random() ** 0.85;
        const spread = 0.038 * (1 - t * 0.78);
        write(index, 0.1 - t * 0.38 + (random() - 0.5) * 0.018, gaussian(random) * spread, gaussian(random) * spread);
      }
      continue;
    }

    if (shape === 'cluster') {
      const centers = [
        [-0.115, 0.05, 0.02],
        [0.11, 0.015, -0.03],
        [0.015, -0.11, 0.055],
      ];
      const center = centers[Math.floor(random() * centers.length)];
      const radius = random() ** 0.55 * 0.062;
      const theta = Math.acos(random() * 2 - 1);
      const phi = random() * Math.PI * 2;
      write(
        index,
        center[0] + Math.sin(theta) * Math.cos(phi) * radius,
        center[1] + Math.cos(theta) * radius,
        center[2] + Math.sin(theta) * Math.sin(phi) * radius,
      );
      continue;
    }

    if (shape === 'nebula') {
      const centers = [
        [-0.1, 0.03, 0],
        [0.09, 0.07, -0.04],
        [0.01, -0.07, 0.06],
        [0.12, -0.04, 0.02],
      ];
      const center = centers[Math.floor(random() * centers.length)];
      const spread = 0.035 + random() ** 1.6 * 0.12;
      write(
        index,
        center[0] + gaussian(random) * spread,
        center[1] + gaussian(random) * spread * 0.72,
        center[2] + gaussian(random) * spread,
      );
      continue;
    }

    if (shape === 'calm') {
      const theta = Math.acos(random() * 2 - 1);
      const phi = random() * Math.PI * 2;
      const radius = 0.15 + gaussian(random) * 0.012;
      write(
        index,
        Math.sin(theta) * Math.cos(phi) * radius,
        Math.cos(theta) * radius * 0.82,
        Math.sin(theta) * Math.sin(phi) * radius,
      );
      continue;
    }

    const theta = Math.acos(random() * 2 - 1);
    const phi = random() * Math.PI * 2;
    const radius = random() ** 0.6 * 0.18;
    write(
      index,
      Math.sin(theta) * Math.cos(phi) * radius,
      Math.cos(theta) * radius,
      Math.sin(theta) * Math.sin(phi) * radius,
    );
  }

  return positions;
}
