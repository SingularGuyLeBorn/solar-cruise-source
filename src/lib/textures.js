import * as THREE from 'three';

function mulberry32(seed) {
  return function random() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function proceduralBodyTexture(id, baseColor = '#8b8378', tintColor = '#5c544b') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const random = mulberry32(hashSeed(id));
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 512, 256);

  for (let i = 0; i < 220; i++) {
    const x = random() * 512;
    const y = random() * 256;
    const radius = 4 + random() * 34;
    const alpha = 0.02 + random() * 0.08;
    ctx.fillStyle = random() > 0.5 ? tintColor : baseColor;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.ellipse(x, y, radius * (0.5 + random()), radius * 0.55, random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 90; i++) {
    const x = random() * 512;
    const y = 20 + random() * 216;
    const radius = 1 + Math.pow(random(), 3) * 16;
    ctx.globalAlpha = 0.14 + random() * 0.18;
    ctx.fillStyle = '#f2eee6';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a2622';
    ctx.globalAlpha = 0.08 + random() * 0.12;
    ctx.beginPath();
    ctx.arc(x + radius * 0.25, y + radius * 0.2, radius * 0.9, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function footprintTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 512, 512);
  ctx.fillStyle = 'rgba(220, 216, 204, 0.9)';
  const drawBoot = (x, y, angle, scale = 1) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    ctx.beginPath();
    ctx.ellipse(0, 22, 18, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.ellipse(-14 + i * 9, -34, 5, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };
  drawBoot(170, 190, -0.35, 1.1);
  drawBoot(265, 235, 0.18, 0.95);
  drawBoot(340, 310, -0.1, 1.05);
  drawBoot(205, 355, 0.4, 1);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function screenTexture(width = 512, height = 320) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return { canvas, ctx, texture };
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

export function stormTexture(id, base = '#b53b22', highlight = '#f3a06a') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const random = mulberry32(hashSeed(id));
  ctx.clearRect(0, 0, 512, 512);
  ctx.save();
  ctx.translate(256, 256);
  ctx.scale(1, 0.56);
  for (let i = 0; i < 170; i++) {
    const radius = 20 + random() * 240;
    const angle = random() * Math.PI * 2 + radius * 0.02;
    ctx.strokeStyle = random() > 0.55 ? highlight : base;
    ctx.globalAlpha = 0.05 + random() * 0.2;
    ctx.lineWidth = 2 + random() * 10;
    ctx.beginPath();
    ctx.arc(0, 0, radius, angle, angle + 0.6 + random() * 1.8);
    ctx.stroke();
  }
  ctx.restore();
  const gradient = ctx.createRadialGradient(256, 256, 40, 256, 256, 250);
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(0.62, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, 'rgba(0,0,0,0.9)');
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
