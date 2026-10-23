import type { RequestHandler } from 'express';
import { roleSchema, verifyToken, type Role } from '../lib/auth';
import { HttpError, forbidden, unauthorized } from '../lib/errors';
import { prisma } from '../lib/prisma';

/**
 * Vérifie le Bearer token puis recharge l'utilisateur en base : le rôle et
 * l'équipe viennent toujours de la base (jamais d'un paramètre d'URL), et un
 * token émis avant une déconnexion ou un changement de mot de passe est refusé.
 */
const authenticate: RequestHandler = async (req, _res, next) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
  if (!token) throw unauthorized('Token manquant');

  const payload = verifyToken(token);
  if (!payload) throw unauthorized('Token invalide ou expiré');

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, role: true, teamId: true, tokenVersion: true, mustChangePassword: true },
  });
  if (!user) throw unauthorized('Utilisateur inconnu');
  if (user.tokenVersion !== payload.version) throw unauthorized('Session expirée, reconnectez-vous');

  const role = roleSchema.safeParse(user.role);
  if (!role.success) throw new HttpError(500, 'Rôle invalide en base');

  req.user = { id: user.id, role: role.data, teamId: user.teamId, mustChangePassword: user.mustChangePassword };
  next();
};

/**
 * Pour les routes du compte (profil, changement de mot de passe, déconnexion) :
 * accessibles même avec un mot de passe provisoire.
 */
export const requireSession = authenticate;

/**
 * Pour tout le reste : un compte avec un mot de passe provisoire doit d'abord le
 * changer (403 tant que ce n'est pas fait).
 */
export const requireAuth: RequestHandler = async (req, res, next) => {
  await authenticate(req, res, () => {
    if (req.user?.mustChangePassword) throw forbidden('Changez votre mot de passe provisoire pour continuer');
    next();
  });
};

// À placer après requireAuth : 403 si le rôle n'est pas dans la liste.
export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) throw unauthorized();
    if (!roles.includes(req.user.role)) throw forbidden(`Réservé au rôle ${roles.join(' ou ')}`);
    next();
  };
}
