import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { color } from '../theme';

// Fond crème avec quelques disques aux couleurs des humeurs, qui dérivent doucement
const BLOBS = [
  { x: 0.08, y: 0.18, r: 0.2, c: color.mood[2], speed: 0.6 },
  { x: 0.92, y: 0.12, r: 0.16, c: color.accentSoft, speed: 0.8 },
  { x: 0.85, y: 0.86, r: 0.22, c: color.mood[4], speed: 0.5 },
  { x: 0.12, y: 0.9, r: 0.14, c: color.mood[0], speed: 0.7 },
];

export function Background() {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: color.bg, overflow: 'hidden' }}>
      {BLOBS.map((blob, index) => {
        const dx = Math.sin((frame / 90) * blob.speed + index) * 30;
        const dy = Math.cos((frame / 110) * blob.speed + index) * 24;
        return (
          <div
            key={index}
            style={{
              position: 'absolute',
              left: `${blob.x * 100}%`,
              top: `${blob.y * 100}%`,
              width: `${blob.r * 100}vmax`,
              height: `${blob.r * 100}vmax`,
              borderRadius: '50%',
              backgroundColor: blob.c,
              opacity: 0.22,
              filter: 'blur(60px)',
              transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
}
