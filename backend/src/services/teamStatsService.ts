import { env } from '../config/env';
import { lastDays, shiftDateKey, todayKey } from '../lib/dates';
import { notFound } from '../lib/errors';
import { prisma } from '../lib/prisma';
import { aggregateWeek, closedWeeks, computeWeeklyAlert, type WeeklyAlert, type WeekStats } from './weeklyService';

// ---------------------------------------------------------------------------
// Types exposés par l'API
// ---------------------------------------------------------------------------

export type TagCount = { label: string; count: number };

export type DayStats = {
  date: string;
  /** Moyenne des notes (2 décimales), null si le jour est masqué */
  avg: number | null;
  /** Nombre de réponses ce jour-là (information de participation, pas d'humeur) */
  count: number;
  /** true si count < seuil : aucune information d'humeur n'est renvoyée */
  hidden: boolean;
  /** Jusqu'à 3 tags les plus cités, vide si masqué */
  topTags: TagCount[];
};

export type Trend = 'up' | 'down' | 'flat';
export type AlertLevel = 'none' | 'watch' | 'alert';

export type TeamAlert = {
  level: AlertLevel;
  message: string;
  /** Raisons dominantes des 7 derniers jours (jours visibles) */
  drivers: TagCount[];
};

export type TeamSummary = {
  /** Nombre d'employés dans l'équipe */
  teamSize: number;
  /** Réponses sur la période, tous jours confondus */
  responses: number;
  /** responses / (jours × employés), entre 0 et 1 */
  participation: number;
  /** Moyenne pondérée des 7 derniers jours (jours visibles), null si aucun */
  avg7: number | null;
  /** Même chose pour les 7 jours précédents */
  avgPrev7: number | null;
  trend: Trend | null;
  /** Répartition des notes 1→5 sur les jours visibles */
  distribution: { score: number; count: number }[];
  /** Raisons les plus citées sur les jours visibles */
  topTags: TagCount[];
  alert: TeamAlert;
};

export type TeamMoodReport = {
  teamId: number;
  teamName: string;
  threshold: number;
  days: DayStats[];
  summary: TeamSummary;
};

export type OptionStat = { id: number; label: string; count: number; ratio: number };

export type QuestionInsight = {
  id: number;
  key: string;
  label: string;
  kind: string;
  /** Nombre de réponses ayant répondu à cette question */
  responses: number;
  options: OptionStat[];
};

export type TeamInsights = {
  teamId: number;
  teamName: string;
  threshold: number;
  days: number;
  /** Jours visibles pris en compte */
  basedOnDays: number;
  /** Réponses prises en compte (celles des jours visibles) */
  responses: number;
  questions: QuestionInsight[];
};

export type TeamOverview = {
  teamId: number;
  teamName: string;
  teamSize: number;
  responses: number;
  participation: number;
  avg7: number | null;
  avgPrev7: number | null;
  trend: Trend | null;
  alert: TeamAlert;
  visibleDays: number;
  hiddenDays: number;
  topTags: TagCount[];
  /** Moyenne par jour (null = masqué), du plus ancien au plus récent */
  series: (number | null)[];
  /** Bilan hebdomadaire de la dernière semaine close (charge, stress) et son alerte */
  weekly: { stats: WeekStats; alert: WeeklyAlert };
};

export type CompanyOverview = {
  threshold: number;
  days: number;
  dates: string[];
  company: {
    teams: number;
    employees: number;
    responses: number;
    participation: number;
    avg7: number | null;
    avgPrev7: number | null;
    trend: Trend | null;
    alerts: number;
  };
  teams: TeamOverview[];
};

// ---------------------------------------------------------------------------
// Règles (documentées dans API.md)
// ---------------------------------------------------------------------------

const TOP_TAGS_PER_DAY = 3;
const TOP_TAGS_SUMMARY = 5;
/** Sur un jour visible, une raison citée une seule fois désignerait une personne : on l'ignore */
const MIN_TAG_MENTIONS_PER_DAY = 2;
const SCORES = [1, 2, 3, 4, 5];

/** Écart de moyenne 7 jours à partir duquel on parle de tendance */
const TREND_DELTA = 0.3;
/** Moyenne 7 jours en dessous de laquelle le moral est « bas » / « fragile » */
const ALERT_AVG = 2.8;
const WATCH_AVG = 3.2;
/** Baisse de la moyenne 7 jours (vs 7 jours précédents) déclenchant une alerte / une vigilance */
const ALERT_DROP = 0.8;
const WATCH_DROP = 0.4;

// ---------------------------------------------------------------------------
// Agrégation pure (testable sans base)
// ---------------------------------------------------------------------------

