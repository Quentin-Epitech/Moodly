import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import type { Role } from '../src/lib/auth';
import { prisma } from '../src/lib/prisma';
import { bearer, createTags, createTeam, loginAs, resetDb } from './helpers';

// Chaque route × chaque rôle : un rôle non autorisé reçoit 403, un visiteur sans
// token 401, un rôle autorisé passe le contrôle d'accès. Une nouvelle route doit
// être ajoutée ici, sinon le dernier test échoue.

const app = createApp();
const ROLES: Role[] = ['EMPLOYEE', 'MANAGER', 'HR'];
const ACCOUNTS: Record<Role, string> = {
  EMPLOYEE: 'emp1@matrice.test',
  MANAGER: 'manager@matrice.test',
  HR: 'manager@direction.test',
};

type Case = { method: 'get' | 'post' | 'delete'; path: string; body?: object; allowed: Role[] | 'public' };

let teamId: number;

const cases = (): Case[] => [
  { method: 'get', path: '/health', allowed: 'public' },
  { method: 'get', path: '/ready', allowed: 'public' },
  { method: 'get', path: '/me', allowed: ROLES },
  { method: 'post', path: '/me/password', body: {}, allowed: ROLES },
  { method: 'get', path: '/tags', allowed: ROLES },
  { method: 'get', path: '/questions', allowed: ROLES },
  { method: 'get', path: '/moods/today', allowed: ['EMPLOYEE'] },
  { method: 'post', path: '/moods', body: { score: 3, tagIds: [] }, allowed: ['EMPLOYEE'] },
  { method: 'get', path: '/checkins/week', allowed: ['EMPLOYEE'] },
  { method: 'post', path: '/checkins', body: { score: 3, workload: 3, stress: 3 }, allowed: ['EMPLOYEE'] },
  { method: 'get', path: '/cases/types', allowed: ['EMPLOYEE'] },
  { method: 'get', path: '/cases', allowed: ROLES },
  { method: 'get', path: '/cases/unread', allowed: ROLES },
  {
    method: 'post',
    path: '/cases',
    body: {
      type: 'CONTACT',
      category: 'Question',
      subject: 'Question',
      message: 'Une question testée.',
      recipient: 'HR',
    },
    allowed: ['EMPLOYEE'],
  },
  { method: 'post', path: '/cases/lookup', body: { tokens: [] }, allowed: ['EMPLOYEE'] },
  { method: 'get', path: '/cases/999999', allowed: ROLES },
  { method: 'post', path: '/cases/999999/messages', body: { body: 'Bonjour' }, allowed: ROLES },
  { method: 'post', path: '/cases/999999/status', body: { status: 'RESOLVED' }, allowed: ['MANAGER', 'HR'] },
  {
    method: 'post',
    path: '/cases/999999/meetings',
    body: { startsAt: new Date(Date.now() + 86_400_000).toISOString(), durationMin: 30, location: 'Visio' },
    allowed: ROLES,
  },
  { method: 'post', path: '/meetings/999999/respond', body: { response: 'ACCEPT' }, allowed: ROLES },
  { method: 'post', path: '/meetings/999999/cancel', allowed: ROLES },
  { method: 'get', path: '/agenda', allowed: ROLES },
  { method: 'get', path: '/teams/me/moods', allowed: ['MANAGER'] },
  { method: 'get', path: '/teams/me/insights', allowed: ['MANAGER'] },
  { method: 'get', path: '/teams/me/weekly', allowed: ['EMPLOYEE', 'MANAGER'] },
  { method: 'get', path: '/teams/me/actions', allowed: ['EMPLOYEE', 'MANAGER'] },
  { method: 'post', path: '/teams/me/actions', body: { message: 'Une action testée' }, allowed: ['MANAGER'] },
  { method: 'delete', path: '/teams/me/actions/999999', allowed: ['MANAGER'] },
  { method: 'get', path: '/teams/overview', allowed: ['HR'] },
  { method: 'get', path: `/teams/${teamId}/moods`, allowed: ['HR'] },
  { method: 'get', path: `/teams/${teamId}/insights`, allowed: ['HR'] },
  { method: 'get', path: `/teams/${teamId}/weekly`, allowed: ['HR'] },
  { method: 'get', path: `/teams/${teamId}/actions`, allowed: ['HR'] },
  { method: 'post', path: '/auth/logout', allowed: ROLES },
];

beforeAll(async () => {
  await resetDb();
  await createTags(['Charge de travail']);
  const team = await createTeam('Matrice', 1);
  await createTeam('Direction', 0, 'HR');
  teamId = team.team.id;
});

afterAll(() => prisma.$disconnect());

describe("matrice d'accès", () => {
  it('protège chaque route selon le rôle', async () => {
    for (const route of cases()) {
      const label = `${route.method.toUpperCase()} ${route.path}`;
      const call = () => {
        const req = request(app)[route.method](route.path);
        return route.body ? req.send(route.body) : req;
      };

      const anonymous = await call();
      if (route.allowed === 'public') {
        expect(anonymous.status, `${label} sans token`).toBe(200);
        continue;
      }
      expect(anonymous.status, `${label} sans token`).toBe(401);

      for (const role of ROLES) {
        // Nouvelle session à chaque appel : /auth/logout ferme la session courante
        const token = await loginAs(app, ACCOUNTS[role]);
        const res = await call().set(bearer(token));
        if (route.allowed.includes(role)) {
          expect([401, 403], `${label} en ${role} (autorisé)`).not.toContain(res.status);
        } else {
          expect(res.status, `${label} en ${role} (interdit)`).toBe(403);
        }
      }
    }
  });

  it('couvre toutes les routes déclarées', () => {
    // Liste des routes de src/routes : à tenir à jour avec cases()
    const declared = [
      'GET /health',
      'GET /ready',
      'POST /auth/login',
      'POST /auth/logout',
      'GET /me',
      'POST /me/password',
      'GET /tags',
      'GET /questions',
      'GET /moods/today',
      'POST /moods',
      'GET /checkins/week',
      'POST /checkins',
      'GET /cases/types',
      'GET /cases',
      'GET /cases/unread',
      'POST /cases',
      'POST /cases/lookup',
      'GET /cases/:id',
      'POST /cases/:id/messages',
      'POST /cases/:id/status',
      'POST /cases/:id/meetings',
      'POST /meetings/:id/respond',
      'POST /meetings/:id/cancel',
      'GET /agenda',
      'GET /teams/me/moods',
      'GET /teams/me/insights',
      'GET /teams/me/weekly',
      'GET /teams/me/actions',
      'POST /teams/me/actions',
      'DELETE /teams/me/actions/:id',
      'GET /teams/overview',
      'GET /teams/:teamId/moods',
      'GET /teams/:teamId/insights',
      'GET /teams/:teamId/weekly',
      'GET /teams/:teamId/actions',
    ];
    const tested = cases().map((c) =>
      `${c.method.toUpperCase()} ${c.path}`
        .replace(`/teams/${teamId}/`, '/teams/:teamId/')
        .replace('/actions/999999', '/actions/:id')
        .replace('/cases/999999', '/cases/:id')
        .replace('/meetings/999999', '/meetings/:id'),
    );
    // /auth/login est public par nature et testé dans auth.test.ts
    expect([...tested, 'POST /auth/login'].sort()).toEqual([...declared].sort());
  });
});
