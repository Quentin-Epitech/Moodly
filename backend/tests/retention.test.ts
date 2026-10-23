import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { shiftDateKey, todayKey, weekStartKey } from '../src/lib/dates';
import { prisma } from '../src/lib/prisma';
import { createAction } from '../src/services/actionService';
import { submitWeekly } from '../src/services/weeklyService';
import { purgeExpiredData } from '../src/services/retentionService';
import { addMood, createTags, createTeam, resetDb } from './helpers';

const today = todayKey();
const RETENTION_DAYS = 395; // valeur par défaut de DATA_RETENTION_DAYS

let teamId: number;

beforeAll(async () => {
  await resetDb();
  const [charge] = await createTags(['Charge de travail']);
  const team = await createTeam('Retention', 1);
  teamId = team.team.id;
  const [employee] = team.employees;

  await addMood(employee, today, 3, [charge.id]);
  await addMood(employee, shiftDateKey(today, -1), 4, [charge.id]);
  await addMood(employee, shiftDateKey(today, -30), 2, [charge.id]);
  await addMood(employee, shiftDateKey(today, -(RETENTION_DAYS + 5)), 5, [charge.id]);

  // Bilans : semaine en cours (gardée), semaine dernière (Submission purgée), très ancienne (tout purgé)
  const thisWeek = weekStartKey(today);
  await submitWeekly({ userId: employee.id, teamId, week: thisWeek, score: 3, workload: 3, stress: 3 });
  await submitWeekly({
    userId: employee.id,
    teamId,
    week: shiftDateKey(thisWeek, -7),
    score: 3,
    workload: 3,
    stress: 3,
  });
  await submitWeekly({
    userId: employee.id,
    teamId,
    week: weekStartKey(shiftDateKey(today, -(RETENTION_DAYS + 10))),
    score: 3,
    workload: 3,
    stress: 3,
  });

  // Demandes : une résolue il y a plus d'un an (purgée), une résolue récemment, une ouverte ancienne (gardées)
  const longAgo = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000);
  const base = { type: 'CONTACT', category: 'Question', subject: 'Question', recipient: 'HR', teamId };
  await prisma.case.create({ data: { ...base, status: 'RESOLVED', resolvedAt: longAgo, createdAt: longAgo } });
  await prisma.case.create({ data: { ...base, status: 'RESOLVED', resolvedAt: new Date() } });
  await prisma.case.create({ data: { ...base, status: 'OPEN', createdAt: longAgo } });

  await createAction(teamId, 'Action récente');
  await createAction(teamId, 'Action expirée', {
    createdAt: new Date(`${shiftDateKey(today, -(RETENTION_DAYS + 5))}T09:00:00Z`),
  });
});

afterAll(() => prisma.$disconnect());

describe('purge de rétention', () => {
  it('supprime les Submission des jours passés et les données au-delà de la durée de conservation', async () => {
    const result = await purgeExpiredData(today);

    expect(result).toEqual({
      submissions: 3,
      moodEntries: 1,
      actions: 1,
      weeklySubmissions: 2,
      weeklyCheckins: 1,
      cases: 1,
    });
    expect(await prisma.weeklySubmission.count()).toBe(1);
    expect(await prisma.weeklyCheckin.count()).toBe(2);
    expect(await prisma.case.count()).toBe(2);

    // Seule la saisie du jour reste : elle bloque encore une deuxième réponse aujourd'hui
    const submissions = await prisma.submission.findMany();
    expect(submissions.map((s) => s.date)).toEqual([today]);

    // Les réponses anonymes récentes restent, avec leurs raisons
    const entries = await prisma.moodEntry.findMany({ include: { tags: true }, orderBy: { date: 'asc' } });
    expect(entries.map((e) => e.date)).toEqual([shiftDateKey(today, -30), shiftDateKey(today, -1), today]);
    expect(await prisma.moodEntryTag.count()).toBe(3);

    expect((await prisma.teamAction.findMany()).map((a) => a.message)).toEqual(['Action récente']);
  });

  it('est idempotente', async () => {
    expect(await purgeExpiredData(today)).toEqual({
      submissions: 0,
      moodEntries: 0,
      actions: 0,
      weeklySubmissions: 0,
      weeklyCheckins: 0,
      cases: 0,
    });
  });
});
