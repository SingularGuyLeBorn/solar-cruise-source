import { BODY_BY_ID, PLANETS } from '../data/solarSystem';
import { UNITS_PER_AU } from '../data/scale';
import { flightState } from '../state/flightState';
import { getPosition } from '../state/worldState';
import { useFlightStore } from '../state/useFlightStore';
import { HOLO_ARTIFACTS, HOLO_ARTIFACT_BY_ID } from '../data/holoArtifacts';
import { ProjectorPreview } from './ProjectorPreview';

function formatDistance(body) {
  const position = getPosition(body.id);
  if (!position) return '—';
  const au = position.distanceTo(flightState.position) / UNITS_PER_AU;
  return `${au < 0.01 ? au.toFixed(4) : au.toFixed(2)} AU`;
}

export function HoloPanel() {
  const holoOpen = useFlightStore((state) => state.holo.open);
  const viewMode = useFlightStore((state) => state.viewMode);
  const earthMode = useFlightStore((state) => state.earthMode);
  const activeProjector = useFlightStore((state) => state.holo.activeProjector);
  const formId = useFlightStore((state) => state.holo.formId);
  const previewId = useFlightStore((state) => state.selector.previewId);
  const setSelectorPreview = useFlightStore((state) => state.setSelectorPreview);
  const cycleSelector = useFlightStore((state) => state.cycleSelector);
  const cycleHoloForm = useFlightStore((state) => state.cycleHoloForm);
  const setActiveProjector = useFlightStore((state) => state.setActiveProjector);
  const setTarget = useFlightStore((state) => state.setTarget);
  const jumpTo = useFlightStore((state) => state.jumpTo);
  const toggleHolo = useFlightStore((state) => state.toggleHolo);
  const openFormGallery = useFlightStore((state) => state.openFormGallery);
  if (!holoOpen || earthMode || viewMode !== 'cockpit') return null;

  const body = BODY_BY_ID.get(previewId) ?? PLANETS[0];
  const facts = (body.facts ?? [body.fact]).filter(Boolean).slice(0, 2);
  const artifact = HOLO_ARTIFACT_BY_ID.get(formId) ?? HOLO_ARTIFACTS[0];
  const artifactIndex = Math.max(
    0,
    HOLO_ARTIFACTS.findIndex((item) => item.id === artifact?.id),
  );
  const solar = activeProjector !== 'collection';

  return (
    <div className="panel holo-panel holo-nav-panel">
      <div className="projector-tabs" role="tablist" aria-label="全息投影选择">
        <button
          type="button"
          role="tab"
          aria-selected={!solar}
          className={!solar ? 'active' : ''}
          onClick={() => setActiveProjector('collection')}
        >
          馆藏 <em>{HOLO_ARTIFACTS.length}</em>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={solar}
          className={solar ? 'active' : ''}
          onClick={() => setActiveProjector('solar')}
        >
          太阳系 <em>{PLANETS.length + 1}</em>
        </button>
      </div>

      <div className="holo-nav-head">
        <div>
          <span className="eyebrow">
            {solar ? 'SOLAR PROJECTION / 太阳系导航' : 'COLLECTION PROJECTION / 馆藏投影'}
          </span>
          <strong>{solar ? (body.en ?? body.name) : artifact?.name}</strong>
          <em>{solar ? body.name : artifact?.en}</em>
        </div>
        <div className="holo-nav-head-tools">
          <ProjectorPreview mode={solar ? 'solar' : 'collection'} selectedId={body.id} />
          <button type="button" className="holo-close" onClick={toggleHolo} aria-label="收起全息投影">
            ×
          </button>
        </div>
      </div>

      {solar ? (
        <>
          <div className="holo-nav-meta">
            <span>DIST {formatDistance(body)}</span>
            <span>R {body.radiusKm ? `${body.radiusKm.toLocaleString()} km` : '—'}</span>
            {body.semiMajorAu ? <span>ORBIT {body.semiMajorAu} AU</span> : null}
          </div>
          <div className="holo-nav-facts">
            {facts.map((fact) => (
              <p key={fact}>{fact}</p>
            ))}
          </div>
          <div className="holo-nav-picker">
            <button type="button" onClick={() => cycleSelector(-1)} aria-label="上一个天体">
              ‹
            </button>
            <button
              type="button"
              className="holo-form-open-inline"
              onClick={() => useFlightStore.getState().toggleSelector()}
              title="打开全息星图"
            >
              全息星图
            </button>
            <button type="button" onClick={() => cycleSelector(1)} aria-label="下一个天体">
              ›
            </button>
          </div>
          <div className="holo-nav-actions">
            <button
              type="button"
              onClick={() => {
                setSelectorPreview(body.id);
                setTarget(body.id);
              }}
            >
              设为目标
            </button>
            <button type="button" className="primary" onClick={() => jumpTo(body.id)}>
              超光速跃迁
            </button>
          </div>
          <small className="holo-nav-hint">空闲 9 秒自动巡游 · 滚轮 / 触控接管 · O 收起 · J 星图</small>
        </>
      ) : (
        <>
          <div className="holo-nav-meta">
            <span>
              SCAN {String(artifactIndex + 1).padStart(2, '0')} / {HOLO_ARTIFACTS.length}
            </span>
            <span>{artifact?.category ?? '馆藏'}</span>
            <span>{artifact?.id === 'mask-protruding' ? '三星堆' : 'REAL SCAN'}</span>
          </div>
          <div className="holo-nav-facts">
            <p>{artifact?.description}</p>
            <p>{artifact?.era}</p>
          </div>
          <div className="holo-nav-picker">
            <button type="button" onClick={() => cycleHoloForm(-1)} aria-label="上一件馆藏">
              ‹
            </button>
            <button type="button" className="holo-form-open-inline" onClick={openFormGallery} title="打开馆藏库">
              馆藏 · {artifact?.name}
            </button>
            <button type="button" onClick={() => cycleHoloForm(1)} aria-label="下一件馆藏">
              ›
            </button>
          </div>
          <div className="holo-nav-actions holo-nav-actions--single">
            <button type="button" className="primary" onClick={openFormGallery}>
              打开馆藏库（B）
            </button>
          </div>
          <small className="holo-nav-hint">点击左侧投影聚焦 · B 馆藏库 · 滚轮切件 · 8 秒自动巡展</small>
        </>
      )}
    </div>
  );
}
