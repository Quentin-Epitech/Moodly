// Capture les écrans de Moodly pour la vidéo, dans la vraie app (stack Docker locale).
// Remet d'abord les données de démo à zéro (ops/demo-reset.sh). Écrit dans public/screens/.
//   node scripts/capture.mjs            (BASE_URL=http://localhost:8080 par défaut)
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://localhost:8080';
const PASSWORD = 'password123'; // mot de passe des comptes de démo (DEMO.md)
const OUT = new URL('../public/screens/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
if (!process.env.BASE_URL) {
  execFileSync(new URL('../../ops/demo-reset.sh', import.meta.url).pathname, { stdio: 'ignore' });
}

// Hauteur d'un iPhone (844) moins la barre d'état (47) : dans la vidéo, la barre d'état est
// dessinée au-dessus de la capture, l'app n'est donc jamais masquée par la Dynamic Island.
const MOBILE = {
  viewport: { width: 390, height: 797 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  locale: 'fr-FR',
  baseURL: BASE,
};
const DESKTOP = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: 'fr-FR', baseURL: BASE };

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'chrome' });

async function shot(page, name) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}${name}.png` });
  console.log(`✓ ${name}`);
}

/** Fait défiler jusqu'à un élément (en haut de l'écran, avec une marge) */
async function scrollTo(page, locator, margin = 90) {
  await locator.first().evaluate((el, m) => {
    let parent = el.parentElement;
    const scrollable = (node) =>
      ['auto', 'scroll'].includes(getComputedStyle(node).overflowY) && node.scrollHeight > node.clientHeight;
    while (parent && !scrollable(parent)) {
      parent = parent.parentElement;
    }
    const scroller = parent ?? document.scrollingElement;
    const top = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - m;
    scroller.scrollTop = top; // scrollTo() est ignoré par certains conteneurs de React Native Web
  }, margin);
}

/** Remonte tout en haut (les écrans gardent parfois la position du formulaire) */
async function scrollTop(page) {
  await page.evaluate(() => {
    for (const node of document.querySelectorAll('*')) if (node.scrollTop > 0) node.scrollTop = 0;
  });
}

async function login(email, options = MOBILE, { keepOnboarding = false } = {}) {
  const page = await (await browser.newContext(options)).newPage();
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL((url) => !url.pathname.endsWith('/login'));
  const onboarding = page.getByRole('button', { name: "C'est compris" });
  if (await onboarding.isVisible({ timeout: 4000 }).catch(() => false)) {
    if (keepOnboarding) return page;
    await onboarding.click();
  }
  await page.waitForTimeout(800);
  return page;
}

// --- Connexion -------------------------------------------------------------
{
  const page = await (await browser.newContext(MOBILE)).newPage();
  await page.goto('/login');
  await shot(page, 'login');
}

// --- Employée : humeur du jour, bilan, suivi, conseils ------------------------
{
  const page = await login('alice@moodly.app', MOBILE, { keepOnboarding: true });
  await shot(page, 'onboarding');
  await page.getByRole('button', { name: "C'est compris" }).click();
  await page.getByText('Comment').first().waitFor();
  await shot(page, 'home');

  await page.getByRole('button', { name: 'Humeur : Bien, 4 sur 5' }).click();
  await page.getByRole('button', { name: "Ambiance d'équipe", exact: true }).click();
  await page.getByRole('button', { name: 'Sens du travail', exact: true }).click();
  await shot(page, 'mood');

  await page.getByRole('button', { name: 'Envoyer ma réponse' }).click();
  await page.getByText('Merci.').waitFor();
  await scrollTop(page);
  await shot(page, 'merci');

  await page.getByRole('button', { name: /Faire mon bilan de la semaine/ }).click();
  await page.getByRole('button', { name: /^Semaine : Correcte/ }).click();
  await page.getByRole('button', { name: /^Charge de travail : Lourde/ }).click();
  await page.getByRole('button', { name: /^Stress : Élevé/ }).click();
  await scrollTo(page, page.getByText('Votre semaine'), 40);
  await shot(page, 'bilan');
  await page.getByRole('button', { name: 'Envoyer mon bilan' }).click();
  await page.getByRole('button', { name: 'Voir mon suivi' }).click();
  await page.getByText('Ma charge et mon stress').waitFor();
  await scrollTo(page, page.getByText("Mon équipe").first(), 60);
  await shot(page, 'suivi');

  await page.getByRole('tab', { name: 'Conseils' }).click();
  await scrollTo(page, page.getByText('Gérer sa charge'), 30);
  await shot(page, 'conseils');
}

// --- Signalement anonyme : le code de suivi ---------------------------------
{
  const page = await login('emma@moodly.app');
  await page.getByRole('tab', { name: /Demandes/ }).click();
  await page.getByRole('button', { name: 'Nouvelle demande' }).click();
  await page.getByRole('button', { name: /Problème avec un collègue/ }).click();
  await page.getByRole('button', { name: 'Tension ou conflit', exact: true }).click();
  await page.getByLabel('Objet').fill('Réunions du lundi tendues');
  await page.getByLabel('Message', { exact: true }).fill('Les réunions du lundi tournent au conflit, plus personne n’ose parler.');
  await page.getByRole('switch', { name: 'Envoyer anonymement' }).click();
  await scrollTo(page, page.getByText('Votre message'), 40);
  await shot(page, 'report');
  await page.getByRole('button', { name: 'Envoyer', exact: true }).click();
  await page.getByText('Gardez ce code.').waitFor();
  await shot(page, 'code');
}

// --- Employé avec rendez-vous : agenda et fil de la demande ------------------
{
  const page = await login('bob@moodly.app');
  await scrollTo(page, page.getByText('Prochains rendez-vous'), 24);
  await shot(page, 'agenda');
  await page.getByRole('button', { name: /Ouvrir la demande/ }).first().click();
  await page.getByText('Rendez-vous confirmé').waitFor();
  await scrollTo(page, page.getByText('Rendez-vous confirmé'), 220);
  await shot(page, 'meeting');
}

// --- Manager : tableau de bord, courbe, charge et stress ---------------------
{
  const page = await login('manager.logistique@moodly.app');
  await page.getByText('Baisse nette du moral').first().waitFor();
  await shot(page, 'manager');
  await scrollTo(page, page.getByText('Courbe du moral').first(), 30);
  await shot(page, 'chart');
  await scrollTo(page, page.getByText('Charge et stress').last(), 30);
  await shot(page, 'weekly');
}

// --- Manager : demandes reçues et proposition de rendez-vous -----------------
{
  const page = await login('manager.produit@moodly.app');
  await page.getByRole('tab', { name: /Demandes/ }).click();
  await page.getByText('Demandes').first().waitFor();
  await page.waitForTimeout(800);
  await shot(page, 'inbox');
  await page.getByRole('button', { name: /^Trop de sujets en parallèle/ }).click();
  await page.getByRole('button', { name: 'Proposer un rendez-vous' }).click();
  await page.getByRole('button', { name: /^(lun|mar|mer|jeu|ven)\. \d+$/ }).nth(1).click();
  await page.getByRole('button', { name: '10:00', exact: true }).click();
  await page.getByRole('button', { name: 'Visio', exact: true }).click();
  await scrollTo(page, page.getByText('Proposer un rendez-vous').last(), 30);
  await shot(page, 'slot');
}

// --- Direction (RH) ------------------------------------------------------------
{
  const page = await login('rh@moodly.app');
  await page.getByText("l'entreprise").first().waitFor();
  await shot(page, 'hr');
  await page.getByRole('tab', { name: /Demandes/ }).click();
  await page.getByText(/Ouverte depuis/).first().waitFor();
  await shot(page, 'hr-cases');
}

// --- Version ordinateur ---------------------------------------------------------
{
  const page = await login('manager.logistique@moodly.app', DESKTOP);
  await page.getByText('Baisse nette du moral').first().waitFor();
  await shot(page, 'desktop-manager');
  await scrollTo(page, page.getByText('Courbe du moral').first(), 30);
  await shot(page, 'desktop-chart');
}
{
  const page = await login('rh@moodly.app', DESKTOP);
  await page.getByText("l'entreprise").first().waitFor();
  await shot(page, 'desktop-hr');
}

await browser.close();
console.log(`Écrans écrits dans ${OUT}`);
