import { router, useFocusEffect } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { api, type AgendaItem } from '@/api';
import { meetingEvent, meetingTitle, teamEvent } from '@/lib/calendar';
import { formatTime, formatUpcoming } from '@/lib/dates';
import palette from '@/theme/palette';
import { AddToCalendarButton } from './AddToCalendarButton';
import { DateTile } from './DateTile';
import { MicroLabel } from './Typography';

function titleOf(item: AgendaItem): string {
  if (item.kind === 'TEAM_EVENT') return item.title;
  return meetingTitle(item.viewer, item.recipient, item.viewer === 'HANDLER' ? item.withLabel : null);
}

function Row({ item }: { item: AgendaItem }) {
  const meeting = item.kind === 'MEETING' ? item : null;
  const pending = meeting?.status === 'PROPOSED';
  const confirmed = item.kind === 'TEAM_EVENT' || meeting?.status === 'ACCEPTED';
  const title = titleOf(item);

  return (
    <View className="flex-row gap-3 rounded-lg bg-surface px-4 py-3">
      <DateTile iso={item.startsAt} size="sm" tone={pending ? 'muted' : 'accent'} />
      <View className="flex-1 gap-1">
        <View className="flex-row flex-wrap items-center gap-2">
          <Text numberOfLines={2} className="flex-shrink font-sans-medium text-[14px] leading-5 text-ink">
            {title}
          </Text>
          {pending && (
            <View className={`rounded-full px-2 py-0.5 ${meeting.canRespond ? 'bg-sun' : 'bg-surface2'}`}>
              <Text className="font-sans-medium text-[10px] text-ink">
                {meeting.canRespond ? 'À confirmer' : 'En attente de réponse'}
              </Text>
            </View>
          )}
        </View>
        <Text className="font-sans text-xs text-ink/60">
          {formatUpcoming(item.startsAt)} · {formatTime(item.startsAt)} · {item.durationMin} min · {item.location}
        </Text>
        {meeting && (
          <Text numberOfLines={1} className="font-sans text-xs text-ink/50">
            Demande : {meeting.subject}
          </Text>
        )}
        <View className="mt-1 flex-row flex-wrap items-center gap-4">
          {confirmed && (
            <AddToCalendarButton
              variant="link"
              label="Ajouter à mon agenda"
              events={() => [
                item.kind === 'TEAM_EVENT'
                  ? teamEvent({ ...item, message: item.title, teamName: item.teamName })
                  : meetingEvent(item, title),
              ]}
              fileName={
                item.kind === 'TEAM_EVENT' ? `moodly-point-equipe-${item.id}.ics` : `moodly-rendez-vous-${item.id}.ics`
              }
            />
          )}
          {meeting && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Ouvrir la demande « ${meeting.subject} »`}
              onPress={() => router.push(`/demandes/${meeting.caseId}`)}
              className="flex-row items-center gap-1 py-1 active:opacity-60"
            >
              <Text className="font-sans-medium text-[13px] text-ink/70">
                {pending && meeting.canRespond ? 'Répondre' : 'Voir la demande'}
              </Text>
              <ArrowRight size={14} color={palette.ink} />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

type Props = { className?: string };

/** Prochains rendez-vous de l'utilisateur ; rien n'est affiché s'il n'y en a pas */
export function UpcomingAgenda({ className = 'mt-10' }: Props) {
  const [items, setItems] = useState<AgendaItem[]>([]);

  // Rechargé à chaque retour sur l'écran (un rendez-vous a pu être accepté entre-temps)
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const agenda = await api.getAgenda();
          if (!cancelled) setItems(agenda);
        } catch {
          // Bloc secondaire : en cas d'erreur réseau, on ne l'affiche simplement pas
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  if (items.length === 0) return null;

  return (
    <View className={className}>
      <MicroLabel tone="accent" className="mb-3">
        Prochains rendez-vous
      </MicroLabel>
      <View className="gap-2">
        {items.map((item) => (
          <Row key={`${item.kind}-${item.id}`} item={item} />
        ))}
      </View>
    </View>
  );
}
