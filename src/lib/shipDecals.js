import { CanvasTexture, SRGBColorSpace } from 'three';
import { mulberry32 } from '../state/shipVariant';

const DEFAULT_VARIANT = {
  name: 'VANGUARD',
  zh: '先驱者号',
  serial: 'SC-01',
  accent: '#b1461f',
  ink: '#1a2229',
  seed: 7319,
};

function finish(canvas) {
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function scratch(ctx, width, height, count, random) {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < count; i++) {
    ctx.strokeStyle = `rgba(0,0,0,${0.12 + random() * 0.3})`;
    ctx.lineWidth = 1 + random() * 2;
    const x = random() * width;
    const y = random() * height;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + random() * 90 - 45, y + random() * 16 - 8);
    ctx.stroke();
  }
  ctx.restore();
}

export function createWingDecal(side = 'left', variant = DEFAULT_VARIANT) {
  const random = mulberry32(variant.seed + (side === 'left' ? 11 : 29));
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 1024, 512);

  if (side === 'left') {
    ctx.fillStyle = variant.ink;
    ctx.font = `900 ${variant.name.length > 7 ? 150 : 168}px "Arial Black", Arial, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillText(variant.name, 42, 170);

    ctx.fillStyle = variant.accent;
    ctx.fillRect(46, 262, 660, 12);
    ctx.fillRect(46, 282, 380, 5);

    ctx.fillStyle = '#2b343b';
    ctx.font = '700 44px Arial, sans-serif';
    ctx.fillText(`${variant.serial}  ·  HELION DYNAMICS`, 48, 336);

    ctx.font = '700 52px "Microsoft YaHei", sans-serif';
    ctx.fillText(variant.zh, 48, 410);

    ctx.fillStyle = variant.accent;
    ctx.beginPath();
    ctx.moveTo(860, 90);
    ctx.lineTo(960, 190);
    ctx.lineTo(860, 290);
    ctx.lineTo(800, 260);
    ctx.lineTo(872, 190);
    ctx.lineTo(800, 120);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = variant.ink;
    ctx.font = '700 28px Arial, sans-serif';
    ctx.fillText('DEEP SPACE CRUISER', 48, 465);
  } else {
    ctx.fillStyle = variant.ink;
    ctx.font = '900 190px "Arial Black", Arial, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(variant.serial, 44, 185);

    ctx.fillStyle = variant.accent;
    ctx.fillRect(46, 290, 330, 10);

    ctx.save();
    ctx.translate(700, 110);
    ctx.fillStyle = '#8c2318';
    ctx.font = '900 64px Arial, sans-serif';
    ctx.fillText('NO STEP', 0, 0);
    ctx.font = '700 30px Arial, sans-serif';
    ctx.fillStyle = '#2b343b';
    ctx.fillText('LIFTING POINT / 起吊点', 0, 52);
    ctx.restore();

    ctx.strokeStyle = variant.accent;
    ctx.lineWidth = 12;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(700 + i * 40, 400);
      ctx.lineTo(730 + i * 40, 330);
      ctx.stroke();
    }

    ctx.fillStyle = '#2b343b';
    ctx.font = '700 34px Arial, sans-serif';
    ctx.fillText('ION DRIVE ACCESS', 44, 400);
    ctx.font = '600 26px Arial, sans-serif';
    ctx.fillText('SERVICE PANEL 03-B  ·  TORQUE 12 N·m', 44, 446);
  }

  scratch(ctx, 1024, 512, 26, random);
  return finish(canvas);
}

export function createHatchDecal(variant = DEFAULT_VARIANT) {
  const random = mulberry32(variant.seed + 43);
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 384;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 1024, 384);

  ctx.strokeStyle = 'rgba(28, 36, 43, 0.92)';
  ctx.lineWidth = 10;
  ctx.strokeRect(18, 18, 988, 348);

  ctx.fillStyle = variant.ink;
  ctx.font = '900 92px "Arial Black", Arial, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('SERVICE HATCH', 52, 120);

  ctx.fillStyle = variant.accent;
  ctx.fillRect(52, 190, 520, 9);

  ctx.fillStyle = '#2b343b';
  ctx.font = '700 38px "Microsoft YaHei", Arial, sans-serif';
  ctx.fillText('维护舱门 · 关闭后锁止', 52, 258);
  ctx.font = '600 26px Arial, sans-serif';
  ctx.fillText(`HATCH 02-C  ·  ${variant.serial}  ·  NO STEP`, 52, 310);

  ctx.strokeStyle = variant.accent;
  ctx.lineWidth = 12;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(790 + i * 36, 300);
    ctx.lineTo(818 + i * 36, 230);
    ctx.stroke();
  }

  scratch(ctx, 1024, 384, 20, random);
  return finish(canvas);
}

export function createRoundelTexture(variant = DEFAULT_VARIANT) {
  const random = mulberry32(variant.seed + 71);
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 256, 256);
  ctx.strokeStyle = variant.accent;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(128, 128, 100, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = variant.accent;
  ctx.beginPath();
  ctx.moveTo(128, 48);
  ctx.lineTo(186, 176);
  ctx.lineTo(128, 146);
  ctx.lineTo(70, 176);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = variant.ink;
  ctx.font = '700 26px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(variant.serial, 128, 224);
  scratch(ctx, 256, 256, 8, random);
  return finish(canvas);
}
