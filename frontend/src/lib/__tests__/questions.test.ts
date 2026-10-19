import type { Question } from '@/api';
import { applicableQuestions, isApplicable } from '@/lib/questions';

const base = { key: 'q', label: 'Q', kind: 'multi' as const, options: [] };

const sinceWhen: Question = { ...base, id: 1, kind: 'single', tagId: null, minScore: null, maxScore: 2 };
const workload: Question = { ...base, id: 2, tagId: 10, minScore: null, maxScore: null };
const positive: Question = { ...base, id: 3, tagId: null, minScore: 4, maxScore: null };
const needs: Question = { ...base, id: 4, tagId: null, minScore: null, maxScore: null };

describe('isApplicable', () => {
  it('respecte la borne haute de la note', () => {
    expect(isApplicable(sinceWhen, 2, [])).toBe(true);
    expect(isApplicable(sinceWhen, 3, [])).toBe(false);
  });

  it('exige la raison cochée', () => {
    expect(isApplicable(workload, 3, [10])).toBe(true);
    expect(isApplicable(workload, 3, [11])).toBe(false);
  });

  it('respecte la borne basse de la note', () => {
    expect(isApplicable(positive, 4, [])).toBe(true);
    expect(isApplicable(positive, 3, [])).toBe(false);
  });

  it('pose toujours une question sans condition', () => {
    expect(isApplicable(needs, 1, [])).toBe(true);
    expect(isApplicable(needs, 5, [99])).toBe(true);
  });
});

describe('applicableQuestions', () => {
  it('filtre selon la note et les raisons, dans l’ordre', () => {
    const all = [sinceWhen, workload, positive, needs];
    expect(applicableQuestions(all, 2, [10]).map((q) => q.id)).toEqual([1, 2, 4]);
    expect(applicableQuestions(all, 5, []).map((q) => q.id)).toEqual([3, 4]);
  });
});
