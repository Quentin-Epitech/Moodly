import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { env } from './config/env';
import { httpLogger } from './lib/logger';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { router } from './routes';

// Anti force brute sur la connexion : LOGIN_RATE_LIMIT tentatives (20 par défaut) par quart d'heure et par IP.
// Le verrouillage par compte (5 échecs) est géré en base par authService.
// Ce compteur est en mémoire : suffisant pour une instance unique (voir PRODUCTION.md).
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.LOGIN_RATE_LIMIT,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'test',
  message: { error: 'Trop de tentatives de connexion, réessayez dans quelques minutes' },
});

function corsOptions(): cors.CorsOptions | null {
  const origins = env.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (origins.length === 0) return null; // même origine (proxy) ou apps natives : pas besoin de CORS
  return { origin: origins.includes('*') ? true : origins };
}

// L'app est construite ici (sans écouter) pour être réutilisée par les tests supertest.
export function createApp() {
  const app = express();

  // Derrière nginx / Caddy : lire la vraie IP du client (limitation de débit)
  app.set('trust proxy', env.TRUST_PROXY);
  app.disable('x-powered-by');

  app.use(httpLogger);
  app.use(helmet());
  const corsConfig = corsOptions();
  if (corsConfig) app.use(cors(corsConfig));
  app.use(express.json({ limit: '50kb' }));
  app.use('/auth/login', loginLimiter);

  app.use(router);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
