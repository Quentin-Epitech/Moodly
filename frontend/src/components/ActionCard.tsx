import { Clock, MapPin, Sparkles } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import type { TeamAction } from '@/api';
import { teamEvent } from '@/lib/calendar';
import { capitalize, formatRelative, formatSlot } from '@/lib/dates';
import palette from '@/theme/palette';
import { AddToCalendarButton } from './AddToCalendarButton';
import { DateTile } from './DateTile';
import { MicroLabel } from './Typography';

type Props = {
  action: TeamAction;
  title?: string;
  /** Nom de l'équipe, pour le titre dans l'agenda */
  teamName?: string;
  onDelete?: () => void;
};

// Une action publiée par le manager (« ce qu'on change »), éventuellement un point d'équipe daté
export function ActionCard({ action, title = 'Action du manager', teamName, onDelete }: Props) {
  const event = action.event;
  const upcoming = event !== null && new Date(event.startsAt) > new Date();

  return (
    <View className="rounded-lg bg-sun px-5 py-4">
      <View className="flex-row items-center gap-2">
        <Sparkles size={14} color={palette.warning} />
        <MicroLabel tone="warning">{title}</MicroLabel>
      </View>
      <Text className="mt-2 font-sans text-[15px] leading-6 text-ink">{action.message}</Text>

      {event && (
        <View className="mt-4 flex-row gap-3 rounded-lg bg-white/70 px-3 py-3">
          <DateTile iso={event.startsAt} size="sm" tone={upcoming ? 'accent' : 'muted'} />
          <View className="flex-1 justify-center gap-1">
            <View className="flex-row items-center gap-2">
              <Clock size={13} color={palette.ink} />
              <Text className="flex-1 font-sans-medium text-[13px] text-ink">
                {capitalize(formatSlot(event.startsAt, event.durationMin))}
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <MapPin size={13} color={palette.ink} />
              <Text className="flex-1 font-sans text-[13px] text-ink/80">{event.location}</Text>
            </View>
            {upcoming && (
              <AddToCalendarButton
                variant="link"
                events={() => [teamEvent({ ...event, id: action.id, message: action.message, teamName })]}
                fileName={`moodly-point-equipe-${action.id}.ics`}
              />
            )}
          </View>
        </View>
      )}

      <View className="mt-3 flex-row items-center justify-between">
        <Text className="font-sans text-xs text-ink/50">{formatRelative(action.createdAt)}</Text>
        {onDelete && (
          <Pressable accessibilityRole="button" onPress={onDelete} className="py-1 active:opacity-60">
            <Text className="font-sans text-xs text-ink/50 underline">Supprimer</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
