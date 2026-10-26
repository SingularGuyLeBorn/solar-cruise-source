import { useEffect, useRef } from 'react';
import { BODY_BY_ID } from '../data/solarSystem';
import { MOON_BY_ID } from '../data/moons';
import { UNITS_PER_AU } from '../data/scale';
import { flightState } from '../state/flightState';
import { getPosition } from '../state/worldState';
import { useFlightStore } from '../state/useFlightStore';
import {
  COCKPIT_FOV,
  cardinal,
  createAttitudeScratch,
  projectDirection,
  projectWorldPoint,
  sampleAttitude,
} from './instruments/attitude';

const LADDER_ANGLES = Array.from({ length: 13 }, (_, index) => (index - 6) * 10).filter(Boolean);

export function CockpitHUD() {
  const viewMode = useFlightStore((state) => state.viewMode);
  const earthMode = useFlightStore((state) => state.earthMode);
  const root = useRef(null);
  const fade = useRef(null);
  const ladder = useRef(null);
  const heading = useRef(null);
  const headingCardinal = useRef(null);
  const fpm = useRef(null);
  const target = useRef(null);
  const targetLabel = useRef(null);
  const speed = useRef(null);
  const gamma = useRef(null);
  const warp = useRef(null);
  const throttle = useRef(null);
  const throttleFill = useRef(null);
  const auto = useRef(null);

  useEffect(() => {
    if (viewMode !== 'cockpit' || earthMode) return undefined;
    const scratch = createAttitudeScratch();
    const setScale = () => root.current?.style.setProperty('--chud-deg-y', `${window.innerHeight / COCKPIT_FOV}px`);
    setScale();
    window.addEventListener('resize', setScale);

    let frame = 0;
    const tick = () => {
      const state = useFlightStore.getState();
      const aspect = window.innerWidth / Math.max(1, window.innerHeight);
      sampleAttitude(scratch, flightState.quaternion, flightState.position, flightState.lookYaw, flightState.lookPitch);

      if (ladder.current) {
        ladder.current.style.transform = `rotate(${scratch.rollDeg.toFixed(2)}deg) translateY(${(
          scratch.pitchDeg *
          (window.innerHeight / COCKPIT_FOV)
        ).toFixed(1)}px)`;
      }
      if (heading.current) heading.current.textContent = String(Math.round(scratch.headingDeg) % 360).padStart(3, '0');
      if (headingCardinal.current) headingCardinal.current.textContent = cardinal(scratch.headingDeg);
      if (fade.current) {
        const look = Math.abs(flightState.lookYaw);
        fade.current.style.opacity = Math.max(0.18, 1 - Math.max(0, look - 0.95) / 1.15).toFixed(2);
      }

      const marker = projectDirection(scratch, scratch.shipForward, aspect);
      if (fpm.current) {
        fpm.current.style.opacity = marker ? '0.9' : '0';
        if (marker) {
          fpm.current.style.left = `${marker.x.toFixed(2)}%`;
          fpm.current.style.top = `${marker.y.toFixed(2)}%`;
        }
      }

      const targetBody = BODY_BY_ID.get(state.targetId) ?? MOON_BY_ID.get(state.targetId);
      const targetPosition = targetBody ? getPosition(targetBody.id) : null;
      const projection = targetPosition ? projectWorldPoint(scratch, targetPosition, aspect) : null;
      if (target.current) {
        target.current.style.opacity = projection ? '0.95' : '0';
        if (projection) {
          target.current.style.left = `${Math.max(7, Math.min(93, projection.x)).toFixed(2)}%`;
          target.current.style.top = `${Math.max(16, Math.min(84, projection.y)).toFixed(2)}%`;
        }
      }
      if (targetLabel.current && targetBody) {
        if (projection) {
          const au = projection.distance / UNITS_PER_AU;
          targetLabel.current.textContent = `${targetBody.en ?? targetBody.name} · ${au < 0.01 ? `${projection.distance.toFixed(1)} u` : `${au.toFixed(au < 1 ? 3 : 2)} AU`}`;
        } else {
          targetLabel.current.textContent = targetBody.en ?? targetBody.name;
        }
      }

      if (speed.current) {
        speed.current.textContent =
          flightState.warp > 0
            ? `WARP ${flightState.warp.toFixed(1)}`
            : flightState.speedC < -0.0005
              ? `REV ${(Math.abs(flightState.speedC) * 100).toFixed(2)}% c`
              : `${(flightState.speedC * 100).toFixed(2)}% c`;
      }
      if (gamma.current) gamma.current.textContent = `γ ${state.gamma.toFixed(4)}`;
      if (warp.current) warp.current.textContent = `${flightState.warp.toFixed(1)} / 9`;
      if (throttle.current) {
        throttle.current.textContent = `${flightState.throttle < 0 ? 'REV' : 'THR'} ${Math.round(
          Math.abs(flightState.throttle) * 100,
        )}%`;
      }
      if (throttleFill.current) {
        throttleFill.current.style.transform = `scaleX(${Math.abs(flightState.throttle).toFixed(3)})`;
        throttleFill.current.classList.toggle('is-reverse', flightState.throttle < 0);
      }
      if (auto.current) {
        const autopilot = state.autopilot;
        auto.current.style.opacity = autopilot.enabled ? '1' : '0';
        if (autopilot.enabled) {
          auto.current.textContent = `AUTO ${autopilot.mode.toUpperCase()} · ${String(autopilot.phase).toUpperCase()} · ${autopilot.positionError.toFixed(2)}u`;
        }
      }

      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', setScale);
    };
  }, [viewMode, earthMode]);

  if (viewMode !== 'cockpit' || earthMode) return null;

  return (
    <div className="chud" ref={root}>
      <div className="chud__fade" ref={fade}>
        <div className="chud__ladder" ref={ladder}>
          {LADDER_ANGLES.map((angle) => (
            <div
              key={angle}
              className={`chud__rung ${angle < 0 ? 'chud__rung--below' : ''}`}
              style={{ top: `calc(var(--chud-deg-y) * ${-angle})` }}
            >
              <i />
              <span>{Math.abs(angle)}</span>
              <i />
            </div>
          ))}
          <div className="chud__horizon">
            <i />
            <span>0</span>
            <i />
          </div>
        </div>

        <div className="chud__boresight">
          <i />
          <i />
        </div>

        <div className="chud__fpm" ref={fpm}>
          <i />
        </div>

        <div className="chud__target" ref={target}>
          <i />
          <i />
          <i />
          <i />
          <span ref={targetLabel}>TARGET</span>
        </div>

        <div className="chud__compass">
          <em ref={headingCardinal}>N</em>
          <strong ref={heading}>000</strong>
          <small>HDG</small>
        </div>

        <div className="chud__readout chud__readout--left">
          <span>VELOCITY</span>
          <strong ref={speed}>0.00% c</strong>
          <em ref={gamma}>γ 1.0000</em>
        </div>

        <div className="chud__readout chud__readout--right">
          <span>WARP</span>
          <strong ref={warp}>0.0 / 9</strong>
          <em ref={throttle}>THR 0%</em>
          <i className="chud__meter">
            <b ref={throttleFill} />
          </i>
        </div>

        <div className="chud__auto" ref={auto} />
      </div>
    </div>
  );
}
