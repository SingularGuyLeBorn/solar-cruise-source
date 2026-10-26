import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, FrontSide, ShaderMaterial, Vector3 } from 'three';

const PHI = (1 + Math.sqrt(5)) / 2;

const BASE_VERTICES = [
  [-1, PHI, 0],
  [1, PHI, 0],
  [-1, -PHI, 0],
  [1, -PHI, 0],
  [0, -1, PHI],
  [0, 1, PHI],
  [0, -1, -PHI],
  [0, 1, -PHI],
  [PHI, 0, -1],
  [PHI, 0, 1],
  [-PHI, 0, -1],
  [-PHI, 0, 1],
].map(([x, y, z]) => new Vector3(x, y, z).normalize());

const BASE_FACES = [
  [0, 11, 5],
  [0, 5, 1],
  [0, 1, 7],
  [0, 7, 10],
  [0, 10, 11],
  [1, 5, 9],
  [5, 11, 4],
  [11, 10, 2],
  [10, 7, 6],
  [7, 1, 8],
  [3, 9, 4],
  [3, 4, 2],
  [3, 2, 6],
  [3, 6, 8],
  [3, 8, 9],
  [4, 9, 5],
  [2, 4, 11],
  [6, 2, 10],
  [8, 6, 7],
  [9, 8, 1],
];

function geodesicGrid(frequency) {
  const vertices = [];
  const lookup = new Map();
  const triangles = [];

  const addVertex = (point) => {
    const normalized = point.clone().normalize();
    const key = `${normalized.x.toFixed(6)}|${normalized.y.toFixed(6)}|${normalized.z.toFixed(6)}`;
    let index = lookup.get(key);
    if (index === undefined) {
      index = vertices.length;
      vertices.push(normalized);
      lookup.set(key, index);
    }
    return index;
  };

  for (const [a, b, c] of BASE_FACES) {
    const pointA = BASE_VERTICES[a];
    const pointB = BASE_VERTICES[b];
    const pointC = BASE_VERTICES[c];
    const grid = [];
    for (let i = 0; i <= frequency; i += 1) {
      grid[i] = [];
      for (let j = 0; j <= frequency - i; j += 1) {
        const u = i / frequency;
        const v = j / frequency;
        const point = pointA
          .clone()
          .multiplyScalar(1 - u - v)
          .addScaledVector(pointB, u)
          .addScaledVector(pointC, v);
        grid[i][j] = addVertex(point);
      }
    }
    for (let i = 0; i < frequency; i += 1) {
      for (let j = 0; j < frequency - i; j += 1) {
        triangles.push([grid[i][j], grid[i + 1][j], grid[i][j + 1]]);
        if (i + j < frequency - 1) {
          triangles.push([grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]]);
        }
      }
    }
  }

  return { vertices, triangles };
}

