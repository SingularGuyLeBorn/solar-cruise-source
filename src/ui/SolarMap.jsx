import { useEffect, useMemo, useState } from 'react';
import { PLANETS, COMETS, SUN } from '../data/solarSystem';
import { UNITS_PER_AU } from '../data/scale';
import { flightState } from '../state/flightState';
import { worldState } from '../state/worldState';
import { useFlightStore } from '../state/useFlightStore';

const CENTER = 110;
const MAP_RADIUS = 88;
const MAX_AU = 70;
const RING_AU = [0.5, 1, 2, 5, 10, 30, 50];

function radiusFor(au) {
  const clamped = Math.max(0, Math.min(MAX_AU, au));
  return (Math.log10(1 + clamped) / Math.log10(1 + MAX_AU)) * MAP_RADIUS;
}

function pointFor(position) {
  const au = Math.hypot(position.x, position.z) / UNITS_PER_AU;
  const angle = Math.atan2(position.z, position.x);
  const radius = radiusFor(au);
  return {
    au,
    x: CENTER + Math.cos(angle) * radius,
    y: CENTER + Math.sin(angle) * radius,
  };
}

const LABELED = new Set(['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']);

export function SolarMap() {
  const targetId = useFlightStore((state) => state.targetId);
  const earthMode = useFlightStore((state) => state.earthMode);
  const setTarget = useFlightStore((state) => state.setTarget);
  const toggleSelector = useFlightStore((state) => state.toggleSelector);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 220);
    return () => window.clearInterval(timer);
  }, []);

  const bodies = useMemo(() => [SUN, ...PLANETS, ...COMETS], []);
  const forward = useMemo(() => {
    const q = flightState.quaternion;
    const x = 2 * (q.x * q.z + q.w * q.y);
    const z = 2 * (q.y * q.z - q.w * q.x);
    return Math.atan2(z, x);
  }, [tick]);
  if (earthMode) return null;

  const ship = pointFor(flightState.position);
  const shipSize = 4.6;

  return (
    <div className="panel solar-map" data-tick={tick}>
      <div className="solar-map-head">
        <div>
          <span className="eyebrow">ORBITAL MAP / 轨道图</span>
          <strong>LOG · 0–70 AU</strong>
        </div>
        <span className="solar-map-ship-dot" />
      </div>
      <svg viewBox="0 0 220 220" role="img" aria-label="太阳系轨道小地图">
        {RING_AU.map((au) => (
          <g key={au}>
            <circle cx={CENTER} cy={CENTER} r={radiusFor(au)} className="solar-map-ring" />
            {au === 1 || au === 10 || au === 30 ? (
              <text x={CENTER + radiusFor(au) + 4} y={CENTER + 3} className="solar-map-ring-label">
                {au} AU
              </text>
            ) : null}
          </g>
        ))}
        <line
          x1={CENTER - MAP_RADIUS - 5}
          y1={CENTER}
          x2={CENTER + MAP_RADIUS + 5}
          y2={CENTER}
          className="solar-map-axis"
        />
        <line
          x1={CENTER}
          y1={CENTER - MAP_RADIUS - 5}
          x2={CENTER}
          y2={CENTER + MAP_RADIUS + 5}
          className="solar-map-axis"
        />
        <g className="solar-map-sweep" aria-hidden="true">
          <line x1={CENTER} y1={CENTER} x2={CENTER + MAP_RADIUS} y2={CENTER} />
        </g>
        {bodies.map((body) => {
          const position = worldState.positions.get(body.id);
          if (!position) return null;
          const point = pointFor(position);
          const isTarget = targetId === body.id;
          const isSun = body.id === 'sun';
          return (
            <g
              key={body.id}
              className={`solar-map-node ${isTarget ? 'is-target' : ''}`}
              onClick={() => setTarget(body.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') setTarget(body.id);
              }}
            >
              <title>{`${body.name} · ${point.au.toFixed(2)} AU`}</title>
              {isTarget ? <circle cx={point.x} cy={point.y} r={7.5} className="solar-map-target-ring" /> : null}
              <circle
                cx={point.x}
                cy={point.y}
                r={isSun ? 4.2 : body.type === 'planet' ? 2.8 : 1.8}
                fill={body.color}
              />
              {LABELED.has(body.id) || isTarget ? (
                <text x={point.x + 6} y={point.y - 5} className="solar-map-label">
                  {body.en}
                </text>
              ) : null}
            </g>
          );
        })}
        <g
          className="solar-map-ship"
          transform={`translate(${ship.x} ${ship.y}) rotate(${(-forward * 180) / Math.PI + 90})`}
        >
          <path
            d={`M 0 -${shipSize} L ${shipSize * 0.7} ${shipSize * 0.7} L 0 ${shipSize * 0.35} L -${shipSize * 0.7} ${shipSize * 0.7} Z`}
          />
        </g>
        <text x={ship.x + 7} y={ship.y + 3} className="solar-map-you">
          YOU
        </text>
      </svg>
      <div className="solar-map-foot">
        <button className="solar-map-open" type="button" onClick={toggleSelector}>
          全息星图
        </button>
        <span>{ship.au < 0.01 ? '< 0.01' : ship.au.toFixed(2)} AU</span>
      </div>
    </div>
  );
}
