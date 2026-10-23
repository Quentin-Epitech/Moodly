import { formatAccessCode } from '@/lib/anonymousCases';

describe('code de suivi', () => {
  it('se normalise quelle que soit la saisie', () => {
    expect(formatAccessCode('abcd efgh-jkLM npqr stuv')).toBe('ABCD-EFGH-JKLM-NPQR-STUV');
    expect(formatAccessCode('ABCD')).toBe('ABCD');
    expect(formatAccessCode('')).toBe('');
  });
});
