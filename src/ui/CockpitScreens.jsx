import { useEffect, useMemo } from 'react';
import { PLANETS, BODY_BY_ID } from '../data/solarSystem';
import { MOON_BY_ID } from '../data/moons';
import { flightState } from '../state/flightState';
import { useFlightStore } from '../state/useFlightStore';
import { getPosition, worldState } from '../state/worldState';
import { formatClock, formatDateFromDays, formatTimeFromDays, relativisticSummary } from '../lib/relativity';
import { screenTexture } from '../lib/textures';

const CYAN = '#7fe7ff';
const AMBER = '#ffbd72';
const DIM = '#2e6070';
const BG = '#031018';

function box(ctx, x, y, w, h, stroke = DIM, fill = null) {
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function bar(ctx, x, y, w, h, value, color = CYAN) {
  box(ctx, x, y, w, h, DIM, 'rgba(8, 30, 40, 0.7)');
  ctx.fillStyle = color;
  ctx.fillRect(x + 2, y + 2, Math.max(0, Math.min(1, value)) * (w - 4), h - 4);
}

function label(ctx, text, x, y, color = CYAN, size = 14, align = 'left') {
  ctx.fillStyle = color;
  ctx.font = `${size}px "IBM Plex Mono", "Inter", monospace`;
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
}

function targetInfo(targetId) {
  return BODY_BY_ID.get(targetId) ?? MOON_BY_ID.get(targetId) ?? null;
}

function unitsToAu(distance) {
  return distance / 110;
}

function drawFrame(ctx, title, subtitle) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, 512, 320);
  const gradient = ctx.createLinearGradient(0, 0, 512, 320);
  gradient.addColorStop(0, 'rgba(9, 38, 52, 0.8)');
  gradient.addColorStop(1, 'rgba(2, 10, 18, 0.9)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 320);
  for (let y = 0; y < 320; y += 4) {
    ctx.fillStyle = 'rgba(80, 200, 240, 0.025)';
    ctx.fillRect(0, y, 512, 1);
  }
  box(ctx, 8, 8, 496, 304, 'rgba(70, 190, 220, 0.45)');
  label(ctx, title, 24, 36, CYAN, 20);
  label(ctx, subtitle, 24, 58, DIM, 12);
  const time = new Date().toISOString().slice(11, 19);
  label(ctx, `UTC ${time}`, 488, 36, DIM, 12, 'right');
}

function drawNav(ctx) {
  const state = useFlightStore.getState();
  drawFrame(ctx, 'NAV / 导航', 'DESTINATION SELECTION');
  const shipPos = flightState.position;
  const targets = PLANETS.map((planet) => {
    const pos = getPosition(planet.id);
    return { body: planet, distance: pos ? pos.distanceTo(shipPos) : Infinity };
  })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 5);

  label(ctx, 'CURRENT TARGET', 24, 92, DIM, 12);
  const target = targetInfo(state.targetId);
  label(ctx, target ? `${target.en ?? target.name} / ${target.name}` : '—', 24, 120, AMBER, 20);
  const targetPos = target ? getPosition(state.targetId) : null;
  if (targetPos) {
    const distance = targetPos.distanceTo(shipPos);
    label(ctx, `${unitsToAu(distance).toFixed(2)} AU · ${distance.toFixed(1)} SCENE UNITS`, 24, 142, CYAN, 13);
  }

  label(ctx, 'NEARBY BODIES', 24, 180, DIM, 12);
  targets.forEach((item, index) => {
    const y = 204 + index * 22;
    label(
      ctx,
      `${String(index + 1).padStart(2, '0')}  ${item.body.en}`,
      24,
      y,
      item.body.id === state.targetId ? AMBER : CYAN,
      13,
    );
    label(ctx, `${unitsToAu(item.distance).toFixed(2)} AU`, 488, y, DIM, 12, 'right');
  });
  box(ctx, 24, 292, 464, 8, DIM, 'rgba(7,30,40,0.8)');
  ctx.fillStyle = CYAN;
  ctx.fillRect(26, 294, 460 * Math.min(1, state.throttle), 4);
}

