import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('un employé saisit son humeur du jour, une seule fois', async ({ page }) => {
  await login(page, 'alice@moodly.app');
  await expect(page.getByText('Comment ça va ?')).toBeVisible();

  await page.getByRole('button', { name: 'Bof, 2 sur 5' }).click();
  // Les sections apparaissent après la note ; les questions dépendent de la note et des raisons
  await page.getByRole('button', { name: 'Management', exact: true }).click();
  await expect(page.getByText('Côté management ?')).toBeVisible();
  await page.getByRole('button', { name: 'Depuis quelques jours' }).click();
  await page.getByRole('button', { name: 'Objectifs flous' }).click();
  await page.getByRole('button', { name: 'Envoyer ma réponse' }).click();

  await expect(page.getByText('Merci.')).toBeVisible();
  await expect(page.getByText('à partir de demain')).toBeVisible();

  // Au retour, l'écran de remerciement : pas de deuxième saisie possible
  await page.reload();
  await expect(page.getByText('Merci.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Envoyer ma réponse' })).toHaveCount(0);
});
