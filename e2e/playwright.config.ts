import { defineConfig, devices } from '@playwright/test';

// Tests de bout en bout de l'app web, contre la stack Docker locale (docker compose up).
// Les données de démo sont réinitialisées avant chaque session (global-setup.ts).
export default defineConfig({
  testDir: './tests',
  // Une seule base de démo partagée : les tests s'exécutent l'un après l'autre
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  globalSetup: './global-setup.ts',
  use: {
    ...devices['Pixel 7'],
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:8080',
    locale: 'fr-FR',
    // Chrome installé en local (PW_CHANNEL=chrome), Chromium de Playwright en CI
    channel: process.env.PW_CHANNEL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
