import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { shiftDateKey, todayKey } from '../src/lib/dates';
import { prisma } from '../src/lib/prisma';
import { addMood, bearer, createTags, createTeam, loginAs, resetDb } from './helpers';

// Attaque par différence : si « aujourd'hui » était visible, le manager verrait le
// nombre de réponses passer de 3 à 4 et la moyenne bouger, et pourrait en déduire la
// note de la personne qui vient de répondre. La journée en cours n'est donc jamais
// exposée : rien de ce qui est saisi aujourd'hui ne change les tableaux de bord.

const app = createApp();
const today = todayKey();
const yesterday = shiftDateKey(today, -1);

let managerToken: string;
let hrToken: string;
let teamId: number;
let employees: Awaited<ReturnType<typeof createTeam>>['employees'];
let chargeId: number;

beforeAll(async () => {
  await resetDb();
  [{ id: chargeId }] = await createTags(['Charge de travail']);
  const team = await createTeam('Differences', 4);
  const direction = await createTeam('Direction', 0, 'HR');
  teamId = team.team.id;
  employees = team.employees;

  for (const employee of employees.slice(0, 3)) await addMood(employee, yesterday, 4, [chargeId]);

  managerToken = await loginAs(app, team.manager.email);
  hrToken = await loginAs(app, direction.manager.email);
});

afterAll(() => prisma.$disconnect());

const snapshot = async () => ({
  moods: (await request(app).get('/teams/me/moods?days=7').set(bearer(managerToken))).body,
  insights: (await request(app).get('/teams/me/insights?days=7').set(bearer(managerToken))).body,
  team: (await request(app).get(`/teams/${teamId}/moods?days=7`).set(bearer(hrToken))).body,
  overview: (await request(app).get('/teams/overview?days=7').set(bearer(hrToken))).body,
});

describe('journée en cours', () => {
  it("s'arrête au dernier jour clos", async () => {
    const res = await request(app).get('/teams/me/moods?days=7').set(bearer(managerToken));

    expect(res.body.days).toHaveLength(7);
    expect(res.body.days.at(-1)).toMatchObject({ date: yesterday, count: 3, hidden: false, avg: 4 });
    expect(res.body.days.map((d: { date: string }) => d.date)).not.toContain(today);
  });

  it("ne change aucun tableau de bord quand quelqu'un répond aujourd'hui", async () => {
    const before = await snapshot();

    // Quatre réponses aujourd'hui (seuil atteint), notes très différentes d'hier
    for (const employee of employees) await addMood(employee, today, 1, [chargeId]);

    expect(await snapshot()).toEqual(before);
  });
});
