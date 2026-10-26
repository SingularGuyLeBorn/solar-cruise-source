const LIVERIES = [
  {
    name: 'VANGUARD',
    zh: '先驱者号',
    prefix: 'SC',
    hull: '#b1461f',
    accent: '#d06a33',
    ceramic: '#c3c7c2',
    ink: '#1a2229',
  },
  {
    name: 'ODYSSEY',
    zh: '奥德赛号',
    prefix: 'SC',
    hull: '#2f6275',
    accent: '#6fd3e8',
    ceramic: '#c7cfd2',
    ink: '#15242b',
  },
  {
    name: 'AURORA',
    zh: '极光号',
    prefix: 'SC',
    hull: '#7b3f5e',
    accent: '#e0a0c0',
    ceramic: '#d6cdd0',
    ink: '#241a20',
  },
  {
    name: 'PIONEER',
    zh: '开拓者号',
    prefix: 'HD',
    hull: '#6b6f3c',
    accent: '#e5c15a',
    ceramic: '#cdd0c2',
    ink: '#20231a',
  },
  {
    name: 'HELIOS',
    zh: '赫利俄斯号',
    prefix: 'HD',
    hull: '#8c5a2b',
    accent: '#ffbd72',
    ceramic: '#d4d1c6',
    ink: '#241d14',
  },
];

export function mulberry32(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function variantForSeed(seedInput) {
  const seed = Math.abs(Math.trunc(seedInput)) || 1;
  const random = mulberry32(seed);
  const livery = LIVERIES[Math.floor(random() * LIVERIES.length) % LIVERIES.length];
  const serial = String(10 + Math.floor(random() * 89));
  return {
    ...livery,
    seed,
    serial: `${livery.prefix}-${serial}`,
  };
}

const requested = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search).get('ship');
export const SHIP_VARIANT =
  requested === null || requested === ''
    ? { ...LIVERIES[0], seed: 7319, serial: 'SC-01' }
    : variantForSeed(Number(requested));
