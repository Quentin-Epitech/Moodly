import bcrypt from 'bcrypt';
import type { Express } from 'express';
import request from 'supertest';
import type { Role } from '../src/lib/auth';
import { prisma } from '../src/lib/prisma';
import { submitMood, type AnswerInput } from '../src/services/moodService';
import type { QuestionKind } from '../src/services/questionService';

export const PASSWORD = 'password123';

export async function resetDb() {
  // Garde-fou : on ne vide une base que dans l'environnement de test
  if (process.env.NODE_ENV !== 'test') {
    throw new Error(`Refus de vider ${process.env.DATABASE_URL} hors environnement de test`);
  }
  await prisma.caseMessage.deleteMany();
  await prisma.caseMeeting.deleteMany();
  await prisma.case.deleteMany();
  await prisma.weeklyCheckin.deleteMany();
  await prisma.weeklySubmission.deleteMany();
  await prisma.moodEntryAnswer.deleteMany();
  await prisma.moodEntryTag.deleteMany();
  await prisma.moodEntry.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.teamAction.deleteMany();
  await prisma.questionOption.deleteMany();
  await prisma.question.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.team.deleteMany();
}

export async function createTags(labels: string[]) {
  const tags = [];
  for (const label of labels) tags.push(await prisma.tag.create({ data: { label } }));
  return tags;
}

type QuestionInput = {
  key: string;
  label?: string;
  kind: QuestionKind;
  tagId?: number;
  minScore?: number;
  maxScore?: number;
  options: string[];
};

export async function createQuestion(input: QuestionInput) {
  const order = await prisma.question.count();
  return prisma.question.create({
    data: {
      key: input.key,
      label: input.label ?? input.key,
      kind: input.kind,
      tagId: input.tagId ?? null,
      minScore: input.minScore ?? null,
      maxScore: input.maxScore ?? null,
      order,
      options: { create: input.options.map((label, i) => ({ label, order: i })) },
    },
    include: { options: { orderBy: { order: 'asc' } } },
  });
}

/**
 * Crée une équipe avec 1 responsable (manager@<slug>.test, rôle MANAGER par
 * défaut) et N employés (emp1@<slug>.test, …).
 */
export async function createTeam(name: string, employeeCount: number, leadRole: Role = 'MANAGER') {
  const passwordHash = await bcrypt.hash(PASSWORD, 4); // coût faible : tests rapides
  const slug = name.toLowerCase();
  const team = await prisma.team.create({
    data: {
      name,
      users: {
        create: [
          { email: `manager@${slug}.test`, passwordHash, role: leadRole },
          ...Array.from({ length: employeeCount }, (_, i) => ({
            email: `emp${i + 1}@${slug}.test`,
            passwordHash,
            role: 'EMPLOYEE',
          })),
        ],
      },
    },
    include: { users: { orderBy: { id: 'asc' } } },
  });
  const [manager, ...employees] = team.users;
  return { team, manager, employees };
}

export async function loginAs(app: Express, email: string): Promise<string> {
  const res = await request(app).post('/auth/login').send({ email, password: PASSWORD });
  if (res.status !== 200) throw new Error(`Login impossible pour ${email} : ${res.status} ${res.text}`);
  return res.body.token as string;
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

/** Insère une réponse via le service (même chemin que l'API et le seed). */
export function addMood(
  user: { id: number; teamId: number },
  date: string,
  score: number,
  tagIds: number[] = [],
  answers: AnswerInput[] = [],
) {
  return submitMood({ userId: user.id, teamId: user.teamId, date, score, tagIds, answers });
}
