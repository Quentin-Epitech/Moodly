import {
  escapeText,
  foldLine,
  meetingEvent,
  meetingTitle,
  nextOccurrence,
  reminderEvents,
  toIcs,
} from '@/lib/calendar';

const NOW = new Date('2026-10-14T09:00:00Z');
const unfold = (ics: string) => ics.replace(/\r\n /g, '');

describe('fichier d’agenda', () => {
  it('produit un VCALENDAR valide, en UTC, avec rappel 15 minutes avant', () => {
    const ics = toIcs(
      [
        meetingEvent(
          { id: 7, startsAt: '2026-10-20T08:00:00.000Z', durationMin: 45, location: 'Bureau RH' },
          'Point avec les RH',
        ),
      ],
      NOW,
    );
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('UID:rendez-vous-7@moodly.app');
    expect(ics).toContain('DTSTART:20261020T080000Z');
    expect(ics).toContain('DTEND:20261020T084500Z');
    expect(ics).toContain('SUMMARY:Point avec les RH');
    expect(ics).toContain('TRIGGER:-PT15M');
    // Toutes les lignes en CRLF
    expect(ics.replace(/\r\n/g, '').includes('\n')).toBe(false);
  });

  it('échappe virgules, points-virgules, retours à la ligne et barres obliques', () => {
    expect(escapeText('Salle 2, étage 3; aile\\B\nporte')).toBe('Salle 2\\, étage 3\\; aile\\\\B\\nporte');
  });

  it('replie les lignes longues à 75 octets, accents compris, sans perte', () => {
    const line = `DESCRIPTION:${'Équipe à l’écoute, '.repeat(12)}`;
    const folded = foldLine(line);
    for (const part of folded.split('\r\n')) expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75);
    expect(folded.replace(/\r\n /g, '')).toBe(line);
  });

  it('les rappels personnels suivent l’heure locale et se répètent', () => {
    const ics = unfold(toIcs(reminderEvents({ dailyTime: '17:30', weekly: true }, NOW), NOW));
    expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR');
    expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=FR');
    // Heure flottante : pas de « Z »
    expect(ics).toMatch(/DTSTART:\d{8}T173000\r\n/);
    expect(ics).toContain('UID:rappel-humeur-du-jour@moodly.app');
    expect(ics).toContain('UID:rappel-bilan-semaine@moodly.app');
  });

  it('sans bilan, un seul rappel', () => {
    expect(reminderEvents({ dailyTime: '09:00', weekly: false }, NOW)).toHaveLength(1);
  });
});

describe('titres neutres', () => {
  it("ne révèlent jamais l'objet d'une demande", () => {
    expect(meetingTitle('REQUESTER', 'HR', null)).toBe('Point avec les RH');
    expect(meetingTitle('REQUESTER', 'MANAGER', null)).toBe('Point avec mon manager');
    expect(meetingTitle('HANDLER', 'HR', 'bob@moodly.app')).toBe('Point avec bob@moodly.app');
  });
});

describe('prochaine occurrence', () => {
  it('saute le week-end et les heures déjà passées', () => {
    const saturday = new Date(2026, 9, 17, 10, 0);
    const next = nextOccurrence('09:00', [1, 2, 3, 4, 5], saturday);
    expect([next.getDay(), next.getHours(), next.getMinutes()]).toEqual([1, 9, 0]);
    const wednesdayEvening = new Date(2026, 9, 14, 18, 0);
    expect(nextOccurrence('17:30', [1, 2, 3, 4, 5], wednesdayEvening).getDate()).toBe(15);
  });
});
