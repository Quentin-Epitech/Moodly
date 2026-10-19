import { env } from '../config/env';

// Les jours sont manipulés sous forme de clés "YYYY-MM-DD" (String en base,
// portable SQLite/Postgres). "Aujourd'hui" dépend du fuseau configuré (TIMEZONE).

const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: env.TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Clé du jour courant dans le fuseau de l'application, ex. "2026-10-12". */
export function todayKey(now: Date = new Date()): string {
  return formatter.format(now);
}

/** Décale une clé de jour de `days` jours (négatif = vers le passé). */
export function shiftDateKey(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

/** Les `count` dernières clés de jour, de la plus ancienne à `endKey` inclus. */
export function lastDays(count: number, endKey: string = todayKey()): string[] {
  return Array.from({ length: count }, (_, i) => shiftDateKey(endKey, i - (count - 1)));
}

// Semaines : identifiées par la clé de leur lundi ("YYYY-MM-DD"), semaine ISO (lundi → dimanche).

/** Lundi de la semaine contenant ce jour. */
export function weekStartKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = dimanche
  return shiftDateKey(key, -((weekday + 6) % 7));
}

/** Lundi de la semaine en cours, dans le fuseau de l'application. */
export function currentWeekKey(now: Date = new Date()): string {
  return weekStartKey(todayKey(now));
}

/** Les `count` dernières semaines (lundis), de la plus ancienne à `endWeekKey` inclus. */
export function lastWeeks(count: number, endWeekKey: string): string[] {
  return Array.from({ length: count }, (_, i) => shiftDateKey(endWeekKey, (i - (count - 1)) * 7));
}

// Heures : les rendez-vous sont stockés en UTC et affichés dans le fuseau de l'application.

function zoneOffsetMs(instant: number, timeZone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
      .formatToParts(instant)
      .map((part) => [part.type, part.value]),
  );
  return Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute) - instant;
}

/** Instant correspondant à une heure locale du fuseau de l'application, ex. ("2026-10-21", "10:00"). */
export function zonedTime(dateKey: string, time: string, timeZone: string = env.TIMEZONE): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const wall = Date.UTC(y, m - 1, d, hh, mm);
  // Deux passes : le décalage peut changer entre l'estimation et l'instant réel (heure d'été)
  const first = wall - zoneOffsetMs(wall, timeZone);
  return new Date(wall - zoneOffsetMs(first, timeZone));
}

const meetingFormatter = new Intl.DateTimeFormat('fr-FR', {
  timeZone: env.TIMEZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
});

/** « mardi 21 octobre à 10:00 », dans le fuseau de l'application */
export function formatMeetingDate(date: Date): string {
  return meetingFormatter.format(date);
}
