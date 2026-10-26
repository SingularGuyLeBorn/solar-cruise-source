import { useFlightStore } from '../state/useFlightStore';

export function MaydayBanner() {
  const hazard = useFlightStore((state) => state.hazard);
  const shield = useFlightStore((state) => state.shield);
  if (!hazard.mayday) return null;
  const label = hazard.kind === 'near' ? '近距掠过' : '撞击预警';
  return (
    <div className={`mayday ${hazard.kind === 'impact' ? 'is-impact' : ''}`} role="alert">
      <span className="mayday-code">MAYDAY</span>
      <span className="mayday-text">
        <strong>小行星{label}</strong>
        <small>
          {hazard.distance.toFixed(1)} u · ETA {hazard.eta > 0 ? `${hazard.eta.toFixed(1)}s` : 'now'}
        </small>
      </span>
      <span className={`mayday-shield ${shield ? 'is-on' : ''}`}>护盾 {shield ? 'ON' : 'OFF'}</span>
    </div>
  );
}
