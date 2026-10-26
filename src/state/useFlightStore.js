import { create } from 'zustand';
import { BODY_BY_ID, PLANETS, SUN } from '../data/solarSystem';
import { MOON_BY_ID } from '../data/moons';
import { HOLO_ARTIFACTS } from '../data/holoArtifacts';
import { flashShield, flightState } from './flightState';

const SIM_SPEEDS = [
  { label: '暂停', value: 0 },
  { label: '1×', value: 1 / 86400 },
  { label: '1 天/秒', value: 1 },
  { label: '10 天/秒', value: 10 },
  { label: '1 年/秒', value: 365.256 },
];

export const useFlightStore = create((set, get) => ({
  viewMode: 'cockpit',
  audioEnabled: true,
  engineOn: true,
  shield: false,
  throttle: 0,
  warp: 0,
  speedC: 0,
  gamma: 1,
  externalSeconds: 0,
  shipSeconds: 0,
  simSpeedIndex: 1,
  targetId: 'earth',
  nearId: null,
  nearDistance: Infinity,
  helpOpen: false,
  jumpOpen: false,
  earthMode: false,
  scanResult: null,
  holo: {
    open: true,
    activeProjector: 'solar',
    formKind: 'artifact',
    formId: HOLO_ARTIFACTS[0]?.id ?? 'mask-protruding',
    formPalette: 'preset',
    formAuto: true,
    formGalleryOpen: false,
    formLastInputAt: Date.now(),
  },
  autopilot: {
    enabled: false,
    mode: 'off',
    phase: 'off',
    targetId: null,
    distance: 0,
    speed: 0,
    relativeSpeed: 0,
    positionError: 0,
    attitudeError: 0,
    throttle: 0,
    session: 0,
  },
  log: ['登舰完成。W 朝视线转向推进，S 反推，方向键转向，V 切换视角。'],
  impactPulse: 0,
  strikePulse: 0,
  strikeMode: 'impact',
  hazard: { mayday: false, kind: 'none', distance: 0, eta: 0 },
  selector: { open: false, previewId: 'earth', lastInputAt: Date.now() },
  solar: {
    activity: 0.3,
    flare: 0,
    flareClass: '—',
    wind: 410,
    sunspots: 4,
    interference: 0.03,
    event: 'QUIET',
  },

  setView(viewMode) {
    flightState.lookYaw = 0;
    set({ viewMode });
  },
  toggleAudio() {
    const next = !get().audioEnabled;
    set({ audioEnabled: next });
    get().addLog(next ? '座舱声音已开启。' : '座舱声音已关闭。');
  },
  toggleEngine() {
    const next = !get().engineOn;
    flightState.engineOn = next;
    set({ engineOn: next });
    get().addLog(next ? '曲率引擎已点火。' : '曲率引擎已关闭。');
  },
  toggleShield() {
    const next = !get().shield;
    flightState.shield = next;
    set({ shield: next });
    if (next) flashShield();
    get().addLog(next ? '离子护盾已展开。' : '离子护盾已收起。');
  },
  setThrottle(value) {
    const throttle = Math.min(1, Math.max(-1, value));
    flightState.throttle = throttle;
    if (throttle < 0 && flightState.warp !== 0) {
      flightState.warp = 0;
      set({ warp: 0 });
    }
    set({ throttle });
  },
  setWarp(value) {
    const warp = Math.min(9, Math.max(0, value));
    flightState.warp = warp;
    if (warp > 0) {
      if (flightState.throttle < 0) {
        flightState.throttle = 0;
        set({ throttle: 0 });
      }
      flightState.speedC = Math.max(0, flightState.speedC);
    }
    if (warp > 0 && !flightState.engineOn) {
      flightState.engineOn = true;
      set({ engineOn: true });
    }
    set({ warp });
  },
  setSimSpeedIndex(index) {
    set({ simSpeedIndex: Math.max(0, Math.min(SIM_SPEEDS.length - 1, index)) });
  },
  cycleSimSpeed() {
    set((state) => ({ simSpeedIndex: (state.simSpeedIndex + 1) % SIM_SPEEDS.length }));
  },
  simSpeedLabel() {
    return SIM_SPEEDS[get().simSpeedIndex].label;
  },
  setTarget(targetId) {
    set({ targetId });
  },
  setNear(nearId, nearDistance) {
    set({ nearId, nearDistance });
  },
  toggleHelp() {
    set((state) => ({ helpOpen: !state.helpOpen }));
  },
  toggleJump() {
    set((state) => ({ jumpOpen: !state.jumpOpen }));
  },
  addLog(text) {
    set((state) => ({ log: [text, ...state.log].slice(0, 5) }));
  },
  jumpTo(targetId) {
    const target = BODY_BY_ID.get(targetId) ?? MOON_BY_ID.get(targetId);
    if (!target) return;
    if (get().autopilot.enabled) get().disengageAutopilot('jump');
    set((state) => ({
      targetId,
      jumpOpen: false,
      earthMode: false,
      simSpeedIndex: 1,
      selector: { ...state.selector, open: false },
    }));
    flightState.jumpRequest = targetId;
    get().addLog(`跳跃目标锁定：${target.name}。曲率场充能中…`);
  },
  requestAsteroidStrike(mode = 'impact') {
    set((state) => ({ strikePulse: state.strikePulse + 1, strikeMode: mode }));
  },
  setHazard(patch) {
    set((state) => ({ hazard: { ...state.hazard, ...patch } }));
  },
  toggleSelector() {
    set((state) => ({
      jumpOpen: false,
      holo: { ...state.holo, formGalleryOpen: false },
      selector: {
        ...state.selector,
        open: !state.selector.open,
        lastInputAt: Date.now(),
      },
    }));
  },
  closeSelector() {
    set((state) => ({ selector: { ...state.selector, open: false } }));
  },
  setSelectorPreview(previewId) {
    set((state) => ({
      selector: { ...state.selector, previewId, lastInputAt: Date.now() },
      holo: { ...state.holo, activeProjector: 'solar' },
    }));
  },
  cycleSelector(direction = 1) {
    const order = [SUN, ...PLANETS];
    const current = order.findIndex((body) => body.id === get().selector.previewId);
    const next = order[(current + direction + order.length) % order.length];
    set((state) => ({
      selector: {
        ...state.selector,
        previewId: next?.id ?? state.selector.previewId,
        lastInputAt: Date.now(),
      },
    }));
  },
  setSolar(patch) {
    set((state) => ({ solar: { ...state.solar, ...patch } }));
  },
  triggerImpactTest() {
    get().requestAsteroidStrike();
  },
  registerShieldImpact() {
    set((state) => ({ impactPulse: state.impactPulse + 1 }));
  },
  scanNearby() {
    const { nearId } = get();
    const body = BODY_BY_ID.get(nearId) ?? MOON_BY_ID.get(nearId);
    if (!body) {
      get().addLog('附近没有可扫描的天体。');
      return;
    }
    flightState.scanPulse = performance.now() / 1000;
    set({ scanResult: body });
    get().addLog(`扫描完成：${body.name}，${body.facts?.[0] ?? body.fact ?? '已记录基础参数。'}`);
  },
  clearScan() {
    set({ scanResult: null });
  },
  toggleHolo() {
    set((state) => ({
      holo: {
        ...state.holo,
        open: !state.holo.open,
        formGalleryOpen: false,
        formLastInputAt: Date.now(),
      },
      selector: { ...state.selector, lastInputAt: Date.now() },
    }));
  },
  openFormGallery() {
    set((state) => ({
      holo: {
        ...state.holo,
        open: true,
        formGalleryOpen: true,
        formLastInputAt: Date.now(),
      },
      selector: { ...state.selector, open: false },
    }));
  },
  closeFormGallery() {
    set((state) => ({
      holo: { ...state.holo, formGalleryOpen: false, formLastInputAt: Date.now() },
    }));
  },
  toggleFormGallery() {
    const state = get();
    if (state.holo.formGalleryOpen) state.closeFormGallery();
    else state.openFormGallery();
  },
  setActiveProjector(activeProjector) {
    if (!['solar', 'collection'].includes(activeProjector)) return;
    set((state) => ({
      holo: { ...state.holo, activeProjector, formLastInputAt: Date.now() },
    }));
  },
  setHoloFormKind() {
    set((state) => ({
      holo: {
        ...state.holo,
        activeProjector: 'collection',
        formKind: 'artifact',
        formId: HOLO_ARTIFACTS[0]?.id ?? state.holo.formId,
        formLastInputAt: Date.now(),
      },
    }));
  },
  setHoloForm(formKind, formId) {
    set((state) => ({
      holo: {
        ...state.holo,
        activeProjector: 'collection',
        formKind: 'artifact',
        formId,
        open: true,
        formLastInputAt: Date.now(),
      },
    }));
  },
  setHoloFormPalette(formPalette) {
    set((state) => ({
      holo: { ...state.holo, formPalette, formLastInputAt: Date.now() },
    }));
  },
  toggleHoloFormAuto() {
    set((state) => ({
      holo: {
        ...state.holo,
        formAuto: !state.holo.formAuto,
        formLastInputAt: Date.now(),
      },
    }));
  },
  cycleHoloForm(direction = 1) {
    const state = get();
    if (!HOLO_ARTIFACTS.length) return;
    const current = HOLO_ARTIFACTS.findIndex((form) => form.id === state.holo.formId);
    const next = HOLO_ARTIFACTS[(current + direction + HOLO_ARTIFACTS.length) % HOLO_ARTIFACTS.length];
    set((previous) => ({
      holo: {
        ...previous.holo,
        activeProjector: 'collection',
        formKind: 'artifact',
        formId: next.id,
        formLastInputAt: Date.now(),
      },
    }));
  },
  cycleActiveProjector(direction = 1) {
    const state = get();
    if (state.holo.activeProjector === 'collection') state.cycleHoloForm(direction);
    else state.cycleSelector(direction);
  },
  setEarthMode(earthMode) {
    if (earthMode && get().autopilot.enabled) get().disengageAutopilot('earth');
    set((state) => ({
      earthMode,
      selector: earthMode ? { ...state.selector, open: false } : state.selector,
      holo: earthMode ? { ...state.holo, formGalleryOpen: false } : state.holo,
    }));
    if (earthMode) get().addLog('进入 Cesium 地球轨道视图。');
  },
  engageAutopilot(mode = 'hold') {
    if (!['hold', 'point', 'approach'].includes(mode)) return;
    const state = get();
    const target = BODY_BY_ID.get(state.targetId) ?? MOON_BY_ID.get(state.targetId);
    if (mode !== 'hold' && !target) {
      get().addLog('自动驾驶：没有锁定目标。');
      return;
    }
    if (!flightState.engineOn) {
      flightState.engineOn = true;
      set({ engineOn: true });
    }
    flightState.warp = 0;
    flightState.throttle = 0;
    flightState.speedC = 0;
    set((previous) => ({
      throttle: 0,
      warp: 0,
      simSpeedIndex: 1,
      autopilot: {
        ...previous.autopilot,
        enabled: true,
        mode,
        phase: 'initializing',
        targetId: state.targetId,
        distance: 0,
        speed: 0,
        relativeSpeed: 0,
        positionError: 0,
        attitudeError: 0,
        throttle: 0,
        session: previous.autopilot.session + 1,
      },
    }));
    get().addLog(
      mode === 'approach'
        ? `自动驾驶：前往 ${target.name}。`
        : mode === 'point'
          ? `自动驾驶：指向 ${target.name}。`
          : '自动驾驶：位置保持。',
    );
  },
  disengageAutopilot(reason = 'manual') {
    const state = get();
    if (!state.autopilot.enabled) return;
    flightState.throttle = 0;
    flightState.warp = 0;
    flightState.speedC = 0;
    set({
      throttle: 0,
      warp: 0,
      speedC: 0,
      autopilot: { ...state.autopilot, enabled: false, mode: 'off', phase: 'off', throttle: 0 },
    });
    const messages = {
      manual: '手动输入接管，自动驾驶解除。',
      jump: '跳跃程序接管，自动驾驶解除。',
      earth: '切换 Cesium 视图，自动驾驶解除。',
      toggle: '自动驾驶已关闭。',
      error: '自动驾驶初始化失败，已退回手动控制。',
      impact: '护盾吸收撞击，自动驾驶解除。',
    };
    get().addLog(messages[reason] ?? '自动驾驶已关闭。');
  },
  setAutopilotStatus(patch) {
    set((state) => ({ autopilot: { ...state.autopilot, ...patch } }));
  },
  simSpeedValue() {
    return SIM_SPEEDS[get().simSpeedIndex].value;
  },
}));

export { SIM_SPEEDS };

export function nearestTargetLabel(state) {
  const target = BODY_BY_ID.get(state.targetId);
  return target ?? null;
}