type Entry = { date: string; score: number; tags: string[] };
type DayBucket = { date: string; scores: number[]; tagCounts: Map<string, number> };

const round2 = (n: number) => Math.round(n * 100) / 100;
const formatScore = (n: number) => n.toFixed(1).replace('.', ',');

function bucketize(entries: Entry[]): Map<string, DayBucket> {
  const buckets = new Map<string, DayBucket>();
  for (const entry of entries) {
    let bucket = buckets.get(entry.date);
    if (!bucket) {
      bucket = { date: entry.date, scores: [], tagCounts: new Map() };
      buckets.set(entry.date, bucket);
    }
    bucket.scores.push(entry.score);
    for (const label of entry.tags) bucket.tagCounts.set(label, (bucket.tagCounts.get(label) ?? 0) + 1);
  }
  return buckets;
}

function mergeTagCounts(buckets: DayBucket[]): Map<string, number> {
  const merged = new Map<string, number>();
  for (const bucket of buckets) {
    for (const [label, count] of bucket.tagCounts) merged.set(label, (merged.get(label) ?? 0) + count);
  }
  return merged;
}

function topTags(tagCounts: Map<string, number>, limit: number, minCount = 1): TagCount[] {
  return [...tagCounts.entries()]
    .map(([label, count]) => ({ label, count }))
    .filter((tag) => tag.count >= minCount)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'fr'))
    .slice(0, limit);
}

/** Moyenne de toutes les notes des buckets donnés, null s'il n'y en a aucune */
function weightedAverage(buckets: DayBucket[]): number | null {
  const scores = buckets.flatMap((b) => b.scores);
  if (scores.length === 0) return null;
  return round2(scores.reduce((sum, s) => sum + s, 0) / scores.length);
}

/**
 * Transforme les réponses brutes d'un jour en agrégat anonyme.
 * En dessous du seuil, on ne renvoie ni moyenne ni tags : avec 1 ou 2 réponses,
 * un manager pourrait deviner qui a dit quoi. Sur un jour visible, une raison
 * n'apparaît que si elle a été cochée au moins deux fois.
 */
export function aggregateDay(date: string, bucket: DayBucket | undefined, threshold: number): DayStats {
  const count = bucket?.scores.length ?? 0;

  if (!bucket || count < threshold) {
    return { date, avg: null, count, hidden: true, topTags: [] };
  }

  return {
    date,
    avg: weightedAverage([bucket]),
    count,
    hidden: false,
    topTags: topTags(bucket.tagCounts, TOP_TAGS_PER_DAY, MIN_TAG_MENTIONS_PER_DAY),
  };
}

/** Les buckets des jours au-dessus du seuil, dans l'ordre des dates */
function visibleBuckets(dateKeys: string[], buckets: Map<string, DayBucket>, threshold: number): DayBucket[] {
  return dateKeys
    .map((date) => buckets.get(date))
    .filter((bucket): bucket is DayBucket => bucket !== undefined && bucket.scores.length >= threshold);
}

function weekAverages(dateKeys: string[], visible: DayBucket[]) {
  const last7 = new Set(dateKeys.slice(-7));
  const prev7 = new Set(dateKeys.slice(-14, -7));
  const avg7 = weightedAverage(visible.filter((b) => last7.has(b.date)));
  const avgPrev7 = weightedAverage(visible.filter((b) => prev7.has(b.date)));

  let trend: Trend | null = null;
  if (avg7 !== null && avgPrev7 !== null) {
    const delta = avg7 - avgPrev7;
    trend = delta >= TREND_DELTA ? 'up' : delta <= -TREND_DELTA ? 'down' : 'flat';
  }

  return { avg7, avgPrev7, trend, last7Visible: visible.filter((b) => last7.has(b.date)) };
}

export function computeAlert(avg7: number | null, avgPrev7: number | null, last7Visible: DayBucket[]): TeamAlert {
  if (avg7 === null) {
    return { level: 'none', message: 'Pas assez de réponses cette semaine pour évaluer le moral.', drivers: [] };
  }

  const drop = avgPrev7 === null ? 0 : avgPrev7 - avg7;
  const drivers = topTags(mergeTagCounts(last7Visible), 3);
  const vs = avgPrev7 === null ? '' : ` contre ${formatScore(avgPrev7)} la semaine précédente`;

  if (drop >= ALERT_DROP) {
    return { level: 'alert', message: `Baisse nette du moral cette semaine : ${formatScore(avg7)} / 5${vs}.`, drivers };
  }
  // Un moral bas mais qui remonte nettement ne se décrit pas comme une dégradation
  const rising = avgPrev7 !== null && avg7 - avgPrev7 >= TREND_DELTA;
  if (avg7 < ALERT_AVG) {
    const message = rising
      ? `Moral encore bas, mais en hausse : ${formatScore(avg7)} / 5${vs}.`
      : `Moral bas cette semaine : ${formatScore(avg7)} / 5${vs}.`;
    return { level: 'alert', message, drivers };
  }
  if (drop >= WATCH_DROP) {
    return { level: 'watch', message: `Le moral fléchit : ${formatScore(avg7)} / 5${vs}.`, drivers };
  }
  if (avg7 < WATCH_AVG) {
    const message = rising
      ? `Le moral remonte, mais reste fragile : ${formatScore(avg7)} / 5${vs}.`
      : `Moral fragile cette semaine : ${formatScore(avg7)} / 5${vs}.`;
    return { level: 'watch', message, drivers };
  }
  return { level: 'none', message: `Moral correct cette semaine : ${formatScore(avg7)} / 5${vs}.`, drivers };
}

