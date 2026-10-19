import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { CalendarPlus } from 'lucide-react-native';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { api, errorMessage, type CaseDetail, type CaseStatus } from '@/api';
import { useGuard } from '@/auth/useGuard';
import { AccountMenu } from '@/components/AccountMenu';
import { Button } from '@/components/Button';
import { StatusChip } from '@/components/CaseRow';
import { ErrorMessage } from '@/components/ErrorMessage';
import { MeetingCard } from '@/components/MeetingCard';
import { RoleNav } from '@/components/RoleNav';
import { Screen } from '@/components/Screen';
import { EMPTY_SLOT, SlotPicker, slotFromDraft, type SlotDraft } from '@/components/SlotPicker';
import { TextField } from '@/components/TextField';
import { TopBar } from '@/components/TopBar';
import { Display, Hairline, MicroLabel } from '@/components/Typography';
import { tokenForCase } from '@/lib/anonymousCases';
import { meetingTitle } from '@/lib/calendar';
import { formatRelative, formatTime } from '@/lib/dates';
import palette from '@/theme/palette';

const NEXT_STATUS: Record<CaseStatus, { status: CaseStatus; label: string }[]> = {
  OPEN: [
    { status: 'IN_PROGRESS', label: 'Prendre en charge' },
    { status: 'RESOLVED', label: 'Marquer comme résolue' },
  ],
  IN_PROGRESS: [{ status: 'RESOLVED', label: 'Marquer comme résolue' }],
  RESOLVED: [{ status: 'IN_PROGRESS', label: 'Rouvrir' }],
};

