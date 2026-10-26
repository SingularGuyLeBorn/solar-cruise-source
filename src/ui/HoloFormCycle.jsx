import { useEffect } from 'react';
import { useFlightStore } from '../state/useFlightStore';

const IDLE_MS = 8000;

export function HoloFormCycle() {
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      const state = useFlightStore.getState();
      if (!state.holo.formAuto || state.holo.formGalleryOpen) return;
      if (state.holo.activeProjector !== 'collection') return;
      if (state.earthMode || state.helpOpen || state.jumpOpen || state.selector.open) return;
      if (state.viewMode !== 'cockpit' || !state.holo.open) return;
      if (Date.now() - state.holo.formLastInputAt < IDLE_MS) return;
      state.cycleHoloForm(1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);
  return null;
}
