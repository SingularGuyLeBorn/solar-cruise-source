import { existsSync, readFileSync, statSync } from 'node:fs';

const failures = [];
const notes = [];

function check(name, condition, detail = '') {
  if (condition) notes.push(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
  else failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
}

function readGlbJson(path) {
  const buffer = readFileSync(path);
  const jsonLength = buffer.readUInt32LE(12);
  return JSON.parse(buffer.subarray(20, 20 + jsonLength).toString('utf8'));
}

check('dist exists', existsSync('dist/index.html'));
if (existsSync('dist/index.html')) {
  const html = readFileSync('dist/index.html', 'utf8');
  check('dist excludes 8K planet maps', !existsSync('dist/planets/8k'));
  check('entry does not preload all planets', !/planets\/8k|perseverance\.glb/.test(html));
  check('entry references a single JS bundle', (html.match(/<script type="module"/g) ?? []).length === 1);
}

for (const path of [
  'public/models/helion/cockpit.glb',
  'public/models/helion/ship_vanguard_mk3.glb',
  'public/models/helion/asteroid_0.glb',
  'public/models/nasa/phobos.glb',
  'public/models/comets/67p.glb',
  'public/models/comets/tempel1.glb',
]) {
  check(`asset ${path}`, existsSync(path));
}

for (const path of [
  'public/models/helion/cockpit.glb',
  'public/models/helion/ship_vanguard_mk3.glb',
  'public/models/helion/asteroid_0.glb',
]) {
  if (!existsSync(path)) continue;
  const json = readGlbJson(path);
  check(`meshopt ${path}`, (json.extensionsRequired ?? []).includes('EXT_meshopt_compression'));
  check(`size ${path}`, statSync(path).size < 900 * 1024, `${(statSync(path).size / 1024).toFixed(0)} KiB`);
}

const flightController = readFileSync('src/scene/FlightController.jsx', 'utf8');
const app = readFileSync('src/App.jsx', 'utf8');
const strike = readFileSync('src/scene/AsteroidStrike.jsx', 'utf8');
const solarSystem = readFileSync('src/scene/SolarSystem.jsx', 'utf8');
const hud = readFileSync('src/ui/HUD.jsx', 'utf8');
const holoSelector = readFileSync('src/scene/HoloSelector3D.jsx', 'utf8');
const cesium = readFileSync('src/earth/CesiumEarth.jsx', 'utf8');
check('no pointer-lock takeover', !/requestPointerLock/.test(app + flightController));
check('canvas drag look', /pointerDown[\s\S]{0,240}space-layer/.test(flightController));
check('real strike asteroid', /useGLTF\('\/models\/helion\/asteroid_0\.glb'\)/.test(strike));
check('no procedural strike rock', !/dodecahedronGeometry/.test(strike));
check('real asteroid belt asset', /useGLTF\('\/models\/helion\/asteroid_0\.glb'\)/.test(solarSystem));
check('belt at true AU scale', /beltInnerAu \* UNITS_PER_AU|beltOuterAu/.test(solarSystem));
check('no procedural belt geometry', !/new IcosahedronGeometry/.test(solarSystem));
check('gallery shortcut B', /KeyB/.test(flightController) && /toggleFormGallery/.test(flightController));
check('all-destinations shortcut Y', /KeyY/.test(flightController) && /toggleJump/.test(flightController));
check('destination menu exposes body ids', /data-destination-id/.test(hud));
check('closed star chart unmounts hit targets', /if \(!open\) return null/.test(holoSelector));
check('roll uses fixed local axis', !/FORWARD\.copy/.test(flightController));
check('both Shift keys boost', /ShiftLeft \|\| keys\.current\.ShiftRight/.test(flightController));
check('ALL STOP zeroes warp', /setThrottle\(0\);\s*state\.setWarp\(0\)/.test(hud));
check(
  'night lights use valid GIBS matrix',
  /GoogleMapsCompatible_Level8/.test(cesium) && !/250m|epsg4326\/best\/VIIRS/.test(cesium),
);

const report = [...notes, ...failures.map((failure) => `FAIL ${failure}`)].join('\n');
console.log(report);
if (failures.length) process.exitCode = 1;