// Fil d'une demande : messages entre le demandeur et le manager ou les RH
export default function CaseScreen() {
  const user = useGuard();
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = Number(rawId);
  const [detail, setDetail] = useState<CaseDetail | null>(null);
  const [token, setToken] = useState<string | undefined>();
  const [reply, setReply] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [proposing, setProposing] = useState(false);
  const [slot, setSlot] = useState<SlotDraft>(EMPTY_SLOT);

  const fetchCase = useCallback(async () => {
    if (!user || !Number.isInteger(id)) return null;
    const caseToken = user.role === 'EMPLOYEE' ? await tokenForCase(user.id, id) : undefined;
    return { caseToken, detail: await api.getCase(id, caseToken) };
  }, [user, id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await fetchCase();
        if (cancelled || !result) return;
        setToken(result.caseToken);
        setDetail(result.detail);
        setError(null);
      } catch (err) {
        if (!cancelled) setError(errorMessage(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchCase]);

  if (!user) return null;

  // Toutes les actions renvoient la demande à jour
  const run = async (action: () => Promise<CaseDetail>) => {
    setBusy(true);
    setError(null);
    try {
      setDetail(await action());
      return true;
    } catch (err) {
      setError(errorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    if (await run(() => api.replyCase(id, reply.trim(), token))) setReply('');
  };

  const changeStatus = (status: CaseStatus) => run(() => api.setCaseStatus(id, status));

  const ready = slotFromDraft(slot);
  const propose = async () => {
    if (!ready) return;
    if (await run(() => api.proposeMeeting(id, ready))) {
      setProposing(false);
      setSlot(EMPTY_SLOT);
    }
  };

  const handler = detail?.viewer === 'HANDLER';

  return (
    <Screen scroll footer={<RoleNav />}>
      <TopBar back={{ label: 'Demandes', onPress: () => router.replace('/demandes') }} right={<AccountMenu />} />

      {!detail ? (
        <View className="mt-16 items-center">
          {error ? <ErrorMessage message={error} /> : <ActivityIndicator color={palette.ink} />}
        </View>
      ) : (
        <>
          <MicroLabel className="mt-10">
            {detail.typeLabel} · {detail.category}
          </MicroLabel>
          <Display size="md" className="mt-3">
            {detail.subject}
          </Display>
          <View className="mt-4 flex-row flex-wrap items-center gap-3">
            <StatusChip status={detail.status} />
            <Text className="font-sans text-xs text-ink/50">
              {handler
                ? `De : ${detail.anonymous ? 'demandeur anonyme' : detail.requester} · Équipe ${detail.teamName}`
                : `À : ${detail.recipientLabel}`}
            </Text>
          </View>

          {handler && detail.anonymous && (
            <Text className="mt-4 font-sans text-xs leading-5 text-ink/50">
              Signalement anonyme : personne ne peut savoir qui l'a envoyé. Répondez ici, la personne verra votre
              réponse grâce à son code de suivi.
            </Text>
          )}
          {!handler && detail.anonymous && token && (
            <Text selectable className="mt-4 font-sans text-xs leading-5 text-ink/50">
              Signalement anonyme · code de suivi {token}
            </Text>
          )}

          <Hairline className="mt-6" />
          <View className="mt-6 gap-4">
            {detail.messages.map((message) =>
              message.kind === 'MEETING_PROPOSED' && message.meeting ? (
                <MeetingCard
                  key={message.id}
                  meeting={message.meeting}
                  calendarTitle={meetingTitle(detail.viewer, detail.recipient, detail.requester)}
                  proposedByLabel={message.authorLabel}
                  busy={busy}
                  onRespond={(response) => void run(() => api.respondMeeting(message.meeting!.id, response))}
                  onCancel={() => void run(() => api.cancelMeeting(message.meeting!.id))}
                />
              ) : message.kind !== 'TEXT' ? (
                <Text key={message.id} className="text-center font-sans text-xs leading-5 text-ink/50">
                  {message.authorLabel} · {message.body}
                </Text>
              ) : (
                <View key={message.id} className={message.mine ? 'items-end' : 'items-start'}>
                  <View className={`max-w-[88%] px-4 py-3 ${message.mine ? 'bg-ink' : 'bg-surface'}`}>
                    <Text className={`font-sans text-[15px] leading-6 ${message.mine ? 'text-white' : 'text-ink'}`}>
                      {message.body}
                    </Text>
                  </View>
                  <Text className="mt-1.5 font-sans text-[11px] text-ink/50">
                    {message.authorLabel} · {formatRelative(message.createdAt)}, {formatTime(message.createdAt)}
                  </Text>
                </View>
              ),
            )}
          </View>

          {detail.anonymous ? (
            handler && (
              <Text className="mt-6 font-sans text-xs leading-5 text-ink/50">
                Pas de rendez-vous pour un signalement anonyme : il révélerait l'identité du demandeur.
              </Text>
            )
          ) : proposing ? (
            <View className="mt-8 rounded-lg border border-line px-4 py-5">
              <MicroLabel tone="accent" className="mb-4">
                Proposer un rendez-vous
              </MicroLabel>
              <SlotPicker
                value={slot}
                onChange={setSlot}
                places={
                  detail.recipient === 'HR'
                    ? ['Bureau RH', 'Visio', 'Salle de réunion']
                    : ['Bureau du manager', 'Visio', 'Salle de réunion']
                }
              />
              <View className="mt-5 gap-2">
                <Button
                  title="Envoyer la proposition"
                  onPress={() => void propose()}
                  loading={busy}
                  disabled={!ready}
                />
                <Button title="Annuler" variant="ghost" onPress={() => setProposing(false)} />
              </View>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => setProposing(true)}
              className="mt-6 flex-row items-center gap-2 self-start rounded-full border border-accent px-4 py-2.5 active:bg-accent-soft hover:bg-accent-soft"
            >
              <CalendarPlus size={16} color={palette.accent} />
              <Text className="font-sans-medium text-[13px] text-accent">Proposer un rendez-vous</Text>
            </Pressable>
          )}

          <View className="mt-8 gap-3">
            <TextField
              label="Répondre"
              value={reply}
              onChangeText={setReply}
              multiline
              maxLength={2000}
              className="min-h-[96px]"
              textAlignVertical="top"
              placeholder="Votre message"
            />
            <ErrorMessage message={error} />
            <Button title="Envoyer" onPress={() => void send()} loading={busy} disabled={reply.trim().length === 0} />
          </View>

          {handler && (
            <View className="mt-8 gap-2">
              <MicroLabel className="mb-1">Statut</MicroLabel>
              {NEXT_STATUS[detail.status].map((next) => (
                <Button
                  key={next.status}
                  title={next.label}
                  variant="secondary"
                  onPress={() => void changeStatus(next.status)}
                  disabled={busy}
                />
              ))}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}
