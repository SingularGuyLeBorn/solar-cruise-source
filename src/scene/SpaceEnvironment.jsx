import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { CanvasTexture, EquirectangularReflectionMapping, PMREMGenerator, SRGBColorSpace } from 'three';

function createSpaceEnvironment() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const sky = ctx.createLinearGradient(0, 0, 0, 512);
  sky.addColorStop(0, '#010207');
  sky.addColorStop(0.45, '#030812');
  sky.addColorStop(0.72, '#061321');
  sky.addColorStop(1, '#010207');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 1024, 512);

  const nebula = ctx.createRadialGradient(300, 300, 20, 300, 300, 260);
  nebula.addColorStop(0, 'rgba(32, 76, 110, 0.28)');
  nebula.addColorStop(0.55, 'rgba(18, 46, 72, 0.14)');
  nebula.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = nebula;
  ctx.fillRect(0, 0, 1024, 512);

  const sun = ctx.createRadialGradient(760, 150, 0, 760, 150, 130);
  sun.addColorStop(0, 'rgba(255, 250, 235, 1)');
  sun.addColorStop(0.05, 'rgba(255, 232, 190, 0.95)');
  sun.addColorStop(0.18, 'rgba(255, 178, 92, 0.36)');
  sun.addColorStop(0.55, 'rgba(255, 130, 40, 0.08)');
  sun.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = sun;
  ctx.fillRect(560, 0, 400, 400);

  let seed = 6217;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  for (let i = 0; i < 420; i++) {
    const x = random() * 1024;
    const y = random() * 512;
    const alpha = 0.15 + random() * 0.55;
    const radius = random() < 0.92 ? 0.6 : 1.3;
    ctx.fillStyle = `rgba(190, 220, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new CanvasTexture(canvas);
  texture.mapping = EquirectangularReflectionMapping;
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export function SpaceEnvironment() {
  const { gl, scene } = useThree();

  useEffect(() => {
    const source = createSpaceEnvironment();
    const generator = new PMREMGenerator(gl);
    const environment = generator.fromEquirectangular(source).texture;
    scene.environment = environment;
    scene.environmentIntensity = 0.85;
    source.dispose();
    generator.dispose();

    return () => {
      scene.environment = null;
      environment.dispose();
    };
  }, [gl, scene]);

  return null;
}
