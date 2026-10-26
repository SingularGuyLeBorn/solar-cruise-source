import { useFlightStore } from '../state/useFlightStore';

export function SolarStatus() {
  const solar = useFlightStore((state) => state.solar);
  const flare = solar.event === 'FLARE';
  return (
    <div className={`solar-status ${flare ? 'is-flare' : ''}`}>
      <span className="solar-status-dot" />
      <span className="solar-status-label">{flare ? `SOLAR FLARE ${solar.flareClass}` : 'SOLAR WIND'}</span>
      <b>{flare ? `${Math.round(solar.interference * 100)}% EM` : `${solar.wind} km/s`}</b>
      <em>
        Kp {flare ? '6' : '3'} · spots {solar.sunspots}
      </em>
    </div>
  );
}
