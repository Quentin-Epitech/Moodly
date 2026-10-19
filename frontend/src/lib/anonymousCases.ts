import { secureStorage } from '@/auth/storage';

// Codes de suivi des signalements anonymes, gardés dans le trousseau de l'appareil.
// Le serveur ne sait pas qui a déposé un signalement anonyme : seul ce code (et
// celui ou celle qui l'a noté) permet de retrouver le fil.

export type AnonymousCaseRef = { id: number; token: string };

const MAX_CODES = 30;
const key = (userId: number) => `moodly.anon.${userId}`;

export async function listAnonymousCases(userId: number): Promise<AnonymousCaseRef[]> {
  try {
    const raw = await secureStorage.get(key(userId));
    return raw ? (JSON.parse(raw) as AnonymousCaseRef[]) : [];
  } catch {
    return [];
  }
}

export async function rememberAnonymousCase(userId: number, ref: AnonymousCaseRef): Promise<void> {
  const current = (await listAnonymousCases(userId)).filter((item) => item.id !== ref.id);
  await secureStorage.set(key(userId), JSON.stringify([ref, ...current].slice(0, MAX_CODES)));
}

export async function tokenForCase(userId: number, caseId: number): Promise<string | undefined> {
  return (await listAnonymousCases(userId)).find((item) => item.id === caseId)?.token;
}

/** « abcd efgh… » → « ABCD-EFGH-… » */
export function formatAccessCode(input: string): string {
  const raw = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return raw.match(/.{1,4}/g)?.join('-') ?? '';
}
