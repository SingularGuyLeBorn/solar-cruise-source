import { useEffect } from 'react';
import { useFlightStore } from '../state/useFlightStore';

const IDLE_MS = 9000;

export function HoloAutoCycle() {
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      const state = useFlightStore.getState();
      const visible = state.selector.open || (state.holo.open && state.viewMode === 'cockpit');
      if (!visible || state.earthMode || state.helpOpen || state.jumpOpen || state.holo.formGalleryOpen) return;
      if (!state.selector.open && state.holo.activeProjector !== 'solar') return;
      if (Date.now() - state.selector.lastInputAt < IDLE_MS) return;
      state.cycleSelector(1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);
  return null;
}
