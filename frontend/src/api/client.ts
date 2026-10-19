import type { ApiErrorBody } from './types';

// Seul endroit de l'app qui fait du fetch. Les écrans passent par `api` (index.ts).

// URL absolue (apps mobiles, dev) ou chemin relatif « /api » (app web servie derrière le même domaine)
const BASE_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '');

/** Au-delà, on abandonne la requête : un réseau mobile peut rester bloqué sans jamais répondre */
export const TIMEOUT_MS = 10_000;

export class ApiError extends Error {
  constructor(
    /** Code HTTP, 0 si l'API est injoignable ou n'a pas répondu à temps */
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

/** Appelé quand l'API répond 401 à une requête authentifiée (session expirée ou fermée ailleurs). */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
  /** false pour les routes publiques (login, health) */
  auth?: boolean;
  /** En-têtes supplémentaires (ex. X-Case-Token d'une demande anonyme) */
  headers?: Record<string, string>;
};

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function networkError(): ApiError {
  const hint = __DEV__ ? ` (${BASE_URL} — le backend tourne-t-il ? l'IP dans .env est-elle la bonne ?)` : '';
  return new ApiError(0, `Pas de réponse du serveur. Vérifiez votre connexion et réessayez.${hint}`);
}

export async function request<T>(
  path: string,
  { method = 'GET', body, auth = true, headers: extraHeaders }: RequestOptions = {},
): Promise<T> {
  if (!BASE_URL) {
    throw new ApiError(0, "EXPO_PUBLIC_API_URL n'est pas défini : copier frontend/.env.example en .env");
  }

  const headers: Record<string, string> = { Accept: 'application/json', ...extraHeaders };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth && authToken) headers.Authorization = `Bearer ${authToken}`;
  const init: RequestInit = { method, headers, body: body === undefined ? undefined : JSON.stringify(body) };

  // Une lecture peut être retentée une fois ; une écriture jamais (pas de double saisie)
  const attempts = method === 'GET' ? 2 : 1;
  let response: Response | null = null;
  for (let attempt = 1; attempt <= attempts && !response; attempt++) {
    try {
      response = await fetchWithTimeout(`${BASE_URL}${path}`, init);
    } catch {
      if (attempt === attempts) throw networkError();
    }
  }
  if (!response) throw networkError();

  const data: unknown = response.status === 204 ? undefined : await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401 && auth) onUnauthorized?.();
    const fallback =
      response.status >= 500
        ? 'Le service rencontre un problème, réessayez dans un instant.'
        : `Erreur ${response.status}`;
    throw new ApiError(response.status, (data as ApiErrorBody | null)?.error ?? fallback);
  }

  return data as T;
}

/** Message à afficher pour n'importe quelle erreur attrapée dans un écran */
export function errorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : 'Une erreur est survenue';
}
