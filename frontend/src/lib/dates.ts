// Formatage des dates renvoyées par l'API, sans dépendre d'Intl (support
// variable selon les moteurs JS mobiles).

const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MONTHS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

function parse(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  return { year, month, day, weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay() };
}

/** Clé "YYYY-MM-DD" d'une date, dans le fuseau du téléphone */
export function dateKey(date: Date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Nombre de jours entre deux clés (positif si `to` est après `from`) */
export function daysBetween(from: string, to: string): number {
  const a = parse(from);
  const b = parse(to);
  return Math.round((Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / 86_400_000);
}

/** "2026-10-12" → "lundi 12 octobre" */
export function formatLongDate(key: string): string {
  const { day, month, weekday } = parse(key);
  return `${WEEKDAYS[weekday]} ${day === 1 ? '1er' : day} ${MONTHS[month - 1]}`;
}

/** "2026-10-12" → "12/10" */
export function formatShortDate(key: string): string {
  const { day, month } = parse(key);
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`;
}

/** Date ISO → "aujourd'hui", "hier", "il y a 3 jours" */
export function formatRelative(iso: string): string {
  const diff = daysBetween(dateKey(new Date(iso)), dateKey());
  if (diff <= 0) return "aujourd'hui";
  if (diff === 1) return 'hier';
  return `il y a ${diff} jours`;
}

/** 3.666 → "3,7" */
export function formatScore(value: number): string {
  return value.toFixed(1).replace('.', ',');
}

/** 0.47 → "47 %" */
export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)} %`;
}

/** 0.42 → "+0,4", -0.8 → "−0,8" */
export function formatDelta(delta: number): string {
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : '';
  return `${sign}${formatScore(Math.abs(delta))}`;
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Date ISO → « 10:42 » (heure du téléphone) */
export function formatTime(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

const MONTHS_SHORT = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
];
const WEEKDAYS_SHORT = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];

/** Date ISO → { day: "20", month: "oct.", weekday: "mar." } (pavé de date) */
export function dateParts(iso: string) {
  const date = new Date(iso);
  return {
    day: String(date.getDate()),
    month: MONTHS_SHORT[date.getMonth()],
    weekday: WEEKDAYS_SHORT[date.getDay()],
  };
}

/** Créneau → « mardi 20 octobre · 10:00 – 10:45 » (heure du téléphone) */
export function formatSlot(iso: string, durationMin: number): string {
  const end = new Date(new Date(iso).getTime() + durationMin * 60_000).toISOString();
  return `${formatLongDate(dateKey(new Date(iso)))} · ${formatTime(iso)} – ${formatTime(end)}`;
}

/** Date ISO à venir → « aujourd'hui », « demain », « dans 4 jours » */
export function formatUpcoming(iso: string): string {
  const diff = daysBetween(dateKey(), dateKey(new Date(iso)));
  if (diff <= 0) return "aujourd'hui";
  if (diff === 1) return 'demain';
  return `dans ${diff} jours`;
}

/** Les `count` prochains jours ouvrés (lundi → vendredi), à partir d'aujourd'hui */
export function upcomingWorkdays(count: number, now: Date = new Date()): string[] {
  const keys: string[] = [];
  for (let offset = 0; keys.length < count && offset < count * 2 + 7; offset++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    if (date.getDay() !== 0 && date.getDay() !== 6) keys.push(dateKey(date));
  }
  return keys;
}

/** "2026-10-15" → « jeu. 15 » */
export function formatDayChip(key: string): string {
  const { day, weekday } = parse(key);
  return `${WEEKDAYS_SHORT[weekday]} ${day}`;
}
