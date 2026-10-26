import { BODY_RADIUS_SCALE } from './scale';

// 真实半长轴（km）用于主要卫星；其余小卫星按母星系统整体放大到行星外，
// 因缺少逐颗真实轨道会保留近似距离，并在 README 中注明。
const REAL_MOON_ORBIT_KM = {
  moon: 384400,
  phobos: 9376,
  deimos: 23463,
  io: 421700,
  europa: 671100,
  ganymede: 1070400,
  callisto: 1882700,
  mimas: 185540,
  enceladus: 238040,
  tethys: 294670,
  dione: 377420,
  rhea: 527070,
  titan: 1221870,
  hyperion: 1500933,
  iapetus: 3560820,
  miranda: 129390,
  ariel: 190900,
  umbriel: 266000,
  titania: 435910,
  oberon: 583520,
  triton: 354759,
  proteus: 117647,
  nereid: 5513400,
  charon: 19591,
};

const MOON_FALLBACK_SCALE = {
  earth: 1,
  mars: 1,
  jupiter: 20,
  saturn: 20,
  uranus: 20,
  neptune: 20,
  pluto: 8,
  haumea: 8,
  makemake: 8,
  eris: 8,
};

const moon = (id, name, en, parent, radiusKm, orbitRadius, periodDays, options = {}) => ({
  id,
  type: 'moon',
  name,
  en,
  parent,
  radiusKm,
  visualRadius: radiusKm * BODY_RADIUS_SCALE,
  orbitRadius,
  periodDays,
  axialTilt: 0,
  rotationHours: periodDays * 24,
  ...options,
});

