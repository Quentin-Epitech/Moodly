import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { shiftDateKey, todayKey } from '../src/lib/dates';
import { prisma } from '../src/lib/prisma';
import { computeAlert } from '../src/services/teamStatsService';
import { addMood, bearer, createTags, createTeam, loginAs, resetDb } from './helpers';

const app = createApp();
const today = todayKey();
// Les semaines comparées se terminent hier (journée en cours exclue)
const lastClosed = shiftDateKey(today, -1);

let criseManagerToken: string;
let fragileManagerToken: string;

beforeAll(async () => {
  await resetDb();
  const [charge, management] = await createTags(['Charge de travail', 'Management']);

  // Équipe « Crise » : 3 réponses par jour (visible), bonne semaine passée puis chute
  const crise = await createTeam('Crise', 3);
  for (let offset = 13; offset >= 7; offset--) {
    const date = shiftDateKey(lastClosed, -offset);
    await addMood(crise.employees[0], date, 4);
    await addMood(crise.employees[1], date, 4, [management.id]);
    await addMood(crise.employees[2], date, 3);
  }
  for (let offset = 6; offset >= 0; offset--) {
    const date = shiftDateKey(lastClosed, -offset);
    await addMood(crise.employees[0], date, 2, [charge.id]);
    await addMood(crise.employees[1], date, 2, [charge.id]);
    await addMood(crise.employees[2], date, 1, [charge.id, management.id]);
  }

  // Équipe « Fragile » : moyenne 3 cette semaine, pas de semaine précédente
  const fragile = await createTeam('Fragile', 3);
  for (let offset = 6; offset >= 0; offset--) {
    const date = shiftDateKey(lastClosed, -offset);
    for (const employee of fragile.employees) await addMood(employee, date, 3);
  }

  criseManagerToken = await loginAs(app, crise.manager.email);
  fragileManagerToken = await loginAs(app, fragile.manager.email);
});

afterAll(() => prisma.$disconnect());

describe('summary et alerte', () => {
  it('détecte une baisse nette : tendance, alerte et raisons dominantes', async () => {
    const res = await request(app).get('/teams/me/moods').set(bearer(criseManagerToken));
    const { summary } = res.body;

    expect(summary.avg7).toBe(1.67);
    expect(summary.avgPrev7).toBe(3.67);
    expect(summary.trend).toBe('down');
    expect(summary.responses).toBe(42);
    expect(summary.participation).toBe(0.47); // 42 / (30 × 3)
    expect(summary.distribution).toEqual([
      { score: 1, count: 7 },
      { score: 2, count: 14 },
      { score: 3, count: 7 },
      { score: 4, count: 14 },
      { score: 5, count: 0 },
    ]);
    expect(summary.alert.level).toBe('alert');
    expect(summary.alert.message).toContain('Baisse nette');
    expect(summary.alert.drivers).toEqual([
      { label: 'Charge de travail', count: 21 },
      { label: 'Management', count: 7 },
    ]);
  });

  it('signale un moral fragile sans semaine de comparaison', async () => {
    const res = await request(app).get('/teams/me/moods').set(bearer(fragileManagerToken));
    const { summary } = res.body;

    expect(summary.avg7).toBe(3);
    expect(summary.avgPrev7).toBeNull();
    expect(summary.trend).toBeNull();
    expect(summary.alert).toEqual({ level: 'watch', message: expect.stringContaining('fragile'), drivers: [] });
  });

  it('adapte la fenêtre au paramètre days', async () => {
    const res = await request(app).get('/teams/me/moods?days=7').set(bearer(criseManagerToken));

    expect(res.body.days).toHaveLength(7);
    expect(res.body.summary.responses).toBe(21);
    expect(res.body.summary.participation).toBe(1);
    expect(res.body.summary.avgPrev7).toBeNull();
  });
});

describe('formulation de l’alerte', () => {
  it('dit que le moral remonte quand il est fragile mais en nette hausse', () => {
    expect(computeAlert(3.1, 2.6, []).message).toBe(
      'Le moral remonte, mais reste fragile : 3,1 / 5 contre 2,6 la semaine précédente.',
    );
    expect(computeAlert(2.6, 2.0, []).message).toMatch(/^Moral encore bas, mais en hausse/);
  });

  it('garde le constat simple quand il ne remonte pas', () => {
    expect(computeAlert(3.1, 3.0, []).message).toMatch(/^Moral fragile cette semaine/);
    expect(computeAlert(2.5, null, []).message).toBe('Moral bas cette semaine : 2,5 / 5.');
  });
});
