import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { Box3, DoubleSide, MeshPhysicalMaterial, Vector3 } from 'three';
import { applyHullDetail } from '../lib/hullMaterial';
import { SHIP_VARIANT } from '../state/shipVariant';

const TARGET_LENGTH = 10.6;
const PANEL_OFFSET = [((SHIP_VARIANT.seed % 97) / 37) % 1, ((SHIP_VARIANT.seed % 53) / 29) % 1];

const PALETTE = {
  vanguard_ceramic: {
    base: '#c3c7c2',
    metalness: 0.2,
    roughness: 0.48,
    envMapIntensity: 1.25,
    seam: 0.42,
    grime: 0.14,
  },
  vanguard_hull: {
    base: '#b1461f',
    metalness: 0.26,
    roughness: 0.42,
    envMapIntensity: 1.2,
    seam: 0.48,
    grime: 0.16,
  },
  vanguard_graphite: {
    base: '#0c141b',
    metalness: 0.38,
    roughness: 0.5,
    envMapIntensity: 1.1,
    seam: 0.3,
    grime: 0.2,
  },
  vanguard_machinery: {
    base: '#78838a',
    metalness: 0.82,
    roughness: 0.3,
    envMapIntensity: 1.35,
    seam: 0.45,
    grime: 0.22,
  },
  vanguard_titanium: {
    base: '#3a444d',
    metalness: 0.9,
    roughness: 0.27,
    envMapIntensity: 1.4,
    seam: 0.4,
    grime: 0.14,
  },
  vanguard_engine: {
    base: '#0b151c',
    metalness: 0.82,
    roughness: 0.32,
    envMapIntensity: 1.3,
    emissive: '#0b3f55',
    emissiveIntensity: 0.5,
  },
  vanguard_nav_light: {
    base: '#ff8a3c',
    metalness: 0.15,
    roughness: 0.35,
    envMapIntensity: 1,
    emissive: '#ff5a1a',
    emissiveIntensity: 2.6,
    toneMapped: false,
  },
};

function createCanopyMaterial() {
  return new MeshPhysicalMaterial({
    color: '#081a24',
    metalness: 0.2,
    roughness: 0.06,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    iridescence: 0.32,
    iridescenceIOR: 1.3,
    iridescenceThicknessRange: [120, 420],
    envMapIntensity: 1.9,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
    side: DoubleSide,
  });
}

export function HelionShip() {
  const { scene } = useGLTF('/models/helion/ship_vanguard_mk3.glb');

  const model = useMemo(() => {
    const clone = scene.clone(true);
    const box = new Box3().setFromObject(clone);
    const size = box.getSize(new Vector3());
    const scale = TARGET_LENGTH / Math.max(size.z, size.x);
    clone.scale.setScalar(scale);
    clone.updateMatrixWorld(true);

    const scaledBox = new Box3().setFromObject(clone);
    const center = scaledBox.getCenter(new Vector3());
    clone.position.sub(center);

    clone.traverse((object) => {
      if (!object.isMesh) return;
      const source = Array.isArray(object.material) ? object.material : [object.material];
      const materials = source.map((material) => {
        const name = (material.name || '').toLowerCase();
        if (name.includes('canopy')) return createCanopyMaterial();

        const next = material.clone();
        const palette = PALETTE[name] ?? PALETTE.vanguard_ceramic;
        if (name === 'vanguard_hull') next.color.set(SHIP_VARIANT.hull);
        else if (name === 'vanguard_ceramic') next.color.set(SHIP_VARIANT.ceramic);
        else next.color.set(palette.base);
        next.metalness = palette.metalness;
        next.roughness = palette.roughness;
        next.envMapIntensity = palette.envMapIntensity;
        if (palette.emissive) {
          next.emissive.set(palette.emissive);
          next.emissiveIntensity = palette.emissiveIntensity;
        }
        if (palette.toneMapped === false) next.toneMapped = false;
        if (!name.includes('engine') && !name.includes('nav_light')) {
          applyHullDetail(next, { seam: palette.seam, grime: palette.grime, offset: PANEL_OFFSET });
        }
        next.needsUpdate = true;
        return next;
      });
      object.material = Array.isArray(object.material) ? materials : materials[0];
      object.castShadow = true;
      object.receiveShadow = true;
      object.frustumCulled = false;
    });

    return clone;
  }, [scene]);

  return <primitive object={model} />;
}

useGLTF.preload('/models/helion/ship_vanguard_mk3.glb');
