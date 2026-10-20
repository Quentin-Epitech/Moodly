import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, Text, View } from 'react-native';
import { api, errorMessage, type CompanyOverview, type TeamOverview } from '@/api';
import { useGuard } from '@/auth/useGuard';
import { ErrorMessage } from '@/components/ErrorMessage';
import { AccountMenu } from '@/components/AccountMenu';
import { RoleNav } from '@/components/RoleNav';
import { NumberedRow } from '@/components/NumberedRow';
import { PeriodSelector, type Period } from '@/components/PeriodSelector';
import { Screen } from '@/components/Screen';
import { Section } from '@/components/Section';
import { Stat, StatGrid, trendHint } from '@/components/Stat';
import { TopBar } from '@/components/TopBar';
import { Display, Highlight, MicroLabel } from '@/components/Typography';
import { formatPercent, formatScore } from '@/lib/dates';
import palette from '@/theme/palette';

const TREND_TONE = { muted: 'text-ink/50', success: 'text-success', danger: 'text-danger' };

// À droite d'une ligne d'équipe : moyenne 7 jours, tendance, point d'alerte
function TeamDetail({ team }: { team: TeamOverview }) {
  const trend = trendHint(team.avg7, team.avgPrev7, team.trend);
  // Alerte de l'équipe : la plus forte entre le moral du jour et le bilan hebdomadaire
  const levels = [team.alert.level, team.weekly.alert.level];
  const level = levels.includes('alert') ? 'alert' : levels.includes('watch') ? 'watch' : 'none';
  const arrow = team.trend === 'up' ? '▲' : team.trend === 'down' ? '▼' : '=';
  return (
    <View className="flex-row items-center gap-3">
      {level !== 'none' && (
        <View className={`h-1.5 w-1.5 rounded-full ${level === 'alert' ? 'bg-danger' : 'bg-warning'}`} />
      )}
      <Text className="font-serif text-[20px] text-ink">{team.avg7 === null ? '—' : formatScore(team.avg7)}</Text>
      {team.trend && <Text className={`font-sans text-[11px] ${TREND_TONE[trend.tone]}`}>{arrow}</Text>}
    </View>
  );
}

// Vue direction : toutes les équipes côte à côte, agrégats uniquement
export default function HrScreen() {
  const user = useGuard('HR');

  const [period, setPeriod] = useState<Period>(30);
  const [overview, setOverview] = useState<CompanyOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const next = await api.getOverview(period);
        if (cancelled) return;
        setOverview(next);
        setError(null);
      } catch (err) {
        if (!cancelled) setError(errorMessage(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, period]);

  if (!user) return null;

  const refresh = async () => {
    setRefreshing(true);
    try {
      setOverview(await api.getOverview(period));
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setRefreshing(false);
    }
  };

  const company = overview?.company;
  const trend = company ? trendHint(company.avg7, company.avgPrev7, company.trend) : null;

  return (
    <Screen
      scroll
      width="wide"
      footer={<RoleNav />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}
    >
      <TopBar right={<AccountMenu />} />

      <MicroLabel className="mt-10">Vue direction · {period} jours, jusqu'à hier</MicroLabel>
      <Display className="mt-3">
        Moral de l'<Highlight color="violet">entreprise</Highlight>
      </Display>

      <View className="mt-7">
        <PeriodSelector value={period} onChange={setPeriod} />
      </View>

      {error && (
        <View className="mt-5">
          <ErrorMessage message={error} />
        </View>
      )}

      {!overview || !company || !trend ? (
        !error && (
          <View className="mt-16 items-center">
            <ActivityIndicator color={palette.ink} />
          </View>
        )
      ) : (
        <>
          <View className="mt-8">
            <StatGrid>
              <Stat
                label="Moyenne 7 jours"
                value={company.avg7 === null ? '—' : formatScore(company.avg7)}
                hint={trend.hint}
                tone={trend.tone}
              />
              <Stat
                label="Équipes en alerte"
                value={`${company.alerts}`}
                hint={`sur ${company.teams}`}
                tone={company.alerts > 0 ? 'danger' : 'success'}
              />
              <Stat
                label="Participation"
                value={formatPercent(company.participation)}
                hint={`${company.responses} réponses · ${company.employees} personnes`}
              />
              <Stat label="Seuil d'anonymat" value={`${overview.threshold}`} hint="réponses minimum par jour" />
            </StatGrid>
          </View>

          <Section
            index={1}
            title="Équipes"
            hint="Moyenne des 7 derniers jours clos · touchez une équipe pour le détail"
          >
            <View className="gap-2">
              {overview.teams.map((team, index) => (
                <NumberedRow
                  key={team.teamId}
                  index={index + 1}
                  label={team.teamName}
                  detail={<TeamDetail team={team} />}
                  onPress={() => router.push({ pathname: '/team/[teamId]', params: { teamId: String(team.teamId) } })}
                />
              ))}
            </View>
          </Section>

          <View className="mt-12 border-t border-line pt-5">
            <MicroLabel>Anonymat</MicroLabel>
            <Text className="mt-2 font-sans text-xs leading-5 text-ink/50">
              Même règle pour la direction que pour les managers : aucune réponse individuelle, et les jours sous le
              seuil sont exclus de tous les totaux, y compris ceux de l'entreprise.
            </Text>
          </View>
        </>
      )}
    </Screen>
  );
}
