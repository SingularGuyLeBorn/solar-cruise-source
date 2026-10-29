import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BODY_BY_ID } from '../data/solarSystem';
import { flightState } from '../state/flightState';
import { useFlightStore, SIM_SPEEDS } from '../state/useFlightStore';

function releaseTouch() {
  flightState.touchPitch = 0;
  flightState.touchYaw = 0;
  flightState.touchRoll = 0;
}

export function MobileControls() {
  const throttle = useFlightStore((state) => state.throttle);
  const warp = useFlightStore((state) => state.warp);
  const simSpeedIndex = useFlightStore((state) => state.simSpeedIndex);
  const autopilot = useFlightStore((state) => state.autopilot);
  const selectorOpen = useFlightStore((state) => state.selector.open);
  const previewId = useFlightStore((state) => state.selector.previewId);
  const selectedBody = BODY_BY_ID.get(previewId);
  const earthMode = useFlightStore((state) => state.earthMode);
  const [panelOpen, setPanelOpen] = useState(false);
  const root = useRef();
  const pad = useRef();
  const knob = useRef();

  useLayoutEffect(() => {
    if (selectorOpen || earthMode) return undefined;
    const element = root.current;
    const hud = element?.closest('.hud');
    if (!element || !hud) return undefined;
    const sync = () =>
      hud.style.setProperty('--mobile-deck-h', `${Math.round(element.getBoundingClientRect().height)}px`);
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(element);
    return () => {
      observer.disconnect();
      hud.style.removeProperty('--mobile-deck-h');
    };
  }, [selectorOpen, earthMode]);

  useEffect(
    () => () => {
      releaseTouch();
    },
    [],
  );

  useEffect(() => {
    if (!selectorOpen) return;
    releaseTouch();
  }, [selectorOpen]);

  if (selectorOpen || earthMode) return null;

  const steer = (event) => {
    if (!pad.current || !knob.current) return;
    const rect = pad.current.getBoundingClientRect();
    const rawX = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const rawY = (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    const length = Math.hypot(rawX, rawY);
    const scale = length > 1 ? 1 / length : 1;
    const x = rawX * scale;
    const y = rawY * scale;
    const state = useFlightStore.getState();
    if (state.autopilot.enabled) state.disengageAutopilot('manual');
    flightState.touchYaw = -x * 0.9;
    flightState.touchPitch = -y * 0.9;
    knob.current.style.transform = `translate(${x * 25}px, ${y * 25}px)`;
  };

  const stopSteer = () => {
    flightState.touchYaw = 0;
    flightState.touchPitch = 0;
    if (knob.current) knob.current.style.transform = 'translate(0px, 0px)';
  };

  const roll = (direction) => (event) => {
    event.preventDefault();
    const state = useFlightStore.getState();
    if (state.autopilot.enabled) state.disengageAutopilot('manual');
    flightState.touchRoll = direction;
  };

  const stopRoll = () => {
    flightState.touchRoll = 0;
  };

  const runAndClose = (action) => {
    action();
    setPanelOpen(false);
  };

  return (
    <div ref={root} className={`mobile-controls ${panelOpen ? 'mobile-controls--panel-open' : ''}`}>
      <div
        className="mobile-stick"
        ref={pad}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture?.(event.pointerId);
          steer(event);
        }}
        onPointerMove={(event) => {
          if (event.buttons === 0 && event.pointerType === 'mouse') return;
          steer(event);
        }}
        onPointerUp={stopSteer}
        onPointerCancel={stopSteer}
        onPointerLeave={stopSteer}
      >
        <span className="mobile-stick__base" />
        <button
          type="button"
          className="mobile-stick__knob"
          ref={knob}
          aria-label="方向控制"
          onPointerDown={(event) => {
            event.preventDefault();
            event.currentTarget.parentElement?.setPointerCapture?.(event.pointerId);
            steer(event);
          }}
        />
        <small>STEER</small>
      </div>

      <div className="mobile-throttle-standalone">
        <div className="mobile-throttle-label">
          <span>
            {throttle < 0 ? 'REV' : 'THR'} {Math.round(Math.abs(throttle) * 100)}%
          </span>
          <em>{selectedBody ? (selectedBody.en ?? selectedBody.name) : ''}</em>
        </div>
        <div className="mobile-throttle-track">
          <span>REV</span>
          <input
            type="range"
            min="-1"
            max="1"
            step="0.01"
            value={throttle}
            onChange={(event) => useFlightStore.getState().setThrottle(Number(event.target.value))}
          />
          <span>FWD</span>
        </div>
      </div>

      <button
        type="button"
        className="mobile-panel-toggle"
        aria-expanded={panelOpen}
        onClick={() => setPanelOpen((value) => !value)}
      >
        {panelOpen ? '收起' : '操作'}
      </button>

      {panelOpen && (
        <div className="mobile-panel">
          <div className="mobile-panel__head">
            <span>TOUCH COMMAND / 触控指令</span>
            <button type="button" onClick={() => setPanelOpen(false)}>
              收起
            </button>
          </div>
          <div className="mobile-controls__grid">
            <button type="button" onClick={() => useFlightStore.getState().setWarp(Math.max(0, warp - 1))}>
              WARP−
            </button>
            <button type="button" onClick={() => useFlightStore.getState().setWarp(Math.min(9, warp + 1))}>
              WARP+
            </button>
            <button
              type="button"
              onPointerDown={roll(-1)}
              onPointerUp={stopRoll}
              onPointerLeave={stopRoll}
              onPointerCancel={stopRoll}
            >
              滚转↺
            </button>
            <button
              type="button"
              onPointerDown={roll(1)}
              onPointerUp={stopRoll}
              onPointerLeave={stopRoll}
              onPointerCancel={stopRoll}
            >
              滚转↻
            </button>
            <button type="button" onClick={() => useFlightStore.getState().cycleSimSpeed()}>
              时间 {SIM_SPEEDS[simSpeedIndex].label}
            </button>
            <button
              type="button"
              className={autopilot.enabled && autopilot.mode === 'hold' ? 'active' : ''}
              onClick={() => {
                const state = useFlightStore.getState();
                if (state.autopilot.enabled && state.autopilot.mode === 'hold') {
                  state.disengageAutopilot('toggle');
                } else {
                  state.engageAutopilot('hold');
                }
              }}
            >
              HOLD
            </button>
            <button
              type="button"
              className={autopilot.enabled && autopilot.mode === 'approach' ? 'active' : ''}
              onClick={() => {
                const state = useFlightStore.getState();
                if (state.autopilot.enabled && state.autopilot.mode === 'approach') {
                  state.disengageAutopilot('toggle');
                } else {
                  state.engageAutopilot('approach');
                }
              }}
            >
              FLY
            </button>
            <button
              type="button"
              className={autopilot.enabled && autopilot.mode === 'point' ? 'active' : ''}
              onClick={() => {
                const state = useFlightStore.getState();
                if (state.autopilot.enabled && state.autopilot.mode === 'point') {
                  state.disengageAutopilot('toggle');
                } else {
                  state.engageAutopilot('point');
                }
              }}
            >
              POINT
            </button>
            <button type="button" onClick={() => runAndClose(() => useFlightStore.getState().scanNearby())}>
              扫描
            </button>
            <button
              type="button"
              onClick={() => runAndClose(() => useFlightStore.getState().jumpTo(useFlightStore.getState().targetId))}
            >
              跃迁
            </button>
            <button type="button" onClick={() => runAndClose(() => useFlightStore.getState().toggleSelector())}>
              星图
            </button>
            <button type="button" onClick={() => runAndClose(() => useFlightStore.getState().toggleJump())}>
              目的地
            </button>
            <button type="button" onClick={() => runAndClose(() => useFlightStore.getState().toggleHolo())}>
              投影
            </button>
            <button type="button" onClick={() => runAndClose(() => useFlightStore.getState().openFormGallery())}>
              馆藏
            </button>
            <button
              type="button"
              onClick={() => {
                const state = useFlightStore.getState();
                state.setThrottle(0);
                state.setWarp(0);
              }}
            >
              全停
            </button>
            <button type="button" onClick={() => runAndClose(() => useFlightStore.getState().triggerImpactTest())}>
              撞击
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
