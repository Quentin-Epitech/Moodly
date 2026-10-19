import { expect, test, type Browser, type Page } from '@playwright/test';
import { login } from './helpers';

async function as(browser: Browser, email: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await login(page, email);
  return page;
}

async function createCase(
  page: Page,
  options: { type: RegExp; category: string; subject: string; message: string; anonymous?: boolean },
) {
  await page.getByRole('tab', { name: /Demandes/ }).click();
  await page.getByRole('button', { name: 'Nouvelle demande' }).click();
  await page.getByRole('button', { name: options.type }).click();
  await page.getByRole('button', { name: options.category, exact: true }).click();
  await page.getByLabel('Objet').fill(options.subject);
  await page.getByLabel('Message', { exact: true }).fill(options.message);
  if (options.anonymous) await page.getByRole('switch', { name: 'Envoyer anonymement' }).click();
  await page.getByRole('button', { name: 'Envoyer', exact: true }).click();
}

test('un employé fait son bilan de la semaine et le retrouve dans son suivi', async ({ page }) => {
  await login(page, 'alice@moodly.app');
  await page.getByRole('button', { name: /Faire mon bilan de la semaine/ }).click();
  await expect(page.getByText('Bilan de la semaine.')).toBeVisible();

  await page.getByRole('button', { name: /^Semaine : Correcte/ }).click();
  await page.getByRole('button', { name: /^Charge de travail : Lourde/ }).click();
  await page.getByRole('button', { name: /^Stress : Élevé/ }).click();
  await page.getByRole('button', { name: 'Envoyer mon bilan' }).click();
  await expect(page.getByText('Bilan fait.')).toBeVisible();

  // Mon suivi : l'historique personnel (gardé sur l'appareil) et la tendance de l'équipe
  await page.getByRole('button', { name: 'Voir mon suivi' }).click();
  await expect(page.getByText('Mon suivi.')).toBeVisible();
  await expect(page.getByLabel('Mon stress : dernière valeur 4,0 sur 5')).toBeVisible();
  await expect(page.getByText("Stress de l'équipe")).toBeVisible();
});

test("une demande d'action arrive chez le manager, qui répond", async ({ page, browser }) => {
  const subject = `Revoir mes délais ${Date.now()}`;
  await login(page, 'hugo@moodly.app');
  await createCase(page, {
    type: /Demande d'action/,
    category: 'Revoir des délais',
    subject,
    message: 'Le livrable de vendredi me paraît impossible à tenir avec le reste.',
  });
  await expect(page.getByText(subject)).toBeVisible();
  await expect(page.getByText('À : Manager de l’équipe').or(page.getByText("À : Manager de l'équipe"))).toBeVisible();

  const manager = await as(browser, 'manager.produit@moodly.app');
  await manager.getByRole('tab', { name: /Demandes/ }).click();
  await manager.getByRole('button', { name: new RegExp(subject) }).click();
  await expect(manager.getByText('De : hugo@moodly.app')).toBeVisible();
  await manager.getByLabel('Répondre').fill('On décale à mardi, je préviens le client.');
  await manager.getByRole('button', { name: 'Envoyer', exact: true }).click();
  await expect(manager.getByText('On décale à mardi, je préviens le client.')).toBeVisible();

  // Côté employé : la réponse est là, la demande est en cours
  await page.reload();
  await expect(page.getByText('On décale à mardi, je préviens le client.')).toBeVisible();
  await expect(page.getByText('En cours')).toBeVisible();
});

test('un signalement anonyme ne révèle pas son auteur au manager', async ({ page, browser }) => {
  const subject = `Remarques déplacées ${Date.now()}`;
  await login(page, 'emma@moodly.app');
  await createCase(page, {
    type: /Problème avec un collègue/,
    category: 'Comportement inapproprié',
    subject,
    message: 'Des remarques répétées sur le physique de collègues en réunion.',
    anonymous: true,
  });
  await expect(page.getByText('Gardez ce code.')).toBeVisible();
  await expect(page.getByText(/^[A-Z2-9]{4}(-[A-Z2-9]{4}){4}$/)).toBeVisible();
  await page.getByRole('button', { name: 'Voir la conversation' }).click();
  await expect(page.getByText(subject)).toBeVisible();

  const manager = await as(browser, 'manager.produit@moodly.app');
  await manager.getByRole('tab', { name: /Demandes/ }).click();
  await manager.getByRole('button', { name: new RegExp(subject) }).click();
  await expect(manager.getByText(/De : demandeur anonyme/)).toBeVisible();
  await expect(manager.getByText('emma@moodly.app')).toHaveCount(0);
  // Pas de rendez-vous possible : il révélerait l'auteur
  await expect(manager.getByRole('button', { name: 'Proposer un rendez-vous' })).toHaveCount(0);
  await expect(manager.getByText(/Pas de rendez-vous pour un signalement anonyme/)).toBeVisible();
});

test('un problème avec le manager va aux RH et jamais au manager', async ({ page, browser }) => {
  const subject = `Objectifs qui changent ${Date.now()}`;
  await login(page, 'gaelle@moodly.app');
  await createCase(page, {
    type: /Problème avec mon manager/,
    category: 'Charge ou objectifs imposés',
    subject,
    message: 'Les objectifs changent chaque semaine sans discussion.',
  });
  await expect(page.getByText('À : Ressources humaines')).toBeVisible();

  const manager = await as(browser, 'manager.produit@moodly.app');
  await manager.getByRole('tab', { name: /Demandes/ }).click();
  await expect(manager.getByText('Demandes reçues.')).toBeVisible();
  await expect(manager.getByText(subject)).toHaveCount(0);

  const hr = await as(browser, 'rh@moodly.app');
  await hr.getByRole('tab', { name: /Demandes/ }).click();
  await expect(hr.getByRole('button', { name: new RegExp(subject) })).toBeVisible();
});

test('les conseils mènent à une demande déjà orientée', async ({ page }) => {
  await login(page, 'alice@moodly.app');
  await page.getByRole('tab', { name: 'Conseils' }).click();
  await expect(page.getByText('Prendre soin')).toBeVisible();
  await expect(page.getByText(/3114/)).toBeVisible();
  await page.getByRole('button', { name: /Demander à alléger ma charge/ }).click();
  await expect(page.getByText("Demande d'action").first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Alléger ma charge', exact: true })).toBeVisible();
});
