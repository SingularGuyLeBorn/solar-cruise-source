import { NodeIO } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRONOS_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, meshopt, prune, quantize, textureCompress, weld } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';

await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions([...KHRONOS_EXTENSIONS, EXTMeshoptCompression])
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });

// NASA landmark GLBs are Draco-compressed and only load when the player flies
// close, so they stay untouched until actually visited.
const jobs = [
  { file: 'public/models/helion/cockpit.glb', stripTextures: true, weld: true, quantize: true },
  { file: 'public/models/helion/ship_vanguard_mk3.glb', weld: true, quantize: true },
  { file: 'public/models/helion/asteroid_0.glb', textureSize: 256, weld: true, quantize: true },
  { file: 'public/models/nasa/phobos.glb', textureSize: 512, weld: true, quantize: true },
  { file: 'public/models/lunar/survey-rover.glb', weld: true, quantize: true },
  { file: 'public/models/comets/67p.glb', weld: true, quantize: true },
  { file: 'public/models/comets/tempel1.glb', weld: true, quantize: true },
];

for (const job of jobs) {
  const document = await io.read(job.file);
  if (job.stripTextures) {
    for (const texture of document.getRoot().listTextures()) texture.dispose();
    for (const material of document.getRoot().listMaterials()) {
      material.setBaseColorTexture(null);
      material.setNormalTexture(null);
      material.setMetallicRoughnessTexture(null);
      material.setEmissiveTexture(null);
      material.setOcclusionTexture(null);
    }
  }
  if (job.textureSize) {
    await document.transform(
      textureCompress({
        encoder: sharp,
        targetFormat: 'jpeg',
        resize: [job.textureSize, job.textureSize],
        quality: 72,
      }),
    );
  }
  if (job.weld) await document.transform(weld());
  if (job.quantize) await document.transform(quantize());
  await document.transform(dedup(), prune());
  await document.transform(meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  await io.write(job.file, document);
  console.log('optimized', job.file);
}
