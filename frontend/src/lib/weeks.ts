import { dateKey, formatShortDate } from './dates';

// Semaines identifiées par la clé de leur lundi ("YYYY-MM-DD"), comme côté API.

function parse(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** Lundi de la semaine contenant ce jour */
export function weekStartKey(key: string = dateKey()): string {
  const date = parse(key);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return toKey(date);
}

export function shiftWeeks(week: string, count: number): string {
  const date = parse(week);
  date.setUTCDate(date.getUTCDate() + count * 7);
  return toKey(date);
}

/** Les `count` dernières semaines (lundis), de la plus ancienne à `lastWeek` inclus */
export function lastWeeks(count: number, lastWeek: string = weekStartKey()): string[] {
  return Array.from({ length: count }, (_, i) => shiftWeeks(lastWeek, i - (count - 1)));
}

/** Moyenne des notes quotidiennes de chaque semaine (null si aucune note cette semaine-là) */
export function weeklyAverages(daily: Record<string, number>, weeks: string[]): (number | null)[] {
  const sums = new Map<string, { total: number; count: number }>();
  for (const [date, score] of Object.entries(daily)) {
    const week = weekStartKey(date);
    const current = sums.get(week) ?? { total: 0, count: 0 };
    sums.set(week, { total: current.total + score, count: current.count + 1 });
  }
  return weeks.map((week) => {
    const sum = sums.get(week);
    return sum ? Math.round((sum.total / sum.count) * 100) / 100 : null;
  });
}

/** « 06/10 » pour l'étiquette d'une semaine */
export function formatWeek(week: string): string {
  return formatShortDate(week);
}
