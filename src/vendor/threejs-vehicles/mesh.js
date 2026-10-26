// SPDX-FileCopyrightText: 2026 AskAlice
// SPDX-License-Identifier: Apache-2.0
//
// Adapted from threejs-vehicles 0.1.0 (Apache-2.0):
// https://github.com/AskAlice/threejs-worldgen/tree/main/packages/vehicles/src/mesh.ts
// Trimmed to the primitives used by the fighter generator; TypeScript types removed.

export function rgb(hex) {
  const value = parseInt(hex.replace('#', ''), 16);
  const linear = (channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return [linear(((value >> 16) & 255) / 255), linear(((value >> 8) & 255) / 255), linear((value & 255) / 255)];
}

export function paint(hex, paintAmount = 0, glow = 0, finish = 0) {
  return { color: rgb(hex), paint: paintAmount, glow, finish };
}

function axisPoint(axis, a, b, c, origin) {
  if (axis === 'x') return [origin[0] + c, origin[1] + a, origin[2] + b];
  if (axis === 'y') return [origin[0] + b, origin[1] + c, origin[2] + a];
  return [origin[0] + a, origin[1] + b, origin[2] + c];
}

function dist2(a, b) {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
}

function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function normalize(a) {
  const length = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / length, a[1] / length, a[2] / length];
}

export class MeshBuilder {
  constructor() {
    this.pos = [];
    this.nor = [];
    this.col = [];
    this.sty = [];
    this.idx = [];
  }

