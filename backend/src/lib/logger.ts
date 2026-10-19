import { randomUUID } from 'node:crypto';
import pino from 'pino';
import { pinoHttp } from 'pino-http';
import { env } from '../config/env';

// Journaux JSON (une ligne par évènement), lisibles par n'importe quel collecteur.
// Jamais de corps de requête, de token ni de mot de passe : une note d'humeur ne
// doit pas pouvoir apparaître dans les logs à côté d'une identité.
export const logger = pino({
  level: env.LOG_LEVEL ?? (env.NODE_ENV === 'test' ? 'silent' : 'info'),
  base: { service: 'moodly-api' },
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.passwordHash', '*.token'],
    censor: '[masqué]',
  },
});

/** Un log par requête : méthode, route, code, durée, identifiant de requête (X-Request-Id). */
export const httpLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const incoming = req.headers['x-request-id'];
    const id = typeof incoming === 'string' && incoming.length <= 100 ? incoming : randomUUID();
    res.setHeader('X-Request-Id', id);
    return id;
  },
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  autoLogging: { ignore: (req) => req.url === '/health' || req.url === '/ready' },
  serializers: {
    // Seulement la route et la méthode : pas d'en-têtes, pas d'IP en clair dans chaque ligne
    req: (req: { id: string; method: string; url: string }) => ({ id: req.id, method: req.method, url: req.url }),
    res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
  },
});