export const MOONS = [
  moon('moon', '月球', 'THE MOON', 'earth', 1737.4, 5.4, 27.3217, {
    texture: 'planets/4k/4k_moon.jpg',
    color: '#c8c3b9',
    major: true,
    phase: 2.6,
    fact: '潮汐锁定地球；静海基地留有阿波罗 11 号的脚印与月球车。',
  }),

  moon('phobos', '火卫一', 'PHOBOS', 'mars', 11.3, 3.0, 0.31891, {
    texture: 'moons/phobos.jpg',
    color: '#8a7768',
    major: true,
    phase: 1.4,
    fact: '正缓慢坠向火星，约 3,000 万至 5,000 万年后可能解体。',
  }),
  moon('deimos', '火卫二', 'DEIMOS', 'mars', 6.2, 4.1, 1.263, {
    texture: 'moons/deimos.jpg',
    color: '#9a8878',
    major: true,
    phase: 4.2,
    fact: '表面被细粒尘埃覆盖，外观比火卫一平滑。',
  }),

  moon('io', '木卫一', 'IO', 'jupiter', 1821.6, 13.8, 1.769, {
    texture: 'moons/io.jpg',
    color: '#e6d36a',
    major: true,
    phase: 0.2,
    fact: '太阳系火山活动最剧烈的天体，表面持续被硫磺重塑。',
  }),
  moon('europa', '木卫二', 'EUROPA', 'jupiter', 1560.8, 16.8, 3.551, {
    texture: 'moons/europa.jpg',
    color: '#d9d4c8',
    major: true,
    phase: 2.1,
    fact: '冰壳下可能存在全球性液态海洋，是寻找地外生命的重点目标。',
  }),
  moon('ganymede', '木卫三', 'GANYMEDE', 'jupiter', 2634.1, 20.5, 7.155, {
    texture: 'moons/ganymede.jpg',
    color: '#b9ae9e',
    major: true,
    phase: 4.6,
    fact: '太阳系最大的卫星，比水星还大，并拥有自身磁场。',
  }),
  moon('callisto', '木卫四', 'CALLISTO', 'jupiter', 2410.3, 25.0, 16.689, {
    texture: 'moons/callisto.jpg',
    color: '#9c9184',
    major: true,
    phase: 5.5,
    fact: '太阳系撞击坑最密集的古老表面之一。',
  }),
  moon('amalthea', '木卫五', 'AMALTHEA', 'jupiter', 83.5, 11.2, 0.498, {
    color: '#a56f58',
    phase: 2.8,
  }),
  moon('thebe', '木卫十四', 'THEBE', 'jupiter', 49.3, 12.0, 0.675, {
    color: '#8f6554',
    phase: 0.9,
  }),
  moon('himalia', '木卫六', 'HIMALIA', 'jupiter', 85, 31.0, 250.6, {
    color: '#8e8478',
    phase: 3.7,
  }),
  moon('elara', '木卫七', 'ELARA', 'jupiter', 43, 34.0, 259.6, { color: '#7f776d', phase: 1.9 }),
  moon('pasiphae', '木卫八', 'PASIPHAE', 'jupiter', 30, 38.0, 743, { color: '#736c62', phase: 5.9 }),
  moon('sinope', '木卫九', 'SINOPE', 'jupiter', 19, 41.0, 758, { color: '#6f675d', phase: 2.6 }),
  moon('lysithea', '木卫十', 'LYSITHEA', 'jupiter', 21, 44.0, 776, { color: '#7d7469', phase: 4.8 }),
  moon('carme', '木卫十一', 'CARME', 'jupiter', 23, 47.0, 734, { color: '#6d645a', phase: 0.4 }),
  moon('ananke', '木卫十二', 'ANANKE', 'jupiter', 14, 50.0, 629, { color: '#75695f', phase: 3.1 }),
  moon('leda', '木卫十三', 'LEDA', 'jupiter', 10, 53.0, 240, { color: '#7f7468', phase: 1.5 }),

  moon('mimas', '土卫一', 'MIMAS', 'saturn', 198.2, 10.6, 0.942, {
    texture: 'moons/mimas.jpg',
    color: '#c5c2ba',
    major: true,
    phase: 2.2,
    fact: '巨大的赫歇尔撞击坑让它看起来像“死星”。',
  }),
  moon('enceladus', '土卫二', 'ENCELADUS', 'saturn', 252.1, 12.2, 1.37, {
    texture: 'moons/enceladus.jpg',
    color: '#e7eef0',
    major: true,
    phase: 5.2,
    fact: '南极虎纹裂缝喷出含盐水汽羽流，冰壳下可能有海洋。',
  }),
  moon('tethys', '土卫三', 'TETHYS', 'saturn', 531.1, 14.2, 1.888, {
    texture: 'moons/tethys.jpg',
    color: '#d3d1c8',
    major: true,
    phase: 1.1,
    fact: '伊萨卡峡谷长约 2,000 km。',
  }),
  moon('dione', '土卫四', 'DIONE', 'saturn', 561.4, 16.4, 2.737, {
    texture: 'moons/dione.jpg',
    color: '#cfccc2',
    major: true,
    phase: 4.4,
  }),
  moon('rhea', '土卫五', 'RHEA', 'saturn', 763.8, 19.0, 4.518, {
    texture: 'moons/rhea.jpg',
    color: '#d0cdc3',
    major: true,
    phase: 0.8,
  }),
  moon('titan', '土卫六', 'TITAN', 'saturn', 2574.7, 23.2, 15.945, {
    texture: 'moons/titan.jpg',
    color: '#d9a85c',
    major: true,
    phase: 3.5,
    fact: '拥有浓密氮气大气与液态甲烷湖泊，是太阳系唯一有厚大气的卫星。',
  }),
  moon('hyperion', '土卫七', 'HYPERION', 'saturn', 135, 26.0, 21.277, {
    color: '#bda58b',
    phase: 5.7,
  }),
  moon('iapetus', '土卫八', 'IAPETUS', 'saturn', 734.5, 29.5, 79.32, {
    texture: 'moons/iapetus.jpg',
    color: '#9d9283',
    major: true,
    phase: 2.9,
    fact: '一面亮如雪、一面暗如煤，拥有巨大的赤道脊。',
  }),
  moon('phoebe', '土卫九', 'PHOEBE', 'saturn', 106.5, 33.0, 550.3, {
    texture: 'moons/phoebe.jpg',
    color: '#695f56',
    phase: 1.7,
    retrograde: true,
  }),
  moon('janus', '土卫十', 'JANUS', 'saturn', 89.5, 10.1, 0.694, { color: '#b8b4aa', phase: 4.0 }),
  moon('epimetheus', '土卫十一', 'EPIMETHEUS', 'saturn', 58.1, 10.4, 0.694, { color: '#b0aca2', phase: 0.5 }),
  moon('prometheus', '土卫十六', 'PROMETHEUS', 'saturn', 43.1, 9.5, 0.613, { color: '#aaa69c', phase: 3.3 }),
  moon('pandora', '土卫十七', 'PANDORA', 'saturn', 40.7, 9.9, 0.629, { color: '#a8a49a', phase: 5.6 }),
  moon('pan', '土卫十八', 'PAN', 'saturn', 14.1, 8.8, 0.575, { color: '#a5a197', phase: 2.4 }),
  moon('atlas', '土卫十五', 'ATLAS', 'saturn', 15.1, 9.2, 0.602, { color: '#aba79d', phase: 0.2 }),
  moon('calypso', '土卫十四', 'CALYPSO', 'saturn', 10.7, 14.6, 1.888, { color: '#b2aea4', phase: 1.3 }),
  moon('telesto', '土卫十三', 'TELESTO', 'saturn', 12.4, 14.0, 1.888, { color: '#b6b2a8', phase: 4.9 }),
  moon('helene', '土卫十二', 'HELENE', 'saturn', 17.6, 16.8, 2.737, { color: '#b4b0a6', phase: 3.8 }),
  moon('daphnis', '土卫三十五', 'DAPHNIS', 'saturn', 3.8, 8.5, 0.594, { color: '#9f9b91', phase: 2.0 }),

  moon('miranda', '天卫五', 'MIRANDA', 'uranus', 235.8, 10.8, 1.413, {
    texture: 'moons/miranda.jpg',
    color: '#c0c6c9',
    major: true,
    phase: 1.2,
    fact: '维罗纳断崖高达约 20 km，是太阳系最高的悬崖之一。',
  }),
  moon('ariel', '天卫一', 'ARIEL', 'uranus', 578.9, 13.2, 2.52, {
    texture: 'moons/ariel.jpg',
    color: '#c7cccd',
    major: true,
    phase: 4.1,
  }),
  moon('umbriel', '天卫二', 'UMBRIEL', 'uranus', 584.7, 15.4, 4.144, {
    texture: 'moons/umbriel.jpg',
    color: '#9ca1a3',
    major: true,
    phase: 2.7,
  }),
  moon('titania', '天卫三', 'TITANIA', 'uranus', 788.4, 18.2, 8.706, {
    texture: 'moons/titania.jpg',
    color: '#bfc4c5',
    major: true,
    phase: 0.7,
  }),
  moon('oberon', '天卫四', 'OBERON', 'uranus', 761.4, 21.0, 13.463, {
    texture: 'moons/oberon.jpg',
    color: '#b2b7b8',
    major: true,
    phase: 5.0,
  }),
  moon('puck', '天卫十五', 'PUCK', 'uranus', 81, 9.6, 0.762, { color: '#aeb3b4', phase: 3.6 }),
  moon('sycorax', '天卫十七', 'SYCORAX', 'uranus', 75, 28.0, 1288, { color: '#7f8486', phase: 1.9 }),
  moon('portia', '天卫十二', 'PORTIA', 'uranus', 67.6, 8.8, 0.513, { color: '#a7acad', phase: 5.4 }),
  moon('juliet', '天卫十一', 'JULIET', 'uranus', 46.8, 8.4, 0.493, { color: '#a9aeb0', phase: 2.2 }),
  moon('belinda', '天卫十四', 'BELINDA', 'uranus', 40.3, 9.0, 0.624, { color: '#a5aaac', phase: 4.7 }),
  moon('cressida', '天卫九', 'CRESSIDA', 'uranus', 39.8, 8.0, 0.463, { color: '#aaaeb0', phase: 0.3 }),
  moon('desdemona', '天卫十', 'DESDEMONA', 'uranus', 32, 8.2, 0.474, { color: '#a8acae', phase: 3.9 }),
  moon('rosalind', '天卫十三', 'ROSALIND', 'uranus', 36, 8.6, 0.558, { color: '#a6aaac', phase: 1.4 }),
  moon('bianca', '天卫八', 'BIANCA', 'uranus', 25.7, 7.8, 0.435, { color: '#a4a8aa', phase: 5.1 }),
  moon('cordelia', '天卫六', 'CORDELIA', 'uranus', 20.1, 7.2, 0.335, { color: '#a2a6a8', phase: 2.8 }),
  moon('ophelia', '天卫七', 'OPHELIA', 'uranus', 21.4, 7.4, 0.376, { color: '#a3a7a9', phase: 4.3 }),
  moon('perdita', '天卫二十五', 'PERDITA', 'uranus', 13.3, 9.2, 0.638, { color: '#9fa3a5', phase: 0.9 }),
  moon('mab', '天卫二十六', 'MAB', 'uranus', 12, 10.0, 0.923, { color: '#9da1a3', phase: 3.2 }),
  moon('cupid', '天卫二十七', 'CUPID', 'uranus', 9, 9.4, 0.618, { color: '#9b9fa1', phase: 1.8 }),
  moon('caliban', '天卫十六', 'CALIBAN', 'uranus', 36, 25.0, 579.7, { color: '#6f7476', phase: 5.8 }),
  moon('francisco', '天卫二十二', 'FRANCISCO', 'uranus', 11, 24.0, 266.6, { color: '#6d7274', phase: 2.5 }),
  moon('trinculo', '天卫二十一', 'TRINCULO', 'uranus', 9, 26.0, 749, { color: '#6b7072', phase: 4.6 }),
  moon('stephano', '天卫二十', 'STEPHANO', 'uranus', 16, 27.0, 677, { color: '#707577', phase: 0.6 }),
  moon('setebos', '天卫十九', 'SETEBOS', 'uranus', 24, 29.0, 2235, { color: '#686d6f', phase: 3.4 }),
  moon('prospero', '天卫十八', 'PROSPERO', 'uranus', 25, 30.0, 1978, { color: '#6a6f71', phase: 1.0 }),
  moon('margaret', '天卫二十三', 'MARGARET', 'uranus', 10, 31.0, 1694, { color: '#656a6c', phase: 5.3 }),
  moon('ferdinand', '天卫二十四', 'FERDINAND', 'uranus', 6, 32.0, 2887, { color: '#63686a', phase: 2.0 }),

  moon('triton', '海卫一', 'TRITON', 'neptune', 1353.4, 11.6, 5.877, {
    texture: 'moons/triton.jpg',
    color: '#c9d4d6',
    major: true,
    phase: 2.6,
    retrograde: true,
    fact: '逆行公转，表面有氮冰间歇泉，可能是被捕获的柯伊伯带天体。',
  }),
  moon('proteus', '海卫八', 'PROTEUS', 'neptune', 210, 8.8, 1.122, {
    color: '#8e9496',
    major: true,
    phase: 4.2,
  }),
  moon('nereid', '海卫二', 'NEREID', 'neptune', 170, 15.0, 360.1, {
    color: '#9fa5a7',
    major: true,
    phase: 0.8,
  }),
  moon('larissa', '海卫七', 'LARISSA', 'neptune', 97, 7.8, 0.555, { color: '#919799', phase: 3.0 }),
  moon('galatea', '海卫六', 'GALATEA', 'neptune', 87, 7.4, 0.429, { color: '#8f9597', phase: 5.5 }),
  moon('despina', '海卫五', 'DESPINA', 'neptune', 75, 7.0, 0.335, { color: '#8d9395', phase: 1.6 }),
  moon('thalassa', '海卫四', 'THALASSA', 'neptune', 41, 6.6, 0.311, { color: '#8b9193', phase: 4.4 }),
  moon('naiad', '海卫三', 'NAIAD', 'neptune', 33, 6.2, 0.294, { color: '#898f91', phase: 0.2 }),
  moon('halimede', '海卫九', 'HALIMEDE', 'neptune', 31, 18.0, 1879, { color: '#7d8385', phase: 2.9 }),
  moon('sao', '海卫十一', 'SAO', 'neptune', 22, 21.0, 2913, { color: '#7b8183', phase: 5.0 }),
  moon('laomedeia', '海卫十二', 'LAOMEDEIA', 'neptune', 21, 24.0, 3172, { color: '#797f81', phase: 1.3 }),
  moon('psamathe', '海卫十', 'PSAMATHE', 'neptune', 19, 27.0, 9074, { color: '#777d7f', phase: 3.8 }),
  moon('neso', '海卫十三', 'NESO', 'neptune', 30, 30.0, 9374, { color: '#757b7d', phase: 0.5 }),
  moon('hippocamp', '海卫十四', 'HIPPOCAMP', 'neptune', 17.4, 9.2, 0.95, { color: '#8a9092', phase: 2.1 }),

  moon('charon', '冥卫一', 'CHARON', 'pluto', 606, 2.4, 6.387, {
    texture: 'moons/charon.jpg',
    color: '#b8b5ad',
    major: true,
    phase: 1.0,
    fact: '与冥王星潮汐锁定，两者围绕共同质心旋转。',
  }),
  moon('nix', '冥卫二', 'NIX', 'pluto', 24.5, 3.2, 24.86, { color: '#b0ada5', phase: 3.5 }),
  moon('hydra', '冥卫三', 'HYDRA', 'pluto', 25.5, 3.8, 38.2, { color: '#aeaba3', phase: 5.2 }),
  moon('kerberos', '冥卫四', 'KERBEROS', 'pluto', 9.5, 4.4, 32.17, { color: '#9f9c94', phase: 2.2 }),
  moon('styx', '冥卫五', 'STYX', 'pluto', 8.5, 3.5, 20.16, { color: '#a5a29a', phase: 0.7 }),

  moon('dysnomia', '迪丝诺美亚', 'DYSNOMIA', 'eris', 350, 1.8, 15.77, {
    color: '#aaa7a0',
    major: true,
    phase: 2.3,
  }),
  moon('hiiaka', '妊卫一', "HI'Iaka", 'haumea', 160, 0.1, 2.2, 49.1, { color: '#c2c8cc', phase: 4.0 }),
  moon('namaka', '妊卫二', 'NAMAKA', 'haumea', 85, 1.6, 18.3, { color: '#b8bec2', phase: 1.5 }),
  moon('mk2', '鸟卫一', 'MK 2', 'makemake', 87, 1.7, 12.4, { color: '#b0a99e', phase: 3.2 }),
];

// 卫星轨道随母星的真实尺寸变化同步放大，避免卫星没入行星本体。
const MOON_ORBIT_GROWTH = {
  earth: 1,
  mars: 0.83,
  jupiter: 3.61,
  saturn: 3.55,
  uranus: 2.32,
  neptune: 2.35,
  pluto: 0.58,
};
for (const m of MOONS) {
  const realKm = REAL_MOON_ORBIT_KM[m.id];
  if (realKm) {
    m.orbitRadius = Number((realKm * BODY_RADIUS_SCALE).toFixed(2));
  } else {
    m.orbitRadius = Number(
      (m.orbitRadius * (MOON_ORBIT_GROWTH[m.parent] ?? 1) * (MOON_FALLBACK_SCALE[m.parent] ?? 1)).toFixed(2),
    );
  }
}

export const MOONS_BY_PARENT = new Map();
for (const m of MOONS) {
  if (!MOONS_BY_PARENT.has(m.parent)) MOONS_BY_PARENT.set(m.parent, []);
  MOONS_BY_PARENT.get(m.parent).push(m);
}
export const MOON_BY_ID = new Map(MOONS.map((m) => [m.id, m]));
