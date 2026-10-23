import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { bearer, createTeam, loginAs, resetDb } from './helpers';

const app = createApp();
const DAY = 86_400_000;
const inDays = (days: number, hourUtc = 8) => {
  const date = new Date(Date.now() + days * DAY);
  date.setUTCHours(hourUtc, 0, 0, 0);
  return date.toISOString();
};
const slot = (days = 2) => ({ startsAt: inDays(days), durationMin: 30, location: 'Salle Atlas' });

let tokens: { alice: string; bob: string; managerP: string; managerQ: string; hr: string };
let caseId: number;

const contact = (recipient: 'MANAGER' | 'HR') => ({
  type: 'CONTACT',
  category: 'Point individuel',
  subject: 'Faire le point',
  message: 'Pouvons-nous faire un point cette semaine ?',
  recipient,
});

beforeAll(async () => {
  await resetDb();
  const p = await createTeam('Produit', 2);
  const q = await createTeam('Support', 1);
  const direction = await createTeam('Direction', 0, 'HR');
  tokens = {
    alice: await loginAs(app, p.employees[0].email),
    bob: await loginAs(app, p.employees[1].email),
    managerP: await loginAs(app, p.manager.email),
    managerQ: await loginAs(app, q.manager.email),
    hr: await loginAs(app, direction.manager.email),
  };
  const created = await request(app).post('/cases').set(bearer(tokens.alice)).send(contact('MANAGER'));
  caseId = created.body.case.id;
});

afterAll(() => prisma.$disconnect());

const agenda = (token: string) => request(app).get('/agenda').set(bearer(token));

describe('rendez-vous dans une demande', () => {
  let meetingId: number;

  it('le manager propose un créneau : il apparaît dans le fil, non lu chez la demandeuse', async () => {
    const res = await request(app).post(`/cases/${caseId}/meetings`).set(bearer(tokens.managerP)).send(slot());
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('IN_PROGRESS');
    const proposal = res.body.messages.at(-1);
    expect(proposal).toMatchObject({ kind: 'MEETING_PROPOSED', sender: 'HANDLER', mine: true });
    expect(proposal.body).toMatch(/^Rendez-vous proposé : .+ \(30 min\) · Salle Atlas$/);
    expect(proposal.meeting).toMatchObject({ status: 'PROPOSED', canRespond: false, canCancel: true });
    meetingId = proposal.meeting.id;

    expect((await request(app).get('/cases/unread').set(bearer(tokens.alice))).body).toEqual({ count: 1 });
    const seen = (await request(app).get(`/cases/${caseId}`).set(bearer(tokens.alice))).body;
    expect(seen.messages.at(-1).meeting).toMatchObject({ canRespond: true, canCancel: false });
  });

  it('figure dans l’agenda des deux côtés, avec qui et à propos de quoi', async () => {
    const mine = (await agenda(tokens.alice)).body;
    expect(mine).toEqual([
      expect.objectContaining({ kind: 'MEETING', caseId, withLabel: "Manager de l'équipe", status: 'PROPOSED' }),
    ]);
    const handler = (await agenda(tokens.managerP)).body;
    expect(handler[0]).toMatchObject({ kind: 'MEETING', withLabel: 'emp1@produit.test', subject: 'Faire le point' });
    // Personne d'autre
    expect((await agenda(tokens.bob)).body).toEqual([]);
    expect((await agenda(tokens.managerQ)).body).toEqual([]);
    expect((await agenda(tokens.hr)).body).toEqual([]);
  });

  it('seul l’autre côté répond ; personne d’extérieur ne voit le rendez-vous', async () => {
    const self = await request(app)
      .post(`/meetings/${meetingId}/respond`)
      .set(bearer(tokens.managerP))
      .send({ response: 'ACCEPT' });
    expect(self.status).toBe(403);
    for (const outsider of [tokens.bob, tokens.managerQ, tokens.hr]) {
      const res = await request(app)
        .post(`/meetings/${meetingId}/respond`)
        .set(bearer(outsider))
        .send({ response: 'ACCEPT' });
      expect(res.status).toBe(404);
    }
  });

  it('la demandeuse accepte : le rendez-vous est confirmé, une seule fois', async () => {
    const res = await request(app)
      .post(`/meetings/${meetingId}/respond`)
      .set(bearer(tokens.alice))
      .send({ response: 'ACCEPT' });
    expect(res.status).toBe(200);
    expect(res.body.messages.at(-1)).toMatchObject({ kind: 'MEETING_ACCEPTED', sender: 'REQUESTER' });
    const proposal = res.body.messages.find((m: { kind: string }) => m.kind === 'MEETING_PROPOSED');
    expect(proposal.meeting).toMatchObject({ status: 'ACCEPTED', canRespond: false, canCancel: true });

    const again = await request(app)
      .post(`/meetings/${meetingId}/respond`)
      .set(bearer(tokens.alice))
      .send({ response: 'DECLINE' });
    expect(again.status).toBe(409);
  });

  it('une nouvelle proposition remplace celle qui attend une réponse', async () => {
    const first = await request(app).post(`/cases/${caseId}/meetings`).set(bearer(tokens.alice)).send(slot(3));
    const second = await request(app).post(`/cases/${caseId}/meetings`).set(bearer(tokens.alice)).send(slot(4));
    expect(second.status).toBe(201);
    const proposals = second.body.messages
      .filter((m: { kind: string }) => m.kind === 'MEETING_PROPOSED')
      .map((m: { meeting: { status: string } }) => m.meeting.status);
    // accepté (le premier rendez-vous), remplacé, en attente
    expect(proposals).toEqual(['ACCEPTED', 'CANCELLED', 'PROPOSED']);
    expect(first.status).toBe(201);
  });

  it('chacun peut annuler un rendez-vous accepté', async () => {
    const res = await request(app).post(`/meetings/${meetingId}/cancel`).set(bearer(tokens.managerP));
    expect(res.status).toBe(200);
    expect(res.body.messages.at(-1)).toMatchObject({ kind: 'MEETING_CANCELLED', sender: 'HANDLER' });
    expect((await request(app).post(`/meetings/${meetingId}/cancel`).set(bearer(tokens.alice))).status).toBe(409);
  });

  it('refuse un créneau passé, une durée hors liste ou un lieu vide', async () => {
    const send = (body: object) =>
      request(app).post(`/cases/${caseId}/meetings`).set(bearer(tokens.managerP)).send(body);
    expect((await send({ ...slot(), startsAt: inDays(-1) })).status).toBe(400);
    expect((await send({ ...slot(), startsAt: inDays(200) })).status).toBe(400);
    expect((await send({ ...slot(), durationMin: 20 })).status).toBe(400);
    expect((await send({ ...slot(), location: ' ' })).status).toBe(400);
  });
});

