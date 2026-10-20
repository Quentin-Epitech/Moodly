import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import {
  api,
  errorMessage,
  type TeamAction,
  type TeamInsights,
  type TeamMoodReport,
  type TeamRef,
  type TeamWeeklyReport,
  type Slot,
} from '@/api';
import { formatPercent, formatScore } from '@/lib/dates';
import { formatWeek } from '@/lib/weeks';
import palette from '@/theme/palette';
import { ActionsSection } from './ActionsSection';
import { AlertBanner } from './AlertBanner';
import { BarList } from './BarList';
import { DayDetails } from './DayDetails';
import { ErrorMessage } from './ErrorMessage';
import { InsightsSection } from './InsightsSection';
import { moodColor } from '@/theme/mood';
import { MOODS } from './MoodPicker';
import { PeriodSelector, type Period } from './PeriodSelector';
import { Screen } from './Screen';
import { Section } from './Section';
import { MiniBars } from './MiniBars';
import { Stat, StatGrid, trendHint } from './Stat';
import { TeamMoodChart } from './TeamMoodChart';
import { Display, Highlight, MicroLabel } from './Typography';

// px-6 de l'écran (24 × 2), si la largeur du conteneur n'est pas encore mesurée
const HORIZONTAL_CHROME = 48;

type Props = {
  team: TeamRef;
  /** true pour le manager de l'équipe (publication / suppression d'actions) */
  canManageActions: boolean;
  /** Première ligne (marque / retour, déconnexion) */
  header: ReactNode;
  /** Navigation par rôle, en bas de l'écran */
  footer?: ReactNode;
  /** Bloc affiché avant les chiffres (prochains rendez-vous du manager) */
  aside?: ReactNode;
};

type Data = { report: TeamMoodReport; insights: TeamInsights; actions: TeamAction[]; weekly: TeamWeeklyReport };

const WEEKS = 12;

type Anchor = 'chart' | 'weekly' | 'distribution' | 'tags' | 'insights' | 'actions';

const SUMMARY: { key: Anchor; index: number; label: string }[] = [
  { key: 'chart', index: 1, label: 'Courbe' },
  { key: 'weekly', index: 2, label: 'Charge et stress' },
  { key: 'distribution', index: 3, label: 'Répartition' },
  { key: 'tags', index: 4, label: 'Raisons' },
  { key: 'insights', index: 5, label: 'Précisions' },
  { key: 'actions', index: 6, label: 'Actions' },
];