export function computeSummary(
  dateKeys: string[],
  buckets: Map<string, DayBucket>,
  threshold: number,
  teamSize: number,
): TeamSummary {
  const visible = visibleBuckets(dateKeys, buckets, threshold);
  const responses = dateKeys.reduce((n, date) => n + (buckets.get(date)?.scores.length ?? 0), 0);
  const { avg7, avgPrev7, trend, last7Visible } = weekAverages(dateKeys, visible);

  const visibleScores = visible.flatMap((b) => b.scores);
  const distribution = SCORES.map((score) => ({ score, count: visibleScores.filter((s) => s === score).length }));

  return {
    teamSize,
    responses,
    participation: teamSize > 0 ? Math.min(1, round2(responses / (dateKeys.length * teamSize))) : 0,
    avg7,
    avgPrev7,
    trend,
    distribution,
    topTags: topTags(mergeTagCounts(visible), TOP_TAGS_SUMMARY),
    alert: computeAlert(avg7, avgPrev7, last7Visible),
  };
}

// ---------------------------------------------------------------------------
// Accès aux données
// ---------------------------------------------------------------------------

async function loadTeam(teamId: number) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true, name: true, _count: { select: { users: { where: { role: 'EMPLOYEE' } } } } },
  });
  if (!team) throw notFound('Équipe introuvable');
  return { id: team.id, name: team.name, teamSize: team._count.users };
}

/** Seules les colonnes date/score/tags sont lues : MoodEntry ne contient de toute façon aucun auteur. */
async function loadEntries(teamId: number, from: string, to: string): Promise<Entry[]> {
  const rows = await prisma.moodEntry.findMany({
    where: { teamId, date: { gte: from, lte: to } },
    select: { date: true, score: true, tags: { select: { tag: { select: { label: true } } } } },
  });
  return rows.map((row) => ({ date: row.date, score: row.score, tags: row.tags.map((t) => t.tag.label) }));
}

/**
 * Fenêtre d'analyse : les `days` derniers jours **clos**, c'est-à-dire jusqu'à
 * hier inclus. La journée en cours n'est jamais exposée : si le manager voyait
 * « aujourd'hui » passer de 3 à 4 réponses et la moyenne bouger, il pourrait
 * déduire la note de la personne qui vient de répondre (attaque par différence).
 */
export function closedWindow(days: number, today = todayKey()): { dateKeys: string[]; from: string; to: string } {
  const to = shiftDateKey(today, -1);
  const dateKeys = lastDays(days, to);
  return { dateKeys, from: dateKeys[0], to };
}

/**
 * Le moral d'une équipe sur les `days` derniers jours clos (jusqu'à hier).
 * Tous les jours sont renvoyés, même sans réponse (count: 0, hidden: true).
 */
export async function getTeamMoodReport(teamId: number, days: number, today = todayKey()): Promise<TeamMoodReport> {
  const team = await loadTeam(teamId);
  const { dateKeys, from, to } = closedWindow(days, today);
  const buckets = bucketize(await loadEntries(teamId, from, to));
  const threshold = env.MIN_RESPONSES;

  return {
    teamId: team.id,
    teamName: team.name,
    threshold,
    days: dateKeys.map((date) => aggregateDay(date, buckets.get(date), threshold)),
    summary: computeSummary(dateKeys, buckets, threshold, team.teamSize),
  };
}

/**
 * Réponses détaillées au questionnaire, cumulées sur la période (jours clos).
 * Règle d'anonymat : seules les réponses des jours visibles (≥ seuil) comptent,
 * et rien n'est jamais ventilé par jour.
 */
