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
const scene = readFileSync('src/scene/SpaceScene.jsx', 'utf8');
const strike = readFileSync('src/scene/AsteroidStrike.jsx', 'utf8');
const solarSystem = readFileSync('src/scene/SolarSystem.jsx', 'utf8');
const hud = readFileSync('src/ui/HUD.jsx', 'utf8');
const store = readFileSync('src/state/useFlightStore.js', 'utf8');
const css = readFileSync('src/styles/quiet-orbit.css', 'utf8');
const holoSelector = readFileSync('src/scene/HoloSelector3D.jsx', 'utf8');
const holoAutoCycle = readFileSync('src/ui/HoloAutoCycle.jsx', 'utf8');
const cesium = readFileSync('src/earth/CesiumEarth.jsx', 'utf8');
const worldState = readFileSync('src/state/worldState.js', 'utf8');
const autopilot = readFileSync('src/scene/Autopilot.jsx', 'utf8');
const mobileControls = readFileSync('src/ui/MobileControls.jsx', 'utf8');
const holoProjector = readFileSync('src/scene/HoloProjector.jsx', 'utf8');
const collectionHolo = readFileSync('src/scene/CollectionHoloCloud.jsx', 'utf8');
const solarHolo = readFileSync('src/scene/SolarHoloRing.jsx', 'utf8');
const solarData = readFileSync('src/data/solarSystem.js', 'utf8');
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
check(
  'Shift boosts both directions without Ctrl',
  (flightController.match(/const boost = keys\.current\.ShiftLeft \|\| keys\.current\.ShiftRight;/g) ?? []).length >=
    2 && !/Control(Left|Right)/.test(flightController),
);
check('numpad warp supported', /Numpad/.test(flightController));
check('focused fields keep native keys', /editing && event\.code !== 'Escape'/.test(flightController));
check(
  'Space jumps from focused HUD buttons',
  !/event\.target\.closest\('button, input, textarea, select, a'\)/.test(flightController),
);
check(
  'ArrowUp raises the nose',
  /\(keys\.current\.ArrowUp \? 1 : 0\) -\s*\(keys\.current\.ArrowDown \? 1 : 0\)/.test(flightController),
);
check('comets are proximity candidates', /\.\.\.COMETS, \.\.\.MOONS/.test(worldState));
check('comet nucleus can appear', /comet\.visualRadius \?\? 0\.5/.test(solarSystem));
check('Saturn ring UVs are radial', /uv\.setXY\(index, \(distance - inner\)/.test(solarSystem));
check(
  'progressive textures recompile materials',
  (solarSystem.match(/key=\{texture \? 'textured' : 'flat'\}/g) ?? []).length >= 3 &&
    /key=\{`\$\{map \? 'map' : 'flat'\}/.test(solarSystem),
);
check('scene uses ACES tone mapping', /ToneMapping mode=\{ToneMappingMode\.ACES_FILMIC\}/.test(scene));
check('target follows selector preview', /SELECTOR_IDS\.has\(targetId\)/.test(store));
check(
  'manual selector choice stops auto tour',
  /autoPaused/.test(store) &&
    /selector\.autoPaused/.test(holoAutoCycle) &&
    /cycleSelector\(1, true\)/.test(holoAutoCycle),
);
check('jump charge overlay present', /jump-charge/.test(hud) && /jump-charge/.test(css));
check('cockpit scan feedback present', /scan-toast/.test(hud) && /scan-toast/.test(css));
check('mobile gallery entry present', /openFormGallery/.test(mobileControls) && /馆藏/.test(mobileControls));
check('comet tail uses soft sprite map', /pointsMaterial[\s\S]{0,220}map=\{glow\}/.test(solarSystem));
check('Saturn tint present', /tint: '#d9ccb4'/.test(solarData));
check(
  'Sun uses seamless procedural surface',
  /function Sun\(\)[\s\S]{0,220}createSunMaterial\(\)/.test(solarSystem) &&
    !/publicPath\(SUN\.texture\)/.test(solarSystem),
);
check(
  'projectors carry generative signal layers',
  /signal/.test(holoProjector) &&
    /HoloSignalField/.test(collectionHolo) &&
    /FeedbackEcho/.test(collectionHolo) &&
    /HoloSignalField/.test(solarHolo) &&
    /SignalNetwork/.test(solarHolo),
);
check('Cesium cannot freeze an active jump', /earthMode && flightState\.jump\.active/.test(store));
check('autopilot settles on holding', /mode === 'approach' && !tooFar && engine\.current\.arrived/.test(autopilot));
check(
  'help and chart exclude each other',
  /toggleHelp\(\)[\s\S]{0,260}selector: helpOpen[\s\S]{0,160}open: false/.test(store) &&
    /toggleSelector\(\)[\s\S]{0,200}helpOpen: false/.test(store),
);
check('ALL STOP zeroes warp', /setThrottle\(0\);\s*state\.setWarp\(0\)/.test(hud));
check('scan pulse feedback present', /scanSerial/.test(store) && /scan-burst/.test(hud) && /scan-burst/.test(css));
check('minimap decorations do not steal taps', /solar-map-ship[\s\S]{0,80}pointer-events: none/.test(css));
check('jump menu pins its header', /\.jump-menu > \.jump-groups/.test(css));
check('jumps do not collide mid-flight', /!autopilotActive && !flightState\.jump\.active/.test(flightController));
check('Cesium wheel is not stolen by hidden chart', /if \(store\.earthMode\) return;/.test(flightController));
check('app shell cannot scroll away', /\.app \{[\s\S]{0,80}overflow: clip/.test(css));
check(
  'night lights use valid GIBS matrix',
  /GoogleMapsCompatible_Level8/.test(cesium) && !/250m|epsg4326\/best\/VIIRS/.test(cesium),
);

const report = [...notes, ...failures.map((failure) => `FAIL ${failure}`)].join('\n');
console.log(report);
if (failures.length) process.exitCode = 1;
