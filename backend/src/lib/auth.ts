import type { Request } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env, JWT_EXPIRES_IN } from '../config/env';
import { unauthorized } from './errors';

// Le rôle est un String en base (pas d'enum Prisma, pour rester portable) :
// c'est ce schéma zod qui fait foi côté API.
//  - EMPLOYEE : saisit son humeur
//  - MANAGER  : voit les agrégats de sa propre équipe, publie des actions
//  - HR       : vue direction, agrégats de toutes les équipes (même seuil)
export const roleSchema = z.enum(['EMPLOYEE', 'MANAGER', 'HR']);
export type Role = z.infer<typeof roleSchema>;

/** Utilisateur authentifié, attaché à `req.user` par le middleware requireAuth. */
export type AuthUser = {
  id: number;
  role: Role;
  teamId: number;
  mustChangePassword: boolean;
};

const payloadSchema = z.object({
  sub: z.coerce.number().int().positive(),
  ver: z.number().int().min(0),
});

/**
 * Le token ne porte que l'identifiant et la version de session : le rôle et
 * l'équipe sont relus en base à chaque requête. Incrémenter `tokenVersion`
 * (déconnexion, changement de mot de passe) invalide tous les tokens émis avant.
 */
export function signToken(user: { id: number; tokenVersion: number }): string {
  return jwt.sign({ ver: user.tokenVersion }, env.JWT_SECRET, {
    subject: String(user.id),
    expiresIn: JWT_EXPIRES_IN,
    algorithm: 'HS256',
  });
}

/** Identifiant et version de session du token, ou null si le token est invalide/expiré. */
export function verifyToken(token: string): { userId: number; version: number } | null {
  try {
    const parsed = payloadSchema.safeParse(jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }));
    if (!parsed.success) return null;
    return { userId: parsed.data.sub, version: parsed.data.ver };
  } catch {
    return null;
  }
}

/** À utiliser dans les controllers derrière requireAuth : évite les `req.user!`. */
export function currentUser(req: Request): AuthUser {
  if (!req.user) throw unauthorized();
  return req.user;
}
