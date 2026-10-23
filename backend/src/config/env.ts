import 'dotenv/config';
import { z } from 'zod';

// Toute la configuration passe par ici : validée au démarrage, typée partout ailleurs.
// En production, les réglages dangereux (secret faible, CORS ouvert) empêchent le démarrage.
const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL est obligatoire'),
    JWT_SECRET: z.string().min(16, 'JWT_SECRET doit faire au moins 16 caractères'),
    // Seuil d'anonymat : en dessous, un jour est masqué pour le manager
    MIN_RESPONSES: z.coerce.number().int().min(1).default(3),
    // Origines autorisées (séparées par des virgules), « * » en dev, vide = CORS désactivé
    CORS_ORIGIN: z.string().default('*'),
    // Fuseau horaire servant à déterminer "aujourd'hui"
    TIMEZONE: z.string().default('Europe/Paris'),
    // Nombre de proxys devant l'API (nginx, Caddy…) : nécessaire pour lire la vraie IP du client
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),
    // Durée de conservation des réponses anonymes (13 mois par défaut)
    DATA_RETENTION_DAYS: z.coerce.number().int().min(31).default(395),
    // Durée de conservation d'une demande / d'un signalement après sa résolution (1 an par défaut)
    CASE_RETENTION_DAYS: z.coerce.number().int().min(30).default(365),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),
    // Autorise le seed de démo (qui vide la base) même en production
    ALLOW_DEMO_SEED: z.stringbool().default(false),
    /** Tentatives de connexion par quart d'heure et par IP (anti force brute) */
    LOGIN_RATE_LIMIT: z.coerce.number().int().min(1).default(20),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV !== 'production') return;
    if (value.JWT_SECRET.length < 32 || value.JWT_SECRET.startsWith('change-me')) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_SECRET'],
        message: 'En production, JWT_SECRET doit être aléatoire et faire au moins 32 caractères (openssl rand -hex 32)',
      });
    }
    if (value.CORS_ORIGIN.split(',').some((origin) => origin.trim() === '*')) {
      ctx.addIssue({
        code: 'custom',
        path: ['CORS_ORIGIN'],
        message: 'En production, CORS_ORIGIN ne peut pas être « * » (origines explicites, ou vide pour désactiver)',
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Configuration invalide (.env) :');
  console.error(z.prettifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;

export const isProduction = env.NODE_ENV === 'production';

/** Durée de vie d'une session (pas de refresh token : on se reconnecte au bout de 7 jours) */
export const JWT_EXPIRES_IN = '7d';
