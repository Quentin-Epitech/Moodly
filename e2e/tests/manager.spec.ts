import { expect, test } from '@playwright/test';
import { login } from './helpers';

test("le manager voit l'alerte et publie une action que son équipe reçoit", async ({ page, browser }) => {
  await login(page, 'manager.logistique@moodly.app');

  await expect(page.getByText('Baisse nette du moral cette semaine')).toBeVisible();
  // La journée en cours n'est jamais affichée : la courbe s'arrête à hier
  await expect(page.getByText("jusqu'à hier").first()).toBeVisible();
  await expect(page.getByText('Hier', { exact: true })).toBeVisible();
  await expect(page.getByText('Côté management ?')).toBeVisible();

  const message = `Point d'équipe jeudi pour expliquer les objectifs (${Date.now()})`;
  await page.getByPlaceholder('on gèle les nouvelles demandes').fill(message);
  await page.getByRole('button', { name: 'Publier' }).click();
  await expect(page.getByText(message)).toBeVisible();

  // Un employé de l'équipe (qui a déjà répondu aujourd'hui) voit l'action
  const employee = await (await browser.newContext()).newPage();
  await login(employee, 'quentin@moodly.app');
  await expect(employee.getByText('Ce que votre manager change')).toBeVisible();
  await expect(employee.getByText(message)).toBeVisible();
});

test('un manager voit les jours masqués par le seuil', async ({ page }) => {
  await login(page, 'manager.support@moodly.app');
  await expect(page.getByText('Jours masqués')).toBeVisible();
  await expect(page.getByText(/il en faut au moins 3/).or(page.getByText('Courbe du moral'))).toBeVisible();
});