export async function getTeamInsights(teamId: number, days: number, today = todayKey()): Promise<TeamInsights> {
  const team = await loadTeam(teamId);
  const { from, to } = closedWindow(days, today);
  const threshold = env.MIN_RESPONSES;

  const countsByDay = await prisma.moodEntry.groupBy({
    by: ['date'],
    where: { teamId, date: { gte: from, lte: to } },
    _count: { _all: true },
  });
  const visibleDates = countsByDay.filter((row) => row._count._all >= threshold).map((row) => row.date);

  const entries =
    visibleDates.length === 0
      ? []
      : await prisma.moodEntry.findMany({
          where: { teamId, date: { in: visibleDates } },
          select: { id: true, answers: { select: { questionId: true, optionId: true } } },
        });

  const respondentsByQuestion = new Map<number, Set<string>>();
  const countByOption = new Map<number, number>();
  for (const entry of entries) {
    for (const answer of entry.answers) {
      if (!respondentsByQuestion.has(answer.questionId)) respondentsByQuestion.set(answer.questionId, new Set());
      respondentsByQuestion.get(answer.questionId)!.add(entry.id);
      countByOption.set(answer.optionId, (countByOption.get(answer.optionId) ?? 0) + 1);
    }
  }

  const questions = await prisma.question.findMany({
    orderBy: { order: 'asc' },
    include: { options: { orderBy: { order: 'asc' }, select: { id: true, label: true } } },
  });

  return {
    teamId: team.id,
    teamName: team.name,
    threshold,
    days,
    basedOnDays: visibleDates.length,
    responses: entries.length,
    questions: questions.map((question) => {
      const responses = respondentsByQuestion.get(question.id)?.size ?? 0;
      return {
        id: question.id,
        key: question.key,
        label: question.label,
        kind: question.kind,
        responses,
        options: question.options
          .map((option) => {
            const count = countByOption.get(option.id) ?? 0;
            return { id: option.id, label: option.label, count, ratio: responses > 0 ? round2(count / responses) : 0 };
          })
          .sort((a, b) => b.count - a.count || a.id - b.id),
      };
    }),
  };
}

/**
 * Vue direction : chaque équipe (agrégats uniquement, même seuil) + total entreprise.
 * Le total entreprise n'inclut que les jours visibles de chaque équipe : sinon un
 * jour masqué pourrait se déduire par soustraction.
 */
export async function getCompanyOverview(days: number, today = todayKey()): Promise<CompanyOverview> {
  const threshold = env.MIN_RESPONSES;
  const { dateKeys, from, to } = closedWindow(days, today);

  const teams = await prisma.team.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, _count: { select: { users: { where: { role: 'EMPLOYEE' } } } } },
  });

  const overviews: TeamOverview[] = [];
  const companyVisible: DayBucket[] = [];
  let employees = 0;
  let responses = 0;

  for (const team of teams) {
    const teamSize = team._count.users;
    if (teamSize === 0) continue; // équipe « Direction » (RH), rien à mesurer

    const buckets = bucketize(await loadEntries(team.id, from, to));
    const lastWeek = closedWeeks(1, today)[0];
    const weekRows = await prisma.weeklyCheckin.findMany({
      where: { teamId: team.id, week: lastWeek },
      select: { score: true, workload: true, stress: true },
    });
    const weekStats = aggregateWeek(lastWeek, weekRows, threshold);
    const summary = computeSummary(dateKeys, buckets, threshold, teamSize);
    const dayStats = dateKeys.map((date) => aggregateDay(date, buckets.get(date), threshold));

    overviews.push({
      teamId: team.id,
      teamName: team.name,
      teamSize,
      responses: summary.responses,
      participation: summary.participation,
      avg7: summary.avg7,
      avgPrev7: summary.avgPrev7,
      trend: summary.trend,
      alert: summary.alert,
      visibleDays: dayStats.filter((d) => !d.hidden).length,
      hiddenDays: dayStats.filter((d) => d.hidden).length,
      topTags: summary.topTags.slice(0, 3),
      series: dayStats.map((d) => d.avg),
      weekly: { stats: weekStats, alert: computeWeeklyAlert(weekStats) },
    });

    companyVisible.push(...visibleBuckets(dateKeys, buckets, threshold));
    employees += teamSize;
    responses += summary.responses;
  }

  const { avg7, avgPrev7, trend } = weekAverages(dateKeys, companyVisible);

  return {
    threshold,
    days,
    dates: dateKeys,
    company: {
      teams: overviews.length,
      employees,
      responses,
      participation: employees > 0 ? Math.min(1, round2(responses / (dateKeys.length * employees))) : 0,
      avg7,
      avgPrev7,
      trend,
      // Une équipe est en alerte si son moral ou son bilan hebdomadaire l'est
      alerts: overviews.filter((t) => t.alert.level === 'alert' || t.weekly.alert.level === 'alert').length,
    },
    teams: overviews,
  };
}