  face(points, style, inside) {
    let pts = points.filter((point, index) => index === 0 || dist2(point, points[index - 1]) > 1e-12);
    if (pts.length > 2 && dist2(pts[0], pts[pts.length - 1]) <= 1e-12) pts.pop();
    if (pts.length < 3) return this;

    let nx = 0;
    let ny = 0;
    let nz = 0;
    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      nx += (a[1] - b[1]) * (a[2] + b[2]);
      ny += (a[2] - b[2]) * (a[0] + b[0]);
      nz += (a[0] - b[0]) * (a[1] + b[1]);
      cx += a[0];
      cy += a[1];
      cz += a[2];
    }
    const length = Math.hypot(nx, ny, nz);
    if (length < 1e-10) return this;
    nx /= length;
    ny /= length;
    nz /= length;
    if (inside) {
      const count = pts.length;
      if (nx * (cx / count - inside[0]) + ny * (cy / count - inside[1]) + nz * (cz / count - inside[2]) < 0) {
        pts = pts.reverse();
        nx = -nx;
        ny = -ny;
        nz = -nz;
      }
    }
    const base = this.pos.length / 3;
    for (const point of pts) {
      this.pos.push(point[0], point[1], point[2]);
      this.nor.push(nx, ny, nz);
      this.col.push(style.color[0], style.color[1], style.color[2]);
      this.sty.push(style.paint, style.glow, style.finish ?? 0);
    }
    for (let i = 1; i < pts.length - 1; i++) this.idx.push(base, base + i, base + i + 1);
    return this;
  }

  box(center, size, style, taper = [1, 1], shift = 0) {
    const hx = size[0] / 2;
    const hy = size[1] / 2;
    const hz = size[2] / 2;
    const tx = hx * taper[0];
    const tz = hz * taper[1];
    const y0 = center[1] - hy;
    const y1 = center[1] + hy;
    const bottom = [
      [center[0] - hx, y0, center[2] - hz],
      [center[0] + hx, y0, center[2] - hz],
      [center[0] + hx, y0, center[2] + hz],
      [center[0] - hx, y0, center[2] + hz],
    ];
    const top = [
      [center[0] - tx, y1, center[2] - tz + shift],
      [center[0] + tx, y1, center[2] - tz + shift],
      [center[0] + tx, y1, center[2] + tz + shift],
      [center[0] - tx, y1, center[2] + tz + shift],
    ];
    const inside = [center[0], center[1], center[2] + shift / 2];
    this.face([top[0], top[3], top[2], top[1]], style, inside);
    this.face([bottom[0], bottom[1], bottom[2], bottom[3]], style, inside);
    this.face([bottom[3], bottom[2], top[2], top[3]], style, inside);
    this.face([bottom[1], bottom[0], top[0], top[1]], style, inside);
    this.face([bottom[2], bottom[1], top[1], top[2]], style, inside);
    this.face([bottom[0], bottom[3], top[3], top[0]], style, inside);
    return this;
  }

  cylinder(axis, center, radius, length, style, segments = 10, radius2 = radius, caps = style) {
    const ring0 = [];
    const ring1 = [];
    for (let k = 0; k < segments; k++) {
      const angle = (k / segments) * Math.PI * 2;
      ring0.push(axisPoint(axis, Math.cos(angle) * radius, Math.sin(angle) * radius, -length / 2, center));
      ring1.push(axisPoint(axis, Math.cos(angle) * radius2, Math.sin(angle) * radius2, length / 2, center));
    }
    for (let k = 0; k < segments; k++) {
      const next = (k + 1) % segments;
      this.face([ring0[k], ring0[next], ring1[next], ring1[k]], style, center);
    }
    if (caps) {
      if (radius > 1e-6) this.face([...ring0].reverse(), caps, center);
      if (radius2 > 1e-6) this.face(ring1, caps, center);
    }
    return this;
  }

  ellipsoid(center, radii, style, segU = 10, segV = 6, top = false) {
    const start = top ? 0 : -Math.PI / 2;
    const point = (u, v) => [
      center[0] + radii[0] * Math.cos(v) * Math.cos(u),
      center[1] + radii[1] * Math.sin(v),
      center[2] + radii[2] * Math.cos(v) * Math.sin(u),
    ];
    for (let j = 0; j < segV; j++) {
      const va = start + ((Math.PI / 2 - start) * j) / segV;
      const vb = start + ((Math.PI / 2 - start) * (j + 1)) / segV;
      for (let i = 0; i < segU; i++) {
        const ua = (i / segU) * Math.PI * 2;
        const ub = ((i + 1) / segU) * Math.PI * 2;
        this.face([point(ua, va), point(ub, va), point(ub, vb), point(ua, vb)], style, center);
      }
    }
    if (top) {
      const ring = [];
      for (let i = 0; i < segU; i++) ring.push(point((i / segU) * Math.PI * 2, 0));
      this.face(ring, style, [center[0], center[1] + radii[1], center[2]]);
    }
    return this;
  }

  loft(sections, style, segments = 12) {
    const rings = sections.map((section) => {
      const ring = [];
      const exponent = 0.2 + 0.8 * section.round;
      const mid = (section.top + section.bottom) / 2;
      const halfHeight = (section.top - section.bottom) / 2;
      for (let k = 0; k < segments; k++) {
        const angle = (k / segments) * Math.PI * 2;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        let x = section.w * Math.sign(cos) * Math.abs(cos) ** exponent;
        const y = mid + halfHeight * Math.sign(sin) * Math.abs(sin) ** exponent;
        if (sin < 0 && section.keel) x *= 1 - section.keel * -sin;
        ring.push([x, y, section.z]);
      }
      return ring;
    });
    for (let i = 0; i < rings.length - 1; i++) {
      const a = sections[i];
      const b = sections[i + 1];
      const inside = [0, (a.top + a.bottom + b.top + b.bottom) / 4, (a.z + b.z) / 2];
      for (let k = 0; k < segments; k++) {
        const next = (k + 1) % segments;
        this.face([rings[i][k], rings[i][next], rings[i + 1][next], rings[i + 1][k]], style, inside);
      }
    }
    for (const [index, direction] of [
      [0, 1],
      [rings.length - 1, -1],
    ]) {
      const section = sections[index];
      if (section.w < 1e-4 || section.top - section.bottom < 1e-4) continue;
      const inside = [0, (section.top + section.bottom) / 2, section.z + direction];
      this.face(rings[index], style, inside);
    }
    return this;
  }

  fin(outline, origin, u, v, thickness, style) {
    const normal = normalize(cross(u, v));
    const at = (point, side) => [
      origin[0] + u[0] * point[0] + v[0] * point[1] + (normal[0] * side * thickness) / 2,
      origin[1] + u[1] * point[0] + v[1] * point[1] + (normal[1] * side * thickness) / 2,
      origin[2] + u[2] * point[0] + v[2] * point[1] + (normal[2] * side * thickness) / 2,
    ];
    const cu = outline.reduce((sum, point) => sum + point[0], 0) / outline.length;
    const cv = outline.reduce((sum, point) => sum + point[1], 0) / outline.length;
    const center = at([cu, cv], 0);
    this.face(
      outline.map((point) => at(point, 1)),
      style,
      center,
    );
    this.face(
      outline.map((point) => at(point, -1)),
      style,
      center,
    );
    for (let i = 0; i < outline.length; i++) {
      const a = outline[i];
      const b = outline[(i + 1) % outline.length];
      this.face([at(a, -1), at(b, -1), at(b, 1), at(a, 1)], style, center);
    }
    return this;
  }

  beam(a, b, width, style) {
    const direction = normalize([b[0] - a[0], b[1] - a[1], b[2] - a[2]]);
    const reference = Math.abs(direction[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const u = normalize(cross(direction, reference));
    const v = cross(direction, u);
    const half = width / 2;
    const corner = (point, su, sv) => [
      point[0] + (u[0] * su + v[0] * sv) * half,
      point[1] + (u[1] * su + v[1] * sv) * half,
      point[2] + (u[2] * su + v[2] * sv) * half,
    ];
    const signs = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ];
    const ca = signs.map(([x, y]) => corner(a, x, y));
    const cb = signs.map(([x, y]) => corner(b, x, y));
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    for (let i = 0; i < 4; i++) this.face([ca[i], ca[(i + 1) % 4], cb[(i + 1) % 4], cb[i]], style, mid);
    this.face(ca, style, mid);
    this.face(cb, style, mid);
    return this;
  }

  build() {
    const position = new Float32Array(this.pos);
    const bounds = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
    for (let i = 0; i < position.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        bounds[k] = Math.min(bounds[k], position[i + k]);
        bounds[k + 3] = Math.max(bounds[k + 3], position[i + k]);
      }
    }
    if (!position.length) bounds.fill(0);
    return {
      position,
      normal: new Float32Array(this.nor),
      color: new Float32Array(this.col),
      style: new Float32Array(this.sty),
      index: new Uint32Array(this.idx),
      bounds,
    };
  }
}
