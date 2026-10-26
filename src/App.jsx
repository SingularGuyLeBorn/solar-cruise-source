import { useEffect, useState } from 'react';
import { SpaceScene, CockpitOverlay } from './scene/SpaceScene';
import { CesiumEarth } from './earth/CesiumEarth';
import { HUD } from './ui/HUD';
import { useFlightStore } from './state/useFlightStore';
import { flightState } from './state/flightState';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { getPosition, worldState } from './state/worldState';
import { SHIP_VARIANT } from './state/shipVariant';
import { BODY_BY_ID } from './data/solarSystem';
import { MOON_BY_ID } from './data/moons';
import { LANDMARKS_BY_BODY } from './data/landmarks';
import { latLonToVector3 } from './lib/orbits';
import { ensureImpactAudio } from './lib/impactAudio';

function BootOverlay({ onStart }) {
  return (
    <div className="boot-overlay">
      <div className="boot-grid" />
      <div className="boot-content">
        <span className="eyebrow">A QUIET PASSAGE · 航行终端</span>
        <h1>SOLAR CRUISE</h1>
        <h2>太阳系漫游</h2>
        <p>
          你正坐在“先驱者号”的驾驶舱里。曲率引擎已就绪，脚下是地球轨道。去月球看阿波罗脚印，去火星看奥林匹斯山，
          去木星穿过大红斑的风暴边缘，或者打开 Cesium 地球，俯瞰整颗行星。
        </p>
        <div className="boot-stats">
          <div>
            <strong>8</strong>
            <span>行星</span>
          </div>
          <div>
            <strong>5</strong>
            <span>矮行星</span>
          </div>
          <div>
            <strong>100+</strong>
            <span>卫星</span>
          </div>
          <div>
            <strong>9</strong>
            <span>曲率上限</span>
          </div>
        </div>
        <div className="boot-controls">
          <kbd>W / S</kbd>
          <span>油门</span>
          <kbd>方向键</kbd>
          <span>转向</span>
          <kbd>V</kbd>
          <span>视角</span>
          <kbd>Space</kbd>
          <span>跳跃</span>
          <kbd>C</kbd>
          <span>Cesium 地球</span>
        </div>
        <button className="primary boot-start" type="button" onClick={onStart}>
          进入驾驶舱
          <small>ENTER COCKPIT</small>
        </button>
        <p className="boot-note">点击画面锁定鼠标环视，方向键控制飞船；Esc 释放。首次载入贴图需要几秒。</p>
      </div>
    </div>
  );
}

