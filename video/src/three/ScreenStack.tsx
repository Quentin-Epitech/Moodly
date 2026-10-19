import { useMemo } from 'react';
import { Easing, interpolate, useCurrentFrame } from 'remotion';
import * as THREE from 'three';
import { screenGeometry } from './geometry';
import { getScreenTexture, getStatusBarTexture } from './useScreenTexture';

export type Screen = { file: string; /** image de la séquence où il apparaît */ at: number };

/** Durée d'un changement d'écran, en images */
const SWIPE = 18;

// Changement d'écran par glissement (l'ancien sort à gauche, le nouveau entre par la droite),
// sans superposition semi-transparente : l'image reste nette pendant la transition.
const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D fromTex;
  uniform sampler2D toTex;
  uniform sampler2D statusTex;
  uniform float progress;
  uniform float statusFrac;
  varying vec2 vUv;
  void main() {
    vec4 color;
    if (vUv.y > 1.0 - statusFrac) {
      color = texture2D(statusTex, vec2(vUv.x, (vUv.y - (1.0 - statusFrac)) / statusFrac));
    } else {
      vec2 uv = vec2(vUv.x, vUv.y / (1.0 - statusFrac));
      float x = uv.x + progress;
      color = x < 1.0 ? texture2D(fromTex, vec2(x, uv.y)) : texture2D(toTex, vec2(x - 1.0, uv.y));
    }
    gl_FragColor = color;
    #include <colorspace_fragment>
  }
`;

type Props = {
  screens: Screen[];
  width: number;
  height: number;
  radius: number;
  /** Part de la hauteur occupée par la barre d'état (0 = pas de barre, ordinateur) */
  statusFrac?: number;
};

/** Écran d'un appareil : captures successives, barre d'état éventuelle */
export function ScreenStack({ screens, width, height, radius, statusFrac = 0 }: Props) {
  const frame = useCurrentFrame();
  const geometry = useMemo(() => screenGeometry(width, height, radius), [width, height, radius]);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          fromTex: { value: null },
          toTex: { value: null },
          statusTex: { value: getStatusBarTexture() },
          progress: { value: 0 },
          statusFrac: { value: statusFrac },
        },
        toneMapped: false,
      }),
    [statusFrac],
  );

  // Écran courant, et glissement depuis le précédent pendant SWIPE images
  let current = 0;
  screens.forEach((screen, index) => {
    if (frame >= screen.at) current = index;
  });
  const previous = Math.max(0, current - 1);
  const progress =
    current === 0
      ? 0
      : interpolate(frame, [screens[current].at, screens[current].at + SWIPE], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.inOut(Easing.cubic),
        });
  const swiping = current > 0 && progress < 1;
  material.uniforms.fromTex.value = getScreenTexture(screens[swiping ? previous : current].file);
  material.uniforms.toTex.value = getScreenTexture(screens[current].file);
  material.uniforms.progress.value = swiping ? progress : 0;

  return <mesh geometry={geometry} material={material} />;
}
