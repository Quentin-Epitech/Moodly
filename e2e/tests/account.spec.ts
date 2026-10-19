import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { PROVISIONAL_FILE } from '../global-setup';
import { login } from './helpers';

test("un compte créé par la CLI doit changer son mot de passe provisoire d'abord", async ({ page }) => {
  const { email, password } = JSON.parse(readFileSync(PROVISIONAL_FILE, 'utf8')) as { email: string; password: string };

  await login(page, email, password);
  await expect(page).toHaveURL(/\/password$/);
  await expect(page.getByText('Choisissez votre mot de passe.')).toBeVisible();

  await page.getByLabel('Mot de passe provisoire').fill(password);
  await page.getByLabel('Nouveau mot de passe', { exact: true }).fill('mon-mot-de-passe-perso');
  await page.getByLabel('Confirmer le nouveau mot de passe').fill('mon-mot-de-passe-perso');
  await page.getByRole('button', { name: 'Enregistrer' }).click();

  await expect(page.getByRole('button', { name: "C'est compris" })).toBeVisible();
  await page.getByRole('button', { name: "C'est compris" }).click();
  await expect(page.getByText('Comment ça va ?')).toBeVisible();
});

test('la déconnexion ferme la session côté serveur', async ({ page }) => {
  await login(page, 'farid@moodly.app');
  const token = await page.evaluate(() => localStorage.getItem('moodly.token'));
  expect(token).toBeTruthy();

  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await expect(page).toHaveURL(/\/login$/);

  // Le token d'avant n'est plus accepté par l'API
  const res = await page.request.get('/api/me', { headers: { Authorization: `Bearer ${token}` } });
  expect(res.status()).toBe(401);
});

test('la page de confidentialité est accessible sans compte', async ({ page }) => {
  await page.goto('/login');
  await page.getByText('Confidentialité : ce qui est enregistré').click();
  await expect(page).toHaveURL(/\/confidentialite$/);
  await expect(page.getByText('Ce qui est enregistré', { exact: true })).toBeVisible();
  await expect(page.getByText('Qui voit quoi', { exact: true })).toBeVisible();
});
