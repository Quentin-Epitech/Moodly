import { defineConfig } from 'vitest/config';

// Base de test : SQLite jetable par défaut, ou TEST_DATABASE_URL (ex. Postgres)
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'file:./test.db';

export default defineConfig({
  test: {
    // Réinitialise la base de test avant la session de tests
    globalSetup: ['tests/globalSetup.ts'],
    // Une seule base partagée : les fichiers de tests tournent l'un après l'autre
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: TEST_DATABASE_URL,
      JWT_SECRET: 'moodly-test-secret-not-for-prod',
      MIN_RESPONSES: '3',
      CORS_ORIGIN: '*',
      TIMEZONE: 'Europe/Paris',
    },
  },
});
