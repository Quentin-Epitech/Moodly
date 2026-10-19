import { expect, test } from '@playwright/test';
import { login } from './helpers';

test("l'app web est servie avec les en-têtes de sécurité et l'API sur la même origine", async ({ request }) => {
  const page = await request.get('/');
  expect(page.status()).toBe(200);
  const headers = page.headers();
  expect(headers['content-security-policy']).toContain("default-src 'self'");
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['x-content-type-options']).toBe('nosniff');

  const health = await request.get('/api/ready');
  expect(await health.json()).toEqual({ ok: true });
  expect(health.headers()['x-request-id']).toBeTruthy();
});

test('aucune erreur dans la console sur un parcours complet', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await login(page, 'manager.produit@moodly.app');
  await expect(page.getByText("Moral de l'équipe")).toBeVisible();
  await page.getByRole('button', { name: '90 jours' }).click();
  await expect(page.getByText("90 jours, jusqu'à hier")).toBeVisible();
  await page.getByRole('link', { name: 'Mot de passe' }).click();
  await expect(page.getByText('Changer de mot de passe.')).toBeVisible();

  expect(await page.locator('html').getAttribute('lang')).toBe('fr');
  expect(errors).toEqual([]);
});
