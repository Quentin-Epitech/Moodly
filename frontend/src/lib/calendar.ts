import type { CaseRecipient, CaseSide, Slot } from '@/api/types';

// Fichiers d'agenda (iCalendar, RFC 5545) générés sur l'appareil : Apple Calendar,
// Outlook et Google Agenda les importent. Rien n'est envoyé à un service d'agenda.
// Les titres restent neutres : un agenda est souvent partagé ou visible par des
// collègues, il ne doit jamais révéler l'objet d'une demande ou d'un signalement.

export type CalendarEvent = {
  /** Identifiant stable : réimporter le fichier met l'événement à jour au lieu de le dupliquer */
  uid: string;
  title: string;
  start: Date;
  durationMin: number;
  location?: string;
  description?: string;
  url?: string;
  /** Rappel N minutes avant le début (0 = à l'heure) */
  alarmMinutes?: number;
  /**
   * Heure « flottante » : l'heure locale de l'agenda, quel que soit le fuseau
   * (rappels personnels, « tous les jours à 17:30 »). Sinon, instant UTC précis.
   */
  floating?: boolean;
  /** Règle de répétition, ex. 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR' */
  rrule?: string;
};

const pad = (value: number) => String(value).padStart(2, '0');

function utcStamp(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

function localStamp(date: Date): string {
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `T${pad(date.getHours())}${pad(date.getMinutes())}00`
  );
}

/** Échappe les caractères spéciaux d'une valeur texte */
export function escapeText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

const encoder = new TextEncoder();

/** Replie une ligne à 75 octets maximum (les lignes suivantes commencent par une espace) */
export function foldLine(line: string): string {
  const chunks: string[] = [];
  let current = '';
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    // 75 octets pour la première ligne, 74 + l'espace pour les suivantes
    if (bytes + size > (chunks.length === 0 ? 75 : 74)) {
      chunks.push(current);
      current = '';
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  chunks.push(current);
  return chunks.join('\r\n ');
}

export function toIcs(events: CalendarEvent[], now: Date = new Date()): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Moodly//Agenda//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];
  for (const event of events) {
    const end = new Date(event.start.getTime() + event.durationMin * 60_000);
    const stamp = event.floating ? localStamp : utcStamp;
    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.uid}@moodly.app`,
      `DTSTAMP:${utcStamp(now)}`,
      `DTSTART:${stamp(event.start)}`,
      `DTEND:${stamp(end)}`,
    );
    if (event.rrule) lines.push(`RRULE:${event.rrule}`);
    lines.push(`SUMMARY:${escapeText(event.title)}`);
    if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
    if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
    if (event.url) lines.push(`URL:${event.url}`);
    if (event.alarmMinutes !== undefined) {
      lines.push(
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:${escapeText(event.title)}`,
        `TRIGGER:${event.alarmMinutes === 0 ? 'PT0M' : `-PT${event.alarmMinutes}M`}`,
        'END:VALARM',
      );
    }
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}

// ---------------------------------------------------------------------------
// Événements Moodly
// ---------------------------------------------------------------------------

/** Titre neutre d'un rendez-vous de demande : avec qui, jamais à propos de quoi */
export function meetingTitle(viewer: CaseSide, recipient: CaseRecipient, requester: string | null): string {
  if (viewer === 'HANDLER') return `Point avec ${requester ?? 'un collaborateur'}`;
  return recipient === 'HR' ? 'Point avec les RH' : 'Point avec mon manager';
}

export function meetingEvent(meeting: Slot & { id: number }, title: string): CalendarEvent {
  return {
    uid: `rendez-vous-${meeting.id}`,
    title,
    start: new Date(meeting.startsAt),
    durationMin: meeting.durationMin,
    location: meeting.location,
    description: 'Rendez-vous pris dans Moodly.',
    alarmMinutes: 15,
  };
}

export function teamEvent(event: Slot & { id: number; message: string; teamName?: string }): CalendarEvent {
  return {
    uid: `point-equipe-${event.id}`,
    title: event.teamName ? `Point d'équipe ${event.teamName}` : "Point d'équipe",
    start: new Date(event.startsAt),
    durationMin: event.durationMin,
    location: event.location,
    description: event.message,
    alarmMinutes: 15,
  };
}

/** Prochaine occurrence (à partir d'aujourd'hui) d'un jour de semaine à une heure locale */
export function nextOccurrence(time: string, weekdays: number[], now: Date = new Date()): Date {
  const [hours, minutes] = time.split(':').map(Number);
  for (let offset = 0; offset < 8; offset++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, hours, minutes);
    if (weekdays.includes(date.getDay()) && date > now) return date;
  }
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, hours, minutes);
}

/**
 * Rappels personnels, à la place des notifications : l'humeur du jour en semaine
 * et, si on le souhaite, le bilan le vendredi. Rien n'est enregistré sur le serveur.
 */
export function reminderEvents(
  options: { dailyTime: string; weekly: boolean; weeklyTime?: string; url?: string },
  now: Date = new Date(),
): CalendarEvent[] {
  const events: CalendarEvent[] = [
    {
      uid: 'rappel-humeur-du-jour',
      title: 'Moodly · Comment ça va ?',
      start: nextOccurrence(options.dailyTime, [1, 2, 3, 4, 5], now),
      durationMin: 5,
      description: 'Trente secondes pour donner votre humeur du jour, sans votre nom.',
      url: options.url,
      alarmMinutes: 0,
      floating: true,
      rrule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
    },
  ];
  if (options.weekly) {
    events.push({
      uid: 'rappel-bilan-semaine',
      title: 'Moodly · Bilan de la semaine',
      start: nextOccurrence(options.weeklyTime ?? options.dailyTime, [5], now),
      durationMin: 5,
      description: 'Trois questions sur votre semaine : charge, stress, ressenti.',
      url: options.url,
      alarmMinutes: 0,
      floating: true,
      rrule: 'FREQ=WEEKLY;BYDAY=FR',
    });
  }
  return events;
}
