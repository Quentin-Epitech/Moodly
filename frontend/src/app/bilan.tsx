import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { api, ApiError, errorMessage, type MoodScore } from '@/api';
import { useGuard } from '@/auth/useGuard';
import { AccountMenu } from '@/components/AccountMenu';
import { Button } from '@/components/Button';
import { ErrorMessage } from '@/components/ErrorMessage';
import { RoleNav } from '@/components/RoleNav';
import { ScalePicker } from '@/components/ScalePicker';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { TopBar } from '@/components/TopBar';
import { Body, Display, Highlight, MicroLabel } from '@/components/Typography';
import { formatLongDate } from '@/lib/dates';
import { recordWeekly } from '@/lib/localHistory';
import palette from '@/theme/palette';

type Phase = 'loading' | 'form' | 'done';

const SCORE_LABELS: [string, string, string, string, string] = [
  'Très difficile',
  'Difficile',
  'Correcte',
  'Bonne',
  'Très bonne',
];
const WORKLOAD_LABELS: [string, string, string, string, string] = [
  'Très légère',
  'Légère',
  'Normale',
  'Lourde',
  'Très lourde',
];
const STRESS_LABELS: [string, string, string, string, string] = ['Aucun', 'Faible', 'Modéré', 'Élevé', 'Très élevé'];

// Bilan de la semaine : trois questions, une fois par semaine, anonyme comme l'humeur du jour
export default function WeeklyScreen() {
  const user = useGuard('EMPLOYEE');
  const [phase, setPhase] = useState<Phase>('loading');
  const [week, setWeek] = useState<string | null>(null);
  const [score, setScore] = useState<MoodScore | null>(null);
  const [workload, setWorkload] = useState<MoodScore | null>(null);
  const [stress, setStress] = useState<MoodScore | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const status = await api.getWeekStatus();
        if (cancelled) return;
        setWeek(status.week);
        setPhase(status.submitted ? 'done' : 'form');
      } catch (err) {
        if (!cancelled) {
          setError(errorMessage(err));
          setPhase('form');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) return null;

  const submit = async () => {
    if (!score || !workload || !stress) return;
    setSending(true);
    setError(null);
    try {
      await api.submitWeekly({ score, workload, stress });
      if (week) await recordWeekly(user.id, week, { score, workload, stress });
      setPhase('done');
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setPhase('done');
      else setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const header = (
    <>
      <TopBar back={{ label: "Aujourd'hui", onPress: () => router.replace('/employee') }} right={<AccountMenu />} />
      <MicroLabel className="mt-10">
        {week ? `Semaine du ${formatLongDate(week)}` : 'Cette semaine'} · Équipe {user.teamName}
      </MicroLabel>
    </>
  );

  if (phase === 'loading') {
    return (
      <Screen footer={<RoleNav />}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={palette.ink} />
        </View>
      </Screen>
    );
  }

  if (phase === 'done') {
    return (
      <Screen scroll footer={<RoleNav />}>
        {header}
        <Display size="xl" className="mt-3">
          <Highlight color="mint">Bilan fait.</Highlight>
          {'\nBonne fin de semaine.'}
        </Display>
        <Body className="mt-5 max-w-[340px]">
          Votre bilan rejoint ceux de l'équipe, sans votre nom. Il comptera dans les tendances de la semaine prochaine.
        </Body>
        <View className="mt-10">
          <Button title="Voir mon suivi" variant="secondary" onPress={() => router.replace('/suivi')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll footer={<RoleNav />}>
      {header}
      <Display className="mt-3">
        Bilan de la <Highlight color="peach">semaine</Highlight>.
      </Display>
      <Body className="mt-4">Trois questions, vingt secondes. Anonyme, comme votre humeur du jour.</Body>

      <Section index={1} title="Votre semaine" hint="Dans l'ensemble, comment s'est-elle passée ?">
        <ScalePicker value={score} onChange={setScore} labels={SCORE_LABELS} name="Semaine" />
      </Section>

      <Section index={2} title="Charge de travail" hint="Comment avez-vous ressenti votre charge ?">
        <ScalePicker
          value={workload}
          onChange={setWorkload}
          labels={WORKLOAD_LABELS}
          name="Charge de travail"
          tone="negative"
        />
      </Section>

      <Section index={3} title="Stress" hint="Quel niveau de stress avez-vous ressenti ?">
        <ScalePicker value={stress} onChange={setStress} labels={STRESS_LABELS} name="Stress" tone="negative" />
      </Section>

      <View className="mt-10 gap-3">
        <Text className="font-sans text-xs leading-5 text-ink/50">
          Envoyé sans votre nom. Votre manager voit des moyennes par semaine, jamais votre réponse, et rien du tout si
          moins de {user.anonymityThreshold} personnes répondent.
        </Text>
        <ErrorMessage message={error} />
        <Button
          title="Envoyer mon bilan"
          onPress={() => void submit()}
          loading={sending}
          disabled={!score || !workload || !stress}
        />
      </View>
    </Screen>
  );
}
