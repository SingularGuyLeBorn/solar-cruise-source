// SPDX-FileCopyrightText: 2026 AskAlice
// SPDX-License-Identifier: Apache-2.0
//
// Adapted from threejs-vehicles 0.1.0 (Apache-2.0), fighterJet() in
// https://github.com/AskAlice/threejs-worldgen/tree/main/packages/vehicles/src/models.ts
// TypeScript types removed, the paint palette is applied directly to the mesh, and
// nav-light / exhaust metadata is exposed for the host game's glow panels.

import { MeshBuilder, paint } from './mesh.js';

const GLASS = paint('#1f2c36', 0, 0.05, 1);
const DARK = paint('#141518');
const RIM = paint('#a9aeb4');

const PALETTES = [
  { name: 'ARCTIC', hull: '#c9d0d3', accent: '#b1461f', glow: '#7fe7ff' },
  { name: 'GUNMETAL', hull: '#59636b', accent: '#d4a24a', glow: '#ffbd72' },
  { name: 'NIGHT', hull: '#2b3a46', accent: '#7fe7ff', glow: '#6fd8ff' },
  { name: 'OLIVE', hull: '#6b7355', accent: '#d9cf9a', glow: '#b8ffcf' },
  { name: 'VIOLET', hull: '#5b4c6d', accent: '#e0a0c0', glow: '#e6b8ff' },
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

function jitter(random, amount) {
  return 1 + (random() * 2 - 1) * amount;
}

function wings(mesh, origin, root, span, chord, sweep, taper, dihedral, thickness, style) {
  for (const side of [1, -1]) {
    const u = [side * Math.cos(dihedral), Math.sin(dihedral), 0];
    mesh.fin(
      [
        [root, chord / 2],
        [span, chord / 2 - sweep],
        [span, chord / 2 - sweep - chord * taper],
        [root, -chord / 2],
      ],
      origin,
      u,
      [0, 0, 1],
      thickness,
      style,
    );
  }
}

export function buildFighter(seed, options = {}) {
  const random = mulberry32(seed);
  const style = options.style ?? (random() < 0.5 ? 'delta' : 'twin-tail');
  const L = (options.length ?? 8.4) * jitter(random, 0.05);
  const R = L * 0.055;
  const palette = PALETTES[Math.floor(random() * PALETTES.length) % PALETTES.length];
  const hull = paint(palette.hull);
  const mesh = new MeshBuilder();

  mesh.loft(
    [
      { z: -L / 2, w: R * 1.1, top: R * 0.6, bottom: -R * 0.6, round: 0.5 },
      { z: -L * 0.15, w: R * 1.4, top: R * 0.9, bottom: -R * 0.7, round: 0.5 },
      { z: L * 0.18, w: R, top: R * 0.85, bottom: -R * 0.6, round: 0.6 },
      { z: L * 0.38, w: R * 0.5, top: R * 0.4, bottom: -R * 0.35, round: 0.8 },
      { z: L / 2, w: 0.03, top: 0, bottom: -0.05, round: 1 },
    ],
    hull,
    12,
  );
  mesh.ellipsoid([0, R * 0.7, L * 0.2], [R * 0.55, R * 0.7, L * 0.12], GLASS, 10, 4, true);

  let navLights;
  if (style === 'delta') {
    wings(mesh, [0, -R * 0.1, -L * 0.12], R * 0.8, L * 0.3, L * 0.55, L * 0.42, 0.12, -0.02, 0.18, hull);
    mesh.fin(
      [
        [R * 0.8, -L * 0.1],
        [R * 0.8 + L * 0.2, -L * 0.42],
        [R * 0.8 + L * 0.2, -L * 0.48],
        [R * 0.8, -L * 0.48],
      ],
      [0, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
      0.15,
      hull,
    );
    navLights = [
      { position: [-(R * 0.8 + L * 0.3), -R * 0.09, -L * 0.265], color: '#ff4030' },
      { position: [R * 0.8 + L * 0.3, -R * 0.09, -L * 0.265], color: '#40ff8a' },
    ];
  } else {
    wings(mesh, [0, -R * 0.1, -L * 0.05], R * 0.9, L * 0.3, L * 0.32, L * 0.2, 0.3, -0.03, 0.16, hull);
    wings(mesh, [0, -R * 0.1, -L * 0.43], R * 0.9, L * 0.2, L * 0.13, L * 0.06, 0.4, -0.05, 0.12, hull);
    for (const side of [-1, 1]) {
      mesh.fin(
        [
          [R * 0.5, -L * 0.18],
          [R * 0.5 + L * 0.17, -L * 0.36],
          [R * 0.5 + L * 0.17, -L * 0.44],
          [R * 0.5, -L * 0.42],
        ],
        [side * R * 0.7, 0, 0],
        [side * Math.sin(0.3), Math.cos(0.3), 0],
        [0, 0, 1],
        0.12,
        hull,
      );
    }
    navLights = [
      { position: [-(R * 0.9 + L * 0.3), -R * 0.09, -L * 0.09], color: '#ff4030' },
      { position: [R * 0.9 + L * 0.3, -R * 0.09, -L * 0.09], color: '#40ff8a' },
    ];
  }

  for (const side of [-1, 1]) {
    mesh.box([side * R * 1.25, -R * 0.2, L * 0.08], [R * 0.6, R * 0.9, L * 0.12], DARK, [1, 0.8], -0.2);
  }

  const exhausts = [];
  for (const side of style === 'twin-tail' ? [-1, 1] : [0]) {
    mesh.cylinder('z', [side * R * 0.55, 0, -L / 2 - 0.3], R * 0.5, 0.8, DARK, 10, R * 0.55);
    exhausts.push({
      position: [side * R * 0.55, 0, -L / 2 - 0.7],
      direction: [0, 0, -1],
      radius: R * 0.42,
      color: palette.glow,
    });
  }

  return {
    mesh: mesh.build(),
    style,
    palette,
    length: L,
    span: style === 'delta' ? R * 0.8 + L * 0.3 : R * 0.9 + L * 0.3,
    exhausts,
    navLights,
  };
}
