import { useState } from 'react';
import { Text, View } from 'react-native';
import { formatScore } from '@/lib/dates';
import { moodColor, type ScaleTone } from '@/theme/mood';

type Props = {
  /** Valeurs de 1 à 5, null = pas de donnée (ou semaine masquée) */
  values: (number | null)[];
  /** Étiquettes sous les barres (espacées selon la place disponible) */
  labels: string[];
  /** Titre court, repris dans la description lue par les lecteurs d'écran */
  title: string;
  /** Texte d'une barre vide (« masquée », « pas de bilan »…) */
  emptyLabel?: string;
  height?: number;
  /** `negative` quand 5 est le pire (charge, stress) : la couleur va du vert au corail */
  tone?: ScaleTone;
};

const MIN = 1;
const MAX = 5;
const GAP = 6; // gap-1.5
// Largeur réservée à une étiquette (« 28/09 » en 9 px)
const LABEL_WIDTH = 30;

// Mini-graphique en barres (1 → 5) : chaque barre prend la couleur de sa valeur, pointillés pour une absence
export function MiniBars({
  values,
  labels,
  title,
  emptyLabel = 'pas de donnée',
  height = 72,
  tone = 'positive',
}: Props) {
  const last = [...values].reverse().find((value) => value !== null) ?? null;
  const summary = last === null ? `${title} : ${emptyLabel}` : `${title} : dernière valeur ${formatScore(last)} sur 5`;
  const [width, setWidth] = useState(0);
  const count = values.length;
  const column = count > 0 ? (width - GAP * (count - 1)) / count : 0;
  // Une étiquette toutes les `step` barres, en partant de la plus récente, pour qu'elles ne se chevauchent pas
  const step = column > 0 ? Math.max(1, Math.ceil((LABEL_WIDTH + 4) / (column + GAP))) : count > 8 ? 2 : 1;

  return (
    <View accessible accessibilityLabel={summary} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <View className="flex-row items-end gap-1.5" style={{ height }}>
        {values.map((value, index) => (
          <View key={index} className="flex-1 justify-end" style={{ height }}>
            {value === null ? (
              <View className="rounded-sm border border-dashed border-hidden" style={{ height: 8 }} />
            ) : (
              <View
                className="rounded-md"
                style={{
                  height: Math.max(6, ((value - MIN) / (MAX - MIN)) * (height - 8) + 6),
                  backgroundColor: moodColor(value, tone),
                  // La semaine la plus récente ressort, les précédentes sont adoucies
                  opacity: index === values.length - 1 ? 1 : 0.8,
                }}
              />
            )}
          </View>
        ))}
      </View>
      <View className="mt-1.5 h-3" importantForAccessibility="no-hide-descendants">
        {width > 0 &&
          labels.map((label, index) => {
            if ((count - 1 - index) % step !== 0) return null;
            // Centrée sous sa barre, sans dépasser du graphique
            const center = index * (column + GAP) + column / 2;
            const left = Math.min(Math.max(0, center - LABEL_WIDTH / 2), width - LABEL_WIDTH);
            return (
              <Text
                key={index}
                numberOfLines={1}
                className="absolute top-0 text-center font-sans text-[9px] text-ink/50"
                style={{ left, width: LABEL_WIDTH }}
              >
                {label}
              </Text>
            );
          })}
      </View>
    </View>
  );
}
