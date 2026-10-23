import { Pressable, Text, View } from 'react-native';

export const PERIODS = [7, 30, 90] as const;
export type Period = (typeof PERIODS)[number];

type Props = { value: Period; onChange: (period: Period) => void };

// Onglets texte soulignés : 7 jours · 30 jours · 90 jours
export function PeriodSelector({ value, onChange }: Props) {
  return (
    <View className="flex-row gap-6 border-b border-line">
      {PERIODS.map((period) => {
        const active = period === value;
        return (
          <Pressable
            key={period}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(period)}
            className={`-mb-px pb-3 ${active ? 'border-b-2 border-accent' : 'border-b-2 border-transparent'}`}
          >
            <Text className={`font-sans-medium text-sm ${active ? 'text-accent' : 'text-ink/50 hover:text-ink'}`}>
              {period} jours
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
