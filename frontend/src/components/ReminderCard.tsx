import { BellRing } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { reminderEvents } from '@/lib/calendar';
import palette from '@/theme/palette';
import { AddToCalendarButton } from './AddToCalendarButton';
import { Chip } from './Chip';
import { Toggle } from './Toggle';

const TIMES = ['09:00', '12:30', '17:00', '18:00'];

// Moodly n'envoie pas de notifications : l'employé ajoute lui-même un rappel à son
// agenda (humeur du jour en semaine, bilan le vendredi). Rien n'est stocké côté serveur.
export function ReminderCard() {
  const [time, setTime] = useState('17:00');
  const [weekly, setWeekly] = useState(true);
  const url = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : undefined;

  return (
    <View className="rounded-lg bg-sky px-5 py-5">
      <View className="flex-row items-center gap-2">
        <BellRing size={16} color={palette.ink} />
        <Text className="font-sans-semibold text-[15px] text-ink">Un rappel dans mon agenda</Text>
      </View>
      <Text className="mt-2 font-sans text-sm leading-5 text-ink/80">
        Pas de notifications dans Moodly : choisissez une heure, le rappel s'ajoute à votre propre agenda. Vous le
        modifiez ou le supprimez quand vous voulez.
      </Text>
      <View className="mt-4 flex-row flex-wrap gap-2">
        {TIMES.map((value) => (
          <Chip key={value} label={value} selected={time === value} onPress={() => setTime(value)} />
        ))}
      </View>
      <View className="mt-3">
        <Toggle label="Rappel du bilan le vendredi" value={weekly} onChange={setWeekly} />
      </View>
      <View className="mt-3">
        <AddToCalendarButton
          label="Ajouter les rappels à mon agenda"
          events={() => reminderEvents({ dailyTime: time, weekly, url })}
          fileName="moodly-rappels.ics"
        />
      </View>
    </View>
  );
}
