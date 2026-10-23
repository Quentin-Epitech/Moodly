import {
  capitalize,
  dateKey,
  daysBetween,
  formatDelta,
  formatLongDate,
  formatPercent,
  formatScore,
  formatShortDate,
} from '@/lib/dates';

describe('dates', () => {
  it('formate une clé de jour en français', () => {
    expect(formatLongDate('2026-10-12')).toBe('lundi 12 octobre');
    expect(formatLongDate('2026-03-01')).toBe('dimanche 1er mars');
    expect(formatShortDate('2026-10-05')).toBe('05/10');
  });

  it('compte les jours entre deux clés', () => {
    expect(daysBetween('2026-10-01', '2026-10-12')).toBe(11);
    expect(daysBetween('2026-10-12', '2026-10-01')).toBe(-11);
  });

  it('produit une clé locale', () => {
    expect(dateKey(new Date(2026, 9, 12, 23, 30))).toBe('2026-10-12');
  });

  it('formate les nombres à la française', () => {
    expect(formatScore(3.666)).toBe('3,7');
    expect(formatPercent(0.474)).toBe('47 %');
    expect(formatDelta(0.42)).toBe('+0,4');
    expect(formatDelta(-0.8)).toBe('−0,8');
    expect(formatDelta(0)).toBe('0,0');
  });

  it('met la première lettre en capitale', () => {
    expect(capitalize('lundi 12 octobre')).toBe('Lundi 12 octobre');
  });
});
