import { Prisma } from '@prisma/client';
import { badRequest, conflict } from '../lib/errors';
import { prisma } from '../lib/prisma';
import { isApplicable } from './questionService';

export type AnswerInput = {
  questionId: number;
  optionIds: number[];
};

export type SubmitMoodInput = {
  userId: number;
  teamId: number;
  /** Jour de la saisie, "YYYY-MM-DD" (l'API passe toujours aujourd'hui, le seed des jours passés) */
  date: string;
  score: number;
  tagIds: number[];
  /** Réponses au questionnaire adaptatif (facultatives) */
  answers: AnswerInput[];
};

/** L'utilisateur a-t-il déjà répondu ce jour-là ? (lecture de Submission uniquement) */
export async function hasSubmitted(userId: number, date: string): Promise<boolean> {
  const submission = await prisma.submission.findUnique({
    where: { userId_date: { userId, date } },
    select: { id: true },
  });
  return submission !== null;
}

/**
 * Vérifie les réponses : question connue et applicable à cette saisie (note,
 * raisons cochées), options appartenant à la question, une seule option pour
 * une question "single". Renvoie les lignes à insérer.
 */
async function validateAnswers(score: number, tagIds: number[], answers: AnswerInput[]) {
  if (answers.length === 0) return [];

  const questionIds = answers.map((a) => a.questionId);
  if (new Set(questionIds).size !== questionIds.length) throw badRequest('Question répondue deux fois');

  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    include: { options: { select: { id: true } } },
  });

  const rows: { questionId: number; optionId: number }[] = [];
  for (const answer of answers) {
    const question = questions.find((q) => q.id === answer.questionId);
    if (!question) throw badRequest('Question inconnue');
    if (!isApplicable(question, score, tagIds)) {
      throw badRequest(`La question « ${question.label} » ne s'applique pas à cette saisie`);
    }

    const optionIds = [...new Set(answer.optionIds)];
    if (optionIds.length === 0) continue; // question laissée sans réponse
    if (question.kind === 'single' && optionIds.length > 1) {
      throw badRequest(`Une seule réponse attendue pour « ${question.label} »`);
    }

    const known = new Set(question.options.map((o) => o.id));
    if (!optionIds.every((id) => known.has(id))) throw badRequest('Réponse inconnue');

    rows.push(...optionIds.map((optionId) => ({ questionId: question.id, optionId })));
  }
  return rows;
}

/**
 * Enregistre une humeur de façon anonyme.
 *
 * Deux écritures dans UNE transaction, sans aucun lien entre elles :
 *  1. Submission(userId, date)  → « cette personne a répondu ce jour-là »
 *     (échoue si elle a déjà répondu : contrainte UNIQUE → 409)
 *  2. MoodEntry(teamId, date, score, tags, réponses détaillées) → « quelqu'un de
 *     cette équipe a mis cette note » — pas de userId, id UUID aléatoire
 *
 * Soit les deux lignes existent, soit aucune. C'est le seul endroit du code qui
 * écrit ces tables : l'API et le seed passent tous les deux par ici.
 */
export async function submitMood(input: SubmitMoodInput): Promise<void> {
  const tagIds = [...new Set(input.tagIds)];

  if (tagIds.length > 0) {
    const known = await prisma.tag.count({ where: { id: { in: tagIds } } });
    if (known !== tagIds.length) throw badRequest('Tag inconnu');
  }

  const answers = await validateAnswers(input.score, tagIds, input.answers);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.submission.create({
        data: { userId: input.userId, date: input.date },
      });

      await tx.moodEntry.create({
        data: {
          teamId: input.teamId,
          date: input.date,
          score: input.score,
          // Arrondi au jour : un horodatage précis permettrait de ré-associer la
          // MoodEntry à la Submission écrite au même instant.
          createdAt: new Date(`${input.date}T00:00:00.000Z`),
          tags: { create: tagIds.map((tagId) => ({ tagId })) },
          answers: { create: answers },
        },
      });
    });
  } catch (err) {
    // P2002 = violation d'unicité (userId, date) : déjà saisi ce jour-là
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw conflict("Humeur déjà saisie aujourd'hui");
    }
    throw err;
  }
}
