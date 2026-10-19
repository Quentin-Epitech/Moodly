import { Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import palette from '@/theme/palette';

/** Marque : un anneau et un point — le pouls de l'équipe */
export function LogoMark({
  size = 22,
  color = palette.accent,
  dot = palette.mood[3],
}: {
  size?: number;
  color?: string;
  dot?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 256 256">
      <Path
        fill={color}
        d="M128 24a104 104 0 1 0 0 208 104 104 0 0 0 0-208Zm0 36a68 68 0 1 1 0 136 68 68 0 0 1 0-136Z"
      />
      <Path fill={dot} d="M128 100a28 28 0 1 0 0 56 28 28 0 0 0 0-56Z" />
    </Svg>
  );
}

export function Logo() {
  return (
    <View className="flex-row items-center gap-2.5">
      <LogoMark />
      <Text className="font-sans-semibold text-base tracking-[-0.3px] text-ink">Moodly</Text>
    </View>
  );
}
