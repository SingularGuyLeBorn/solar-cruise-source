import { Canvas } from '@react-three/fiber';
import { HOLO_ARTIFACTS, HOLO_ARTIFACT_BY_ID } from '../data/holoArtifacts';
import { CollectionHoloCloud } from '../scene/CollectionHoloCloud';
import { useFlightStore } from '../state/useFlightStore';

export function HoloFormGallery() {
  const open = useFlightStore((state) => state.holo.formGalleryOpen);
  const formId = useFlightStore((state) => state.holo.formId);
  const formAuto = useFlightStore((state) => state.holo.formAuto);
  const closeGallery = useFlightStore((state) => state.closeFormGallery);
  const setHoloForm = useFlightStore((state) => state.setHoloForm);
  const toggleHoloFormAuto = useFlightStore((state) => state.toggleHoloFormAuto);
  const cycleHoloForm = useFlightStore((state) => state.cycleHoloForm);

  if (!open) return null;

  const selected = HOLO_ARTIFACT_BY_ID.get(formId) ?? HOLO_ARTIFACTS[0];
  if (!selected) return null;
  const currentIndex = Math.max(
    0,
    HOLO_ARTIFACTS.findIndex((item) => item.id === selected.id),
  );
  const previewCount =
    typeof window !== 'undefined' && window.matchMedia('(max-width: 900px), (pointer: coarse)').matches ? 8000 : 16000;

  return (
    <div
      className="modal-backdrop holo-gallery-backdrop"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) closeGallery();
      }}
    >
      <div className="holo-gallery-shell">
        <button type="button" className="holo-gallery-close" onClick={closeGallery} aria-label="关闭馆藏库">
          ×
        </button>

        <aside className="holo-gallery-preview-panel">
          <Canvas
            dpr={[1, 1.5]}
            camera={{ position: [0, 0.06, 2.65], fov: 34, near: 0.1, far: 20 }}
            gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
          >
            <CollectionHoloCloud count={previewCount} scale={1.05} pointSize={1.9} />
          </Canvas>
          <span className="holo-gallery-preview-tag">3D POINT CLOUD · {previewCount.toLocaleString('en-US')} PTS</span>
          <div className="holo-gallery-preview-caption">
            <span>REAL SCAN / 馆藏点云</span>
            <strong>{selected.name}</strong>
            <em>{selected.en}</em>
          </div>
        </aside>

        <section className="holo-gallery-library">
          <header className="holo-gallery-head">
            <div>
              <span className="eyebrow">HOLOGRAPHIC COLLECTION / 馆藏投影库</span>
              <h2>馆藏投影</h2>
              <p>
                {HOLO_ARTIFACTS.length} 件真实扫描 · 当前 {selected.name}
                <em>{selected.en}</em>
              </p>
            </div>
            <span className="holo-gallery-count">
              {currentIndex + 1} / {HOLO_ARTIFACTS.length}
            </span>
          </header>

          <div className="holo-gallery-toolbar">
            <span className="holo-form-scan-note">
              3D 点云 · B / Esc 关闭 · 来源见 <code>public/artifacts/CREDITS.md</code>
            </span>
            <button type="button" className={`holo-form-auto ${formAuto ? 'active' : ''}`} onClick={toggleHoloFormAuto}>
              AUTO {formAuto ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="holo-form-grid holo-form-grid--artifacts holo-gallery-grid">
            {HOLO_ARTIFACTS.map((item) => (
              <button
                type="button"
                key={item.id}
                data-form-id={item.id}
                className={item.id === selected.id ? 'active' : ''}
                onClick={() => setHoloForm('artifact', item.id)}
              >
                <i style={{ background: item.colors?.[1] ?? '#5fd4e2' }} />
                <span>{item.name}</span>
                <em>{item.en}</em>
              </button>
            ))}
          </div>

          <div className="holo-gallery-detail holo-form-detail">
            <div>
              <strong>{selected.name}</strong>
              <em>{selected.en}</em>
            </div>
            <p>{selected.description}</p>
            <small>
              {selected.era} · {selected.credit}
            </small>
          </div>

          <div className="holo-form-footer holo-gallery-footer">
            <button type="button" onClick={() => cycleHoloForm(-1)} aria-label="上一件馆藏">
              ‹
            </button>
            <span>
              {currentIndex + 1} / {HOLO_ARTIFACTS.length}
            </span>
            <button type="button" onClick={() => cycleHoloForm(1)} aria-label="下一件馆藏">
              ›
            </button>
            <button type="button" className="primary" onClick={closeGallery}>
              应用到投影台
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
