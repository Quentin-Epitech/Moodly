import { z } from 'zod';
import { prisma } from '../lib/prisma';

export const questionKindSchema = z.enum(['single', 'multi']);
export type QuestionKind = z.infer<typeof questionKindSchema>;

export type QuestionDto = {
  id: number;
  key: string;
  label: string;
  kind: QuestionKind;
  /** Posée seulement si cette raison est cochée (null = pas de condition) */
  tagId: number | null;
  /** Posée seulement si la note est dans [minScore, maxScore] (null = pas de borne) */
  minScore: number | null;
  maxScore: number | null;
  options: { id: number; label: string }[];
};

type Conditions = { tagId: number | null; minScore: number | null; maxScore: number | null };

/** La question doit-elle être posée pour cette saisie ? (même règle côté app et côté API) */
export function isApplicable(question: Conditions, score: number, tagIds: number[]): boolean {
  if (question.tagId !== null && !tagIds.includes(question.tagId)) return false;
  if (question.minScore !== null && score < question.minScore) return false;
  if (question.maxScore !== null && score > question.maxScore) return false;
  return true;
}

export async function listQuestions(): Promise<QuestionDto[]> {
  const questions = await prisma.question.findMany({
    orderBy: { order: 'asc' },
    include: { options: { orderBy: { order: 'asc' }, select: { id: true, label: true } } },
  });

  return questions.map((question) => ({
    id: question.id,
    key: question.key,
    label: question.label,
    kind: questionKindSchema.parse(question.kind),
    tagId: question.tagId,
    minScore: question.minScore,
    maxScore: question.maxScore,
    options: question.options,
  }));
}
