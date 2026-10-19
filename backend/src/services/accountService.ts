import { randomInt } from 'node:crypto';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { roleSchema, type Role } from '../lib/auth';
import { HttpError, badRequest, notFound } from '../lib/errors';
import { prisma } from '../lib/prisma';
import { BCRYPT_COST } from './authService';

// Gestion des comptes, utilisée par la CLI (npm run users). Pas d'écran d'admin :
// les comptes sont provisionnés par l'exploitant à partir de la liste RH.

const accountSchema = z.object({
  email: z.email('Email invalide').transform((email) => email.trim().toLowerCase()),
  team: z.string().trim().min(1, 'Équipe obligatoire').max(80),
  role: roleSchema,
});
export type AccountInput = z.input<typeof accountSchema>;

export type CreatedAccount = { email: string; team: string; role: Role; temporaryPassword: string };

export type AccountSummary = {
  email: string;
  team: string;
  role: string;
  mustChangePassword: boolean;
  locked: boolean;
};

// Sans caractères ambigus (0/O, 1/l/I) : le mot de passe provisoire est recopié à la main
const ALPHABET = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateTemporaryPassword(length = 14): string {
  return Array.from({ length }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
}

export async function addAccount(input: AccountInput): Promise<CreatedAccount> {
  const { email, team, role } = accountSchema.parse(input);
  if (await prisma.user.findUnique({ where: { email } })) throw new HttpError(409, `Le compte ${email} existe déjà`);

  const temporaryPassword = generateTemporaryPassword();
  const teamRow = await prisma.team.upsert({ where: { name: team }, update: {}, create: { name: team } });
  await prisma.user.create({
    data: {
      email,
      role,
      teamId: teamRow.id,
      passwordHash: await bcrypt.hash(temporaryPassword, BCRYPT_COST),
      mustChangePassword: true,
    },
  });
  return { email, team, role, temporaryPassword };
}

/** Lignes CSV « email,team,role » (en-tête obligatoire). Chaque ligne est traitée indépendamment. */
export async function importAccounts(csv: string): Promise<{ created: CreatedAccount[]; errors: string[] }> {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
  const header = lines.shift()?.toLowerCase().replace(/\s/g, '');
  if (header !== 'email,team,role') throw badRequest('En-tête CSV attendu : email,team,role');

  const created: CreatedAccount[] = [];
  const errors: string[] = [];
  for (const [index, line] of lines.entries()) {
    const [email = '', team = '', role = ''] = line.split(',').map((cell) => cell.trim());
    try {
      created.push(await addAccount({ email, team, role: role.toUpperCase() as Role }));
    } catch (err) {
      errors.push(`ligne ${index + 2} (${email || 'vide'}) : ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return { created, errors };
}

async function findAccount(email: string) {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user) throw notFound(`Compte ${email} introuvable`);
  return user;
}

/** Nouveau mot de passe provisoire, sessions fermées, verrouillage levé. */
export async function resetAccountPassword(email: string): Promise<string> {
  const user = await findAccount(email);
  const temporaryPassword = generateTemporaryPassword();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(temporaryPassword, BCRYPT_COST),
      mustChangePassword: true,
      tokenVersion: { increment: 1 },
      failedLogins: 0,
      lockedUntil: null,
    },
  });
  return temporaryPassword;
}

export async function unlockAccount(email: string): Promise<void> {
  const user = await findAccount(email);
  await prisma.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
}

/**
 * Changement d'équipe ou de rôle. Les réponses passées restent comptées dans
 * l'ancienne équipe : elles sont anonymes, on ne peut pas (et on ne doit pas) les déplacer.
 */
export async function updateAccount(email: string, changes: { team?: string; role?: string }): Promise<void> {
  const user = await findAccount(email);
  const data: { teamId?: number; role?: Role; tokenVersion?: { increment: number } } = {};
  if (changes.team) {
    const team = await prisma.team.upsert({
      where: { name: changes.team.trim() },
      update: {},
      create: { name: changes.team.trim() },
    });
    data.teamId = team.id;
  }
  if (changes.role) data.role = roleSchema.parse(changes.role.toUpperCase());
  if (Object.keys(data).length === 0) throw badRequest('Rien à modifier (--team ou --role)');
  data.tokenVersion = { increment: 1 }; // les droits changent : on force une reconnexion
  await prisma.user.update({ where: { id: user.id }, data });
}

/**
 * Suppression d'un compte (départ, droit à l'effacement). Ses Submission sont
 * supprimées ; ses réponses passées, anonymes et sans lien avec lui, restent dans
 * les statistiques de l'équipe.
 */
export async function removeAccount(email: string): Promise<void> {
  const user = await findAccount(email);
  // Ses demandes nominatives restent (le destinataire peut en avoir besoin) mais perdent leur auteur
  await prisma.$transaction([
    prisma.submission.deleteMany({ where: { userId: user.id } }),
    prisma.weeklySubmission.deleteMany({ where: { userId: user.id } }),
    prisma.user.delete({ where: { id: user.id } }),
  ]);
}

export async function listAccounts(team?: string, now = new Date()): Promise<AccountSummary[]> {
  const users = await prisma.user.findMany({
    where: team ? { team: { name: team } } : undefined,
    include: { team: true },
    orderBy: [{ team: { name: 'asc' } }, { role: 'asc' }, { email: 'asc' }],
  });
  return users.map((user) => ({
    email: user.email,
    team: user.team.name,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
    locked: user.lockedUntil !== null && user.lockedUntil > now,
  }));
}
