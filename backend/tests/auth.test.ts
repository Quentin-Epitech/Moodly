import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { addAccount } from '../src/services/accountService';
import { MAX_FAILED_LOGINS } from '../src/services/authService';
import { PASSWORD, bearer, createTeam, loginAs, resetDb } from './helpers';

const app = createApp();
let emails: { employees: string[]; manager: string };

const login = (email: string, password: string) => request(app).post('/auth/login').send({ email, password });

beforeAll(async () => {
  await resetDb();
  const team = await createTeam('Auth', 4);
  emails = { employees: team.employees.map((u) => u.email), manager: team.manager.email };
});

afterAll(() => prisma.$disconnect());

describe('POST /auth/login', () => {
  it('renvoie un token et le profil, sans aucune donnée sensible', async () => {
    const res = await login(emails.employees[0], PASSWORD);

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(Object.keys(res.body.user).sort()).toEqual([
      'anonymityThreshold',
      'email',
      'id',
      'mustChangePassword',
      'role',
      'teamName',
    ]);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|failedLogins|lockedUntil|tokenVersion/);
  });

  it('répond exactement pareil pour un email inconnu et un mauvais mot de passe', async () => {
    const unknown = await login('personne@auth.test', PASSWORD);
    const wrong = await login(emails.employees[0], 'mauvais-mot-de-passe');

    expect(unknown.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(unknown.body).toEqual(wrong.body);
  });

  it(`verrouille le compte après ${MAX_FAILED_LOGINS} échecs, même avec le bon mot de passe ensuite`, async () => {
    const email = emails.employees[1];
    for (let attempt = 0; attempt < MAX_FAILED_LOGINS; attempt++) {
      expect((await login(email, 'mauvais-mot-de-passe')).status).toBe(401);
    }

    const locked = await login(email, PASSWORD);
    expect(locked.status).toBe(429);
    expect(locked.body).toEqual({ error: expect.any(String) });

    // Le verrouillage expire : on simule le passage du temps
    await prisma.user.update({ where: { email }, data: { lockedUntil: new Date(Date.now() - 1000) } });
    expect((await login(email, PASSWORD)).status).toBe(200);
    expect(await prisma.user.findUnique({ where: { email } })).toMatchObject({ failedLogins: 0, lockedUntil: null });
  });
});

describe('POST /auth/logout', () => {
  it('invalide le token utilisé (et les autres sessions)', async () => {
    const token = await loginAs(app, emails.employees[2]);
    const other = await loginAs(app, emails.employees[2]);
    expect((await request(app).get('/me').set(bearer(token))).status).toBe(200);

    expect((await request(app).post('/auth/logout').set(bearer(token))).status).toBe(204);

    expect((await request(app).get('/me').set(bearer(token))).status).toBe(401);
    expect((await request(app).get('/me').set(bearer(other))).status).toBe(401);
    expect((await login(emails.employees[2], PASSWORD)).status).toBe(200);
  });

  it('exige une session', async () => {
    expect((await request(app).post('/auth/logout')).status).toBe(401);
  });
});

describe('POST /me/password', () => {
  it('refuse un mot de passe actuel faux, trop court ou identique', async () => {
    const token = await loginAs(app, emails.employees[3]);
    const send = (body: object) => request(app).post('/me/password').set(bearer(token)).send(body);

    expect((await send({ currentPassword: 'faux', newPassword: 'un-mot-de-passe-long' })).status).toBe(400);
    expect((await send({ currentPassword: PASSWORD, newPassword: 'court' })).status).toBe(400);
    expect((await send({ currentPassword: PASSWORD, newPassword: PASSWORD })).status).toBe(400);
    expect((await send({})).status).toBe(400);
  });

  it('change le mot de passe, ferme les autres sessions et renvoie une nouvelle session', async () => {
    const current = await loginAs(app, emails.manager);
    const other = await loginAs(app, emails.manager);

    const res = await request(app)
      .post('/me/password')
      .set(bearer(current))
      .send({ currentPassword: PASSWORD, newPassword: 'nouveau-mot-de-passe-1' });

    expect(res.status).toBe(200);
    expect(res.body.user.mustChangePassword).toBe(false);
    expect((await request(app).get('/me').set(bearer(res.body.token))).status).toBe(200);
    expect((await request(app).get('/me').set(bearer(current))).status).toBe(401);
    expect((await request(app).get('/me').set(bearer(other))).status).toBe(401);
    expect((await login(emails.manager, PASSWORD)).status).toBe(401);
    expect((await login(emails.manager, 'nouveau-mot-de-passe-1')).status).toBe(200);
  });
});

describe('mot de passe provisoire', () => {
  it("bloque l'app tant que le mot de passe provisoire n'est pas changé", async () => {
    const account = await addAccount({ email: 'Nouveau@Auth.test', team: 'Auth', role: 'EMPLOYEE' });
    expect(account.email).toBe('nouveau@auth.test');

    const first = await login(account.email, account.temporaryPassword);
    expect(first.status).toBe(200);
    expect(first.body.user.mustChangePassword).toBe(true);

    const temporary = first.body.token as string;
    expect((await request(app).get('/me').set(bearer(temporary))).status).toBe(200);
    expect((await request(app).get('/tags').set(bearer(temporary))).status).toBe(403);
    expect((await request(app).get('/moods/today').set(bearer(temporary))).status).toBe(403);

    const changed = await request(app)
      .post('/me/password')
      .set(bearer(temporary))
      .send({ currentPassword: account.temporaryPassword, newPassword: 'mon-vrai-mot-de-passe' });
    expect(changed.status).toBe(200);
    expect((await request(app).get('/tags').set(bearer(changed.body.token))).status).toBe(200);
  });
});
