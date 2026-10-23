import { Pressable, Text, View } from 'react-native';
import type { CaseStatus, CaseSummary } from '@/api';
import { dateKey, daysBetween, formatRelative } from '@/lib/dates';

export const STATUS_LABELS: Record<CaseStatus, string> = {
  OPEN: 'Nouvelle',
  IN_PROGRESS: 'En cours',
  RESOLVED: 'Résolue',
};

// Nouvelle en violet, en cours en ambre, résolue en vert
const STATUS_TONE: Record<CaseStatus, { bg: string; text: string }> = {
  OPEN: { bg: 'bg-accent-soft', text: 'text-accent' },
  IN_PROGRESS: { bg: 'bg-warning-soft', text: 'text-warning' },
  RESOLVED: { bg: 'bg-success-soft', text: 'text-success' },
};

export function StatusChip({ status }: { status: CaseStatus }) {
  return (
    <View className={`rounded-full px-2.5 py-0.5 ${STATUS_TONE[status].bg}`}>
      <Text className={`font-sans-medium text-[11px] ${STATUS_TONE[status].text}`}>{STATUS_LABELS[status]}</Text>
    </View>
  );
}

type Props = { item: CaseSummary; onPress: () => void };

/** Au-delà, une demande non résolue est signalée à qui la traite */
const STALE_DAYS = 7;

// Une demande dans une liste : objet, type, interlocuteur, statut, pastille non lue
export function CaseRow({ item, onPress }: Props) {
  const who =
    item.viewer === 'HANDLER'
      ? item.anonymous
        ? `Anonyme · ${item.teamName}`
        : `${item.requester ?? ''} · ${item.teamName}`
      : `À : ${item.recipientLabel}`;
  const age = daysBetween(dateKey(new Date(item.createdAt)), dateKey());
  const stale = item.viewer === 'HANDLER' && item.status !== 'RESOLVED' && age >= STALE_DAYS;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.subject}, ${item.typeLabel}, ${STATUS_LABELS[item.status]}${item.unread ? ', réponse non lue' : ''}${stale ? `, ouverte depuis ${age} jours` : ''}`}
      onPress={onPress}
      className="rounded-lg bg-surface px-5 py-4 active:bg-surface2 hover:bg-surface2"
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            {item.unread && <View className="h-2 w-2 rounded-full bg-accent" />}
            <Text numberOfLines={1} className="flex-1 font-sans-medium text-[15px] text-ink">
              {item.subject}
            </Text>
          </View>
          <Text numberOfLines={1} className="mt-1 font-sans text-xs text-ink/50">
            {item.typeLabel} · {item.category}
          </Text>
          <Text numberOfLines={1} className="mt-0.5 font-sans text-xs text-ink/50">
            {who} · {formatRelative(item.lastMessageAt)}
          </Text>
          {stale && (
            <Text className="mt-1 font-sans-medium text-xs text-danger">Ouverte depuis {age} jours : à traiter</Text>
          )}
        </View>
        <StatusChip status={item.status} />
      </View>
    </Pressable>
  );
}
