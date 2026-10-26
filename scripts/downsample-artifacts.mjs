import { readdir, readFile, writeFile } from 'node:fs/promises';

const DIR = 'public/artifacts';
const FULL_POINTS = 32768;
const PREVIEW_POINTS = 8192;

function sample(packed, targetPoints) {
  const sourceCount = Math.floor(packed.length / 3);
  const out = new Uint16Array(targetPoints * 3);
  for (let index = 0; index < targetPoints; index += 1) {
    const source = Math.min(sourceCount - 1, Math.floor((index / targetPoints) * sourceCount));
    out[index * 3] = packed[source * 3];
    out[index * 3 + 1] = packed[source * 3 + 1];
    out[index * 3 + 2] = packed[source * 3 + 2];
  }
  return out;
}

for (const name of await readdir(DIR)) {
  if (!name.endsWith('.bin') || name.includes('.preview.')) continue;
  const path = `${DIR}/${name}`;
  const buffer = await readFile(path);
  const packed = new Uint16Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 2);
  const sourceCount = Math.floor(packed.length / 3);
  if (!sourceCount) continue;
  const full = sample(packed, Math.min(FULL_POINTS, sourceCount));
  const preview = sample(packed, Math.min(PREVIEW_POINTS, sourceCount));
  await writeFile(path, Buffer.from(full.buffer));
  await writeFile(path.replace(/\.bin$/, '.preview.bin'), Buffer.from(preview.buffer));
  console.log(`${name}: ${sourceCount} -> ${full.length / 3} points (+${preview.length / 3} preview)`);
}
