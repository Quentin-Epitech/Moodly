import type { Question } from '@/api';

type Conditions = Pick<Question, 'tagId' | 'minScore' | 'maxScore'>;

/** Même règle que le backend : la question est posée selon la note et les raisons cochées. */
export function isApplicable(question: Conditions, score: number, tagIds: number[]): boolean {
  if (question.tagId !== null && !tagIds.includes(question.tagId)) return false;
  if (question.minScore !== null && score < question.minScore) return false;
  if (question.maxScore !== null && score > question.maxScore) return false;
  return true;
}

export function applicableQuestions(questions: Question[], score: number, tagIds: number[]): Question[] {
  return questions.filter((question) => isApplicable(question, score, tagIds));
}
