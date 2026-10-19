import type { MoodScore } from '@/api';
import { ScalePicker } from './ScalePicker';

export const MOODS: { score: MoodScore; label: string }[] = [
  { score: 1, label: 'Difficile' },
  { score: 2, label: 'Bof' },
  { score: 3, label: 'Moyen' },
  { score: 4, label: 'Bien' },
  { score: 5, label: 'Super' },
];

const LABELS = MOODS.map((mood) => mood.label) as [string, string, string, string, string];

export function moodOf(score: number) {
  return MOODS.find((mood) => mood.score === score) ?? MOODS[2];
}

type Props = {
  value: MoodScore | null;
  onChange: (score: MoodScore) => void;
};

// Humeur du jour : cinq visages, du corail au vert, avec leurs libellés
export function MoodPicker({ value, onChange }: Props) {
  return <ScalePicker value={value} onChange={onChange} labels={LABELS} name="Humeur" faces />;
}
