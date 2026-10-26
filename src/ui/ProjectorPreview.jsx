import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { CollectionHoloCloud, MiniOrrery } from '../scene/CollectionHoloCloud';
import { useFlightStore } from '../state/useFlightStore';

const QUERY = '(max-width: 900px), (pointer: coarse)';

function useCoarseViewport() {
  const [coarse, setCoarse] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(QUERY).matches,
  );

  useEffect(() => {
    const media = window.matchMedia(QUERY);
    const update = () => setCoarse(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return coarse;
}

export function ProjectorPreview({ mode, selectedId }) {
  const coarse = useCoarseViewport();
  const suspended = useFlightStore(
    (state) => state.helpOpen || state.jumpOpen || state.holo.formGalleryOpen || state.earthMode,
  );
  if (!coarse || suspended) return null;

  return (
    <div className="projector-preview">
      {mode === 'collection' ? (
        <Canvas
          dpr={[1, 1.5]}
          camera={{ position: [0, 0.08, 2.5], fov: 36, near: 0.1, far: 20 }}
          gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        >
          <CollectionHoloCloud count={2600} scale={1.35} pointSize={2.1} />
        </Canvas>
      ) : (
        <Canvas
          dpr={[1, 1.5]}
          camera={{ position: [0, 0.85, 2.15], fov: 40, near: 0.1, far: 20 }}
          gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        >
          <MiniOrrery selectedId={selectedId} />
        </Canvas>
      )}
    </div>
  );
}
