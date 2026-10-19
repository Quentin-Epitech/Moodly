import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

/** Entrée d'un appareil (0 → 1), avec un léger retard possible */
export function useEntrance(delay = 0) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 70, mass: 1 } });
}

/** Sortie en fin de scène (1 → 0 sur les 12 dernières images) */
export function useExit(duration: number) {
  const frame = useCurrentFrame();
  return interpolate(frame, [duration - 12, duration], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
}

/** Flottement lent d'un objet posé */
export function useFloat(phase = 0) {
  const frame = useCurrentFrame();
  return { y: Math.sin(frame / 38 + phase) * 0.03, rot: Math.sin(frame / 55 + phase) * 0.04 };
}
