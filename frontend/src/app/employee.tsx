import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { router } from 'expo-router';
import { api, ApiError, errorMessage, type MoodScore, type Question, type Tag, type TeamAction } from '@/api';
import { useGuard } from '@/auth/useGuard';
import { ActionCard } from '@/components/ActionCard';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { ErrorMessage } from '@/components/ErrorMessage';
import { AccountMenu } from '@/components/AccountMenu';
import { MoodPicker } from '@/components/MoodPicker';
import { NumberedRow } from '@/components/NumberedRow';
import { ReminderCard } from '@/components/ReminderCard';
import { QuestionCard } from '@/components/QuestionCard';
import { RoleNav } from '@/components/RoleNav';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { TopBar } from '@/components/TopBar';
import { Body, Display, Highlight, MicroLabel } from '@/components/Typography';
import { UpcomingAgenda } from '@/components/UpcomingAgenda';
import { dateKey, formatLongDate } from '@/lib/dates';
import { recordDaily } from '@/lib/localHistory';
import { applicableQuestions } from '@/lib/questions';
import palette from '@/theme/palette';

const MAX_TAGS = 3;

type Phase = 'loading' | 'form' | 'done';

// Une seule page : la note d'abord, puis les sections apparaissent au fur et à mesure
export default function EmployeeScreen() {
  const user = useGuard('EMPLOYEE');

  const [phase, setPhase] = useState<Phase>('loading');
  const [tags, setTags] = useState<Tag[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [latestAction, setLatestAction] = useState<TeamAction | null>(null);
  const [weeklyDone, setWeeklyDone] = useState(true);

  const [score, setScore] = useState<MoodScore | null>(null);
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [answers, setAnswers] = useState<Record<number, number[]>>({});

  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const [today, allTags, allQuestions, actions, week] = await Promise.all([
          api.getMoodToday(),
          api.getTags(),
          api.getQuestions(),
          api.getTeamActions(),
          api.getWeekStatus(),
        ]);
        if (cancelled) return;
        setWeeklyDone(week.submitted);
        setTags(allTags);
        setQuestions(allQuestions);
        setLatestAction(actions[0] ?? null);
        setPhase(today.submitted ? 'done' : 'form');
      } catch (err) {
        if (cancelled) return;
        setError(errorMessage(err));
        setPhase('form');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) return null;

  // Questions posées pour cette saisie : dépendent de la note et des raisons cochées
  const applicable = score ? applicableQuestions(questions, score, tagIds) : [];
  const answered = applicable.filter((question) => (answers[question.id] ?? []).length > 0);

  const toggleTag = (id: number) =>
    setTagIds((current) => (current.includes(id) ? current.filter((t) => t !== id) : [...current, id]));

  const submit = async () => {
    if (!score) return;
    setSending(true);
    setError(null);
    try {
      await api.submitMood({
        score,
        tagIds,
        answers: answered.map((question) => ({ questionId: question.id, optionIds: answers[question.id] })),
      });
      // Suivi personnel : uniquement sur cet appareil, jamais envoyé avec l'identité
      await recordDaily(user.id, dateKey(), score);
      setPhase('done');
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setPhase('done'); // déjà saisi aujourd'hui (depuis un autre appareil, par exemple)
      } else {
        setError(errorMessage(err));
      }
    } finally {
      setSending(false);
    }
  };

  if (phase === 'loading') {
    return (
      <Screen footer={<RoleNav />}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={palette.ink} />
        </View>
      </Screen>
    );
  }

  const today = formatLongDate(dateKey());

  if (phase === 'done') {
    return (
      <Screen scroll footer={<RoleNav />}>
        <TopBar right={<AccountMenu />} />
        <MicroLabel className="mt-10">
          {today} · Équipe {user.teamName}
        </MicroLabel>
        <Display size="xl" className="mt-3">
          <Highlight color="mint">Merci.</Highlight>
          {'\nÀ demain.'}
        </Display>
        <Body className="mt-5 max-w-[320px]">
          Votre réponse a rejoint celles de l'équipe {user.teamName}, sans votre nom. Elle comptera dans les tendances
          de l'équipe à partir de demain.
        </Body>
        {latestAction && (
          <View className="mt-12">
            <ActionCard action={latestAction} title="Ce que votre manager change" teamName={user.teamName} />
          </View>
        )}
        <UpcomingAgenda className="mt-12" />
        {!weeklyDone && (
          <View className="mt-12">
            <MicroLabel className="mb-3">Cette semaine</MicroLabel>
            <NumberedRow index={1} label="Faire mon bilan de la semaine" onPress={() => router.push('/bilan')} />
          </View>
        )}
        <View className="mt-12">
          <ReminderCard />
        </View>
      </Screen>
    );
  }

  const sendIndex = applicable.length > 0 ? 3 : 2;

  return (
    <Screen scroll footer={<RoleNav />}>
      <TopBar right={<AccountMenu />} />

      <MicroLabel className="mt-10">
        {today} · Équipe {user.teamName}
      </MicroLabel>
      <Display size="xl" className="mt-3">
        Comment <Highlight>ça va</Highlight> ?
      </Display>
      <Body className="mt-4">Réponse anonyme · trente secondes.</Body>

      <View className="mt-9">
        <MoodPicker value={score} onChange={setScore} />
      </View>

      {latestAction && !score && (
        <View className="mt-12">
          <ActionCard action={latestAction} title="Ce que votre manager change" teamName={user.teamName} />
        </View>
      )}
      {!score && <UpcomingAgenda />}

      {!score && !weeklyDone && (
        <View className="mt-10">
          <MicroLabel className="mb-3">Cette semaine</MicroLabel>
          <NumberedRow index={1} label="Faire mon bilan de la semaine" onPress={() => router.push('/bilan')} />
        </View>
      )}

      {score && (
        <>
          <Section
            index={1}
            title="Les raisons"
            hint={`Qu'est-ce qui pèse ou qui aide ? Facultatif · ${MAX_TAGS} maximum`}
          >
            <View className="flex-row flex-wrap gap-2">
              {tags.map((tag) => {
                const selected = tagIds.includes(tag.id);
                return (
                  <Chip
                    key={tag.id}
                    label={tag.label}
                    selected={selected}
                    disabled={!selected && tagIds.length >= MAX_TAGS}
                    onPress={() => toggleTag(tag.id)}
                  />
                );
              })}
            </View>
          </Section>

          {applicable.length > 0 && (
            <Section index={2} title="Précisions" hint="Ces questions dépendent de votre réponse. Facultatif.">
              <View className="gap-8">
                {applicable.map((question) => (
                  <QuestionCard
                    key={question.id}
                    question={question}
                    selected={answers[question.id] ?? []}
                    onChange={(optionIds) => setAnswers((current) => ({ ...current, [question.id]: optionIds }))}
                  />
                ))}
              </View>
            </Section>
          )}

          <Section index={sendIndex} title="Envoyer">
            <Text className="font-sans text-xs leading-5 text-ink/50">
              Envoyé sans votre nom. Votre manager verra une moyenne par jour et des tendances cumulées — jamais votre
              réponse, et rien du tout si moins de {user.anonymityThreshold} personnes répondent.
            </Text>
            <View className="mt-5 gap-3">
              <ErrorMessage message={error} />
              <Button title="Envoyer ma réponse" onPress={() => void submit()} loading={sending} />
            </View>
          </Section>
        </>
      )}
    </Screen>
  );
}
