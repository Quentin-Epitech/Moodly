import { createApp } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';
import { purgeExpiredData } from './services/retentionService';

const PURGE_INTERVAL_MS = 60 * 60 * 1000;

async function purge() {
  try {
    const result = await purgeExpiredData();
    logger.info(result, 'Purge des données expirées');
  } catch (err) {
    logger.error({ err }, 'Échec de la purge des données expirées');
  }
}

const app = createApp();

const server = app.listen(env.PORT, '0.0.0.0', () => {
  logger.info(
    { port: env.PORT, env: env.NODE_ENV, minResponses: env.MIN_RESPONSES, retentionDays: env.DATA_RETENTION_DAYS },
    'Moodly API démarrée',
  );
});

// Purge au démarrage puis toutes les heures (sans bloquer l'arrêt du processus)
void purge();
const purgeTimer = setInterval(() => void purge(), PURGE_INTERVAL_MS);
purgeTimer.unref();

// Arrêt propre (docker stop, Ctrl+C) : on termine les requêtes en cours puis on ferme Prisma
async function shutdown(signal: string) {
  logger.info({ signal }, 'Arrêt en cours');
  clearInterval(purgeTimer);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  // Filet de sécurité si une connexion reste ouverte
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
