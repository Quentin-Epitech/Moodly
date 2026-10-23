import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { shiftDateKey, todayKey } from '../src/lib/dates';
import { prisma } from '../src/lib/prisma';
import { addMood, bearer, createTags, createTeam, loginAs, resetDb } from './helpers';

const app = createApp();
const day1 = shiftDateKey(todayKey(), -1);

let hrToken: string;
let managerToken: string;
let employeeToken: string;
let produitTeamId: number;
const emails: string[] = [];

beforeAll(async () => {
  await resetDb();
  const [charge] = await createTags(['Charge de travail']);
  const produit = await createTeam('Produit', 3);
  const support = await createTeam('Support', 2);
  const direction = await createTeam('Direction', 0, 'HR');
  produitTeamId = produit.team.id;
  emails.push(...produit.employees.map((u) => u.email), ...support.employees.map((u) => u.email));

  // Produit à J-1 : 3 réponses (visible) ; Support : 2 réponses (masqué)
  await addMood(produit.employees[0], day1, 4, [charge.id]);
  await addMood(produit.employees[1], day1, 4);
  await addMood(produit.employees[2], day1, 2);
  await addMood(support.employees[0], day1, 1);
  await addMood(support.employees[1], day1, 1);

  hrToken = await loginAs(app, direction.manager.email);
  managerToken = await loginAs(app, produit.manager.email);
  employeeToken = await loginAs(app, produit.employees[0].email);
});

afterAll(() => prisma.$disconnect());

describe('vue direction (HR)', () => {
  it('liste les équipes avec des agrégats, le total entreprise ignore les jours masqués', async () => {
    const res = await request(app).get('/teams/overview?days=30').set(bearer(hrToken));

    expect(res.status).toBe(200);
    expect(res.body.threshold).toBe(3);
    expect(res.body.dates).toHaveLength(30);
    // « Direction » n'a pas d'employés : absente
    expect(res.body.teams.map((t: { teamName: string }) => t.teamName)).toEqual(['Produit', 'Support']);

    const produit = res.body.teams[0];
    expect(produit).toMatchObject({ teamSize: 3, responses: 3, avg7: 3.33, visibleDays: 1, hiddenDays: 29 });
    expect(produit.series.at(-1)).toBe(3.33);
    expect(produit.topTags).toEqual([{ label: 'Charge de travail', count: 1 }]);

    const support = res.body.teams[1];
    expect(support).toMatchObject({ teamSize: 2, responses: 2, avg7: null, visibleDays: 0, hiddenDays: 30 });
    expect(support.series.every((v: number | null) => v === null)).toBe(true);

    // Les deux « 1 » de Support ne tirent pas la moyenne entreprise vers le bas : jour masqué, exclu
    expect(res.body.company).toEqual({
      teams: 2,
      employees: 5,
      responses: 5,
      participation: 0.03,
      avg7: 3.33,
      avgPrev7: null,
      trend: null,
      alerts: 0,
    });

    const raw = JSON.stringify(res.body);
    expect(raw).not.toMatch(/userId|email|passwordHash/i);
    for (const email of emails) expect(raw).not.toContain(email);
  });

  it("donne accès aux agrégats d'une équipe par son id", async () => {
    const moods = await request(app).get(`/teams/${produitTeamId}/moods?days=7`).set(bearer(hrToken));
    expect(moods.status).toBe(200);
    expect(moods.body.teamName).toBe('Produit');
    expect(moods.body.days).toHaveLength(7);

    const insights = await request(app).get(`/teams/${produitTeamId}/insights`).set(bearer(hrToken));
    expect(insights.status).toBe(200);

    const unknown = await request(app).get('/teams/9999/moods').set(bearer(hrToken));
    expect(unknown.status).toBe(404);
  });

  it('réserve la vue direction au rôle HR, et le reste aux autres rôles', async () => {
    expect((await request(app).get('/teams/overview').set(bearer(managerToken))).status).toBe(403);
    expect((await request(app).get('/teams/overview').set(bearer(employeeToken))).status).toBe(403);
    expect((await request(app).get(`/teams/${produitTeamId}/moods`).set(bearer(managerToken))).status).toBe(403);

    // Un compte RH ne saisit pas d'humeur et n'a pas d'équipe « à lui »
    expect((await request(app).get('/moods/day1').set(bearer(hrToken))).status).toBe(403);
    expect((await request(app).get('/teams/me/moods').set(bearer(hrToken))).status).toBe(403);
  });
});
