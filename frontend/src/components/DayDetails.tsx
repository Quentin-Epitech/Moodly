import { Text, View } from 'react-native';
import type { DayStats } from '@/api';
import { formatLongDate, formatScore } from '@/lib/dates';
import { moodLevel, MOOD_SOFT_BG } from '@/theme/mood';
import { MoodFace } from './MoodFace';
import { MicroLabel } from './Typography';

type Props = { day: DayStats; threshold: number };

// Détail du jour sélectionné dans le graphe : date, moyenne, nombre de réponses, raisons
export function DayDetails({ day, threshold }: Props) {
  const plural = day.count > 1 ? 's' : '';

  return (
    <View className="mt-6">
      <MicroLabel>{formatLongDate(day.date)}</MicroLabel>

      {day.hidden || day.avg === null ? (
        <>
          <Text className="mt-2 font-serif text-[22px] leading-7 text-ink">Jour masqué</Text>
          <Text className="mt-1 font-sans text-sm leading-5 text-ink/50">
            {day.count} réponse{plural} — il en faut au moins {threshold} pour afficher une moyenne.
          </Text>
        </>
      ) : (
        <>
          <View className="mt-2 flex-row items-center gap-3">
            <View className={`h-11 w-11 items-center justify-center rounded-full ${MOOD_SOFT_BG[moodLevel(day.avg)]}`}>
              <MoodFace level={moodLevel(day.avg)} size={40} />
            </View>
            <Text className="font-serif text-[34px] leading-10 tracking-[-0.8px] text-ink">{formatScore(day.avg)}</Text>
            <Text className="font-sans text-sm text-ink/50">
              / 5 · {day.count} réponse{plural}
            </Text>
          </View>
          {day.topTags.length > 0 && (
            <View className="mt-3 flex-row flex-wrap gap-2">
              {day.topTags.map((tag) => (
                <View key={tag.label} className="rounded-full border border-line px-3 py-1.5">
                  <Text className="font-sans text-xs text-ink">
                    {tag.label} · {tag.count}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}
