import { Prisma } from '@prisma/client';
import { env } from '../config/env';
import { currentWeekKey, lastWeeks, shiftDateKey, todayKey, weekStartKey } from '../lib/dates';
import { conflict, notFound } from '../lib/errors';
import { prisma } from '../lib/prisma';

// Bilan hebdomadaire : note de la semaine, charge de travail et stress ressentis.
// Même principe d'anonymat que l'humeur du jour : WeeklySubmission (qui) et
// WeeklyCheckin (quoi) sans aucun lien, agrégats par semaine close avec seuil.

export type WeeklyInput = {
  userId: number;
  teamId: number;
  /** Lundi de la semaine (l'API passe toujours la semaine en cours, le seed des semaines passées) */
  week: string;
  score: number;
  workload: number;
  stress: number;
};

export type WeekStats = {
  /** Lundi de la semaine, "YYYY-MM-DD" */
  week: string;
  count: number;
  /** true si count < seuil : aucune moyenne n'est renvoyée */
  hidden: boolean;
  avgScore: number | null;
  avgWorkload: number | null;
  avgStress: number | null;
};

export type WeeklyAlertLevel = 'none' | 'watch' | 'alert';
export type WeeklyAlert = { level: WeeklyAlertLevel; message: string };

export type TeamWeeklyReport = {
  teamId: number;
  teamName: string;
  threshold: number;
  weeks: WeekStats[];
  /** Calculée sur la dernière semaine close */
  alert: WeeklyAlert;
};

const STRESS_ALERT = 4;
const STRESS_WATCH = 3.5;
const WORKLOAD_ALERT = 4;
const WORKLOAD_WATCH = 3.5;

const round2 = (n: number) => Math.round(n * 100) / 100;
const formatScore = (n: number) => n.toFixed(1).replace('.', ',');
const average = (values: number[]) => round2(values.reduce((sum, v) => sum + v, 0) / values.length);

export async function hasSubmittedWeek(userId: number, week = currentWeekKey()): Promise<boolean> {
  const row = await prisma.weeklySubmission.findUnique({
    where: { userId_week: { userId, week } },
    select: { id: true },
  });
  return row !== null;
}

/** Écrit WeeklySubmission et WeeklyCheckin dans une seule transaction ; 409 si déjà fait cette semaine. */
export async function submitWeekly(input: WeeklyInput): Promise<void> {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.weeklySubmission.create({ data: { userId: input.userId, week: input.week } });
      await tx.weeklyCheckin.create({
        data: {
          teamId: input.teamId,
          week: input.week,
          score: input.score,
          workload: input.workload,
          stress: input.stress,
        },
      });
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw conflict('Bilan de la semaine déjà fait');
    }
    throw err;
  }
}

/** Agrège une semaine ; en dessous du seuil, rien d'autre que le nombre de réponses. */
export function aggregateWeek(
  week: string,
  rows: { score: number; workload: number; stress: number }[],
  threshold: number,
): WeekStats {
  const count = rows.length;
  if (count < threshold) {
    return { week, count, hidden: true, avgScore: null, avgWorkload: null, avgStress: null };
  }
  return {
    week,
    count,
    hidden: false,
    avgScore: average(rows.map((r) => r.score)),
    avgWorkload: average(rows.map((r) => r.workload)),
    avgStress: average(rows.map((r) => r.stress)),
  };
}

export function computeWeeklyAlert(last: WeekStats | undefined): WeeklyAlert {
  if (!last || last.hidden || last.avgStress === null || last.avgWorkload === null) {
    return { level: 'none', message: 'Pas assez de bilans la semaine dernière.' };
  }
  const stress = `stress ${formatScore(last.avgStress)} / 5`;
  const workload = `charge ${formatScore(last.avgWorkload)} / 5`;
  if (last.avgStress >= STRESS_ALERT || last.avgWorkload >= WORKLOAD_ALERT) {
    return { level: 'alert', message: `Semaine dernière très chargée : ${stress}, ${workload}.` };
  }
  if (last.avgStress >= STRESS_WATCH || last.avgWorkload >= WORKLOAD_WATCH) {
    return { level: 'watch', message: `Tension en hausse la semaine dernière : ${stress}, ${workload}.` };
  }
  return { level: 'none', message: `Semaine dernière : ${stress}, ${workload}.` };
}

/**
 * Les `weeks` dernières semaines **closes** (la semaine en cours n'est jamais
 * exposée : même attaque par différence que pour les jours).
 */
export function closedWeeks(weeks: number, today = todayKey()): string[] {
  return lastWeeks(weeks, shiftDateKey(weekStartKey(today), -7));
}

export async function getTeamWeeklyReport(
  teamId: number,
  weeks: number,
  today = todayKey(),
): Promise<TeamWeeklyReport> {
  const team = await prisma.team.findUnique({ where: { id: teamId }, select: { id: true, name: true } });
  if (!team) throw notFound('Équipe introuvable');

  const threshold = env.MIN_RESPONSES;
  const keys = closedWeeks(weeks, today);
  const rows = await prisma.weeklyCheckin.findMany({
    where: { teamId, week: { in: keys } },
    select: { week: true, score: true, workload: true, stress: true },
  });

  const stats = keys.map((week) =>
    aggregateWeek(
      week,
      rows.filter((row) => row.week === week),
      threshold,
    ),
  );

  return { teamId: team.id, teamName: team.name, threshold, weeks: stats, alert: computeWeeklyAlert(stats.at(-1)) };
}
