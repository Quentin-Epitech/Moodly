import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { bearer, createTeam, loginAs, resetDb } from './helpers';

const app = createApp();

let managerToken: string;
let employeeToken: string;
let otherManagerToken: string;

beforeAll(async () => {
  await resetDb();
  const team = await createTeam('Actions', 1);
  const other = await createTeam('Autre', 1);
  managerToken = await loginAs(app, team.manager.email);
  employeeToken = await loginAs(app, team.employees[0].email);
  otherManagerToken = await loginAs(app, other.manager.email);
});

afterAll(() => prisma.$disconnect());

describe('/teams/me/actions', () => {
  it('le manager publie une action, son équipe la lit, les autres non', async () => {
    const created = await request(app)
      .post('/teams/me/actions')
      .set(bearer(managerToken))
      .send({ message: '  On réduit les réunions à 30 minutes maximum.  ' });
    expect(created.status).toBe(201);
    expect(created.body).toEqual({
      id: expect.any(Number),
      message: 'On réduit les réunions à 30 minutes maximum.',
      createdAt: expect.any(String),
      event: null,
    });

    const seenByEmployee = await request(app).get('/teams/me/actions').set(bearer(employeeToken));
    expect(seenByEmployee.status).toBe(200);
    expect(seenByEmployee.body).toEqual([created.body]);

    const seenByOther = await request(app).get('/teams/me/actions').set(bearer(otherManagerToken));
    expect(seenByOther.body).toEqual([]);
  });

  it('valide le message (400) et refuse un employé (403)', async () => {
    const tooShort = await request(app).post('/teams/me/actions').set(bearer(managerToken)).send({ message: 'ok' });
    expect(tooShort.status).toBe(400);

    const byEmployee = await request(app)
      .post('/teams/me/actions')
      .set(bearer(employeeToken))
      .send({ message: 'Je publie une action' });
    expect(byEmployee.status).toBe(403);
  });

  it("supprime une action, uniquement pour l'équipe qui la possède", async () => {
    const [action] = (await request(app).get('/teams/me/actions').set(bearer(managerToken))).body;

    const byOther = await request(app).delete(`/teams/me/actions/${action.id}`).set(bearer(otherManagerToken));
    expect(byOther.status).toBe(404);

    const byOwner = await request(app).delete(`/teams/me/actions/${action.id}`).set(bearer(managerToken));
    expect(byOwner.status).toBe(204);

    const remaining = await request(app).get('/teams/me/actions').set(bearer(managerToken));
    expect(remaining.body).toEqual([]);
  });
});
