import { useCallback, useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { SRGBColorSpace, TextureLoader } from 'three';
import { worldState } from '../state/worldState';

const loader = new TextureLoader();
const textureCache = new Map();
const subscribers = new Map();
const queue = [];
let active = 0;
const MAX_CONCURRENT = 4;
let bootReady = false;
let upgradeReady = false;
let upgradeTimer = null;

export function previewPath(url) {
  if (!url) return url;
  return url.replace(/\.(jpe?g|png|webp)$/i, '.preview.webp');
}

export function thumbPath(url) {
  if (!url) return url;
  return url.replace(/\.(jpe?g|png|webp)$/i, '.thumb.webp');
}

export function useStaticTexture(url) {
  const [texture, setTexture] = useState(() => (url ? (textureCache.get(url) ?? null) : null));
  useEffect(() => {
    if (!url) {
      setTexture(null);
      return undefined;
    }
    if (textureCache.has(url)) {
      setTexture(textureCache.get(url));
      return undefined;
    }
    return requestTexture(url, 1, (next) => setTexture(next));
  }, [url]);
  return texture;
}

function pump() {
  if (active >= MAX_CONCURRENT || !queue.length) return;
  queue.sort((a, b) => a.priority - b.priority);
  const job = queue.shift();
  active += 1;
  loader.load(
    job.url,
    (texture) => {
      texture.colorSpace = SRGBColorSpace;
      texture.anisotropy = 4;
      textureCache.set(job.url, texture);
      active -= 1;
      const set = subscribers.get(job.url);
      subscribers.delete(job.url);
      set?.forEach((callback) => callback(texture));
      pump();
    },
    undefined,
    () => {
      active -= 1;
      subscribers.delete(job.url);
      pump();
    },
  );
}

function requestTexture(url, priority, callback) {
  if (!url) return () => {};
  if (textureCache.has(url)) {
    callback(textureCache.get(url));
    return () => {};
  }
  let set = subscribers.get(url);
  if (!set) {
    set = new Set();
    subscribers.set(url, set);
    queue.push({ url, priority });
  }
  set.add(callback);
  pump();
  return () => {
    const current = subscribers.get(url);
    current?.delete(callback);
  };
}

export function markBootReady() {
  bootReady = true;
  if (typeof window === 'undefined') return;
  window.__cruiseBooted = true;
  window.dispatchEvent(new Event('cruise:boot'));
  if (upgradeTimer) clearTimeout(upgradeTimer);
  upgradeTimer = setTimeout(() => {
    upgradeReady = true;
    window.__cruiseUpgraded = true;
    window.dispatchEvent(new Event('cruise:upgrade'));
  }, 7000);
}

export function warmPreview(url) {
  if (!url) return;
  requestTexture(previewPath(url), 1, () => {});
}

/**
 * Streams a small WebP preview first, then upgrades to the full texture only
 * when the camera is close to the body. Never suspends the scene.
 */
export function useProgressiveTexture({
  url,
  positionId,
  radius = 1,
  immediate = false,
  previewScale = 900,
  hiResScale = 30,
  previewEnabled = true,
  hiRes = true,
}) {
  const preview = previewEnabled ? previewPath(url) : null;
  const initial = textureCache.get(url) ?? (preview ? textureCache.get(preview) : null) ?? null;
  const initialLevel = textureCache.has(url) ? 2 : initial ? 1 : 0;
  const [texture, setTexture] = useState(initial);
  const [quality, setQuality] = useState(initialLevel);
  const levelRef = useRef(initialLevel);
  const previewRequested = useRef(initialLevel >= 1 || !previewEnabled);
  const fullRequested = useRef(initialLevel >= 2);
  const nearRef = useRef(false);

  const apply = useCallback((next, level) => {
    levelRef.current = Math.max(levelRef.current, level);
    setTexture(next);
    setQuality(levelRef.current);
  }, []);

  const requestPreview = useCallback(() => {
    if (!preview || previewRequested.current) return;
    previewRequested.current = true;
    requestTexture(preview, 1, (texture) => apply(texture, 1));
  }, [apply, preview]);

  const requestFull = useCallback(() => {
    if (!url || fullRequested.current) return;
    fullRequested.current = true;
    requestTexture(url, 2, (texture) => apply(texture, 2));
  }, [apply, url]);

  useEffect(() => {
    if (!url) return undefined;
    if (immediate) requestPreview();
    const onUpgrade = () => {
      if (nearRef.current && hiRes) requestFull();
    };
    if (upgradeReady && nearRef.current && hiRes) requestFull();
    window.addEventListener('cruise:upgrade', onUpgrade);
    return () => window.removeEventListener('cruise:upgrade', onUpgrade);
  }, [hiRes, immediate, requestFull, requestPreview, url]);

  useFrame(({ camera }) => {
    if (!positionId) return;
    const position = worldState.positions.get(positionId);
    if (!position) return;
    const distance = camera.position.distanceTo(position);
    const previewDistance = Math.max(radius * previewScale, 24);
    if (!previewRequested.current && distance < previewDistance) requestPreview();
    const fullDistance = Math.max(radius * hiResScale, 18);
    const near = distance < fullDistance;
    nearRef.current = near;
    if (near && upgradeReady && hiRes) requestFull();
  });

  return { texture, quality };
}
