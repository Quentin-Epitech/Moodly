import { useVideoConfig } from 'remotion';

/** Cadrage : horizontal (16:9) ou vertical (9:16) */
export function useLayout() {
  const { width, height } = useVideoConfig();
  const portrait = height > width;
  return { portrait, width, height };
}
