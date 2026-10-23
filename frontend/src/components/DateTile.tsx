import { Text, View } from 'react-native';
import { dateParts } from '@/lib/dates';

type Props = { iso: string; tone?: 'accent' | 'muted'; size?: 'md' | 'sm' };

/** Pavé de date façon agenda : jour de la semaine, numéro, mois */
export function DateTile({ iso, tone = 'accent', size = 'md' }: Props) {
  const { day, month, weekday } = dateParts(iso);
  const box = size === 'md' ? 'h-16 w-14' : 'h-12 w-11';
  return (
    <View
      className={`${box} items-center justify-center rounded-lg ${tone === 'accent' ? 'bg-accent' : 'bg-surface2'}`}
      importantForAccessibility="no-hide-descendants"
    >
      <Text className={`font-sans-medium text-[10px] uppercase ${tone === 'accent' ? 'text-white/80' : 'text-ink/50'}`}>
        {weekday}
      </Text>
      <Text
        className={`font-serif ${size === 'md' ? 'text-[24px] leading-7' : 'text-[19px] leading-6'} ${tone === 'accent' ? 'text-white' : 'text-ink/60'}`}
      >
        {day}
      </Text>
      <Text className={`font-sans text-[10px] ${tone === 'accent' ? 'text-white/80' : 'text-ink/50'}`}>{month}</Text>
    </View>
  );
}
