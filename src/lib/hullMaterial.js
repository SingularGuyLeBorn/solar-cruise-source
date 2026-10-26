export function applyHullDetail(material, { scale = 1.8, seam = 0.32, grime = 0.12, offset = [0, 0] } = {}) {
  const uniforms = {
    uHullScale: { value: scale },
    uHullSeam: { value: seam },
    uHullGrime: { value: grime },
    uHullOffset: { value: offset },
  };

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vHullPos;
        varying vec3 vHullNormal;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vHullPos = position;
        vHullNormal = normal;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vHullPos;
        varying vec3 vHullNormal;
        uniform float uHullScale;
        uniform float uHullSeam;
        uniform float uHullGrime;
        uniform vec2 uHullOffset;

        float hullHash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        float hullNoise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(hullHash(i), hullHash(i + vec2(1.0, 0.0)), u.x),
            mix(hullHash(i + vec2(0.0, 1.0)), hullHash(i + vec2(1.0, 1.0)), u.x),
            u.y
          );
        }

        float hullPanel(vec2 uv) {
          vec2 f = abs(fract(uv) - 0.5);
          return smoothstep(0.455, 0.5, max(f.x, f.y));
        }`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        vec3 hullNormalW = normalize(vHullNormal);
        vec3 hullWeights = pow(abs(hullNormalW), vec3(5.0));
        hullWeights /= max(hullWeights.x + hullWeights.y + hullWeights.z, 1e-4);

        vec2 hullUvX = (vHullPos.zy + uHullOffset) * uHullScale;
        vec2 hullUvY = (vHullPos.xz + uHullOffset.yx) * uHullScale * 0.82;
        vec2 hullUvZ = (vHullPos.xy + uHullOffset) * uHullScale;
        float hullEdge =
          hullWeights.x * hullPanel(hullUvX) +
          hullWeights.y * hullPanel(hullUvY) +
          hullWeights.z * hullPanel(hullUvZ);
        float hullGrain = hullNoise(vHullPos.xy * 14.0 + vHullPos.z * 6.0);
        float hullGrime = smoothstep(0.58, 0.95, hullNoise(vHullPos.xz * 1.1 + vHullPos.y * 2.7));
        float hullFine =
          hullWeights.x * hullPanel(hullUvX * 3.1) +
          hullWeights.y * hullPanel(hullUvY * 2.7) +
          hullWeights.z * hullPanel(hullUvZ * 3.1);
        float hullPanelTint = hullHash(floor(hullUvY));

        diffuseColor.rgb *= 1.0 - hullEdge * uHullSeam;
        diffuseColor.rgb *= 1.0 - hullFine * uHullSeam * 0.3;
        diffuseColor.rgb *= 0.95 + hullGrain * 0.1;
        diffuseColor.rgb *= 1.0 - hullGrime * uHullGrime;
        diffuseColor.rgb *= 1.0 + (hullPanelTint - 0.5) * 0.07 * hullWeights.y;`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor = clamp(
          roughnessFactor + hullEdge * 0.24 + hullGrime * 0.1 + (hullGrain - 0.5) * 0.05,
          0.04,
          1.0
        );`,
      );
  };

  material.customProgramCacheKey = () => 'solar-cruise-hull-detail-v1';
  return material;
}
