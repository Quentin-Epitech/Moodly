import palette from './palette';

export type MoodLevel = 1 | 2 | 3 | 4 | 5;

/**
 * Sens d'une échelle de 1 à 5 : `positive` quand 5 est le mieux (humeur, semaine),
 * `negative` quand 5 est le pire (charge, stress) — les couleurs sont alors inversées.
 */
export type ScaleTone = 'positive' | 'negative';

/** Niveau de couleur (1 corail → 5 vert) d'une valeur, éventuellement décimale */
export function moodLevel(value: number, tone: ScaleTone = 'positive'): MoodLevel {
  const rounded = Math.min(5, Math.max(1, Math.round(value)));
  return (tone === 'negative' ? 6 - rounded : rounded) as MoodLevel;
}

/** Couleur pleine, pour les graphes et les icônes */
export function moodColor(value: number, tone: ScaleTone = 'positive'): string {
  return palette.mood[moodLevel(value, tone)];
}

/** Couleur pastel, pour les fonds */
export function moodSoftColor(value: number, tone: ScaleTone = 'positive'): string {
  return palette['mood-soft'][moodLevel(value, tone)];
}

// Classes écrites en entier pour que Tailwind les trouve
export const MOOD_BG: Record<MoodLevel, string> = {
  1: 'bg-mood-1',
  2: 'bg-mood-2',
  3: 'bg-mood-3',
  4: 'bg-mood-4',
  5: 'bg-mood-5',
};

export const MOOD_SOFT_BG: Record<MoodLevel, string> = {
  1: 'bg-mood-soft-1',
  2: 'bg-mood-soft-2',
  3: 'bg-mood-soft-3',
  4: 'bg-mood-soft-4',
  5: 'bg-mood-soft-5',
};
