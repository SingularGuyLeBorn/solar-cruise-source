let context = null;
let noiseBuffer = null;
let enabled = true;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function createNoise(context) {
  const length = Math.floor(context.sampleRate * 1.2);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < length; index += 1) {
    data[index] = Math.random() * 2 - 1;
  }
  return buffer;
}

export function ensureImpactAudio() {
  if (typeof window === 'undefined') return null;
  try {
    if (!context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
      noiseBuffer = createNoise(context);
    }
    if (context.state === 'suspended') context.resume().catch(() => {});
    return context;
  } catch {
    return null;
  }
}

export function setImpactAudioEnabled(value) {
  enabled = Boolean(value);
}

export function playImpactCreak(detail = {}) {
  if (!enabled) return;
  if (!context) return;
  if (context.state !== 'running') {
    context.resume().catch(() => {});
    return;
  }
  try {
    const now = context.currentTime;
    const severity = clamp(detail.severity ?? 0.5, 0.08, 1);
    const normalSpeed = clamp(detail.normalSpeed ?? 8, 0, 60);
    const angle = clamp(detail.angleFactor ?? 1, 0, 1);
    const pan = clamp(detail.pan ?? 0, -1, 1) * 0.72;
    const master = context.createGain();
    master.gain.value = 0.08 + severity * 0.24;
    const panner = context.createStereoPanner ? context.createStereoPanner() : context.createGain();
    if (panner.pan) panner.pan.value = pan;
    master.connect(panner).connect(context.destination);

    // Low structural thud.
    const thud = context.createOscillator();
    const thudGain = context.createGain();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(86 + normalSpeed * 1.8, now);
    thud.frequency.exponentialRampToValueAtTime(32, now + 0.42);
    thudGain.gain.setValueAtTime(0.0001, now);
    thudGain.gain.exponentialRampToValueAtTime(0.65, now + 0.012);
    thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
    thud.connect(thudGain).connect(master);
    thud.start(now);
    thud.stop(now + 0.45);

    // Resonant metal sheet / hull creak.
    const creakLength = 0.3 + severity * 0.75;
    const creak = context.createBufferSource();
    creak.buffer = noiseBuffer;
    const creakFilter = context.createBiquadFilter();
    creakFilter.type = 'bandpass';
    creakFilter.Q.value = 7 + severity * 7;
    creakFilter.frequency.setValueAtTime(420 + severity * 240, now + 0.015);
    creakFilter.frequency.exponentialRampToValueAtTime(1350 + normalSpeed * 22, now + creakLength * 0.55);
    creakFilter.frequency.exponentialRampToValueAtTime(560, now + creakLength);
    const creakGain = context.createGain();
    creakGain.gain.setValueAtTime(0.0001, now);
    creakGain.gain.exponentialRampToValueAtTime(0.22 + angle * severity * 0.28, now + 0.035);
    creakGain.gain.exponentialRampToValueAtTime(0.0001, now + creakLength);
    creak.connect(creakFilter).connect(creakGain).connect(master);
    creak.start(now + 0.01);
    creak.stop(now + creakLength + 0.02);

    // Stick-slip ticks: quick bursts make the creak feel mechanical.
    const ticks = 3 + Math.round(severity * 5);
    for (let index = 0; index < ticks; index += 1) {
      const tick = context.createBufferSource();
      tick.buffer = noiseBuffer;
      const tickFilter = context.createBiquadFilter();
      tickFilter.type = 'bandpass';
      tickFilter.frequency.value = 900 + index * 95 + severity * 320;
      tickFilter.Q.value = 12;
      const tickGain = context.createGain();
      const start = now + 0.035 + index * (0.055 + (1 - severity) * 0.025);
      const gain = (0.08 + severity * 0.12) * (1 - index / (ticks + 1));
      tickGain.gain.setValueAtTime(0.0001, start);
      tickGain.gain.exponentialRampToValueAtTime(gain, start + 0.006);
      tickGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.075);
      tick.connect(tickFilter).connect(tickGain).connect(master);
      tick.start(start);
      tick.stop(start + 0.09);
    }
  } catch {
    // Audio is optional: never break flight if a browser blocks WebAudio.
  }
}