describe('rendez-vous et anonymat', () => {
  it("impossible dans un signalement anonyme : il révélerait l'auteur", async () => {
    const created = await request(app).post('/cases').set(bearer(tokens.bob)).send({
      type: 'COLLEAGUE_ISSUE',
      category: 'Tension ou conflit',
      subject: 'Tensions en réunion',
      message: 'Les réunions tournent au conflit depuis deux semaines.',
      anonymous: true,
    });
    const res = await request(app)
      .post(`/cases/${created.body.case.id}/meetings`)
      .set(bearer(tokens.managerP))
      .send(slot());
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/anonyme/);
  });

  it('un rendez-vous avec les RH reste invisible du manager', async () => {
    const created = await request(app).post('/cases').set(bearer(tokens.bob)).send(contact('HR'));
    const res = await request(app).post(`/cases/${created.body.case.id}/meetings`).set(bearer(tokens.hr)).send(slot());
    expect(res.status).toBe(201);
    expect((await agenda(tokens.hr)).body).toHaveLength(1);
    expect((await agenda(tokens.bob)).body[0]).toMatchObject({ withLabel: 'Ressources humaines' });
    const managerItems = (await agenda(tokens.managerP)).body as Array<{ caseId: number }>;
    expect(managerItems.some((item) => item.caseId === created.body.case.id)).toBe(false);
  });
});

describe("rendez-vous d'équipe", () => {
  it('une action datée apparaît dans l’agenda de toute l’équipe, pas ailleurs', async () => {
    const res = await request(app)
      .post('/teams/me/actions')
      .set(bearer(tokens.managerP))
      .send({ message: "Point d'équipe sur les priorités", event: { ...slot(1), location: 'Salle Seine' } });
    expect(res.status).toBe(201);
    expect(res.body.event).toMatchObject({ durationMin: 30, location: 'Salle Seine' });

    for (const token of [tokens.alice, tokens.bob, tokens.managerP]) {
      const items = (await agenda(token)).body as Array<{ kind: string; title?: string }>;
      expect(items.find((item) => item.kind === 'TEAM_EVENT')).toMatchObject({
        title: "Point d'équipe sur les priorités",
        teamName: 'Produit',
      });
    }
    const other = (await agenda(tokens.managerQ)).body as Array<{ kind: string }>;
    expect(other.some((item) => item.kind === 'TEAM_EVENT')).toBe(false);
  });

  it('refuse un rendez-vous d’équipe dans le passé', async () => {
    const res = await request(app)
      .post('/teams/me/actions')
      .set(bearer(tokens.managerP))
      .send({ message: 'Point passé', event: { ...slot(), startsAt: inDays(-2) } });
    expect(res.status).toBe(400);
  });
});
