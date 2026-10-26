import { useEffect, useRef } from 'react';
import { BODY_BY_ID, PLANETS, SUN } from '../data/solarSystem';
import { UNITS_PER_AU } from '../data/scale';
import { flightState } from '../state/flightState';
import { getPosition } from '../state/worldState';
import { useFlightStore } from '../state/useFlightStore';

const SELECTOR_BODIES = [SUN, ...PLANETS];
const PLANETS_ONLY = PLANETS.filter((body) => body.type === 'planet');
const DWARFS = PLANETS.filter((body) => body.type === 'dwarf');

function formatDistance(body) {
  const position = getPosition(body.id);
  if (!position) return '—';
  const au = position.distanceTo(flightState.position) / UNITS_PER_AU;
  return `${au < 0.01 ? au.toFixed(4) : au.toFixed(2)} AU`;
}

export function HoloSelectorPanel() {
  const selector = useFlightStore((state) => state.selector);
  const setPreview = useFlightStore((state) => state.setSelectorPreview);
  const setTarget = useFlightStore((state) => state.setTarget);
  const jumpTo = useFlightStore((state) => state.jumpTo);
  const closeSelector = useFlightStore((state) => state.closeSelector);
  const carousel = useRef(null);

  useEffect(() => {
    const list = carousel.current;
    if (!list || list.clientWidth === 0) return;
    const active = list.querySelector('button.active');
    if (!active) return;
    list.scrollTo({
      left: active.offsetLeft - list.clientWidth / 2 + active.clientWidth / 2,
      behavior: 'smooth',
    });
  }, [selector.open, selector.previewId]);

  if (!selector.open) return null;

  const body = BODY_BY_ID.get(selector.previewId) ?? PLANETS[0];
  const facts = (body.facts ?? [body.fact]).filter(Boolean).slice(0, 2);

  return (
    <div className="panel holo-selector-panel">
      <div className="holo-selector-head">
        <div>
          <span className="eyebrow">HOLOGRAPHIC STAR CHART / 全息星图</span>
          <strong>{body.en ?? body.name}</strong>
          <em>{body.name}</em>
        </div>
        <button type="button" className="holo-selector-close" onClick={closeSelector} aria-label="关闭全息星图">
          ×
        </button>
      </div>

      <div className="holo-selector-meta">
        <span>DIST {formatDistance(body)}</span>
        <span>R {body.radiusKm ? `${body.radiusKm.toLocaleString()} km` : '—'}</span>
        {body.semiMajorAu ? <span>ORBIT {body.semiMajorAu} AU</span> : null}
      </div>

      <div className="holo-selector-facts">
        {facts.map((fact) => (
          <p key={fact}>{fact}</p>
        ))}
      </div>

      <div className="holo-selector-section holo-selector-carousel">
        <span>SELECT / 选择天体</span>
        <div className="holo-selector-list" ref={carousel}>
          {SELECTOR_BODIES.map((item) => (
            <button
              key={item.id}
              type="button"
              data-body-id={item.id}
              className={item.id === body.id ? 'active' : ''}
              onClick={() => setPreview(item.id)}
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>

      <div className="holo-selector-section">
        <span>PLANETS / 行星</span>
        <div className="holo-selector-list">
          {[SUN, ...PLANETS_ONLY].map((item) => (
            <button
              key={item.id}
              type="button"
              data-body-id={item.id}
              className={item.id === body.id ? 'active' : ''}
              onClick={() => setPreview(item.id)}
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>

      <div className="holo-selector-section">
        <span>DWARFS / 矮行星</span>
        <div className="holo-selector-list">
          {DWARFS.map((item) => (
            <button
              key={item.id}
              type="button"
              data-body-id={item.id}
              className={item.id === body.id ? 'active' : ''}
              onClick={() => setPreview(item.id)}
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>

      <div className="holo-selector-actions">
        <button type="button" onClick={() => setTarget(body.id)}>
          设为目标
        </button>
        <button type="button" className="primary" onClick={() => jumpTo(body.id)}>
          超光速跃迁
        </button>
        <button
          type="button"
          className="holo-selector-all"
          onClick={() => useFlightStore.getState().toggleJump()}
          title="全部目的地：行星 / 卫星 / 彗星（Y）"
        >
          全部目的地 <kbd>Y</kbd>
        </button>
      </div>

      <small className="holo-selector-hint">
        空闲 9 秒自动巡游 · 滚轮 / 触控切换 3D 行星节点 · J 关闭，Space 跃迁 · Y 全部目的地
      </small>
    </div>
  );
}
