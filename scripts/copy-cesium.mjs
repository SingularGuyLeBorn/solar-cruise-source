import fs from 'node:fs';
import path from 'node:path';

const source = path.resolve('node_modules/cesium/Build/Cesium');
const target = path.resolve('public/cesium');

if (!fs.existsSync(source)) {
  console.log('Cesium package not installed yet; skip static asset copy.');
  process.exit(0);
}

const marker = path.join(target, 'Workers');
if (fs.existsSync(marker)) {
  console.log('Cesium static assets already present.');
  process.exit(0);
}

fs.mkdirSync(target, { recursive: true });
for (const dir of ['Assets', 'ThirdParty', 'Widgets', 'Workers']) {
  const from = path.join(source, dir);
  const to = path.join(target, dir);
  if (!fs.existsSync(from)) continue;
  fs.cpSync(from, to, { recursive: true });
  console.log(`Copied ${dir} -> public/cesium/${dir}`);
}
