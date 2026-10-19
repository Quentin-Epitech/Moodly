import { ScrollView, Text, View } from 'react-native';
import type { Slot } from '@/api';
import { formatDayChip, upcomingWorkdays } from '@/lib/dates';
import { Chip } from './Chip';
import { TextField } from './TextField';
import { MicroLabel } from './Typography';

export type SlotDraft = { day: string | null; time: string | null; durationMin: number; location: string };

export const EMPTY_SLOT: SlotDraft = { day: null, time: null, durationMin: 30, location: '' };

const TIMES = [
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
];
const DURATIONS = [15, 30, 45, 60, 90];
const DAYS_SHOWN = 10;
/** Délai minimal avant un créneau proposé aujourd'hui (comme l'API) */
const MIN_NOTICE_MS = 10 * 60 * 1000;

function startOf(day: string, time: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm);
}

function isPastFor(day: string, time: string, now: Date) {
  return startOf(day, time).getTime() < now.getTime() + MIN_NOTICE_MS;
}

/** Créneau complet prêt à envoyer, ou null tant qu'il manque quelque chose */
export function slotFromDraft(draft: SlotDraft, now: Date = new Date()): Slot | null {
  if (!draft.day || !draft.time || draft.location.trim().length < 2) return null;
  if (isPastFor(draft.day, draft.time, now)) return null;
  return {
    startsAt: startOf(draft.day, draft.time).toISOString(),
    durationMin: draft.durationMin,
    location: draft.location.trim(),
  };
}

type Props = {
  value: SlotDraft;
  onChange: (value: SlotDraft) => void;
  /** Lieux proposés en un geste (« Visio », « Bureau RH »…) */
  places: string[];
};

// Choix d'un créneau au doigt : jour ouvré, heure, durée, lieu. Pas de sélecteur
// de date natif : mêmes gestes sur téléphone et sur le web.
export function SlotPicker({ value, onChange, places }: Props) {
  const now = new Date();
  const days = upcomingWorkdays(DAYS_SHOWN, now);
  const set = (patch: Partial<SlotDraft>) => onChange({ ...value, ...patch });
  const isPast = (time: string) => value.day !== null && isPastFor(value.day, time, now);

  return (
    <View className="gap-5">
      <View>
        <MicroLabel className="mb-2">Jour</MicroLabel>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
          {days.map((day) => (
            <Chip
              key={day}
              label={formatDayChip(day)}
              selected={value.day === day}
              onPress={() => set({ day, time: value.time && !isPastFor(day, value.time, now) ? value.time : null })}
            />
          ))}
        </ScrollView>
      </View>

      <View>
        <MicroLabel className="mb-2">Heure</MicroLabel>
        <View className="flex-row flex-wrap gap-2">
          {TIMES.map((time) => (
            <Chip
              key={time}
              label={time}
              selected={value.time === time}
              disabled={value.day === null || isPast(time)}
              onPress={() => set({ time })}
            />
          ))}
        </View>
        {value.day === null && <Text className="mt-2 font-sans text-xs text-ink/50">Choisissez d'abord un jour.</Text>}
      </View>

      <View>
        <MicroLabel className="mb-2">Durée</MicroLabel>
        <View className="flex-row flex-wrap gap-2">
          {DURATIONS.map((minutes) => (
            <Chip
              key={minutes}
              label={`${minutes} min`}
              selected={value.durationMin === minutes}
              onPress={() => set({ durationMin: minutes })}
            />
          ))}
        </View>
      </View>

      <View>
        <MicroLabel className="mb-2">Lieu</MicroLabel>
        <View className="mb-3 flex-row flex-wrap gap-2">
          {places.map((place) => (
            <Chip
              key={place}
              label={place}
              selected={value.location === place}
              onPress={() => set({ location: place })}
            />
          ))}
        </View>
        <TextField
          accessibilityLabel="Lieu"
          value={value.location}
          onChangeText={(location) => set({ location })}
          maxLength={80}
          placeholder="Ou précisez : salle, lien de visio…"
        />
      </View>
    </View>
  );
}
