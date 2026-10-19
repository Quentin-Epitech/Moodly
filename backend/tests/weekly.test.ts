import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { currentWeekKey, shiftDateKey } from '../src/lib/dates';
import { prisma } from '../src/lib/prisma';
import { closedWeeks, submitWeekly } from '../src/services/weeklyService';
import { bearer, createTeam, loginAs, resetDb } from './helpers';

const app = createApp();
const thisWeek = currentWeekKey();
const lastWeek = closedWeeks(1)[0];
const twoWeeksAgo = shiftDateKey(lastWeek, -7);

let managerToken: string;
let employeeTokens: string[];
let hrToken: string;
let teamId: number;

beforeAll(async () => {
  await resetDb();
  const team = await createTeam('Hebdo', 4);
  const direction = await createTeam('Direction', 0, 'HR');
  teamId = team.team.id;
  const [e1, e2, e3] = team.employees;

  // Semaine dernière : 3 bilans (= seuil), stress et charge très élevés
  await submitWeekly({ userId: e1.id, teamId, week: lastWeek, score: 2, workload: 5, stress: 4 });
  await submitWeekly({ userId: e2.id, teamId, week: lastWeek, score: 2, workload: 4, stress: 5 });
  await submitWeekly({ userId: e3.id, teamId, week: lastWeek, score: 3, workload: 4, stress: 4 });
  // Il y a deux semaines : 2 bilans → masqué
  await submitWeekly({ userId: e1.id, teamId, week: twoWeeksAgo, score: 1, workload: 1, stress: 1 });
  await submitWeekly({ userId: e2.id, teamId, week: twoWeeksAgo, score: 1, workload: 1, stress: 1 });

  managerToken = await loginAs(app, team.manager.email);
  employeeTokens = await Promise.all(team.employees.map((e) => loginAs(app, e.email)));
  hrToken = await loginAs(app, direction.manager.email);
});

afterAll(() => prisma.$disconnect());

describe('POST /checkins', () => {
  it('enregistre un bilan par semaine et refuse le second (409)', async () => {
    const before = await request(app).get('/checkins/week').set(bearer(employeeTokens[3]));
    expect(before.body).toEqual({ week: thisWeek, submitted: false });

    const first = await request(app)
      .post('/checkins')
      .set(bearer(employeeTokens[3]))
      .send({ score: 4, workload: 3, stress: 2 });
    expect(first.status).toBe(201);

    const after = await request(app).get('/checkins/week').set(bearer(employeeTokens[3]));
    expect(after.body.submitted).toBe(true);

    const second = await request(app)
      .post('/checkins')
      .set(bearer(employeeTokens[3]))
      .send({ score: 1, workload: 1, stress: 1 });
    expect(second.status).toBe(409);
  });

  it('valide les notes (1 à 5)', async () => {
    const res = await request(app)
      .post('/checkins')
      .set(bearer(employeeTokens[0]))
      .send({ score: 6, workload: 3, stress: 2 });
    expect(res.status).toBe(400);
  });

  it('stocke le bilan sans auteur ni horodatage', async () => {
    const [row] = await prisma.weeklyCheckin.findMany({ take: 1 });
    expect(Object.keys(row).sort()).toEqual(['id', 'score', 'stress', 'teamId', 'week', 'workload']);
  });
});

describe('GET /teams/me/weekly', () => {
  it('agrège les semaines closes, masque celles sous le seuil et lève une alerte', async () => {
    const res = await request(app).get('/teams/me/weekly?weeks=4').set(bearer(managerToken));

    expect(res.status).toBe(200);
    expect(res.body.weeks).toHaveLength(4);
    expect(res.body.weeks.map((w: { week: string }) => w.week)).not.toContain(thisWeek);
    expect(res.body.weeks.at(-1)).toEqual({
      week: lastWeek,
      count: 3,
      hidden: false,
      avgScore: 2.33,
      avgWorkload: 4.33,
      avgStress: 4.33,
    });
    expect(res.body.weeks.at(-2)).toEqual({
      week: twoWeeksAgo,
      count: 2,
      hidden: true,
      avgScore: null,
      avgWorkload: null,
      avgStress: null,
    });
    expect(res.body.alert.level).toBe('alert');
  });

  it("ne bouge pas quand quelqu'un fait son bilan cette semaine", async () => {
    const before = (await request(app).get('/teams/me/weekly?weeks=4').set(bearer(managerToken))).body;
    await request(app).post('/checkins').set(bearer(employeeTokens[1])).send({ score: 5, workload: 1, stress: 1 });
    await request(app).post('/checkins').set(bearer(employeeTokens[2])).send({ score: 5, workload: 1, stress: 1 });
    const after = (await request(app).get('/teams/me/weekly?weeks=4').set(bearer(managerToken))).body;

    expect(after).toEqual(before);
  });

  it("est visible par les employés de l'équipe (tendance) et par la direction", async () => {
    const employee = await request(app).get('/teams/me/weekly?weeks=4').set(bearer(employeeTokens[0]));
    expect(employee.status).toBe(200);
    expect(employee.body.weeks.at(-1).avgStress).toBe(4.33);

    const hr = await request(app).get(`/teams/${teamId}/weekly?weeks=4`).set(bearer(hrToken));
    expect(hr.body.weeks.at(-1).avgStress).toBe(4.33);

    const overview = await request(app).get('/teams/overview?days=7').set(bearer(hrToken));
    const team = overview.body.teams.find((t: { teamName: string }) => t.teamName === 'Hebdo');
    expect(team.weekly.alert.level).toBe('alert');
    expect(overview.body.company.alerts).toBe(1);
  });
});
