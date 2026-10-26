import { PLANETS, BODY_BY_ID, COMETS } from '../data/solarSystem';
import { UNITS_PER_AU } from '../data/scale';
import { MOONS, MOON_BY_ID } from '../data/moons';
import { CockpitHUD } from './CockpitHUD';
import { AutopilotPanel } from './AutopilotPanel';
import { HoloPanel } from './HoloPanel';
import { SolarMap } from './SolarMap';
import { MaydayBanner } from './MaydayBanner';
import { SolarStatus } from './SolarStatus';
import { HoloSelectorPanel } from './HoloSelectorPanel';
import { HoloAutoCycle } from './HoloAutoCycle';
import { HoloFormCycle } from './HoloFormCycle';
import { HoloFormGallery } from './HoloFormGallery';
import { ImpactAudio } from './ImpactAudio';
import { MobileControls } from './MobileControls';
import { useFlightStore, SIM_SPEEDS } from '../state/useFlightStore';
import { flightState } from '../state/flightState';
import { getPosition, worldState } from '../state/worldState';
import {
  formatClock,
  formatDateFromDays,
  formatSpeed,
  formatTimeFromDays,
  relativisticSummary,
} from '../lib/relativity';

function distanceTo(id) {
  const position = getPosition(id);
  return position ? position.distanceTo(flightState.position) : Infinity;
}

function auLabel(units) {
  return `${(units / UNITS_PER_AU).toFixed(2)} AU`;
}

function TargetCard({ state }) {
  const target = BODY_BY_ID.get(state.targetId) ?? MOON_BY_ID.get(state.targetId);
  const distance = distanceTo(state.targetId);
  if (!target) return null;
  return (
    <button className="hud-target" type="button" onClick={() => state.toggleSelector()}>
      <span className="eyebrow">TARGET / 目标</span>
      <strong>{target.en ?? target.name}</strong>
      <em>{target.name}</em>
      <span className="target-distance">{Number.isFinite(distance) ? auLabel(distance) : '—'}</span>
    </button>
  );
}

