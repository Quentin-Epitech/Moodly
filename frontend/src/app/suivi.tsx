import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { api, errorMessage, type TeamWeeklyReport } from '@/api';
import { useGuard } from '@/auth/useGuard';
import { AccountMenu } from '@/components/AccountMenu';
import { AlertBanner } from '@/components/AlertBanner';
import { ErrorMessage } from '@/components/ErrorMessage';
import { MiniBars } from '@/components/MiniBars';
import { ReminderCard } from '@/components/ReminderCard';
import { NumberedRow } from '@/components/NumberedRow';
import { RoleNav } from '@/components/RoleNav';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { TopBar } from '@/components/TopBar';
import { Body, Display, Highlight, MicroLabel } from '@/components/Typography';
import { formatScore } from '@/lib/dates';
import { clearLocalHistory, getLocalHistory, isEmpty, type LocalHistory } from '@/lib/localHistory';
import { formatWeek, lastWeeks, weekStartKey, weeklyAverages } from '@/lib/weeks';

const WEEKS = 8;

function Legend({ label, value }: { label: string; value: number | null }) {
  return (
    <View className="mb-3 flex-row items-baseline justify-between">
      <Text className="font-sans-medium text-sm text-ink">{label}</Text>
      <Text className="font-serif text-[20px] text-ink">{value === null ? '—' : formatScore(value)}</Text>
    </View>
  );
}

// Mon suivi : mon historique (sur cet appareil uniquement) et la tendance de mon équipe
export default function TrackingScreen() {
  const user = useGuard('EMPLOYEE');
  const [history, setHistory] = useState<LocalHistory | null>(null);
  const [team, setTeam] = useState<TeamWeeklyReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const local = await getLocalHistory(user.id);
      if (!cancelled) setHistory(local);
      try {
        const report = await api.getTeamWeekly(WEEKS);
        if (!cancelled) setTeam(report);
      } catch (err) {
        if (!cancelled) setError(errorMessage(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) return null;

  // Mes semaines : jusqu'à la semaine en cours (mes propres réponses, pas de risque d'anonymat)
  const myWeeks = lastWeeks(WEEKS, weekStartKey());
  const myLabels = myWeeks.map(formatWeek);
  const myMood = history ? weeklyAverages(history.daily, myWeeks) : [];
  const myWorkload = history ? myWeeks.map((w) => history.weekly[w]?.workload ?? null) : [];
  const myStress = history ? myWeeks.map((w) => history.weekly[w]?.stress ?? null) : [];
  const lastOf = (values: (number | null)[]) => [...values].reverse().find((v) => v !== null) ?? null;

  const clear = async () => {
    await clearLocalHistory(user.id);
    setHistory(await getLocalHistory(user.id));
  };

  return (
    <Screen scroll width="wide" footer={<RoleNav />}>
      <TopBar right={<AccountMenu />} />
      <MicroLabel className="mt-10">Équipe {user.teamName}</MicroLabel>
      <Display className="mt-3">
        Mon <Highlight color="violet">suivi</Highlight>.
      </Display>
      <Body className="mt-4 max-w-[560px]">
        Vos réponses semaine après semaine, et la tendance de votre équipe. Votre historique est enregistré uniquement
        sur cet appareil : personne d'autre, pas même Moodly, ne peut le relier à vous.
      </Body>

      <View className="md:flex-row md:gap-12">
        <View className="md:flex-1">
          <Section index={1} title="Mon humeur" hint={`Moyenne de mes notes du jour, ${WEEKS} dernières semaines`}>
            {history && isEmpty(history) ? (
              <View className="gap-4">
                <Text className="font-sans text-sm leading-5 text-ink/50">
                  Votre suivi se remplit au fil de vos réponses sur cet appareil.
                </Text>
                <NumberedRow index={1} label="Répondre aujourd'hui" onPress={() => router.replace('/employee')} />
              </View>
            ) : (
              <>
                <Legend label="Dernière semaine" value={lastOf(myMood)} />
                <MiniBars values={myMood} labels={myLabels} title="Mon humeur" emptyLabel="pas de réponse" />
              </>
            )}
          </Section>

          <Section index={2} title="Ma charge et mon stress" hint="D'après mes bilans de la semaine">
            {history && Object.keys(history.weekly).length === 0 ? (
              <View className="gap-4">
                <Text className="font-sans text-sm leading-5 text-ink/50">Pas encore de bilan sur cet appareil.</Text>
                <NumberedRow index={1} label="Faire mon bilan de la semaine" onPress={() => router.push('/bilan')} />
              </View>
            ) : (
              <View className="gap-6">
                <View>
                  <Legend label="Charge de travail" value={lastOf(myWorkload)} />
                  <MiniBars
                    values={myWorkload}
                    labels={myLabels}
                    title="Ma charge"
                    emptyLabel="pas de bilan"
                    tone="negative"
                  />
                </View>
                <View>
                  <Legend label="Stress" value={lastOf(myStress)} />
                  <MiniBars
                    values={myStress}
                    labels={myLabels}
                    title="Mon stress"
                    emptyLabel="pas de bilan"
                    tone="negative"
                  />
                </View>
              </View>
            )}
          </Section>
        </View>

        <View className="md:flex-1">
          <Section
            index={3}
            title="Mon équipe"
            hint={`Moyennes des bilans de l'équipe, semaines closes, au moins ${team?.threshold ?? 3} réponses`}
          >
            <ErrorMessage message={error} />
            {team && (
              <View className="gap-6">
                {team.alert.level !== 'none' && (
                  <AlertBanner alert={{ level: team.alert.level, message: team.alert.message, drivers: [] }} />
                )}
                <View>
                  <Legend label="Charge de l'équipe" value={lastOf(team.weeks.map((w) => w.avgWorkload))} />
                  <MiniBars
                    values={team.weeks.map((w) => w.avgWorkload)}
                    labels={team.weeks.map((w) => formatWeek(w.week))}
                    title="Charge de l'équipe"
                    tone="negative"
                    emptyLabel="semaine masquée"
                  />
                </View>
                <View>
                  <Legend label="Stress de l'équipe" value={lastOf(team.weeks.map((w) => w.avgStress))} />
                  <MiniBars
                    values={team.weeks.map((w) => w.avgStress)}
                    labels={team.weeks.map((w) => formatWeek(w.week))}
                    title="Stress de l'équipe"
                    tone="negative"
                    emptyLabel="semaine masquée"
                  />
                </View>
              </View>
            )}
          </Section>
        </View>
      </View>

      <View className="mt-12">
        <ReminderCard />
      </View>

      <View className="mt-12 border-t border-line pt-5">
        <MicroLabel>Sur cet appareil</MicroLabel>
        <Text className="mt-2 font-sans text-xs leading-5 text-ink/50">
          Votre historique personnel n'existe que sur ce téléphone (ou ce navigateur). Il disparaît si vous changez
          d'appareil ou si vous l'effacez.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void clear()}
          className="mt-3 self-start py-1 active:opacity-60"
        >
          <Text className="font-sans text-xs text-ink/70 underline">Effacer mon historique sur cet appareil</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
