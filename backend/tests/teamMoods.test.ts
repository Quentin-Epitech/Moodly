import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { shiftDateKey, todayKey } from '../src/lib/dates';
import { prisma } from '../src/lib/prisma';
import { addMood, bearer, createTags, createTeam, loginAs, resetDb } from './helpers';

const app = createApp();
const today = todayKey();
// Les tableaux de bord s'arrêtent au dernier jour clos (hier)
const day1 = shiftDateKey(today, -1);
const day2 = shiftDateKey(today, -2);
const day3 = shiftDateKey(today, -3);

let produitManagerToken: string;
let supportManagerToken: string;
let employeeToken: string;
let produitTeamId: number;
const employeeEmails: string[] = [];

beforeAll(async () => {
  await resetDb();
  const [charge, ambiance] = await createTags(['Charge de travail', "Ambiance d'équipe"]);
  const produit = await createTeam('Produit', 4);
  const support = await createTeam('Support', 2);
  produitTeamId = produit.team.id;
  employeeEmails.push(...produit.employees.map((u) => u.email), ...support.employees.map((u) => u.email));

  // Produit, J-1 : 3 réponses (= seuil) → visible
  await addMood(produit.employees[0], day1, 4, [charge.id]);
  await addMood(produit.employees[1], day1, 5, [charge.id, ambiance.id]);
  await addMood(produit.employees[2], day1, 3, [charge.id]);
  // Produit, J-2 : 2 réponses très basses (< seuil) → masqué, rien ne doit fuiter
  await addMood(produit.employees[0], day2, 1, [charge.id]);
  await addMood(produit.employees[1], day2, 1, [charge.id]);
  // Support, J-1 : 2 réponses → masqué
  await addMood(support.employees[0], day1, 2);
  await addMood(support.employees[1], day1, 2);

  produitManagerToken = await loginAs(app, produit.manager.email);
  supportManagerToken = await loginAs(app, support.manager.email);
  employeeToken = await loginAs(app, produit.employees[0].email);
});

afterAll(() => prisma.$disconnect());

describe('GET /teams/me/moods', () => {
  it("renvoie toujours 30 jours clos, jusqu'à hier, avec le seuil", async () => {
    const res = await request(app).get('/teams/me/moods?days=30').set(bearer(produitManagerToken));

    expect(res.status).toBe(200);
    expect(res.body.teamName).toBe('Produit');
    expect(res.body.threshold).toBe(3);
    expect(res.body.days).toHaveLength(30);
    expect(res.body.days[0].date).toBe(shiftDateKey(day1, -29));
    expect(res.body.days.at(-1).date).toBe(day1);
  });

  it('agrège un jour qui atteint le seuil : moyenne, nombre, raisons citées au moins deux fois', async () => {
    const res = await request(app).get('/teams/me/moods').set(bearer(produitManagerToken));
    const day = res.body.days.find((d: { date: string }) => d.date === day1);

    // « Ambiance d'équipe » n'a été cochée qu'une fois : l'afficher désignerait une personne
    expect(day).toEqual({
      date: day1,
      avg: 4,
      count: 3,
      hidden: false,
      topTags: [{ label: 'Charge de travail', count: 3 }],
    });
  });

  it("arrondit l'horodatage des réponses au jour (pas d'ordre d'insertion exploitable)", async () => {
    const entries = await prisma.moodEntry.findMany({ where: { date: day1 } });

    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(entry.createdAt.toISOString()).toBe(`${day1}T00:00:00.000Z`);
    }
  });

  it('masque un jour sous le seuil sans laisser fuiter la moyenne ni les tags', async () => {
    const res = await request(app).get('/teams/me/moods').set(bearer(produitManagerToken));
    const days: Array<{ date: string }> = res.body.days;

    expect(days.find((d) => d.date === day2)).toEqual({
      date: day2,
      avg: null,
      count: 2,
      hidden: true,
      topTags: [],
    });
    expect(days.find((d) => d.date === day3)).toEqual({
      date: day3,
      avg: null,
      count: 0,
      hidden: true,
      topTags: [],
    });
  });

  it('résume la période : KPI calculés sur les jours visibles uniquement', async () => {
    const res = await request(app).get('/teams/me/moods').set(bearer(produitManagerToken));
    const { summary } = res.body;

    expect(summary).toEqual({
      teamSize: 4,
      responses: 5, // 3 à J-1 + 2 à J-2 (la participation n'est pas une information d'humeur)
      participation: 0.04, // 5 / (30 jours × 4 employés)
      avg7: 4, // J-2 (masqué) ne compte pas : les notes 1 et 1 ne fuitent nulle part
      avgPrev7: null,
      trend: null,
      distribution: [
        { score: 1, count: 0 },
        { score: 2, count: 0 },
        { score: 3, count: 1 },
        { score: 4, count: 1 },
        { score: 5, count: 1 },
      ],
      topTags: [
        { label: 'Charge de travail', count: 3 },
        { label: "Ambiance d'équipe", count: 1 },
      ],
      alert: {
        level: 'none',
        message: expect.any(String),
        // Sur 7 jours (agrégat multi-jours), toutes les raisons sont comptées
        drivers: [
          { label: 'Charge de travail', count: 3 },
          { label: "Ambiance d'équipe", count: 1 },
        ],
      },
    });
  });

  it('ne contient aucune donnée individuelle', async () => {
    const res = await request(app).get('/teams/me/moods').set(bearer(produitManagerToken));

    expect(Object.keys(res.body).sort()).toEqual(['days', 'summary', 'teamId', 'teamName', 'threshold']);
    for (const day of res.body.days) {
      expect(Object.keys(day).sort()).toEqual(['avg', 'count', 'date', 'hidden', 'topTags']);
    }
    const raw = JSON.stringify(res.body);
    expect(raw).not.toMatch(/userId|email|passwordHash|submission/i);
    for (const email of employeeEmails) expect(raw).not.toContain(email);
  });

  it("ne renvoie que l'équipe du manager, même avec un teamId dans l'URL", async () => {
    const res = await request(app)
      .get(`/teams/me/moods?teamId=${produitTeamId}&days=30`)
      .set(bearer(supportManagerToken));

    expect(res.status).toBe(200);
    expect(res.body.teamName).toBe('Support');
    const day = res.body.days.find((d: { date: string }) => d.date === day1);
    // 2 réponses Support, pas les 3 de Produit
    expect(day).toMatchObject({ count: 2, hidden: true, avg: null });
    expect(res.body.summary.avg7).toBeNull();
  });

  it("refuse à un manager l'URL RH d'une autre équipe (403)", async () => {
    const res = await request(app).get(`/teams/${produitTeamId}/moods`).set(bearer(supportManagerToken));

    expect(res.status).toBe(403);
  });

  it('refuse un employé (403)', async () => {
    const res = await request(app).get('/teams/me/moods').set(bearer(employeeToken));

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: expect.any(String) });
  });

  it('refuse sans token (401)', async () => {
    const res = await request(app).get('/teams/me/moods');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: expect.any(String) });
  });
});
