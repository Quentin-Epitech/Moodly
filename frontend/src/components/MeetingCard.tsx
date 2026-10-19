import { Clock, MapPin } from 'lucide-react-native';
import { Text, View } from 'react-native';
import type { Meeting, MeetingStatus } from '@/api';
import { meetingEvent } from '@/lib/calendar';
import { capitalize, formatSlot } from '@/lib/dates';
import palette from '@/theme/palette';
import { AddToCalendarButton } from './AddToCalendarButton';
import { Button } from './Button';
import { DateTile } from './DateTile';
import { MicroLabel } from './Typography';

const STATUS: Record<MeetingStatus, { label: string; bg: string; tone: 'warning' | 'ink' | 'muted' }> = {
  PROPOSED: { label: 'Proposition de rendez-vous', bg: 'bg-sun', tone: 'warning' },
  ACCEPTED: { label: 'Rendez-vous confirmé', bg: 'bg-success-soft', tone: 'ink' },
  DECLINED: { label: 'Rendez-vous refusé', bg: 'bg-surface', tone: 'muted' },
  CANCELLED: { label: 'Rendez-vous annulé', bg: 'bg-surface', tone: 'muted' },
};

type Props = {
  meeting: Meeting;
  /** Titre neutre pour l'agenda (« Point avec les RH ») */
  calendarTitle: string;
  /** Qui a proposé, vu par le lecteur (« Vous », « RH · rh@… ») */
  proposedByLabel: string;
  busy?: boolean;
  onRespond?: (response: 'ACCEPT' | 'DECLINE') => void;
  onCancel?: () => void;
};

// Rendez-vous dans le fil d'une demande : date, heure, lieu, et l'action attendue
export function MeetingCard({ meeting, calendarTitle, proposedByLabel, busy = false, onRespond, onCancel }: Props) {
  const status = STATUS[meeting.status];
  const inactive = meeting.status === 'DECLINED' || meeting.status === 'CANCELLED';

  return (
    <View
      className={`rounded-lg px-4 py-4 ${status.bg}`}
      accessibilityLabel={`${status.label}, ${formatSlot(meeting.startsAt, meeting.durationMin)}, ${meeting.location}`}
    >
      <MicroLabel tone={status.tone === 'muted' ? 'muted' : status.tone === 'warning' ? 'warning' : 'ink'}>
        {status.label}
      </MicroLabel>
      <View className="mt-3 flex-row gap-4">
        <DateTile iso={meeting.startsAt} tone={inactive ? 'muted' : 'accent'} />
        <View className="flex-1 justify-center gap-1.5">
          <View className="flex-row items-center gap-2">
            <Clock size={14} color={inactive ? palette.hidden : palette.ink} />
            <Text
              className={`flex-1 font-sans-medium text-[14px] ${inactive ? 'text-ink/50 line-through' : 'text-ink'}`}
            >
              {capitalize(formatSlot(meeting.startsAt, meeting.durationMin))}
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <MapPin size={14} color={inactive ? palette.hidden : palette.ink} />
            <Text className={`flex-1 font-sans text-[14px] ${inactive ? 'text-ink/50' : 'text-ink/80'}`}>
              {meeting.location}
            </Text>
          </View>
          <Text className="font-sans text-xs text-ink/50">Proposé par : {proposedByLabel}</Text>
        </View>
      </View>

      {meeting.canRespond && onRespond && (
        <View className="mt-4 flex-row gap-2">
          <View className="flex-1">
            <Button title="Accepter" onPress={() => onRespond('ACCEPT')} disabled={busy} />
          </View>
          <View className="flex-1">
            <Button title="Refuser" variant="secondary" onPress={() => onRespond('DECLINE')} disabled={busy} />
          </View>
        </View>
      )}

      {meeting.status === 'ACCEPTED' && (
        <View className="mt-4">
          <AddToCalendarButton
            events={() => [meetingEvent(meeting, calendarTitle)]}
            fileName={`moodly-rendez-vous-${meeting.id}.ics`}
          />
        </View>
      )}

      {meeting.canCancel && onCancel && (
        <View className="mt-2 items-start">
          <Button
            title={meeting.status === 'PROPOSED' ? 'Retirer ma proposition' : 'Annuler le rendez-vous'}
            variant="ghost"
            onPress={onCancel}
            disabled={busy}
          />
        </View>
      )}
    </View>
  );
}
