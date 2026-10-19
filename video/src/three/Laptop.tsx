import type { ThreeElements } from '@react-three/fiber';
import { useMemo } from 'react';
import { color } from '../theme';
import { bodyGeometry } from './geometry';
import { ScreenStack, type Screen } from './ScreenStack';

// Écran au ratio des captures ordinateur (1440 × 900)
const SCREEN_W = 2.4;
const SCREEN_H = SCREEN_W * (900 / 1440);
const LID_W = SCREEN_W + 0.12;
const LID_H = SCREEN_H + 0.14;

type Props = ThreeElements['group'] & { screens: Screen[]; /** ouverture du capot, en radians */ open?: number };

export function Laptop({ screens, open = 0.18, ...group }: Props) {
  const lid = useMemo(() => bodyGeometry(LID_W, LID_H, 0.06, 0.03), []);
  const base = useMemo(() => bodyGeometry(LID_W + 0.1, 1.65, 0.08, 0.05), []);

  return (
    <group {...group}>
      {/* Socle, posé à plat devant la charnière : clavier et pavé tactile */}
      <group position={[0, -LID_H / 2, 0.82]}>
        <mesh geometry={base} rotation={[-Math.PI / 2, 0, 0]}>
          <meshStandardMaterial color={color.laptop} metalness={0.15} roughness={0.5} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.047, -0.28]}>
          <planeGeometry args={[LID_W - 0.3, 0.7]} />
          <meshStandardMaterial color="#2B2A33" roughness={0.8} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.047, 0.42]}>
          <planeGeometry args={[0.95, 0.55]} />
          <meshStandardMaterial color="#CFCAC2" roughness={0.6} />
        </mesh>
      </group>
      {/* Capot, pivotant autour de la charnière (bord bas) */}
      <group position={[0, -LID_H / 2, 0]} rotation={[-open, 0, 0]}>
        <group position={[0, LID_H / 2, 0]}>
          <mesh geometry={lid}>
            <meshStandardMaterial color={color.ink} metalness={0.4} roughness={0.4} />
          </mesh>
          <group position={[0, 0.01, 0.04]}>
            <ScreenStack screens={screens} width={SCREEN_W} height={SCREEN_H} radius={0.02} />
          </group>
        </group>
      </group>
    </group>
  );
}
