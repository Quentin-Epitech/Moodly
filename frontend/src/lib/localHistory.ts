import AsyncStorage from '@react-native-async-storage/async-storage';
import { dateKey, daysBetween } from './dates';

// Historique personnel de l'employé, stocké UNIQUEMENT sur son appareil.
// Le serveur ne garde aucun lien entre une personne et ses réponses : c'est ici,
// et seulement ici, que l'employé retrouve son propre suivi. Changer d'appareil
// ou effacer les données de l'app le fait disparaître (c'est voulu).

export type WeeklyEntry = { score: number; workload: number; stress: number };

export type LocalHistory = {
  /** Note du jour par date "YYYY-MM-DD" */
  daily: Record<string, number>;
  /** Bilan par semaine (lundi "YYYY-MM-DD") */
  weekly: Record<string, WeeklyEntry>;
};

const EMPTY: LocalHistory = { daily: {}, weekly: {} };
const KEEP_DAYS = 400;

const key = (userId: number) => `moodly.history.${userId}`;

async function read(userId: number): Promise<LocalHistory> {
  try {
    const raw = await AsyncStorage.getItem(key(userId));
    if (!raw) return { daily: {}, weekly: {} };
    const parsed = JSON.parse(raw) as Partial<LocalHistory>;
    return { daily: parsed.daily ?? {}, weekly: parsed.weekly ?? {} };
  } catch {
    return { daily: {}, weekly: {} };
  }
}

/** Ne garde que les ~13 derniers mois */
function prune(history: LocalHistory, today = dateKey()): LocalHistory {
  const recent = <T>(entries: Record<string, T>) =>
    Object.fromEntries(Object.entries(entries).filter(([date]) => daysBetween(date, today) <= KEEP_DAYS));
  return { daily: recent(history.daily), weekly: recent(history.weekly) };
}

async function write(userId: number, history: LocalHistory) {
  try {
    await AsyncStorage.setItem(key(userId), JSON.stringify(prune(history)));
  } catch {
    // Stockage indisponible (navigation privée…) : le suivi personnel est simplement absent
  }
}

export async function getLocalHistory(userId: number): Promise<LocalHistory> {
  return read(userId);
}

export async function recordDaily(userId: number, date: string, score: number) {
  const history = await read(userId);
  history.daily[date] = score;
  await write(userId, history);
}

export async function recordWeekly(userId: number, week: string, entry: WeeklyEntry) {
  const history = await read(userId);
  history.weekly[week] = entry;
  await write(userId, history);
}

export async function clearLocalHistory(userId: number) {
  try {
    await AsyncStorage.removeItem(key(userId));
  } catch {
    // rien à effacer
  }
}

export function isEmpty(history: LocalHistory = EMPTY): boolean {
  return Object.keys(history.daily).length === 0 && Object.keys(history.weekly).length === 0;
}
