const artifactCache = new Map();

function sampleArtifact(packed, count) {
  const sourceCount = Math.floor(packed.length / 3);
  if (!sourceCount) return new Float32Array(count * 3);
  const positions = new Float32Array(count * 3);
  const decoded = new Float32Array(count * 3);
  const decode = 3.6 / 65535;
  for (let index = 0; index < count; index += 1) {
    const source = Math.min(sourceCount - 1, Math.floor((index / count) * sourceCount));
    decoded[index * 3] = packed[source * 3] * decode - 1.8;
    decoded[index * 3 + 1] = packed[source * 3 + 1] * decode - 1.8;
    decoded[index * 3 + 2] = packed[source * 3 + 2] * decode - 1.8;
  }
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  for (let index = 0; index < count; index += 1) {
    const x = decoded[index * 3];
    const y = decoded[index * 3 + 1];
    const z = decoded[index * 3 + 2];
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (z < minZ) minZ = z;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (z > maxZ) maxZ = z;
  }
  const centerX = (minX + maxX) * 0.5;
  const centerY = (minY + maxY) * 0.5;
  const centerZ = (minZ + maxZ) * 0.5;
  const extent = Math.max(maxX - minX, maxY - minY, maxZ - minZ, 0.0001);
  for (let index = 0; index < count; index += 1) {
    positions[index * 3] = (decoded[index * 3] - centerX) / extent;
    positions[index * 3 + 1] = (decoded[index * 3 + 1] - centerY) / extent;
    positions[index * 3 + 2] = (decoded[index * 3 + 2] - centerZ) / extent;
  }
  return positions;
}

export async function loadArtifactPositions(artifact, count) {
  const key = `${artifact.id}:${count}`;
  if (artifactCache.has(key)) return artifactCache.get(key);
  const promise = fetch(`/${artifact.asset}`, { cache: 'force-cache' })
    .then((response) => {
      if (!response.ok) throw new Error(`artifact ${artifact.id}: ${response.status}`);
      return response.arrayBuffer();
    })
    .then((buffer) => sampleArtifact(new Uint16Array(buffer), count));
  artifactCache.set(key, promise);
  promise.catch(() => artifactCache.delete(key));
  return promise;
}
