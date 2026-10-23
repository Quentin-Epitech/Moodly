import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import type { Trend } from '@/api';
import { formatDelta } from '@/lib/dates';
import { MicroLabel } from './Typography';

export type StatTone = 'muted' | 'success' | 'danger';

const HINT_TONE: Record<StatTone, string> = {
  muted: 'text-ink/50',
  success: 'text-success',
  danger: 'text-danger',
};

type StatProps = {
  label: string;
  value: string;
  hint?: string;
  tone?: StatTone;
  /** Valeur textuelle (plus petite) plutôt qu'un chiffre */
  small?: boolean;
};

// Chiffre clé : étiquette, grand chiffre en serif, commentaire.
// Deux par ligne sur téléphone, quatre sur grand écran.
export function Stat({ label, value, hint, tone = 'muted', small = false }: StatProps) {
  return (
    <View className="w-1/2 border-b border-line py-5 pr-4 md:w-1/4 md:py-6 md:pr-6">
      <MicroLabel>{label}</MicroLabel>
      <Text
        className={`mt-2 font-serif text-ink ${small ? 'text-[20px] leading-7' : 'text-[34px] leading-10 tracking-[-0.8px] md:text-[40px] md:leading-[44px]'}`}
        numberOfLines={2}
      >
        {value}
      </Text>
      {hint ? <Text className={`mt-1.5 font-sans text-xs ${HINT_TONE[tone]}`}>{hint}</Text> : null}
    </View>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <View className="flex-row flex-wrap border-t border-line">{children}</View>;
}

/** Texte de comparaison « ▲ +0,4 vs semaine précédente » et sa couleur */
export function trendHint(
  avg7: number | null,
  avgPrev7: number | null,
  trend: Trend | null,
): { hint: string; tone: StatTone } {
  if (avg7 === null) return { hint: 'pas assez de réponses', tone: 'muted' };
  if (avgPrev7 === null || trend === null) return { hint: 'pas de semaine de comparaison', tone: 'muted' };
  const delta = formatDelta(avg7 - avgPrev7);
  if (trend === 'up') return { hint: `▲ ${delta} vs semaine précédente`, tone: 'success' };
  if (trend === 'down') return { hint: `▼ ${delta} vs semaine précédente`, tone: 'danger' };
  return { hint: `= stable (${delta})`, tone: 'muted' };
}
