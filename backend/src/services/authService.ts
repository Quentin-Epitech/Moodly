import bcrypt from 'bcrypt';
import type { Team, User } from '@prisma/client';
import { env } from '../config/env';
import { roleSchema, signToken, type Role } from '../lib/auth';
import { HttpError, badRequest, notFound, unauthorized } from '../lib/errors';
import { prisma } from '../lib/prisma';

export type PublicUser = {
  id: number;
  email: string;
  role: Role;
  teamName: string;
  /** Seuil d'anonymat (MIN_RESPONSES), affiché à l'employé dans l'onboarding */
  anonymityThreshold: number;
  /** Mot de passe provisoire : l'app impose de le changer avant tout le reste */
  mustChangePassword: boolean;
};

export type Session = { token: string; user: PublicUser };

export const BCRYPT_COST = 10;
export const MIN_PASSWORD_LENGTH = 10;
/** Échecs consécutifs avant verrouillage, et durée du verrouillage */
export const MAX_FAILED_LOGINS = 5;
export const LOCK_DURATION_MS = 15 * 60 * 1000;

// Comparé quand l'email n'existe pas : même temps de réponse que pour un vrai compte
const DUMMY_HASH = bcrypt.hashSync('moodly-dummy-password', BCRYPT_COST);

// Ce qui sort de l'API : jamais le hash du mot de passe ni les compteurs de sécurité
function toPublicUser(user: User & { team: Team }): PublicUser {
  return {
    id: user.id,
    email: user.email,
    role: roleSchema.parse(user.role),
    teamName: user.team.name,
    anonymityThreshold: env.MIN_RESPONSES,
    mustChangePassword: user.mustChangePassword,
  };
}

export async function login(email: string, password: string, now = new Date()): Promise<Session> {
  const user = await prisma.user.findUnique({ where: { email }, include: { team: true } });

  if (!user) {
    await bcrypt.compare(password, DUMMY_HASH);
    throw unauthorized('Email ou mot de passe incorrect');
  }

  if (user.lockedUntil && user.lockedUntil > now) {
    throw new HttpError(429, 'Trop de tentatives pour ce compte, réessayez dans quelques minutes');
  }

  if (!(await bcrypt.compare(password, user.passwordHash))) {
    const failed = user.failedLogins + 1;
    const locked = failed >= MAX_FAILED_LOGINS;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLogins: locked ? 0 : failed,
        lockedUntil: locked ? new Date(now.getTime() + LOCK_DURATION_MS) : null,
      },
    });
    // Même message que pour un email inconnu : on ne révèle pas si le compte existe
    throw unauthorized('Email ou mot de passe incorrect');
  }

  if (user.failedLogins > 0 || user.lockedUntil) {
    await prisma.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
  }

  return { token: signToken(user), user: toPublicUser(user) };
}

/** Déconnexion : invalide toutes les sessions ouvertes de l'utilisateur (tous appareils). */
export async function logout(userId: number): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } } });
}

export async function changePassword(userId: number, currentPassword: string, newPassword: string): Promise<Session> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound('Utilisateur introuvable');

  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw badRequest('Mot de passe actuel incorrect');
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    throw badRequest(`Le nouveau mot de passe doit faire au moins ${MIN_PASSWORD_LENGTH} caractères`);
  }
  if (newPassword === currentPassword) {
    throw badRequest("Le nouveau mot de passe doit être différent de l'actuel");
  }

  // Les autres sessions sont fermées ; on renvoie un nouveau token pour celle-ci
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: await bcrypt.hash(newPassword, BCRYPT_COST),
      mustChangePassword: false,
      tokenVersion: { increment: 1 },
    },
    include: { team: true },
  });

  return { token: signToken(updated), user: toPublicUser(updated) };
}

export async function getMe(userId: number): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { team: true } });
  if (!user) throw notFound('Utilisateur introuvable');
  return toPublicUser(user);
}
