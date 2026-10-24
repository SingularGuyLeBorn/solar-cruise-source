import { create } from 'zustand';
import { BODY_BY_ID, PLANETS } from '../data/solarSystem';
import { MOON_BY_ID } from '../data/moons';
import { flashShield, flightState, triggerShieldImpact } from './flightState';

const SIM_SPEEDS = [
  { label: '暂停', value: 0 },
  { label: '1×', value: 1 / 86400 },
  { label: '1 天/秒', value: 1 },
  { label: '10 天/秒', value: 10 },
  { label: '1 年/秒', value: 365.256 },
];

export const useFlightStore = create((set, get) => ({
  viewMode: 'cockpit',
  engineOn: true,
  shield: true,
  throttle: 0,
  warp: 0,
  speedC: 0,
  gamma: 1,
  externalSeconds: 0,
  shipSeconds: 0,
  simSpeedIndex: 2,
  targetId: 'earth',
  nearId: null,
  nearDistance: Infinity,
  helpOpen: false,
  jumpOpen: false,
  earthMode: false,
  scanResult: null,
  log: ['登舰完成。W/S 调速，方向键转向，V 切换视角。'],
  impactPulse: 0,

  setView(viewMode) {
    flightState.lookYaw = 0;
    set({ viewMode });
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
    const throttle = Math.min(1, Math.max(0, value));
    flightState.throttle = throttle;
    set({ throttle });
  },
  setWarp(value) {
    const warp = Math.min(9, Math.max(0, value));
    flightState.warp = warp;
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
    const target = BODY_BY_ID.get(targetId) ?? PLANETS.find((planet) => planet.id === targetId);
    if (!target) return;
    set({ targetId, jumpOpen: false, earthMode: false });
    flightState.jumpRequest = targetId;
    get().addLog(`跳跃目标锁定：${target.name}。曲率场充能中…`);
  },
  triggerImpactTest() {
    triggerShieldImpact({ x: 0.4, y: 0.7, z: 0.2 });
    set((state) => ({ impactPulse: state.impactPulse + 1 }));
    get().addLog('检测到冲击波，离子护盾产生涟漪。');
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
  setEarthMode(earthMode) {
    set({ earthMode });
    if (earthMode) get().addLog('进入 Cesium 地球轨道视图。');
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
