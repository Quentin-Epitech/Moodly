import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { bearer, createQuestion, createTags, createTeam, loginAs, resetDb } from './helpers';

const app = createApp();

let chargeTagId: number;
let sinceWhen: Awaited<ReturnType<typeof createQuestion>>;
let workload: Awaited<ReturnType<typeof createQuestion>>;
let employee1Token: string;
let employee2Token: string;
let employee3Token: string;
let managerToken: string;

beforeAll(async () => {
  await resetDb();
  const [charge] = await createTags(['Charge de travail', "Ambiance d'équipe"]);
  chargeTagId = charge.id;
  sinceWhen = await createQuestion({
    key: 'since_when',
    kind: 'single',
    maxScore: 2,
    options: ["Aujourd'hui", 'Quelques jours'],
  });
  workload = await createQuestion({
    key: 'workload',
    kind: 'multi',
    tagId: charge.id,
    options: ['Délais', 'Réunions', 'Effectif'],
  });

  const produit = await createTeam('Produit', 3);
  employee1Token = await loginAs(app, produit.employees[0].email);
  employee2Token = await loginAs(app, produit.employees[1].email);
  employee3Token = await loginAs(app, produit.employees[2].email);
  managerToken = await loginAs(app, produit.manager.email);
});

afterAll(() => prisma.$disconnect());

describe('POST /moods', () => {
  it('enregistre la saisie du jour puis refuse la seconde (409)', async () => {
    const before = await request(app).get('/moods/today').set(bearer(employee1Token));
    expect(before.body).toEqual({ submitted: false });

    const first = await request(app)
      .post('/moods')
      .set(bearer(employee1Token))
      .send({ score: 4, tagIds: [chargeTagId] });
    expect(first.status).toBe(201);
    expect(first.body).toEqual({ submitted: true });

    const after = await request(app).get('/moods/today').set(bearer(employee1Token));
    expect(after.body).toEqual({ submitted: true });

    const second = await request(app).post('/moods').set(bearer(employee1Token)).send({ score: 2, tagIds: [] });
    expect(second.status).toBe(409);
    expect(second.body).toEqual({ error: expect.any(String) });

    // Une seule paire Submission / MoodEntry : la transaction n'a rien laissé traîner
    expect(await prisma.submission.count()).toBe(1);
    expect(await prisma.moodEntry.count()).toBe(1);
  });

  it("stocke la réponse sans aucune référence à l'utilisateur", async () => {
    const [entry] = await prisma.moodEntry.findMany();

    expect(Object.keys(entry).sort()).toEqual(['createdAt', 'date', 'id', 'score', 'teamId']);
  });

  it('valide le corps de la requête (400) sans consommer la saisie du jour', async () => {
    const invalidBodies = [
      { score: 6, tagIds: [] },
      { score: 0, tagIds: [] },
      { score: 3, tagIds: [chargeTagId, chargeTagId + 1, chargeTagId + 2, chargeTagId + 3] },
      { score: 3, tagIds: [9999] },
      { tagIds: [] },
    ];
    for (const body of invalidBodies) {
      const res = await request(app).post('/moods').set(bearer(employee2Token)).send(body);
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect(res.body).toEqual({ error: expect.any(String) });
    }

    // Les tentatives invalides n'ont rien écrit : la saisie du jour reste possible
    const ok = await request(app).post('/moods').set(bearer(employee2Token)).send({ score: 3, tagIds: [] });
    expect(ok.status).toBe(201);
  });

  it('valide les réponses au questionnaire (400) puis les enregistre, toujours sans utilisateur', async () => {
    const [delais, reunions] = workload.options;
    const invalidBodies = [
      // question « charge de travail » sans la raison cochée
      { score: 2, tagIds: [], answers: [{ questionId: workload.id, optionIds: [delais.id] }] },
      // question « depuis quand » réservée aux notes ≤ 2
      { score: 4, tagIds: [], answers: [{ questionId: sinceWhen.id, optionIds: [sinceWhen.options[0].id] }] },
      // deux réponses à une question à choix unique
      { score: 2, tagIds: [], answers: [{ questionId: sinceWhen.id, optionIds: sinceWhen.options.map((o) => o.id) }] },
      // option d'une autre question
      { score: 2, tagIds: [chargeTagId], answers: [{ questionId: workload.id, optionIds: [sinceWhen.options[0].id] }] },
      // question inconnue
      { score: 2, tagIds: [], answers: [{ questionId: 9999, optionIds: [1] }] },
    ];
    for (const body of invalidBodies) {
      const res = await request(app).post('/moods').set(bearer(employee3Token)).send(body);
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect(res.body).toEqual({ error: expect.any(String) });
    }
    expect(await prisma.moodEntryAnswer.count()).toBe(0);

    const ok = await request(app)
      .post('/moods')
      .set(bearer(employee3Token))
      .send({
        score: 2,
        tagIds: [chargeTagId],
        answers: [
          { questionId: sinceWhen.id, optionIds: [sinceWhen.options[1].id] },
          { questionId: workload.id, optionIds: [delais.id, reunions.id, delais.id] },
        ],
      });
    expect(ok.status).toBe(201);

    const answers = await prisma.moodEntryAnswer.findMany();
    expect(answers).toHaveLength(3);
    for (const answer of answers) {
      expect(Object.keys(answer).sort()).toEqual(['moodEntryId', 'optionId', 'questionId']);
    }
  });

  it('refuse un manager (403)', async () => {
    const res = await request(app).post('/moods').set(bearer(managerToken)).send({ score: 3, tagIds: [] });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: expect.any(String) });
  });
});
