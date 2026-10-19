import { Pressable, Text, View } from 'react-native';
import type { MoodScore } from '@/api';
import { MOOD_BG, MOOD_SOFT_BG, moodLevel, type ScaleTone } from '@/theme/mood';
import { MoodFace } from './MoodFace';

type Props = {
  value: MoodScore | null;
  onChange: (score: MoodScore) => void;
  /** Cinq libellés, du 1 au 5 */
  labels: [string, string, string, string, string];
  /** Nom de l'échelle, pour les lecteurs d'écran (ex. « Stress ») */
  name: string;
  /** `negative` quand 5 est le pire (charge, stress) : les couleurs vont alors du vert au corail */
  tone?: ScaleTone;
  /** Un visage plutôt qu'un chiffre dans chaque cercle (humeur du jour) */
  faces?: boolean;
};

const SCORES: MoodScore[] = [1, 2, 3, 4, 5];

// Cinq cercles pastel, du corail au vert ; le choix se remplit de sa couleur
export function ScalePicker({ value, onChange, labels, name, tone = 'positive', faces = false }: Props) {
  return (
    <View className="flex-row justify-between">
      {SCORES.map((score, index) => {
        const selected = value === score;
        const level = moodLevel(score, tone);
        return (
          <Pressable
            key={score}
            accessibilityRole="button"
            accessibilityLabel={`${name} : ${labels[index]}, ${score} sur 5`}
            accessibilityState={{ selected }}
            onPress={() => onChange(score)}
            className="w-[19%] items-center active:opacity-70 hover:opacity-80"
          >
            <View
              className={`h-14 w-14 items-center justify-center rounded-full border-2 ${selected ? `border-ink ${MOOD_BG[level]}` : `border-transparent ${MOOD_SOFT_BG[level]}`} ${value !== null && !selected ? 'opacity-70' : ''}`}
            >
              {faces ? (
                <MoodFace level={moodLevel(score)} size={46} />
              ) : (
                <Text className="font-serif text-[26px] text-ink">{score}</Text>
              )}
            </View>
            <Text
              numberOfLines={2}
              className={`mt-2 text-center text-[11px] leading-[14px] ${selected ? 'font-sans-semibold text-ink' : 'font-sans text-ink/50'}`}
            >
              {labels[index]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
