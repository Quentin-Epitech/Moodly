import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { shiftDateKey, todayKey } from '../src/lib/dates';
import { prisma } from '../src/lib/prisma';
import { addMood, bearer, createQuestion, createTags, createTeam, loginAs, resetDb } from './helpers';

const app = createApp();
const today = todayKey();
const day1 = shiftDateKey(today, -1);
const day2 = shiftDateKey(today, -2);

let managerToken: string;
let employeeToken: string;
let needs: Awaited<ReturnType<typeof createQuestion>>;
let workload: Awaited<ReturnType<typeof createQuestion>>;

beforeAll(async () => {
  await resetDb();
  const [charge] = await createTags(['Charge de travail']);
  needs = await createQuestion({
    key: 'needs',
    kind: 'multi',
    options: ['Moins de réunions', 'Priorités claires', 'Formation'],
  });
  workload = await createQuestion({
    key: 'workload',
    kind: 'multi',
    tagId: charge.id,
    options: ['Délais', 'Effectif'],
  });
  const [reunions, priorites, formation] = needs.options;
  const [delais] = workload.options;

  const team = await createTeam('Insight', 3);
  const [e1, e2, e3] = team.employees;

  // J-1 : 3 réponses → visible, les réponses détaillées comptent
  await addMood(
    e1,
    day1,
    3,
    [charge.id],
    [
      { questionId: needs.id, optionIds: [reunions.id] },
      { questionId: workload.id, optionIds: [delais.id] },
    ],
  );
  await addMood(e2, day1, 3, [], [{ questionId: needs.id, optionIds: [reunions.id, priorites.id] }]);
  await addMood(e3, day1, 4, [], [{ questionId: needs.id, optionIds: [priorites.id] }]);

  // J-2 : 2 réponses → masqué, leurs réponses détaillées ne doivent apparaître nulle part
  await addMood(e1, day2, 1, [], [{ questionId: needs.id, optionIds: [formation.id] }]);
  await addMood(e2, day2, 1, [], [{ questionId: needs.id, optionIds: [formation.id] }]);

  managerToken = await loginAs(app, team.manager.email);
  employeeToken = await loginAs(app, e1.email);
});

afterAll(() => prisma.$disconnect());

describe('GET /teams/me/insights', () => {
  it('cumule les réponses des jours visibles uniquement, jamais par jour', async () => {
    const res = await request(app).get('/teams/me/insights?days=30').set(bearer(managerToken));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ teamName: 'Insight', threshold: 3, days: 30, basedOnDays: 1, responses: 3 });
    expect(Object.keys(res.body).sort()).toEqual([
      'basedOnDays',
      'days',
      'questions',
      'responses',
      'teamId',
      'teamName',
      'threshold',
    ]);

    const needsInsight = res.body.questions.find((q: { key: string }) => q.key === 'needs');
    expect(needsInsight.responses).toBe(3);
    expect(needsInsight.options).toEqual([
      { id: needs.options[0].id, label: 'Moins de réunions', count: 2, ratio: 0.67 },
      { id: needs.options[1].id, label: 'Priorités claires', count: 2, ratio: 0.67 },
      // « Formation » n'a été choisie que le jour masqué : 0
      { id: needs.options[2].id, label: 'Formation', count: 0, ratio: 0 },
    ]);

    const workloadInsight = res.body.questions.find((q: { key: string }) => q.key === 'workload');
    expect(workloadInsight.responses).toBe(1);
    expect(workloadInsight.options[0]).toEqual({ id: workload.options[0].id, label: 'Délais', count: 1, ratio: 1 });

    const raw = JSON.stringify(res.body);
    expect(raw).not.toMatch(/userId|email|date|moodEntryId/i);
  });

  it('refuse un employé (403)', async () => {
    const res = await request(app).get('/teams/me/insights').set(bearer(employeeToken));

    expect(res.status).toBe(403);
  });
});
