import { useEffect } from 'react';
import { ensureImpactAudio, playImpactCreak, setImpactAudioEnabled } from '../lib/impactAudio';
import { useFlightStore } from '../state/useFlightStore';

export function ImpactAudio() {
  const audioEnabled = useFlightStore((state) => state.audioEnabled);

  useEffect(() => {
    setImpactAudioEnabled(audioEnabled);
  }, [audioEnabled]);

  useEffect(() => {
    const unlock = () => ensureImpactAudio();
    const onImpact = (event) => {
      if (!useFlightStore.getState().audioEnabled) return;
      playImpactCreak(event.detail);
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    window.addEventListener('cruise:impact', onImpact);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('cruise:impact', onImpact);
    };
  }, []);

  return null;
}
