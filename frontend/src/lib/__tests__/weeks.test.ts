import { formatWeek, lastWeeks, shiftWeeks, weekStartKey, weeklyAverages } from '@/lib/weeks';

describe('semaines', () => {
  it('ramène un jour au lundi de sa semaine', () => {
    expect(weekStartKey('2026-10-14')).toBe('2026-10-12'); // mercredi → lundi
    expect(weekStartKey('2026-10-12')).toBe('2026-10-12'); // lundi
    expect(weekStartKey('2026-10-18')).toBe('2026-10-12'); // dimanche
    expect(weekStartKey('2027-01-01')).toBe('2026-12-28'); // changement d'année
  });

  it('liste les dernières semaines dans l’ordre', () => {
    expect(lastWeeks(3, '2026-10-12')).toEqual(['2026-09-28', '2026-10-05', '2026-10-12']);
    expect(shiftWeeks('2026-10-12', -1)).toBe('2026-10-05');
    expect(formatWeek('2026-10-05')).toBe('05/10');
  });

  it('calcule la moyenne des notes du jour par semaine', () => {
    const daily = { '2026-10-05': 2, '2026-10-07': 4, '2026-10-13': 5 };
    expect(weeklyAverages(daily, ['2026-09-28', '2026-10-05', '2026-10-12'])).toEqual([null, 3, 5]);
  });
});
