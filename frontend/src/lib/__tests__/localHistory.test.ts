import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearLocalHistory, getLocalHistory, isEmpty, recordDaily, recordWeekly } from '@/lib/localHistory';
import { dateKey } from '@/lib/dates';

describe('historique personnel (sur l’appareil)', () => {
  beforeEach(() => AsyncStorage.clear());

  it('garde les notes et bilans par utilisateur', async () => {
    const today = dateKey();
    await recordDaily(1, today, 4);
    await recordWeekly(1, today, { score: 3, workload: 4, stress: 2 });
    await recordDaily(2, today, 1);

    const history = await getLocalHistory(1);
    expect(history.daily).toEqual({ [today]: 4 });
    expect(history.weekly[today]).toEqual({ score: 3, workload: 4, stress: 2 });
    expect((await getLocalHistory(2)).daily).toEqual({ [today]: 1 });
  });

  it('oublie les réponses de plus de 13 mois', async () => {
    await recordDaily(1, '2020-01-06', 3);
    await recordDaily(1, dateKey(), 5);
    expect(Object.keys((await getLocalHistory(1)).daily)).toEqual([dateKey()]);
  });

  it("s'efface à la demande", async () => {
    await recordDaily(1, dateKey(), 4);
    await clearLocalHistory(1);
    expect(isEmpty(await getLocalHistory(1))).toBe(true);
  });
});
