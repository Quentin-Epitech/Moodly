import { CalendarCheck, CalendarPlus } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { addToCalendar } from '@/lib/addToCalendar';
import type { CalendarEvent } from '@/lib/calendar';
import palette from '@/theme/palette';

type Props = {
  events: () => CalendarEvent[];
  fileName: string;
  label?: string;
  /** Pilule pleine (violette) ou lien discret */
  variant?: 'pill' | 'link';
};

// « Ajouter à mon agenda » : fichier .ics téléchargé (web) ou partagé (mobile)
export function AddToCalendarButton({ events, fileName, label = 'Ajouter à mon agenda', variant = 'pill' }: Props) {
  const [state, setState] = useState<'idle' | 'done' | 'error'>('idle');

  const add = async () => {
    try {
      await addToCalendar(events(), fileName);
      setState('done');
    } catch {
      setState('error');
    }
  };

  const Icon = state === 'done' ? CalendarCheck : CalendarPlus;
  const pill = variant === 'pill';

  return (
    <View className={pill ? 'items-start' : undefined}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => void add()}
        className={
          pill
            ? 'flex-row items-center gap-2 rounded-full bg-accent px-4 py-2.5 active:opacity-80 hover:opacity-90'
            : 'flex-row items-center gap-1.5 py-1 active:opacity-60'
        }
      >
        <Icon size={16} color={pill ? palette.bg : palette.accent} />
        <Text className={`font-sans-medium text-[13px] ${pill ? 'text-white' : 'text-accent'}`}>{label}</Text>
      </Pressable>
      {state === 'done' && Platform.OS === 'web' && (
        <Text className="mt-2 font-sans text-xs leading-5 text-ink/60">
          Fichier téléchargé : ouvrez-le pour l'ajouter à Outlook, Apple Calendar ou Google Agenda.
        </Text>
      )}
      {state === 'error' && (
        <Text className="mt-2 font-sans text-xs text-danger">Impossible de créer le fichier d'agenda.</Text>
      )}
    </View>
  );
}
