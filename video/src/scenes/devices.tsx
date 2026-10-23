import { useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import * as THREE from 'three';
import { useLayout } from '../layout';
import { Laptop } from '../three/Laptop';
import { Phone } from '../three/Phone';
import type { Screen } from '../three/ScreenStack';
import { useEntrance, useExit, useFloat } from './motion';

type Placement = { x: number; y: number; z?: number; scale: number; rotY: number; rotX?: number };

/** Ombre portée floue, posée sous l'appareil (s'estompe quand il s'élève) */
function SoftShadow({ x, y, z, width, opacity }: { x: number; y: number; z: number; width: number; opacity: number }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(128, 32, 4, 128, 32, 120);
    gradient.addColorStop(0, 'rgba(27, 26, 34, 0.55)');
    gradient.addColorStop(1, 'rgba(27, 26, 34, 0)');
    ctx.setTransform(1, 0, 0, 0.25, 0, 24);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(canvas);
  }, []);
  return (
    <mesh position={[x, y, z]}>
      <planeGeometry args={[width, width / 4]} />
      <meshBasicMaterial map={texture} transparent opacity={opacity} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/** Téléphone posé dans la scène : entre par le bas en pivotant, flotte, sort en fin de scène */
export function PlacedPhone({
  screens,
  landscape,
  portrait,
  delay = 0,
  duration,
  phase = 0,
}: {
  screens: Screen[];
  landscape: Placement;
  portrait: Placement;
  delay?: number;
  duration: number;
  phase?: number;
}) {
  const layout = useLayout();
  const p = layout.portrait ? portrait : landscape;
  const enter = useEntrance(delay);
  const exit = useExit(duration);
  const float = useFloat(phase);
  const k = enter * exit;
  return (
    <>
      <SoftShadow
        x={p.x}
        y={p.y - 0.9 * p.scale}
        z={(p.z ?? 0) - 0.2}
        width={1.05 * p.scale * (1 - float.y * 2)}
        opacity={0.5 * k * k}
      />
      <Phone
        screens={screens}
        position={[p.x, p.y - (1 - k) * 2.6 + float.y, p.z ?? 0]}
        rotation={[(p.rotX ?? 0.04) + (1 - k) * 0.4, p.rotY + (1 - k) * 0.9 + float.rot, 0]}
        scale={p.scale}
      />
    </>
  );
}

export function PlacedLaptop({
  screens,
  landscape,
  portrait,
  delay = 0,
  duration,
}: {
  screens: Screen[];
  landscape: Placement;
  portrait: Placement;
  delay?: number;
  duration: number;
}) {
  const layout = useLayout();
  const frame = useCurrentFrame();
  const p = layout.portrait ? portrait : landscape;
  const enter = useEntrance(delay);
  const exit = useExit(duration);
  const k = enter * exit;
  // Le capot s'ouvre pendant l'entrée
  const open = 0.18 + (1 - enter) * 1.3;
  const sway = Math.sin(frame / 70) * 0.03;
  return (
    <>
      <SoftShadow x={p.x} y={p.y - 1.05 * p.scale} z={(p.z ?? 0) + 0.6} width={3.3 * p.scale} opacity={0.4 * k * k} />
      <Laptop
      screens={screens}
      open={open}
      position={[p.x, p.y - (1 - k) * 2.2, p.z ?? 0]}
      rotation={[p.rotX ?? 0.12, p.rotY + sway, 0]}
      scale={p.scale * (0.85 + 0.15 * k)}
      />
    </>
  );
}