export default function App() {
  const earthMode = useFlightStore((state) => state.earthMode);
  const [booted, setBooted] = useState(false);
  const addLog = useFlightStore((state) => state.addLog);

  useEffect(() => {
    if (new URLSearchParams(location.search).get('debug') === '1') {
      window.__cruise = {
        ship: SHIP_VARIANT,
        store: useFlightStore,
        flightState,
        worldState,
        getPosition,
        teleport(id, distance = 4, view = 'cockpit') {
          const targetPosition = getPosition(id);
          if (!targetPosition) return;
          const target = BODY_BY_ID.get(id) ?? MOON_BY_ID.get(id);
          const safeDistance = target?.visualRadius ? target.visualRadius * 1.35 + 0.8 : 2.4;
          const cameraDistance = Math.max(distance, safeDistance);
          const offset = new Vector3(0.25, 0.18, 1).normalize().multiplyScalar(cameraDistance);
          const cameraPoint = targetPosition.clone().add(offset);
          const matrix = new Matrix4().lookAt(cameraPoint, targetPosition, new Vector3(0, 1, 0));
          const quaternion = new Quaternion().setFromRotationMatrix(matrix);
          const eye = new Vector3(0, 0.38, 0.55).applyQuaternion(quaternion);
          flightState.position.copy(cameraPoint).sub(eye);
          flightState.quaternion.copy(quaternion);
          flightState.speedC = 0;
          flightState.throttle = 0;
          flightState.warp = 0;
          flightState.lookYaw = 0;
          flightState.lookPitch = 0;
          useFlightStore.getState().setTarget(id);
          useFlightStore.getState().setView(view);
          useFlightStore.getState().setEarthMode(false);
          useFlightStore.getState().setSimSpeedIndex(1);
        },
        focusLandmark(bodyId, landmarkId, distance = 0.38) {
          const body = BODY_BY_ID.get(bodyId) ?? MOON_BY_ID.get(bodyId);
          const landmark = LANDMARKS_BY_BODY.get(bodyId)?.find((item) => item.id === landmarkId);
          const center = getPosition(bodyId);
          if (!body || !landmark || !center) return;
          const local = latLonToVector3(landmark.lat, landmark.lon, body.visualRadius * 1.01);
          let spin;
          if (MOON_BY_ID.has(bodyId)) {
            const localPos = worldState.localPositions.get(bodyId) ?? new Vector3();
            spin =
              bodyId === 'moon'
                ? Math.atan2(localPos.z, -localPos.x)
                : (worldState.days / Math.abs(body.periodDays)) * Math.PI * 2 * (body.retrograde ? -1 : 1);
          } else {
            const rotationHours = body.rotationHours || 24;
            spin = (worldState.days / (Math.abs(rotationHours) / 24)) * Math.PI * 2 * (rotationHours < 0 ? -1 : 1);
          }
          local.applyAxisAngle(new Vector3(0, 1, 0), spin);
          if (MOON_BY_ID.has(bodyId) === false && body.axialTilt) {
            local.applyAxisAngle(new Vector3(0, 0, 1), body.axialTilt * (Math.PI / 180));
          }
          const point = center.clone().add(local);
          const normal = local.clone().normalize();
          const tangent = new Vector3().crossVectors(normal, new Vector3(0, 1, 0));
          if (tangent.lengthSq() < 0.01) tangent.set(1, 0, 0);
          tangent.normalize();
          const cameraDistance = distance + 0.9;
          const cameraPoint = point
            .clone()
            .addScaledVector(normal, cameraDistance)
            .addScaledVector(tangent, cameraDistance * 0.18);
          const matrix = new Matrix4().lookAt(cameraPoint, point, normal);
          const quaternion = new Quaternion().setFromRotationMatrix(matrix);
          const eye = new Vector3(0, 0.38, 0.55).applyQuaternion(quaternion);
          flightState.position.copy(cameraPoint).sub(eye);
          flightState.quaternion.copy(quaternion);
          flightState.speedC = 0;
          flightState.throttle = 0;
          flightState.warp = 0;
          flightState.lookYaw = 0;
          flightState.lookPitch = 0;
          useFlightStore.getState().setTarget(bodyId);
          useFlightStore.getState().setView('cockpit');
          useFlightStore.getState().setEarthMode(false);
          useFlightStore.getState().setSimSpeedIndex(1);
        },
      };
    }
  }, []);

  const start = () => {
    ensureImpactAudio();
    setBooted(true);
    addLog('先驱者号已进入自由飞行。曲率引擎待命。');
  };

  const lockPointer = (event) => {
    if (event.pointerType === 'mouse' && event.target.tagName === 'CANVAS') {
      event.target.requestPointerLock?.();
    }
  };

  return (
    <div className="app">
      <div
        className="space-layer"
        style={{ visibility: earthMode ? 'hidden' : 'visible', pointerEvents: earthMode ? 'none' : 'auto' }}
        onPointerDown={lockPointer}
      >
        <SpaceScene active={!earthMode} />
      </div>
      {earthMode && (
        <div className="earth-layer">
          <CesiumEarth />
          <CockpitOverlay />
        </div>
      )}
      <HUD />
      {!booted && <BootOverlay onStart={start} />}
      <div className="pointer-hint">点击画面锁定鼠标环视 · 方向键控船 · Esc 释放</div>
    </div>
  );
}