// The dual of a geodesic icosahedron is a Goldberg polyhedron: contiguous
// hexagons plus exactly twelve pentagons. Every cell boundary is built from
// the same shared triangle centroids, so neighbouring edges meet exactly.
export function createHexShieldGeometry(frequency = 14) {
  const { vertices, triangles } = geodesicGrid(frequency);
  const centroids = triangles.map(([a, b, c]) =>
    new Vector3().add(vertices[a]).add(vertices[b]).add(vertices[c]).normalize(),
  );
  const incident = vertices.map(() => []);
  triangles.forEach((triangle, index) => {
    triangle.forEach((vertexIndex) => incident[vertexIndex].push(index));
  });

  const surfacePositions = [];
  const surfaceCenters = [];
  const surfaceRandoms = [];
  const edgePositions = [];
  const edgeCenters = [];
  const seenEdges = new Set();
  const center = new Vector3();
  const axisA = new Vector3();
  const axisB = new Vector3();
  const reference = new Vector3();
  const rimScale = 1.004;

  for (let vertexIndex = 0; vertexIndex < vertices.length; vertexIndex += 1) {
    center.copy(vertices[vertexIndex]);
    reference.set(Math.abs(center.y) < 0.9 ? 0 : 1, Math.abs(center.y) < 0.9 ? 1 : 0, 0);
    axisA.crossVectors(reference, center).normalize();
    axisB.crossVectors(center, axisA);
    const ordered = incident[vertexIndex].slice().sort((left, right) => {
      const a = centroids[left];
      const b = centroids[right];
      const angleA = Math.atan2(a.dot(axisB), a.dot(axisA));
      const angleB = Math.atan2(b.dot(axisB), b.dot(axisA));
      return angleA - angleB;
    });
    const seed = Math.abs(Math.sin(center.x * 12.9898 + center.y * 78.233 + center.z * 37.719) * 43758.5453);
    const random = 0.55 + (seed - Math.floor(seed)) * 0.45;
    const hub = center.clone().multiplyScalar(1);
    const boundary = ordered.map((triangleIndex) => centroids[triangleIndex].clone().multiplyScalar(rimScale));

    for (let side = 0; side < boundary.length; side += 1) {
      const from = boundary[side];
      const to = boundary[(side + 1) % boundary.length];
      surfacePositions.push(hub.x, hub.y, hub.z, from.x, from.y, from.z, to.x, to.y, to.z);
      surfaceCenters.push(center.x, center.y, center.z, center.x, center.y, center.z, center.x, center.y, center.z);
      surfaceRandoms.push(random, random, random);

      const triangleA = ordered[side];
      const triangleB = ordered[(side + 1) % ordered.length];
      const edgeKey = triangleA < triangleB ? `${triangleA}:${triangleB}` : `${triangleB}:${triangleA}`;
      if (seenEdges.has(edgeKey)) continue;
      seenEdges.add(edgeKey);
      edgePositions.push(from.x, from.y, from.z, to.x, to.y, to.z);
      const midpoint = new Vector3().addVectors(from, to).normalize();
      edgeCenters.push(midpoint.x, midpoint.y, midpoint.z, midpoint.x, midpoint.y, midpoint.z);
    }
  }

  const surface = new BufferGeometry();
  surface.setAttribute('position', new BufferAttribute(new Float32Array(surfacePositions), 3));
  surface.setAttribute('aCellCenter', new BufferAttribute(new Float32Array(surfaceCenters), 3));
  surface.setAttribute('aRand', new BufferAttribute(new Float32Array(surfaceRandoms), 1));
  surface.computeBoundingSphere();

  const edges = new BufferGeometry();
  edges.setAttribute('position', new BufferAttribute(new Float32Array(edgePositions), 3));
  edges.setAttribute('aEdgeCenter', new BufferAttribute(new Float32Array(edgeCenters), 3));
  edges.computeBoundingSphere();

  return { surface, edges, cellCount: vertices.length };
}

const deformationGLSL = /* glsl */ `
  uniform float uTime;
  uniform vec3 uImpactPos[4];
  uniform float uImpactTime[4];
  uniform float uImpactStrength[4];

  vec3 deformShield(vec3 position, out float stress) {
    vec3 base = normalize(position);
    float dent = 0.0;
    stress = 0.0;
    for (int i = 0; i < 4; i++) {
      float strength = uImpactStrength[i];
      if (strength <= 0.001) continue;
      float age = max(0.0, uTime - uImpactTime[i]);
      float angle = acos(clamp(dot(base, uImpactPos[i]), -1.0, 1.0));
      float radius = 0.26 + 0.4 * strength;
      float core = smoothstep(radius, 0.0, angle);
      core *= core;
      float ripple = sin(angle * 32.0 - age * 17.0);
      ripple *= exp(-angle * 4.4 - age * 1.55);
      ripple = max(ripple, 0.0);
      dent += (core * 1.15 + ripple * 0.42) * strength * exp(-age * 1.05);
      stress += core * strength * exp(-age * 0.5);
    }
    float rest = sin(uTime * 1.15 + base.y * 6.0 + base.x * 9.0) * 0.0016;
    return base * (1.0 - dent * 0.11 + rest);
  }
`;

