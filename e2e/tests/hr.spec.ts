import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('la direction compare les équipes et ouvre le détail en lecture seule', async ({ page }) => {
  await login(page, 'rh@moodly.app');

  await expect(page.getByText("Moral de l'entreprise")).toBeVisible();
  for (const team of ['Logistique', 'Produit', 'Support', 'Ventes']) {
    await expect(page.getByText(team, { exact: true })).toBeVisible();
  }

  await page.getByText('Logistique', { exact: true }).click();
  await expect(page).toHaveURL(/\/team\/\d+$/);
  await expect(page.getByText('Baisse nette du moral cette semaine')).toBeVisible();
  // Lecture seule : pas de publication d'action
  await expect(page.getByRole('button', { name: 'Publier' })).toHaveCount(0);
});
