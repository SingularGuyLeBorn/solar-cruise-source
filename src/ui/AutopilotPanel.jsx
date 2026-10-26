import { BODY_BY_ID } from '../data/solarSystem';
import { MOON_BY_ID } from '../data/moons';
import { UNITS_PER_AU } from '../data/scale';
import { useFlightStore } from '../state/useFlightStore';

const MODE_LABEL = {
  hold: 'HOLD / 位置保持',
  point: 'POINT / 指向目标',
  approach: 'FLY TO / 前往目标',
};

const PHASE_LABEL = {
  initializing: '初始化物理引擎',
  slewing: '姿态对齐',
  cruising: '巡航接近',
  braking: '减速修正',
  holding: '保持',
  'too-far': '目标过远，请先跃迁',
  error: '初始化失败',
  off: '未接管',
};

function distanceLabel(distance) {
  if (!Number.isFinite(distance) || distance <= 0) return '—';
  const au = distance / UNITS_PER_AU;
  return au < 0.01 ? `${distance.toFixed(1)} u` : `${au.toFixed(3)} AU`;
}

export function AutopilotPanel() {
  const autopilot = useFlightStore((state) => state.autopilot);
  const targetId = useFlightStore((state) => state.targetId);
  const earthMode = useFlightStore((state) => state.earthMode);
  const engageAutopilot = useFlightStore((state) => state.engageAutopilot);
  const disengageAutopilot = useFlightStore((state) => state.disengageAutopilot);
  if (earthMode) return null;

  const target = BODY_BY_ID.get(targetId) ?? MOON_BY_ID.get(targetId);
  const engaged = autopilot.enabled;

  return (
    <div className="panel autopilot-panel">
      <div className="autopilot-head">
        <span className="eyebrow">AUTOPILOT / 自动驾驶</span>
        <span className={`autopilot-state ${engaged ? 'is-on' : ''}`}>{engaged ? 'ENGAGED' : 'MANUAL'}</span>
      </div>

      <div className="autopilot-mode">{engaged ? MODE_LABEL[autopilot.mode] : '未接管 · G 保持 / F 飞向目标'}</div>

      {engaged && (
        <>
          <div className="autopilot-telemetry">
            <div>
              <span>PHASE</span>
              <b>{PHASE_LABEL[autopilot.phase] ?? autopilot.phase}</b>
            </div>
            <div>
              <span>TARGET</span>
              <b>{target?.en ?? target?.name ?? '—'}</b>
            </div>
            <div>
              <span>DIST</span>
              <b>{distanceLabel(autopilot.distance)}</b>
            </div>
            <div>
              <span>VEL</span>
              <b>{autopilot.speed.toFixed(2)} u/s</b>
            </div>
            <div>
              <span>CLOSURE</span>
              <b>{autopilot.relativeSpeed.toFixed(2)} u/s</b>
            </div>
            <div>
              <span>POS ERR</span>
              <b>{autopilot.positionError.toFixed(2)} u</b>
            </div>
            <div>
              <span>ATT ERR</span>
              <b>{autopilot.attitudeError.toFixed(1)}°</b>
            </div>
          </div>
          <div className="autopilot-throttle" aria-hidden="true">
            <i style={{ width: `${Math.round(autopilot.throttle * 100)}%` }} />
          </div>
        </>
      )}

      <div className="autopilot-buttons">
        <button
          className={engaged && autopilot.mode === 'hold' ? 'active' : ''}
          type="button"
          onClick={() => engageAutopilot('hold')}
        >
          HOLD
        </button>
        <button
          className={engaged && autopilot.mode === 'point' ? 'active' : ''}
          type="button"
          disabled={!target}
          onClick={() => engageAutopilot('point')}
        >
          POINT
        </button>
        <button
          className={engaged && autopilot.mode === 'approach' ? 'active' : ''}
          type="button"
          disabled={!target}
          onClick={() => engageAutopilot('approach')}
        >
          FLY TO
        </button>
        <button type="button" disabled={!engaged} onClick={() => disengageAutopilot('toggle')}>
          OFF
        </button>
      </div>

      <small className="autopilot-hint">Rapier 刚体 + PID · 手动输入自动解除</small>
    </div>
  );
}
