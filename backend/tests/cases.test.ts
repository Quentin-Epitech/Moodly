import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { bearer, createTeam, loginAs, resetDb } from './helpers';

const app = createApp();

let tokens: {
  alice: string;
  bob: string;
  managerP: string;
  zoe: string;
  managerQ: string;
  hr: string;
};

const actionRequest = {
  type: 'ACTION_REQUEST',
  category: 'Alléger ma charge',
  subject: 'Trop de projets en parallèle',
  message: 'Je suis sur trois projets à la fois depuis un mois, pouvons-nous en parler ?',
};

beforeAll(async () => {
  await resetDb();
  const p = await createTeam('Produit', 2);
  const q = await createTeam('Support', 1);
  const direction = await createTeam('Direction', 0, 'HR');
  tokens = {
    alice: await loginAs(app, p.employees[0].email),
    bob: await loginAs(app, p.employees[1].email),
    managerP: await loginAs(app, p.manager.email),
    zoe: await loginAs(app, q.employees[0].email),
    managerQ: await loginAs(app, q.manager.email),
    hr: await loginAs(app, direction.manager.email),
  };
});

afterAll(() => prisma.$disconnect());

const list = (token: string) => request(app).get('/cases').set(bearer(token));

describe('demande d’action (manager)', () => {
  let caseId: number;

  it("arrive chez le manager de l'équipe, avec le nom du demandeur", async () => {
    const created = await request(app).post('/cases').set(bearer(tokens.alice)).send(actionRequest);
    expect(created.status).toBe(201);
    expect(created.body.accessToken).toBeNull();
    expect(created.body.case).toMatchObject({
      recipient: 'MANAGER',
      status: 'OPEN',
      anonymous: false,
      viewer: 'REQUESTER',
    });
    caseId = created.body.case.id;

    const inbox = (await list(tokens.managerP)).body;
    expect(inbox).toHaveLength(1);
    expect(inbox[0]).toMatchObject({ id: caseId, requester: 'emp1@produit.test', unread: true, viewer: 'HANDLER' });
  });

  it("n'est visible ni par un autre manager ni par les RH", async () => {
    expect((await list(tokens.managerQ)).body).toEqual([]);
    expect((await list(tokens.hr)).body).toEqual([]);
    expect((await request(app).get(`/cases/${caseId}`).set(bearer(tokens.managerQ))).status).toBe(404);
    expect((await request(app).get(`/cases/${caseId}`).set(bearer(tokens.hr))).status).toBe(404);
    expect((await request(app).get(`/cases/${caseId}`).set(bearer(tokens.bob))).status).toBe(404);
  });

  it('fait avancer la demande quand le manager répond, avec pastille « non lu »', async () => {
    const reply = await request(app)
      .post(`/cases/${caseId}/messages`)
      .set(bearer(tokens.managerP))
      .send({ body: 'Oui, faisons un point jeudi.' });
    expect(reply.status).toBe(201);
    expect(reply.body.status).toBe('IN_PROGRESS');

    expect((await request(app).get('/cases/unread').set(bearer(tokens.alice))).body).toEqual({ count: 1 });
    const thread = await request(app).get(`/cases/${caseId}`).set(bearer(tokens.alice));
    expect(thread.body.messages.map((m: { authorLabel: string }) => m.authorLabel)).toEqual([
      'Vous',
      'Manager · manager@produit.test',
    ]);
    expect((await request(app).get('/cases/unread').set(bearer(tokens.alice))).body).toEqual({ count: 0 });
  });

  it('est résolue par le manager et rouverte si le demandeur répond', async () => {
    expect(
      (await request(app).post(`/cases/${caseId}/status`).set(bearer(tokens.alice)).send({ status: 'RESOLVED' }))
        .status,
    ).toBe(403);

    const resolved = await request(app)
      .post(`/cases/${caseId}/status`)
      .set(bearer(tokens.managerP))
      .send({ status: 'RESOLVED' });
    expect(resolved.body.status).toBe('RESOLVED');

    const reopened = await request(app)
      .post(`/cases/${caseId}/messages`)
      .set(bearer(tokens.alice))
      .send({ body: 'Finalement ça recommence.' });
    expect(reopened.body.status).toBe('IN_PROGRESS');
  });
});

