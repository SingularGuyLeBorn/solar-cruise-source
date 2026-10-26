export const EARTH_RADIUS_KM = 6371;
export const EARTH_VISUAL_RADIUS = 2.8;
export const BODY_RADIUS_SCALE = EARTH_VISUAL_RADIUS / EARTH_RADIUS_KM;

// 真实比例：行星视觉半径按公里等比换算，轨道距离也按真实 AU 等比换算。
// 唯一非真实量是玩家飞船/驾驶舱——否则在行星尺度下不可见。
export const UNITS_PER_AU = Number(((EARTH_VISUAL_RADIUS / EARTH_RADIUS_KM) * 149_597_870).toFixed(2));
export const ORBIT_DISTANCE_SCALE = 10;
