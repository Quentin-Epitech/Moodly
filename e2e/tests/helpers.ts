import { expect, type Page } from '@playwright/test';

export const PASSWORD = 'password123';

/** Connexion par l'écran de login ; valide l'onboarding s'il s'affiche (première connexion). */
export async function login(page: Page, email: string, password = PASSWORD) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).not.toHaveURL(/\/login$/);

  const onboarding = page.getByRole('button', { name: "C'est compris" });
  if (await onboarding.isVisible({ timeout: 3_000 }).catch(() => false)) await onboarding.click();
}
