import * as THREE from 'three';

export function screenTexture(width = 512, height = 320) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return { canvas, ctx, texture };
}

export function enginePanelTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 256, 128);

  ctx.fillStyle = 'rgba(7, 24, 34, 0.55)';
  ctx.fillRect(4, 4, 248, 120);
  ctx.strokeStyle = 'rgba(160, 238, 255, 0.85)';
  ctx.lineWidth = 3;
  ctx.strokeRect(5, 5, 246, 118);

  ctx.shadowColor = 'rgba(150, 235, 255, 0.95)';
  ctx.shadowBlur = 14;
  const bars = [
    [22, 198, 0.95, 9],
    [44, 178, 0.8, 7],
    [62, 202, 0.9, 6],
    [86, 188, 0.75, 8],
    [106, 150, 0.55, 5],
  ];
  for (const [y, width, alpha, height] of bars) {
    ctx.fillStyle = `rgba(220, 248, 255, ${alpha})`;
    ctx.fillRect(30, y, width, height);
  }
  ctx.fillStyle = 'rgba(235, 252, 255, 0.9)';
  ctx.fillRect(34, 58, 188, 4);
  ctx.fillStyle = 'rgba(160, 238, 255, 0.65)';
  for (let i = 0; i < 7; i++) ctx.fillRect(24 + i * 32, 14, 12, 3);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

export function radialGlowTexture(inner = 'rgba(255,235,190,1)', outer = 'rgba(255,120,20,0)') {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, inner);
  gradient.addColorStop(0.25, 'rgba(255,180,80,0.55)');
  gradient.addColorStop(0.6, 'rgba(255,110,30,0.16)');
  gradient.addColorStop(1, outer);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