const surfaceVertexShader = /* glsl */ `
  attribute vec3 aCellCenter;
  attribute float aRand;
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  varying vec3 vCellCenterW;
  varying float vRand;
  ${deformationGLSL}
  void main() {
    float stress;
    vec3 displaced = deformShield(position, stress);
    vec4 world = modelMatrix * vec4(displaced, 1.0);
    vNormalW = normalize(mat3(modelMatrix) * normalize(position));
    vCellCenterW = normalize(mat3(modelMatrix) * aCellCenter);
    vViewDir = normalize(cameraPosition - world.xyz);
    vRand = aRand;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const surfaceFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uActive;
  uniform vec3 uColor;
  uniform vec3 uImpactPos[4];
  uniform float uImpactTime[4];
  uniform float uImpactStrength[4];
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  varying vec3 vCellCenterW;
  varying float vRand;

  void main() {
    vec3 cell = normalize(vCellCenterW);
    float heat = 0.0;
    vec3 hot = vec3(0.0);
    for (int i = 0; i < 4; i++) {
      float strength = uImpactStrength[i];
      if (strength <= 0.001) continue;
      float age = max(0.0, uTime - uImpactTime[i]);
      float angle = acos(clamp(dot(cell, uImpactPos[i]), -1.0, 1.0));
      float field = smoothstep(0.24 + 0.42 * strength, 0.0, angle);
      field *= exp(-age * 0.5);
      vec3 severity = mix(vec3(1.0, 0.7, 0.26), vec3(1.0, 0.13, 0.035), strength);
      hot += severity * field * strength;
      heat += field * strength;
    }
    heat = clamp(heat, 0.0, 1.4);
    if (heat > 0.0001) hot /= heat;
    vec3 baseColor = uColor * (0.65 + 0.35 * vRand);
    vec3 color = mix(baseColor, hot, clamp(heat * 1.5, 0.0, 1.0));
    color += vec3(1.0, 0.78, 0.4) * pow(heat, 2.0) * 0.9;
    float fresnel = pow(1.0 - abs(dot(normalize(vNormalW), normalize(vViewDir))), 2.0);
    float alpha = (0.0015 + vRand * 0.0015 + fresnel * 0.014 + heat * 0.9) * uActive;
    gl_FragColor = vec4(color, alpha);
  }
`;

const edgeVertexShader = /* glsl */ `
  attribute vec3 aEdgeCenter;
  varying vec3 vEdgeCenterW;
  ${deformationGLSL}
  void main() {
    float stress;
    vec3 displaced = deformShield(position, stress);
    vec4 world = modelMatrix * vec4(displaced, 1.0);
    vEdgeCenterW = normalize(mat3(modelMatrix) * aEdgeCenter);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const edgeFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uActive;
  uniform vec3 uColor;
  uniform vec3 uImpactPos[4];
  uniform float uImpactTime[4];
  uniform float uImpactStrength[4];
  varying vec3 vEdgeCenterW;

  void main() {
    vec3 cell = normalize(vEdgeCenterW);
    float heat = 0.0;
    vec3 hot = vec3(0.0);
    for (int i = 0; i < 4; i++) {
      float strength = uImpactStrength[i];
      if (strength <= 0.001) continue;
      float age = max(0.0, uTime - uImpactTime[i]);
      float angle = acos(clamp(dot(cell, uImpactPos[i]), -1.0, 1.0));
      float field = smoothstep(0.24 + 0.42 * strength, 0.0, angle);
      field *= exp(-age * 0.45);
      vec3 severity = mix(vec3(1.0, 0.7, 0.26), vec3(1.0, 0.13, 0.035), strength);
      hot += severity * field * strength;
      heat += field * strength;
    }
    heat = clamp(heat, 0.0, 1.4);
    if (heat > 0.0001) hot /= heat;
    vec3 color = mix(uColor, hot, clamp(heat * 1.35, 0.0, 1.0));
    color += vec3(1.0, 0.7, 0.32) * pow(heat, 2.0) * 1.0;
    float pulse = 0.86 + 0.14 * sin(uTime * 1.8);
    float alpha = (0.055 + heat * 1.4) * pulse * uActive;
    gl_FragColor = vec4(color, alpha);
  }
`;

export function createHexShieldLayers(frequency = 14) {
  const { surface, edges, cellCount } = createHexShieldGeometry(frequency);
  const uniforms = {
    uTime: { value: 0 },
    uActive: { value: 1 },
    uColor: { value: new Color('#5fe0ff') },
    uImpactPos: { value: [new Vector3(), new Vector3(), new Vector3(), new Vector3()] },
    uImpactTime: { value: [-1000, -1000, -1000, -1000] },
    uImpactStrength: { value: [0, 0, 0, 0] },
  };
  const surfaceMaterial = new ShaderMaterial({
    uniforms,
    vertexShader: surfaceVertexShader,
    fragmentShader: surfaceFragmentShader,
    transparent: true,
    depthWrite: false,
    side: FrontSide,
    blending: AdditiveBlending,
    toneMapped: false,
  });
  const edgeMaterial = new ShaderMaterial({
    uniforms,
    vertexShader: edgeVertexShader,
    fragmentShader: edgeFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
  });
  return { surface, edges, surfaceMaterial, edgeMaterial, uniforms, cellCount };
}
