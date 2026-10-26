export const EPOCH_UTC = Date.UTC(2000, 0, 1, 12);
export const START_DATE = new Date('2026-10-24T00:00:00Z');
export const START_DAYS = (START_DATE.getTime() - EPOCH_UTC) / 86400000;

export function gammaFromSpeedC(v) {
  const clamped = Math.min(Math.abs(v), 0.999999);
  return 1 / Math.sqrt(1 - clamped * clamped);
}

export function formatNumber(value, digits = 0) {
  return Number(value).toLocaleString('zh-CN', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

export function formatClock(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  return `${days}d ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatDateFromDays(days) {
  const date = new Date(EPOCH_UTC + days * 86400000);
  return date.toISOString().slice(0, 10);
}

export function formatTimeFromDays(days) {
  const date = new Date(EPOCH_UTC + days * 86400000);
  return date.toISOString().slice(11, 19);
}

export function formatSpeed(speedC, warp) {
  if (warp > 0) return `WARP ${warp.toFixed(1)}`;
  if (Math.abs(speedC) < 0.001) return '0.00 % c';
  if (speedC < 0) return `REV ${(Math.abs(speedC) * 100).toFixed(2)} % c`;
  return `${speedC.toFixed(4)} c`;
}

export function relativisticSummary(speedC, warp) {
  if (warp > 0) {
    return {
      gamma: 1,
      label: '曲率泡 · 固有时正常',
      note: '曲率驱动不携带局域惯性系，时间膨胀按工程模型显示。',
    };
  }
  const gamma = gammaFromSpeedC(speedC);
  return {
    gamma,
    label: `洛伦兹因子 γ = ${gamma.toFixed(4)}`,
    note: gamma > 1.01 ? `飞船上每秒，外部流逝 ${gamma.toFixed(2)} 秒。` : '低速段相对论效应可忽略。',
  };
}
