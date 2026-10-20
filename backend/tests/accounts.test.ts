import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { shiftDateKey, todayKey } from '../src/lib/dates';
import { prisma } from '../src/lib/prisma';
import {
  addAccount,
  generateTemporaryPassword,
  importAccounts,
  listAccounts,
  removeAccount,
  resetAccountPassword,
  unlockAccount,
  updateAccount,
} from '../src/services/accountService';
import { addMood, bearer, resetDb } from './helpers';

const app = createApp();
const login = (email: string, password: string) => request(app).post('/auth/login').send({ email, password });

beforeAll(() => resetDb());
afterAll(() => prisma.$disconnect());

describe('gestion des comptes (CLI)', () => {
  it('génère des mots de passe provisoires sans caractères ambigus', () => {
    const passwords = Array.from({ length: 50 }, () => generateTemporaryPassword());
    expect(new Set(passwords).size).toBe(50);
    for (const password of passwords) expect(password).toMatch(/^[a-km-zA-HJ-NP-Z2-9]{14}$/);
  });

  it("crée un compte (et l'équipe) avec un mot de passe provisoire à changer", async () => {
    const account = await addAccount({ email: 'jeanne@acme.test', team: 'Produit', role: 'EMPLOYEE' });

    const res = await login('jeanne@acme.test', account.temporaryPassword);
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ teamName: 'Produit', role: 'EMPLOYEE', mustChangePassword: true });
    await expect(addAccount({ email: 'jeanne@acme.test', team: 'Produit', role: 'EMPLOYEE' })).rejects.toThrow(
      'existe déjà',
    );
  });

  it('importe un CSV ligne par ligne et signale les lignes invalides', async () => {
    const csv = [
      'email,team,role',
      'paul@acme.test,Support,manager',
      '# commentaire ignoré',
      'zoe@acme.test,Support,EMPLOYEE',
      'pas-un-email,Support,EMPLOYEE',
      'max@acme.test,Support,STAGIAIRE',
    ].join('\n');

    const { created, errors } = await importAccounts(csv);
    expect(created.map((a) => [a.email, a.role])).toEqual([
      ['paul@acme.test', 'MANAGER'],
      ['zoe@acme.test', 'EMPLOYEE'],
    ]);
    expect(errors).toHaveLength(2);
    await expect(importAccounts('mail;equipe\nx;y')).rejects.toThrow('En-tête');
  });

  it('réinitialise un mot de passe et ferme les sessions ouvertes', async () => {
    const account = await addAccount({ email: 'reset@acme.test', team: 'Produit', role: 'EMPLOYEE' });
    const session = (await login(account.email, account.temporaryPassword)).body.token;

    const temporaryPassword = await resetAccountPassword('reset@acme.test');

    expect((await request(app).get('/me').set(bearer(session))).status).toBe(401);
    expect((await login(account.email, account.temporaryPassword)).status).toBe(401);
    expect((await login(account.email, temporaryPassword)).body.user.mustChangePassword).toBe(true);
  });

  it("change d'équipe en fermant les sessions, et déverrouille un compte", async () => {
    const account = await addAccount({ email: 'mobile@acme.test', team: 'Produit', role: 'EMPLOYEE' });
    const session = (await login(account.email, account.temporaryPassword)).body.token;

    await updateAccount('mobile@acme.test', { team: 'Ventes', role: 'manager' });
    expect((await request(app).get('/me').set(bearer(session))).status).toBe(401);
    expect(await listAccounts('Ventes')).toEqual([
      { email: 'mobile@acme.test', team: 'Ventes', role: 'MANAGER', mustChangePassword: true, locked: false },
    ]);

    await prisma.user.update({
      where: { email: 'mobile@acme.test' },
      data: { lockedUntil: new Date(Date.now() + 60_000) },
    });
    expect((await listAccounts('Ventes'))[0].locked).toBe(true);
    await unlockAccount('mobile@acme.test');
    expect((await listAccounts('Ventes'))[0].locked).toBe(false);
  });

  it('supprime un compte sans toucher aux réponses anonymes de son équipe', async () => {
    const account = await addAccount({ email: 'depart@acme.test', team: 'Produit', role: 'EMPLOYEE' });
    const user = await prisma.user.findUniqueOrThrow({ where: { email: account.email } });
    await addMood(user, todayKey(), 4);
    await addMood(user, shiftDateKey(todayKey(), -1), 2);

    await removeAccount('depart@acme.test');

    expect(await prisma.user.findUnique({ where: { email: account.email } })).toBeNull();
    expect(await prisma.submission.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.moodEntry.count({ where: { teamId: user.teamId } })).toBe(2);
    await expect(removeAccount('depart@acme.test')).rejects.toThrow('introuvable');
  });
});
