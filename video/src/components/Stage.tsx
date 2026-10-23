import { ThreeCanvas } from '@remotion/three';
import type { ReactNode } from 'react';
import { useVideoConfig } from 'remotion';

/** Scène 3D transparente posée sur le fond : caméra, lumières douces */
export function Stage({ children, fov = 30, z = 6.5 }: { children: ReactNode; fov?: number; z?: number }) {
  const { width, height } = useVideoConfig();
  return (
    <ThreeCanvas
      width={width}
      height={height}
      flat
      camera={{ fov, position: [0, 0, z], near: 0.1, far: 50 }}
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <ambientLight intensity={1.1} />
      <directionalLight position={[3, 4, 6]} intensity={2.2} />
      <directionalLight position={[-4, -2, 3]} intensity={0.8} color="#d9d0ff" />
      {children}
    </ThreeCanvas>
  );
}