function drawFlight(ctx) {
  const state = useFlightStore.getState();
  drawFrame(ctx, 'FLIGHT / 飞行', 'CURVATURE DRIVE');
  const summary = relativisticSummary(state.speedC, state.warp);
  const speed = state.warp > 0 ? `WARP ${state.warp.toFixed(1)}` : `${(state.speedC * 100).toFixed(2)} % c`;
  label(ctx, 'VELOCITY', 24, 94, DIM, 12);
  label(ctx, speed, 24, 134, AMBER, 32);
  label(ctx, summary.label, 24, 160, CYAN, 13);
  label(ctx, 'THROTTLE', 24, 196, DIM, 12);
  bar(ctx, 24, 206, 230, 18, state.throttle, CYAN);
  label(ctx, `${Math.round(state.throttle * 100)}%`, 266, 220, CYAN, 13);
  label(ctx, 'WARP', 24, 246, DIM, 12);
  bar(ctx, 24, 256, 230, 12, state.warp / 9, AMBER);
  label(ctx, `${state.warp.toFixed(1)} / 9`, 266, 266, AMBER, 13);
  label(ctx, `γ  ${state.gamma.toFixed(4)}`, 488, 112, summary.gamma > 1.01 ? AMBER : DIM, 16, 'right');
  label(ctx, `EXTERNAL  ${formatClock(state.externalSeconds)}`, 488, 146, DIM, 12, 'right');
  label(ctx, `SHIP TIME ${formatClock(state.shipSeconds)}`, 488, 168, CYAN, 12, 'right');
  label(ctx, `SIM DATE  ${formatDateFromDays(worldState.days)}`, 488, 202, DIM, 12, 'right');
  label(ctx, `SIM CLOCK ${formatTimeFromDays(worldState.days)} UTC`, 488, 222, DIM, 12, 'right');
  label(ctx, summary.note, 24, 292, DIM, 11);
}

function drawSystems(ctx) {
  const state = useFlightStore.getState();
  drawFrame(ctx, 'SYSTEMS / 系统', 'SHIP INTEGRITY');
  const rows = [
    ['ION SHIELD', state.shield ? 1 : 0, state.shield ? 'ONLINE' : 'OFFLINE', CYAN],
    ['ENGINE', state.engineOn ? 1 : 0, state.engineOn ? 'IGNITED' : 'STANDBY', AMBER],
    ['HULL', 0.98, 'NOMINAL', CYAN],
    ['POWER', 0.86, '86%', CYAN],
    [
      'CURVATURE FIELD',
      Math.min(1, state.warp / 9 + (state.engineOn ? 0.15 : 0)),
      state.warp > 0 ? 'ACTIVE' : 'IDLE',
      AMBER,
    ],
  ];
  rows.forEach(([name, value, status, color], index) => {
    const y = 96 + index * 38;
    label(ctx, name, 24, y, DIM, 12);
    bar(ctx, 24, y + 8, 300, 14, value, color);
    label(ctx, status, 488, y + 20, color, 13, 'right');
  });
  label(ctx, 'SHIELD RIPPLE', 24, 288, DIM, 12);
  label(
    ctx,
    state.shield ? 'HEX MATRIX STABLE' : 'PROTECTION DISABLED',
    488,
    288,
    state.shield ? CYAN : AMBER,
    12,
    'right',
  );
}

function drawScan(ctx) {
  const state = useFlightStore.getState();
  const body = state.scanResult ?? targetInfo(state.nearId);
  drawFrame(ctx, 'SENSOR / 探测', 'PROXIMITY ANALYSIS');
  if (!body) {
    label(ctx, 'NO BODY IN RANGE', 24, 130, DIM, 18);
    label(ctx, '接近行星后按 R 扫描', 24, 160, CYAN, 13);
    return;
  }
  label(ctx, `${body.en ?? body.name}`, 24, 104, AMBER, 22);
  label(ctx, body.name, 24, 128, CYAN, 16);
  label(ctx, `RADIUS  ${body.radiusKm ? `${body.radiusKm.toLocaleString()} km` : '—'}`, 24, 166, CYAN, 13);
  if (body.semiMajorAu) label(ctx, `ORBIT  ${body.semiMajorAu} AU`, 24, 186, CYAN, 13);
  if (body.periodDays) label(ctx, `PERIOD  ${body.periodDays.toFixed(1)} d`, 24, 206, CYAN, 13);
  if (body.axialTilt !== undefined) label(ctx, `AXIAL TILT  ${body.axialTilt}°`, 24, 226, CYAN, 13);
  const facts = body.facts ?? [body.fact].filter(Boolean);
  facts.slice(0, 3).forEach((fact, index) => {
    label(ctx, `· ${fact.slice(0, 42)}`, 24, 260 + index * 18, DIM, 11);
  });
}

export function CockpitScreen({ kind, position, rotation = [0, 0, 0], size = [1.06, 0.66] }) {
  const screen = useMemo(() => screenTexture(512, 320), []);
  useEffect(() => {
    const draw = () => {
      const ctx = screen.ctx;
      if (!ctx) return;
      if (kind === 'nav') drawNav(ctx);
      else if (kind === 'flight') drawFlight(ctx);
      else if (kind === 'systems') drawSystems(ctx);
      else drawScan(ctx);
      screen.texture.needsUpdate = true;
    };
    draw();
    const timer = setInterval(draw, 150);
    return () => clearInterval(timer);
  }, [kind, screen]);

  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0, -0.012]}>
        <planeGeometry args={[size[0] + 0.06, size[1] + 0.06]} />
        <meshBasicMaterial color="#1a3542" toneMapped={false} />
      </mesh>
      <mesh>
        <planeGeometry args={size} />
        <meshBasicMaterial map={screen.texture} toneMapped={false} />
      </mesh>
    </group>
  );
}
