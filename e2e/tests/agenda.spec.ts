import { readFile } from 'node:fs/promises';
import { expect, test, type Browser, type Locator, type Page } from '@playwright/test';
import { login } from './helpers';

async function as(browser: Browser, email: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await login(page, email);
  return page;
}

/** Clique et renvoie le contenu du fichier .ics téléchargé */
async function downloadIcs(page: Page, button: Locator): Promise<string> {
  const [download] = await Promise.all([page.waitForEvent('download'), button.click()]);
  expect(download.suggestedFilename()).toMatch(/\.ics$/);
  return readFile(await download.path(), 'utf8');
}

/** Choisit un créneau : le deuxième jour ouvré proposé (jamais aujourd'hui), 10:00, lieu en un geste */
async function pickSlot(page: Page, place: string) {
  await page
    .getByRole('button', { name: /^(lun|mar|mer|jeu|ven)\. \d+$/ })
    .nth(1)
    .click();
  await page.getByRole('button', { name: '10:00', exact: true }).click();
  await page.getByRole('button', { name: place, exact: true }).click();
}

test("le manager propose un rendez-vous, l'employé l'accepte et l'ajoute à son agenda", async ({ page, browser }) => {
  const subject = `Point sur mes priorités ${Date.now()}`;
  await login(page, 'david@moodly.app');
  await page.getByRole('tab', { name: /Demandes/ }).click();
  await page.getByRole('button', { name: 'Nouvelle demande' }).click();
  await page.getByRole('button', { name: /Demande d'action/ }).click();
  await page.getByRole('button', { name: 'Clarifier mes priorités', exact: true }).click();
  await page.getByLabel('Objet').fill(subject);
  await page
    .getByLabel('Message', { exact: true })
    .fill('Trois urgences par jour, je ne sais plus par quoi commencer.');
  await page.getByRole('button', { name: 'Envoyer', exact: true }).click();
  await expect(page.getByText(subject)).toBeVisible();

  const manager = await as(browser, 'manager.produit@moodly.app');
  await manager.getByRole('tab', { name: /Demandes/ }).click();
  await manager.getByRole('button', { name: new RegExp(subject) }).click();
  await manager.getByRole('button', { name: 'Proposer un rendez-vous' }).click();
  await pickSlot(manager, 'Visio');
  await manager.getByRole('button', { name: 'Envoyer la proposition' }).click();
  await expect(manager.getByText('Proposition de rendez-vous')).toBeVisible();
  await expect(manager.getByRole('button', { name: 'Retirer ma proposition' })).toBeVisible();

  // Côté employé : la proposition attend une réponse
  await page.reload();
  await expect(page.getByText('Proposition de rendez-vous')).toBeVisible();
  await page.getByRole('button', { name: 'Accepter' }).click();
  await expect(page.getByText('Rendez-vous confirmé')).toBeVisible();

  // Le fichier d'agenda a un titre neutre : jamais l'objet de la demande
  const ics = await downloadIcs(page, page.getByRole('button', { name: 'Ajouter à mon agenda' }));
  expect(ics).toContain('BEGIN:VCALENDAR');
  expect(ics).toContain('SUMMARY:Point avec mon manager');
  expect(ics).toContain('LOCATION:Visio');
  expect(ics).not.toContain('priorités');

  // Et il figure dans « Prochains rendez-vous » sur l'accueil
  await page.getByRole('tab', { name: "Aujourd'hui" }).click();
  await expect(page.getByText('Prochains rendez-vous')).toBeVisible();
  await expect(page.getByText(`Demande : ${subject}`)).toBeVisible();
});

test("le manager date un point d'équipe que chacun ajoute à son agenda", async ({ page, browser }) => {
  const message = `Point d'équipe : nouvelle organisation (${Date.now()})`;
  await login(page, 'manager.logistique@moodly.app');
  await page.getByPlaceholder('on gèle les nouvelles demandes').fill(message);
  await page.getByRole('switch', { name: "C'est un point d'équipe" }).click();
  await pickSlot(page, 'Salle de réunion');
  await page.getByRole('button', { name: 'Publier' }).click();
  await expect(page.getByText(message)).toBeVisible();

  const employee = await as(browser, 'ugo@moodly.app');
  await expect(employee.getByText(message).first()).toBeVisible();
  const ics = await downloadIcs(employee, employee.getByRole('button', { name: 'Ajouter à mon agenda' }).first());
  expect(ics).toContain("SUMMARY:Point d'équipe Logistique");
  expect(ics).toContain('LOCATION:Salle de réunion');
  expect(ics).toContain('TRIGGER:-PT15M');
});

test("les rappels s'ajoutent à l'agenda de l'employé, sans rien envoyer au serveur", async ({ page }) => {
  await login(page, 'alice@moodly.app');
  await page.getByRole('tab', { name: 'Mon suivi' }).click();
  await page.getByRole('button', { name: '09:00', exact: true }).click();

  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  const ics = await downloadIcs(page, page.getByRole('button', { name: 'Ajouter les rappels à mon agenda' }));
  expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR');
  expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=FR');
  expect(ics).toMatch(/DTSTART:\d{8}T090000\r\n/);
  expect(requests.filter((url) => url.includes('/api/'))).toEqual([]);
});

test('la direction voit les demandes qui attendent depuis trop longtemps', async ({ page }) => {
  await login(page, 'rh@moodly.app');
  await page.getByRole('tab', { name: /Demandes/ }).click();
  await expect(page.getByText(/Ouverte depuis \d+ jours : à traiter/)).toBeVisible();
  // Et la proposition de rendez-vous envoyée à samir, en attente de sa réponse
  await expect(page.getByText('Prochains rendez-vous')).toBeVisible();
  await expect(page.getByText('En attente de réponse')).toBeVisible();
});