export function HUD() {
  const state = useFlightStore();
  const target = BODY_BY_ID.get(state.targetId) ?? MOON_BY_ID.get(state.targetId);
  const near = BODY_BY_ID.get(state.nearId) ?? MOON_BY_ID.get(state.nearId);
  const summary = relativisticSummary(state.speedC, state.warp);
  const speed = formatSpeed(state.speedC, state.warp);

  return (
    <div
      className={`hud ${state.earthMode ? 'hud--earth' : ''} ${state.viewMode === 'cockpit' && !state.earthMode ? 'hud--cockpit' : ''} ${state.selector.open ? 'hud--selector' : ''}`}
    >
      <div
        className={`warp-vignette ${state.warp > 0 ? 'warp-vignette--active' : ''}`}
        style={{ opacity: Math.min(0.7, state.warp / 9) }}
      />
      {state.impactPulse > 0 && <div key={state.impactPulse} className="impact-flash" />}
      <div
        className="em-overlay"
        aria-hidden="true"
        style={{ opacity: Math.min(0.24, state.solar.interference * 0.45) }}
      />

      <header className="hud-top">
        <div className="brand">
          <span className="brand-mark">SC</span>
          <div>
            <strong>SOLAR CRUISE</strong>
            <small>静默航行 · 太阳系巡游</small>
          </div>
        </div>
        <TargetCard state={state} />
        <nav className="hud-actions">
          <button
            className={state.viewMode === 'cockpit' ? 'active' : ''}
            type="button"
            onClick={() => state.setView('cockpit')}
          >
            驾驶舱
          </button>
          <button
            className={state.viewMode === 'chase' ? 'active' : ''}
            type="button"
            onClick={() => state.setView('chase')}
          >
            第三人称
          </button>
          <button className={state.shield ? 'active' : ''} type="button" onClick={state.toggleShield}>
            护盾 {state.shield ? 'ON' : 'OFF'}
          </button>
          <button className={state.engineOn ? 'active' : ''} type="button" onClick={state.toggleEngine}>
            引擎 {state.engineOn ? 'ON' : 'OFF'}
          </button>
          <button className={state.holo.open ? 'active' : ''} type="button" onClick={state.toggleHolo}>
            投影
          </button>
          <button
            className={`hud-actions__desktop ${state.selector.open ? 'active' : ''}`}
            type="button"
            onClick={state.toggleSelector}
          >
            星图
          </button>
          <button type="button" onClick={() => state.toggleHelp()}>
            操作
          </button>
          <button
            className={state.earthMode ? 'active' : ''}
            type="button"
            onClick={() => state.setEarthMode(!state.earthMode)}
          >
            {state.earthMode ? '返回太空' : 'CESIUM 地球'}
          </button>
        </nav>
      </header>

      <CockpitHUD />
      <SolarMap />
      <HoloSelectorPanel />
      <SolarStatus />
      <MaydayBanner />
      <HoloPanel />
      <MobileControls />
      <MobileScanCard state={state} />
      <HoloAutoCycle />
      <HoloFormCycle />
      <HoloFormGallery />
      <ImpactAudio />

      {!state.earthMode && (
        <aside className="hud-left">
          <div className="panel">
            <span className="eyebrow">FLIGHT CONTROL / 飞行控制</span>
            <div className="big-readout">{speed}</div>
            <div className="readout-row">
              <span>γ</span>
              <b>{summary.gamma.toFixed(4)}</b>
            </div>
            <div className="readout-row">
              <span>{state.throttle < 0 ? 'REVERSE' : 'THROTTLE'}</span>
              <b>{Math.round(Math.abs(state.throttle) * 100)}%</b>
            </div>
            <input
              className="range"
              type="range"
              min="-1"
              max="1"
              step="0.01"
              value={state.throttle}
              onChange={(event) => state.setThrottle(Number(event.target.value))}
            />
            <div className="throttle-ends">
              <span>REV</span>
              <span>FWD</span>
            </div>
            <div className="readout-row">
              <span>WARP</span>
              <b>{state.warp.toFixed(1)} / 9</b>
            </div>
            <div className="warp-buttons">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((warp) => (
                <button
                  key={warp}
                  className={state.warp === warp ? 'active' : ''}
                  type="button"
                  onClick={() => state.setWarp(warp)}
                >
                  {warp}
                </button>
              ))}
            </div>
            <div className="button-row">
              <button type="button" onClick={() => state.setWarp(Math.max(0, state.warp - 1))}>
                WARP −
              </button>
              <button type="button" onClick={() => state.setWarp(Math.min(9, state.warp + 1))}>
                WARP +
              </button>
              <button type="button" onClick={() => state.setThrottle(0)}>
                ALL STOP
              </button>
            </div>
          </div>

          <div className="panel">
            <span className="eyebrow">PROXIMITY / 邻近天体</span>
            <div className="near-body">
              <strong>{near ? (near.en ?? near.name) : 'DEEP SPACE'}</strong>
              <span>{near ? near.name : '深空巡航'}</span>
              <small>{Number.isFinite(state.nearDistance) ? auLabel(Math.max(0, state.nearDistance)) : '—'}</small>
            </div>
            <div className="button-row">
              <button type="button" onClick={() => state.scanNearby()}>
                扫描 R
              </button>
              <button type="button" onClick={() => state.triggerImpactTest()}>
                小行星撞击 K
              </button>
            </div>
          </div>
        </aside>
      )}

      <div className="hud-bottom">
        <div className="time-panel">
          <div>
            <span className="eyebrow">EXTERNAL / 外部时间</span>
            <strong>{formatClock(state.externalSeconds)}</strong>
          </div>
          <div>
            <span className="eyebrow">SHIP / 飞船固有时</span>
            <strong>{formatClock(state.shipSeconds)}</strong>
          </div>
          <div>
            <span className="eyebrow">SIM DATE / 星历</span>
            <strong>
              {formatDateFromDays(worldState.days)} <em>{formatTimeFromDays(worldState.days)} UTC</em>
            </strong>
          </div>
          <div>
            <span className="eyebrow">TIME FLOW / 时间倍率</span>
            <button type="button" onClick={() => state.cycleSimSpeed()}>
              {SIM_SPEEDS[state.simSpeedIndex].label} ↻
            </button>
          </div>
        </div>
        <div className="bottom-hint">
          <span>{summary.note}</span>
          <span>
            {state.earthMode
              ? 'Cesium 地球 · 鼠标拖拽旋转 / 滚轮缩放'
              : '鼠标 360° 环视 · W 朝视线转向推进 · S 反推 · 滚轮切投影 · J 星图 · V 视角'}
          </span>
        </div>
      </div>

      <aside className="hud-right">
        <AutopilotPanel />
        <div className="panel">
          <span className="eyebrow">MISSION LOG / 航行日志</span>
          <ul className="log-list">
            {state.log.slice(0, 3).map((entry, index) => (
              <li key={`${entry}-${index}`}>{entry}</li>
            ))}
          </ul>
        </div>
        {state.scanResult && (
          <div className="panel scan-panel">
            <span className="eyebrow">SCAN RESULT / 扫描结果</span>
            <h3>{state.scanResult.name}</h3>
            <small>{state.scanResult.en}</small>
            {(state.scanResult.facts ?? [state.scanResult.fact])
              .filter(Boolean)
              .slice(0, 3)
              .map((fact) => (
                <p key={fact}>{fact}</p>
              ))}
            <button type="button" onClick={state.clearScan}>
              关闭
            </button>
          </div>
        )}
      </aside>

      {!state.earthMode && (
        <div className="crosshair" aria-hidden="true">
          <span />
          <span />
          <i>{target ? target.name : '—'}</i>
        </div>
      )}

      {state.jumpOpen && <JumpMenu state={state} />}
      {state.helpOpen && <HelpPanel state={state} />}
      {state.earthMode && (
        <div className="earth-badge">
          <span className="eyebrow">CESIUM EARTH / 地球轨道视图</span>
          <strong>实时卫星影像 · 鼠标拖拽环绕</strong>
          <small>影像 © Esri / Maxar / Earthstar Geographics · 服务条款适用</small>
        </div>
      )}
    </div>
  );
}

