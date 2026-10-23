import { Text, View, type GestureResponderEvent } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import type { DayStats } from '@/api';
import { formatShortDate } from '@/lib/dates';
import { moodColor } from '@/theme/mood';
import palette from '@/theme/palette';

type Props = {
  days: DayStats[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  /** Largeur disponible en px */
  width: number;
};

const Y_AXIS_WIDTH = 24;
const INITIAL_SPACING = 10;
const END_SPACING = 10;
const HEIGHT = 180;
const LABEL_WIDTH = 44;
const MUTED = '#19191980';

/** Une étiquette tous les `step` jours selon la période affichée */
function labelStep(count: number) {
  if (count <= 7) return 1;
  if (count <= 31) return 7;
  return 30;
}

/**
 * Courbe de la moyenne sur la période : trait noir, points de la couleur de l'humeur
 * (corail → vert). Les jours masqués par le seuil n'ont pas de valeur : ils laissent
 * un trou (jamais à zéro).
 * Un tap ou un glissement sur le graphe sélectionne le jour le plus proche.
 */
export function TeamMoodChart({ days, selectedIndex, onSelect, width }: Props) {
  const plotWidth = width - Y_AXIS_WIDTH;
  const spacing = (plotWidth - INITIAL_SPACING - END_SPACING) / Math.max(1, days.length - 1);
  const last = days.length - 1;

  const data = days.map((day, index) => ({
    // Pas de `value` pour un jour masqué : gifted-charts le traite comme manquant
    ...(day.hidden || day.avg === null ? {} : { value: day.avg }),
    dataPointColor: day.avg === null ? palette.ink : moodColor(day.avg),
    dataPointRadius: index === selectedIndex ? 6 : days.length > 31 ? 2 : 3.5,
  }));

  const step = labelStep(days.length);
  const labelIndices = days
    .map((_, index) => index)
    .filter((index) => index === last || (index % step === 0 && index <= last - Math.ceil(step / 2)));

  const xOf = (index: number) => INITIAL_SPACING + index * spacing;
  const indexFromX = (x: number) => Math.min(last, Math.max(0, Math.round((x - INITIAL_SPACING) / spacing)));
  const select = (event: GestureResponderEvent) => onSelect(indexFromX(event.nativeEvent.locationX));

  const selectedDay = days[selectedIndex];

  return (
    <View style={{ width }}>
      <LineChart
        data={data}
        width={plotWidth}
        height={HEIGHT}
        spacing={spacing}
        initialSpacing={INITIAL_SPACING}
        endSpacing={END_SPACING}
        yAxisLabelWidth={Y_AXIS_WIDTH}
        disableScroll
        curved
        thickness={2}
        color={palette.ink}
        interpolateMissingValues={false}
        extrapolateMissingValues={false}
        // Axe de 1 à 5 : décalage de 1, puis 4 sections d'une unité
        yAxisOffset={1}
        maxValue={4}
        noOfSections={4}
        yAxisThickness={0}
        xAxisThickness={1}
        xAxisColor={palette.line}
        xAxisLabelsHeight={0}
        rulesType="solid"
        rulesColor={palette.line}
        yAxisTextStyle={{ color: MUTED, fontSize: 11, fontFamily: 'Inter_400Regular' }}
        isAnimated={false}
      />

      <View style={{ height: 16, marginTop: 6 }}>
        {labelIndices.map((index) => (
          <Text
            key={index}
            style={{
              position: 'absolute',
              left: Y_AXIS_WIDTH + xOf(index) - LABEL_WIDTH / 2,
              width: LABEL_WIDTH,
              textAlign: 'center',
              fontSize: 10,
              fontFamily: index === selectedIndex ? 'Inter_500Medium' : 'Inter_400Regular',
              color: index === selectedIndex ? palette.ink : MUTED,
            }}
          >
            {index === last ? 'Hier' : formatShortDate(days[index].date)}
          </Text>
        ))}
      </View>

      {/* Couche tactile au-dessus du tracé : tap ou glissement → jour le plus proche */}
      <View
        style={{ position: 'absolute', left: Y_AXIS_WIDTH, top: 0, width: plotWidth, height: HEIGHT, zIndex: 10 }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={select}
        onResponderMove={select}
      >
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: xOf(selectedIndex) - 0.5,
            top: 0,
            width: 1,
            height: HEIGHT,
            backgroundColor: selectedDay?.hidden ? palette.hidden : palette.accent,
          }}
        />
      </View>
    </View>
  );
}
