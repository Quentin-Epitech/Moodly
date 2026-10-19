import type { ReactNode } from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

/** Mot surligné au feutre, qui se trace de gauche à droite à partir de `at` */
export function Highlight({ children, tone, at = 0 }: { children: ReactNode; tone: string; at?: number }) {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [at, at + 14], [0, 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <span
      style={{
        backgroundImage: `linear-gradient(${tone}, ${tone})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: `${progress}% 88%`,
        backgroundPosition: '0 60%',
        borderRadius: 8,
        padding: '0 0.08em',
        boxDecorationBreak: 'clone',
        WebkitBoxDecorationBreak: 'clone',
      }}
    >
      {children}
    </span>
  );
}
