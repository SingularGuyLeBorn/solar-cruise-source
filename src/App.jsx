import { useEffect, useState } from 'react';
import { SpaceScene, CockpitOverlay } from './scene/SpaceScene';
import { CesiumEarth } from './earth/CesiumEarth';
import { HUD } from './ui/HUD';
import { useFlightStore } from './state/useFlightStore';
import { flightState } from './state/flightState';
import { Matrix4, Vector3 } from 'three';
import { getPosition, worldState } from './state/worldState';

function BootOverlay({ onStart }) {
  return (
    <div className="boot-overlay">
      <div className="boot-grid" />
      <div className="boot-content">
        <span className="eyebrow">HUMAN FLIGHT SYSTEMS · 航行终端</span>
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
            <strong>∞</strong>
            <span>曲率档位</span>
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
        <p className="boot-note">点击画面可锁定鼠标；Esc 释放。首次载入贴图需要几秒。</p>
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
        store: useFlightStore,
        flightState,
        worldState,
        getPosition,
        teleport(id, distance = 4, view = 'cockpit') {
          const targetPosition = getPosition(id);
          if (!targetPosition) return;
          const offset = new Vector3(0.25, 0.18, 1).normalize().multiplyScalar(distance);
          const position = targetPosition.clone().add(offset);
          const matrix = new Matrix4().lookAt(position, targetPosition, new Vector3(0, 1, 0));
          flightState.position.copy(position);
          flightState.quaternion.setFromRotationMatrix(matrix);
          flightState.speedC = 0;
          flightState.throttle = 0;
          flightState.warp = 0;
          useFlightStore.getState().setTarget(id);
          useFlightStore.getState().setView(view);
          useFlightStore.getState().setEarthMode(false);
        },
      };
    }
  }, []);

  const start = () => {
    setBooted(true);
    addLog('先驱者号已进入自由飞行。曲率引擎待命。');
  };

  const lockPointer = (event) => {
    if (event.target.tagName === 'CANVAS') event.target.requestPointerLock?.();
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
      <div className="pointer-hint">点击画面锁定鼠标 · Esc 释放</div>
    </div>
  );
}