function MobileScanCard({ state }) {
  const body = state.scanResult;
  if (!body) return null;
  const fact = (body.facts ?? [body.fact]).filter(Boolean)[0];
  return (
    <div className="panel mobile-scan-card">
      <div className="mobile-scan-head">
        <span className="eyebrow">SCAN / 扫描结果</span>
        <button type="button" onClick={state.clearScan} aria-label="关闭扫描结果">
          ×
        </button>
      </div>
      <strong>{body.en ?? body.name}</strong>
      <em>{body.name}</em>
      {fact ? <p>{fact}</p> : null}
    </div>
  );
}

function JumpMenu({ state }) {
  const groups = [
    { label: '行星与矮行星', items: PLANETS },
    { label: '主要卫星', items: MOONS.filter((moon) => moon.major) },
    { label: '彗星', items: COMETS },
  ];
  return (
    <div className="modal-backdrop">
      <div className="modal jump-menu">
        <header>
          <div>
            <span className="eyebrow">CURVATURE JUMP / 空间跳跃</span>
            <h2>选择目的地</h2>
          </div>
          <button type="button" onClick={state.toggleJump}>
            ✕
          </button>
        </header>
        <div className="jump-groups">
          {groups.map((group) => (
            <section key={group.label}>
              <h3>{group.label}</h3>
              {group.items.map((body) => {
                const distance = distanceTo(body.id);
                return (
                  <button
                    key={body.id}
                    type="button"
                    className={state.targetId === body.id ? 'selected' : ''}
                    onClick={() => state.jumpTo(body.id)}
                  >
                    <span>{body.name}</span>
                    <small>{body.en}</small>
                    <em>{Number.isFinite(distance) ? auLabel(distance) : '—'}</em>
                  </button>
                );
              })}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function HelpPanel({ state }) {
  const rows = [
    ['鼠标', '驾驶舱 360° 自由环视 / 追尾视角转向'],
    ['W / S', 'W 朝当前视角转向并推进 / S 反推（S 可进入倒退）'],
    ['Shift', '加力'],
    ['方向键', '俯仰 / 偏航'],
    ['A / D', '滚转（A 左 / D 右）'],
    ['数字 0–9', '直接设定曲率档位'],
    ['Space', '跳跃到当前目标'],
    ['滚轮', '切换当前投影：馆藏下一件 / 太阳系下一个天体'],
    ['J', '打开 / 关闭全屏全息星图'],
    ['V', '驾驶舱 / 第三人称'],
    ['H', '离子护盾开 / 关（默认关闭）'],
    ['E', '引擎点火 / 关闭'],
    ['T', '时间倍率'],
    ['R', '扫描邻近天体'],
    ['C', 'Cesium 地球视图'],
    ['K', '小行星撞击测试'],
    ['G', '自动驾驶：位置保持 / 解除'],
    ['F', '自动驾驶：飞向当前目标'],
    ['O', '太阳系导航全息 开 / 收起'],
    ['投影卡 · 馆藏', '打开 20 件真实扫描馆藏投影库'],
    ['投影区', '馆藏 / 太阳系切换（移动端投影卡 tab）'],
    ['移动端', '左下摇杆与底部油门常驻；右下“操作”卷轴展开触控指令'],
    ['M', '座舱撞击音效 开 / 关'],
    ['P', '显示 / 隐藏本帮助'],
  ];
  return (
    <div className="modal-backdrop">
      <div className="modal help-panel">
        <header>
          <div>
            <span className="eyebrow">FLIGHT MANUAL / 飞行手册</span>
            <h2>控制说明</h2>
          </div>
          <button type="button" onClick={state.toggleHelp}>
            ✕
          </button>
        </header>
        <div className="help-grid">
          {rows.map(([key, action]) => (
            <div key={key}>
              <kbd>{key}</kbd>
              <span>{action}</span>
            </div>
          ))}
        </div>
        <p>
          提示：在驾驶舱内可以点击护盾 / 引擎按钮；起飞前引擎已点火。曲率档位越高，星场拉伸越明显。接近行星时按 R
          扫描，档案会显示在右侧。
        </p>
        <button className="primary" type="button" onClick={state.toggleHelp}>
          开始航行
        </button>
      </div>
    </div>
  );
}