describe('problème avec le manager (RH)', () => {
  it('va aux RH et jamais au manager concerné', async () => {
    const created = await request(app).post('/cases').set(bearer(tokens.bob)).send({
      type: 'MANAGER_ISSUE',
      category: 'Communication difficile',
      subject: 'Consignes contradictoires',
      message: 'Les consignes changent tous les jours sans explication.',
    });
    expect(created.status).toBe(201);
    const id = created.body.case.id;

    expect((await list(tokens.hr)).body.map((c: { id: number }) => c.id)).toContain(id);
    expect((await list(tokens.managerP)).body.map((c: { id: number }) => c.id)).not.toContain(id);
    expect((await request(app).get(`/cases/${id}`).set(bearer(tokens.managerP))).status).toBe(404);
    expect((await request(app).get(`/cases/${id}`).set(bearer(tokens.hr))).body.requester).toBe('emp2@produit.test');
  });
});

describe('signalement anonyme', () => {
  let id: number;
  let accessToken: string;

  it("ne garde aucun lien avec l'auteur et rend un code de suivi", async () => {
    const created = await request(app).post('/cases').set(bearer(tokens.bob)).send({
      type: 'COLLEAGUE_ISSUE',
      category: 'Tension ou conflit',
      subject: 'Ambiance tendue en réunion',
      message: 'Les réunions du lundi tournent souvent au conflit ouvert.',
      anonymous: true,
    });
    expect(created.status).toBe(201);
    accessToken = created.body.accessToken;
    expect(accessToken).toMatch(/^[A-Z2-9]{4}(-[A-Z2-9]{4}){4}$/);
    id = created.body.case.id;

    const row = await prisma.case.findUniqueOrThrow({ where: { id }, include: { messages: true } });
    expect(row.authorId).toBeNull();
    expect(row.accessTokenHash).not.toContain(accessToken.replace(/-/g, ''));
    // Heure arrondie : pas de recoupement à la minute près
    expect(row.createdAt.getUTCMinutes()).toBe(0);
    expect(row.createdAt.getUTCSeconds()).toBe(0);
  });

  it("est traité par le manager sans qu'il sache qui l'a envoyé", async () => {
    const thread = await request(app).get(`/cases/${id}`).set(bearer(tokens.managerP));
    expect(thread.body).toMatchObject({ anonymous: true, requester: null });
    expect(thread.body.messages[0].authorLabel).toBe('Demandeur anonyme');
    expect(JSON.stringify(thread.body)).not.toContain('emp2@produit.test');
  });

  it("n'apparaît que via le code de suivi, jamais dans « mes demandes »", async () => {
    expect((await list(tokens.bob)).body.map((c: { id: number }) => c.id)).not.toContain(id);
    expect((await request(app).get(`/cases/${id}`).set(bearer(tokens.bob))).status).toBe(404);

    const found = await request(app)
      .post('/cases/lookup')
      .set(bearer(tokens.bob))
      .send({ tokens: [accessToken.toLowerCase(), 'ZZZZ-ZZZZ-ZZZZ-ZZZZ-ZZZZ'] });
    expect(found.body.map((c: { id: number }) => c.id)).toEqual([id]);

    const reply = await request(app)
      .post(`/cases/${id}/messages`)
      .set(bearer(tokens.bob))
      .set('X-Case-Token', accessToken)
      .send({ body: 'Précision : surtout depuis septembre.' });
    expect(reply.status).toBe(201);
    expect(reply.body.messages.at(-1)).toMatchObject({ sender: 'REQUESTER', mine: true });
  });
});

describe('validation', () => {
  it('refuse les combinaisons interdites', async () => {
    const post = (body: object) => request(app).post('/cases').set(bearer(tokens.zoe)).send(body);

    expect((await post({ ...actionRequest, anonymous: true })).status).toBe(400);
    expect((await post({ ...actionRequest, category: 'Inconnue' })).status).toBe(400);
    expect((await post({ ...actionRequest, message: 'court' })).status).toBe(400);
    expect(
      (
        await post({
          type: 'CONTACT',
          category: 'Question',
          subject: 'Une question',
          message: 'Une question sur les congés.',
        })
      ).status,
    ).toBe(400);

    const contact = await post({
      type: 'CONTACT',
      category: 'Question',
      subject: 'Une question',
      message: 'Une question sur les congés.',
      recipient: 'HR',
    });
    expect(contact.status).toBe(201);
    expect(contact.body.case.recipient).toBe('HR');
  });

  it('expose les types et leurs règles aux employés', async () => {
    const types = (await request(app).get('/cases/types').set(bearer(tokens.alice))).body;
    expect(types.map((t: { type: string }) => t.type)).toEqual([
      'ACTION_REQUEST',
      'COLLEAGUE_ISSUE',
      'MANAGER_ISSUE',
      'CONTACT',
    ]);
    expect(types.find((t: { type: string }) => t.type === 'MANAGER_ISSUE')).toMatchObject({
      recipient: 'HR',
      anonymousAllowed: true,
    });
  });
});