// Tableau de bord d'une équipe : partagé par l'écran manager et la vue direction
export function TeamDashboard({ team, canManageActions, header, footer, aside }: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [positions, setPositions] = useState<Partial<Record<Anchor, number>>>({});

  const [period, setPeriod] = useState<Period>(30);
  const [data, setData] = useState<Data | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerTop, setContainerTop] = useState(0);

  const fetchData = useCallback(
    async (days: Period): Promise<Data> => {
      const [report, insights, actions, weekly] = await Promise.all([
        api.getTeamMoods(days, team),
        api.getTeamInsights(days, team),
        api.getTeamActions(team),
        api.getTeamWeekly(WEEKS, team),
      ]);
      return { report, insights, actions, weekly };
    },
    [team],
  );

  const applyData = (next: Data) => {
    setData(next);
    setError(null);
    // Par défaut : le jour visible le plus récent
    const lastVisible = next.report.days.map((d) => !d.hidden).lastIndexOf(true);
    setSelectedIndex(lastVisible === -1 ? next.report.days.length - 1 : lastVisible);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const next = await fetchData(period);
        if (!cancelled) applyData(next);
      } catch (err) {
        if (!cancelled) setError(errorMessage(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchData, period]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      applyData(await fetchData(period));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setRefreshing(false);
    }
  };

  const createAction = async (message: string, event?: Slot) => {
    const created = await api.createTeamAction({ message, event });
    setData((current) => (current ? { ...current, actions: [created, ...current.actions] } : current));
  };

  const deleteAction = async (id: number) => {
    await api.deleteTeamAction(id);
    setData((current) => (current ? { ...current, actions: current.actions.filter((a) => a.id !== id) } : current));
  };

  // Sommaire : chaque bloc mémorise sa position, le lien y fait défiler
  const anchor = (key: Anchor) => (event: LayoutChangeEvent) => {
    const y = event.nativeEvent.layout.y;
    setPositions((current) => (current[key] === y ? current : { ...current, [key]: y }));
  };
  const scrollTo = (key: Anchor) => {
    const y = positions[key];
    if (y !== undefined) scrollRef.current?.scrollTo({ y: containerTop + y - 12, animated: true });
  };

  const report = data?.report;
  const summary = report?.summary;
  const hiddenDays = report?.days.filter((d) => d.hidden).length ?? 0;
  const hasVisibleDay = report?.days.some((d) => !d.hidden) ?? false;
  const selectedDay = report?.days[selectedIndex];
  const trend = summary ? trendHint(summary.avg7, summary.avgPrev7, summary.trend) : null;
  const chartWidth = containerWidth || windowWidth - HORIZONTAL_CHROME;

  return (
    <Screen
      scroll
      width="wide"
      scrollRef={scrollRef}
      footer={footer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}
    >
      <View
        onLayout={(event) => {
          setContainerWidth(event.nativeEvent.layout.width);
          setContainerTop(event.nativeEvent.layout.y);
        }}
      >
        {header}

        <MicroLabel className="mt-10">
          {report ? `Équipe ${report.teamName}` : 'Équipe'} · {period} jours, jusqu'à hier
        </MicroLabel>
        <Display className="mt-3">
          Moral de l'<Highlight color="violet">équipe</Highlight>
        </Display>

        <View className="mt-7">
          <PeriodSelector value={period} onChange={setPeriod} />
        </View>

        {data && (
          <View className="mt-4 flex-row flex-wrap gap-x-5 gap-y-2">
            {SUMMARY.map((item) => (
              <Pressable
                key={item.key}
                accessibilityRole="link"
                onPress={() => scrollTo(item.key)}
                className="flex-row items-center gap-1.5 py-1 active:opacity-60 hover:opacity-70"
              >
                <Text className="font-sans text-xs text-ink/40">{String(item.index).padStart(2, '0')}</Text>
                <Text className="font-sans text-sm text-ink/70">{item.label}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {error && (
          <View className="mt-5">
            <ErrorMessage message={error} />
          </View>
        )}

        {aside}

        {!data || !report || !summary || !trend ? (
          !error && (
            <View className="mt-16 items-center">
              <ActivityIndicator color={palette.ink} />
            </View>
          )
        ) : (
          <>
            {summary.alert.level !== 'none' && (
              <View className="mt-8">
                <AlertBanner alert={summary.alert} />
              </View>
            )}
            {data.weekly.alert.level !== 'none' && (
              <View className={summary.alert.level !== 'none' ? 'mt-3' : 'mt-8'}>
                <AlertBanner alert={{ ...data.weekly.alert, drivers: [] }} />
              </View>
            )}

            <View className="mt-8">
              <StatGrid>
                <Stat
                  label="Moyenne 7 jours"
                  value={summary.avg7 === null ? '—' : formatScore(summary.avg7)}
                  hint={trend.hint}
                  tone={trend.tone}
                />
                <Stat
                  label="Participation"
                  value={formatPercent(summary.participation)}
                  hint={`${summary.responses} réponses · ${summary.teamSize} personnes`}
                />
                <Stat
                  label="Jours masqués"
                  value={`${hiddenDays}`}
                  hint={`sur ${report.days.length} · seuil ${report.threshold} réponses`}
                />
                <Stat
                  label="Raison n°1"
                  value={summary.topTags[0]?.label ?? '—'}
                  hint={summary.topTags[0] ? `${summary.topTags[0].count} mentions` : 'aucune raison citée'}
                  small
                />
              </StatGrid>
            </View>

            <Section
              index={1}
              title="Courbe du moral"
              hint="Touchez ou glissez pour voir un jour"
              onLayout={anchor('chart')}
            >
              {hasVisibleDay ? (
                <TeamMoodChart
                  days={report.days}
                  selectedIndex={selectedIndex}
                  onSelect={setSelectedIndex}
                  width={chartWidth}
                />
              ) : (
                <Text className="py-8 font-sans text-sm text-ink/50">
                  Pas encore assez de réponses pour tracer une courbe.
                </Text>
              )}
              {selectedDay && <DayDetails day={selectedDay} threshold={report.threshold} />}
            </Section>

            <Section
              index={2}
              title="Charge et stress"
              hint={`Bilans hebdomadaires, ${WEEKS} dernières semaines closes · semaines sous le seuil masquées`}
              onLayout={anchor('weekly')}
            >
              <View className="gap-6 md:flex-row md:gap-12">
                {(
                  [
                    ['Charge de travail', 'avgWorkload'],
                    ['Stress', 'avgStress'],
                    ['Note de la semaine', 'avgScore'],
                  ] as const
                ).map(([label, field]) => {
                  const values = data.weekly.weeks.map((w) => w[field]);
                  const last = data.weekly.weeks.at(-1)?.[field] ?? null;
                  return (
                    <View key={field} className="md:flex-1">
                      <View className="mb-3 flex-row items-baseline justify-between">
                        <Text className="font-sans-medium text-sm text-ink">{label}</Text>
                        <Text className="font-serif text-[20px] text-ink">
                          {last === null ? '—' : formatScore(last)}
                        </Text>
                      </View>
                      <MiniBars
                        values={values}
                        labels={data.weekly.weeks.map((w) => formatWeek(w.week))}
                        title={label}
                        emptyLabel="semaine masquée"
                        tone={field === 'avgScore' ? 'positive' : 'negative'}
                      />
                    </View>
                  );
                })}
              </View>
            </Section>

            {/* Sur grand écran, deux colonnes */}
            <View className="md:flex-row md:gap-12">
              <View className="md:flex-1">
                <Section
                  index={3}
                  title="Répartition des notes"
                  hint="Jours visibles uniquement"
                  onLayout={anchor('distribution')}
                >
                  <BarList
                    items={[...summary.distribution].reverse().map((d) => {
                      const mood = MOODS.find((m) => m.score === d.score);
                      return { label: `${d.score} · ${mood?.label ?? ''}`, count: d.count, color: moodColor(d.score) };
                    })}
                  />
                </Section>
              </View>
              <View className="md:flex-1">
                <Section
                  index={4}
                  title="Raisons les plus citées"
                  hint="Jours visibles uniquement"
                  onLayout={anchor('tags')}
                >
                  <BarList items={summary.topTags} emptyText="Aucune raison citée sur la période." />
                </Section>
              </View>
            </View>

            <View className="md:flex-row md:gap-12">
              <View className="md:flex-1">
                <Section
                  index={5}
                  title="Précisions"
                  hint="Questionnaire adaptatif, cumulé sur la période"
                  onLayout={anchor('insights')}
                >
                  <InsightsSection insights={data.insights} />
                </Section>
              </View>
              <View className="md:flex-1">
                <Section
                  index={6}
                  title="Ce qu'on change"
                  hint={
                    canManageActions
                      ? "Vos actions sont visibles par toute l'équipe"
                      : 'Actions publiées par le manager'
                  }
                  onLayout={anchor('actions')}
                >
                  <ActionsSection
                    actions={data.actions}
                    canManage={canManageActions}
                    onCreate={createAction}
                    onDelete={deleteAction}
                    teamName={report?.teamName}
                  />
                </Section>
              </View>
            </View>

            <View className="mt-12 border-t border-line pt-5">
              <MicroLabel>Anonymat</MicroLabel>
              <Text className="mt-2 font-sans text-xs leading-5 text-ink/50">
                Les jours avec moins de {report.threshold} réponses sont masqués et exclus de tous les calculs : aucune
                moyenne, aucune raison, aucune précision — pour qu'on ne puisse jamais deviner la réponse d'une
                personne. Sur un jour visible, une raison n'apparaît que si elle a été citée au moins deux fois. La
                journée en cours n'est jamais affichée : elle apparaît le lendemain, une fois close.
              </Text>
            </View>
          </>
        )}
      </View>
    </Screen>
  );
}
