import Svg, { Circle, Path } from 'react-native-svg';
import type { MoodLevel } from '@/theme/mood';
import palette from '@/theme/palette';

// Courbure de la bouche, de la moue (1) au grand sourire (5)
const MOUTH: Record<MoodLevel, string> = {
  1: 'M13 28 Q20 21 27 28',
  2: 'M13 27 Q20 24 27 27',
  3: 'M13 26 L27 26',
  4: 'M13 25 Q20 30 27 25',
  5: 'M12 24 Q20 34 28 24',
};

type Props = { level: MoodLevel; size?: number; color?: string };

/** Petit visage dessiné : deux yeux et une bouche qui sourit plus ou moins */
export function MoodFace({ level, size = 28, color = palette.ink }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Circle cx={14.5} cy={16} r={2.4} fill={color} />
      <Circle cx={25.5} cy={16} r={2.4} fill={color} />
      <Path d={MOUTH[level]} stroke={color} strokeWidth={2.6} strokeLinecap="round" fill="none" />
    </Svg>
  );
}
