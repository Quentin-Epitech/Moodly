import type { ThreeElements } from '@react-three/fiber';
import { useMemo } from 'react';
import { color } from '../theme';
import { bodyGeometry, roundedRectShape } from './geometry';
import { ScreenStack, type Screen } from './ScreenStack';
import * as THREE from 'three';

// Proportions d'un iPhone récent (écran 390 × 844 points : barre d'état de 47, puis la capture de l'app)
const SCREEN_W = 0.72;
const SCREEN_H = SCREEN_W * (844 / 390);
const BODY_W = SCREEN_W + 0.07;
const BODY_H = SCREEN_H + 0.07;
const DEPTH = 0.075;

type Props = ThreeElements['group'] & { screens: Screen[] };

export function Phone({ screens, ...group }: Props) {
  const body = useMemo(() => bodyGeometry(BODY_W, BODY_H, 0.12, DEPTH), []);
  const island = useMemo(() => new THREE.ShapeGeometry(roundedRectShape(0.2, 0.055, 0.0275), 12), []);
  const front = DEPTH / 2 + 0.021;

  return (
    <group {...group}>
      <mesh geometry={body}>
        <meshStandardMaterial color={color.phone} metalness={0.55} roughness={0.32} />
      </mesh>
      {/* Boutons latéraux */}
      <mesh position={[BODY_W / 2 + 0.008, 0.32, 0]}>
        <boxGeometry args={[0.014, 0.2, 0.035]} />
        <meshStandardMaterial color={color.phone} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[-BODY_W / 2 - 0.008, 0.42, 0]}>
        <boxGeometry args={[0.014, 0.12, 0.035]} />
        <meshStandardMaterial color={color.phone} metalness={0.6} roughness={0.3} />
      </mesh>
      <group position={[0, 0, front]}>
        <ScreenStack screens={screens} width={SCREEN_W} height={SCREEN_H} radius={0.095} statusFrac={47 / 844} />
        {/* Dynamic Island */}
        <mesh geometry={island} position={[0, SCREEN_H / 2 - 0.045, 0.01]}>
          <meshBasicMaterial color="#000000" toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}
