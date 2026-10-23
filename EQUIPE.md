# Répartition technique

Cinq périmètres, chacun avec ses propres fichiers pour travailler en parallèle sans conflits. Chaque périmètre a un
**responsable** qui le connaît à fond, fait les évolutions, écrit les tests et le présente en soutenance.

> Point de départ : le socle initial est sur la branche `setup/scaffold`. Chacun poursuit sur son périmètre, avec ses
> propres commits : c'est ce qui montre qui a fait quoi. Mode d'emploi pas à pas : [`CONTRIBUTING.md`](CONTRIBUTING.md).

| Périmètre | Responsable (GitHub) | Relit les PR de | Cœur technique |
| --- | --- | --- | --- |
| **A — API, auth & sécurité** | _à remplir_ | B | Express, JWT, middlewares, contrat d'API, rendez-vous |
| **B — Anonymisation & statistiques** | _à remplir_ | A | Modèle Prisma, transaction, agrégats, seuil, alertes |
| **C — App mobile : parcours employé** | _à remplir_ | D | Expo Router, session, saisie, bilan, suivi, demandes, agenda |
| **D — Tableaux de bord manager & direction** | _à remplir_ | C | Graphe, statistiques, actions d'équipe, demandes reçues, vue RH |
| **E — Infra, données & qualité** | _à remplir_ | tout ce qui touche Docker, la CI, la base | Docker, Postgres/Supabase, CI, e2e, vidéo |

### Planning

| Quand | Qui | Quoi |
| --- | --- | --- |
| Jour 1 | tous | Cloner, lancer la démo, lire son périmètre (« À comprendre d'abord »), ouvrir sa première PR (une tâche **P1**) |
| Jours 2 à 4 | chacun | Ses tâches **P1**, puis **P2** ; une PR par tâche, relue par son binôme sous 24 h |
| Jour 4 au soir | E | Gel : plus de nouvelle fonctionnalité, seulement des corrections ; `main` doit être vert |
| Jour 5 | tous | Répétition de la soutenance (`DEMO.md`) : chacun présente son périmètre et ses PR |

Rappel du sujet — **interdits** : refresh token, notifications push, champ commentaire libre, historique employé,
écran d'admin. Aucune tâche ci-dessous n'y touche.

Priorités : **P1** = à faire avant la démo, **P2** = si le temps le permet. Les tâches marquées ✅ ont été faites
dans le socle (passage « prêt pour la production ») : à **comprendre et savoir expliquer**, pas à refaire.

---

## A — API, auth & sécurité

**Fichiers** : `backend/src/routes/`, `controllers/`, `middlewares/`, `lib/auth.ts`, `lib/errors.ts`, `lib/logger.ts`,
`config/env.ts`, `app.ts`, `services/authService.ts`, `services/accountService.ts`, `cli/users.ts`, `backend/API.md`,
`services/meetingService.ts`, `services/agendaService.ts` (rendez-vous et agenda : qui propose, qui répond, accès
calqué sur la demande), `tests/auth.test.ts`, `tests/accounts.test.ts`, `tests/accessMatrix.test.ts`,
`tests/meetings.test.ts`.

**À comprendre d'abord**
- Le trajet d'une requête : `routes/` → `requireAuth` (vérifie le JWT puis **recharge l'utilisateur en base**) →
  `requireRole` → controller (validation zod) → service → Prisma.
- Pourquoi l'équipe vient toujours du token et jamais de l'URL (`/teams/me/...`).
- Le format d'erreur unique `{ error }` dans `middlewares/errorHandler.ts`.

**Tâches**
1. ✅ **Matrice d'accès testée** (`tests/accessMatrix.test.ts`). Un test paramétré qui appelle *chaque* route avec *chaque* rôle (anonyme,
   EMPLOYEE, MANAGER, HR) et vérifie le code attendu (200/201/401/403). C'est la preuve qu'aucune route n'est oubliée.
2. ✅ **Déconnexion réelle** (`tokenVersion`, `POST /auth/logout`). Aujourd'hui un JWT reste valide 7 jours même après « Se déconnecter ». Ajouter un
   `tokenVersion` sur `User` (à coordonner avec B pour le schéma), l'inclure dans le token, l'incrémenter sur
   `POST /auth/logout`, et refuser les tokens dont la version ne correspond plus. Pas de refresh token.
3. ✅ **Verrouillage par compte** (5 échecs → 15 min). En plus de la limite par IP : après 5 échecs sur un même email, refuser pendant
   15 minutes (`429`), sans révéler si l'email existe.
4. ✅ **Journalisation** (pino, `X-Request-Id`, aucun corps ni token).
5. **P1 — Documentation interactive de l'API.** Générer un schéma OpenAPI à partir des schémas zod existants et le
   servir sur `/docs` en développement uniquement ; vérifier qu'il reste aligné avec `API.md` (test).
6. **P2 — Limiteur partagé.** Brancher la limitation de débit sur un stockage partagé (Redis) pour pouvoir lancer
   plusieurs instances de l'API ; documenter le changement dans `PRODUCTION.md`.
7. **P2 — Journal d'audit de la CLI.** Tracer qui a créé, réinitialisé ou supprimé quel compte et quand (sans aucune
   donnée d'humeur). Logs de requêtes structurés (méthode, route, code, durée, identifiant de requête) **sans**
   corps de requête ni token — vérifier qu'aucune note n'apparaît dans les logs.

**Tests attendus** : matrice d'accès, logout qui invalide le token, verrouillage.
**En soutenance** : le parcours d'une requête et pourquoi un manager ne peut pas lire une autre équipe.

---

## B — Anonymisation & statistiques

**Fichiers** : `backend/prisma/schema.prisma`, `prisma/migrations/`, `services/moodService.ts`,
`services/teamStatsService.ts`, `services/questionService.ts`, `services/actionService.ts`,
`services/retentionService.ts`, `src/seed.ts`, `tests/closedDays.test.ts`, `tests/retention.test.ts`,
`tests/teamMoods.test.ts`, `summary.test.ts`, `insights.test.ts`, `moods.test.ts`.

**À comprendre d'abord**
- Pourquoi `Submission` et `MoodEntry` n'ont aucun lien, et pourquoi elles sont écrites dans la même transaction.
- Pourquoi `MoodEntry.id` est un UUID et `createdAt` est arrondi au jour.
- Les règles de masquage : seuil par jour, raison affichée seulement si elle est citée au moins deux fois, jours
  masqués exclus de tous les totaux (y compris l'entreprise).

**Tâches**
1. ✅ **Attaque par différence sur la journée en cours** (statistiques jusqu'à hier, `tests/closedDays.test.ts`). Faille réelle : le manager voit « aujourd'hui » passer de
   3 à 4 réponses et la moyenne changer ; si un collègue vient de lui dire « j'ai répondu », il déduit sa note.
   Solution à implémenter et tester : n'exposer un jour qu'une fois **clos** (aujourd'hui toujours masqué pour le
   manager et la direction), et l'expliquer dans l'onboarding et `API.md`.
2. **P1 — Tests unitaires des fonctions pures.** `aggregateDay`, `computeAlert`, `computeSummary` sont pures : les
   tester directement (bornes du seuil, égalités dans le tri des raisons, seuils d'alerte exacts 2,8 / 3,2 / 0,4 / 0,8).
3. **P2 — Agrégation en base.** Remplacer le calcul en JavaScript par des `groupBy` Prisma (portables SQLite /
   Postgres) et mesurer le gain sur un jeu de 50 000 réponses (script de benchmark dans `backend/scripts/`).
4. **P2 — Test de propriété.** Avec `fast-check` : pour des jeux de réponses aléatoires, aucun jour masqué ne laisse
   fuir de moyenne ni de raison, et aucune raison citée une seule fois n'apparaît sur un jour.

5. **P2 — Seuil adapté à la taille de l'équipe.** Pour une équipe de 3 personnes, un seuil de 3 révèle que tout le
   monde a répondu : étudier un seuil minimum relatif (ex. max(3, 40 % de l'équipe)) et le tester.

6. ✅ **Bilan hebdomadaire** (`weeklyService.ts`, semaines closes, alerte stress / charge) et **demandes**
   (`caseService.ts`, routage, anonymat par code de suivi) : à maîtriser pour la soutenance.
7. ✅ **Délai de traitement des demandes** : une demande ouverte depuis plus de 7 jours est signalée au manager et
   aux RH (`CaseRow`), sans aucune statistique sur le contenu.
8. **P1 — Preuve d'anonymat pour le jury.** Un document `ANONYMAT.md` (attaques envisagées : recoupement de deux
   jours, heure de réponse, raison citée par une seule personne, petite équipe ; nos parades ; ce qui reste
   possible) et un script `ops/prouver-anonymat.sh` qui affiche, en direct, le contenu des tables `Submission` et
   `MoodEntry` pour montrer qu'aucun lien n'existe.

**Tests attendus** : fonctions pures couvertes, test de propriété, seuil relatif.
**En soutenance** : le schéma Submission / MoodEntry et la faille de la journée en cours, avec sa correction.

---

## C — App mobile : parcours employé

**Fichiers** : `frontend/src/app/_layout.tsx`, `index.tsx`, `login.tsx`, `onboarding.tsx`, `employee.tsx`,
`password.tsx`, `confidentialite.tsx`,
`frontend/src/api/` (client et types), `frontend/src/auth/`, composants `MoodPicker`, `Chip`, `QuestionCard`,
`TextField`, `Button`, `lib/questions.ts`, et l'agenda : `lib/calendar.ts` (fichiers `.ics`), `lib/addToCalendar.ts`
(téléchargement web, partage mobile), composants `SlotPicker`, `MeetingCard`, `UpcomingAgenda`, `ReminderCard`,
`AddToCalendarButton`, `DateTile`.

**À comprendre d'abord**
- La session : token dans `expo-secure-store`, revalidé par `GET /me` au lancement, aiguillage `homeHref`.
- La règle d'applicabilité des questions, identique côté app (`lib/questions.ts`) et côté API.
- Pourquoi **aucun `fetch`** ne doit apparaître hors de `src/api/`.

**Tâches**
1. **P1 — Test sur vrais téléphones.** iOS et Android via Expo Go : clavier qui masque les champs, zones sûres,
   polices, retour arrière Android. Corriger et noter les appareils testés.
2. ✅ **Réseau fiable** (délai de 10 s, un nouvel essai pour les lectures, jamais pour les écritures). Dans `api/client.ts` : délai maximum (AbortController, 10 s), message clair hors
   connexion, un seul nouvel essai automatique sur les `GET`. Pas de double envoi sur `POST /moods`.
3. **P2 — Saisie hors ligne.** Si le réseau tombe au moment d'envoyer, garder la réponse sur le téléphone et
   l'envoyer au retour du réseau (une seule fois ; un `409` au renvoi = déjà enregistrée).
4. **P2 — Accessibilité.** Libellés VoiceOver / TalkBack sur toute la saisie, tailles de texte dynamiques, cibles
   tactiles de 44 px minimum.

5. ✅ **Bilan de la semaine, « Mon suivi » (historique sur l'appareil), demandes et conseils** : à maîtriser.
7. ✅ **Rendez-vous et agenda** : proposer / accepter un créneau, « Ajouter à mon agenda » (fichier `.ics` généré sur
   l'appareil, titre neutre), rappels personnels à la place des notifications. À tester sur iPhone et Android :
   la feuille de partage doit proposer « Ajouter à Calendrier ».
6. **P1 — Écran de mot de passe.** Indicateur de robustesse, affichage du mot de passe, tests du parcours « mot de
   passe provisoire » sur mobile.

**Tests attendus** : tests de composants (React Native Testing Library) du parcours de saisie avec l'API simulée :
note → raisons → questions qui apparaissent → envoi → écran de remerciement ; cas `409` et hors connexion.
**En soutenance** : la saisie en direct sur un vrai téléphone.

---

## D — Tableaux de bord manager & direction

**Fichiers** : `frontend/src/app/manager.tsx`, `hr.tsx`, `team/[teamId].tsx`, composants `TeamDashboard`,
`TeamMoodChart`, `DayDetails`, `Stat`, `BarList`, `AlertBanner`, `InsightsSection`, `ActionsSection`, `ActionCard`,
`PeriodSelector`, `NumberedRow`, `Screen` (mise en page web).

**À comprendre d'abord**
- Comment le graphe laisse un **trou** pour un jour masqué au lieu de le tracer à zéro.
- Le même `TeamDashboard` sert au manager (`team="me"`, actions modifiables) et à la direction (id d'équipe, lecture
  seule).
- La mise en page responsive : colonne de 560 px ou 1 040 px, chiffres clés sur quatre colonnes au-delà de `md`.

**Tâches**
1. **P1 — Comparaison sur la courbe.** Tracer la période précédente en pointillé sous la courbe actuelle (deuxième
   série gifted-charts), avec une légende.
2. **P1 — Graphe accessible.** Sur web, navigation au clavier (flèches gauche / droite pour changer de jour) ;
   partout, un résumé textuel lu par les lecteurs d'écran (« moyenne 2,4, en baisse de 1,3 sur 7 jours »).
3. **P2 — Export CSV pour la direction.** Agrégats uniquement (équipe, jour, moyenne ou « masqué », nombre de
   réponses). Téléchargement sur web, partage sur mobile.
4. **P2 — États de chargement et vides.** Squelettes à la place de l'indicateur, message dédié quand une équipe n'a
   encore aucune réponse.
5. **P1 — Demandes reçues.** Recherche et tri (ancienneté, non lues). ✅ Les demandes ouvertes depuis plus de
   7 jours sont déjà signalées ; ✅ un point d'équipe peut être daté.

**Tests attendus** : tests de composants avec l'API simulée — alerte affichée, jour masqué (« Jour masqué », pas de
raisons), publication puis suppression d'une action, export sans aucune donnée individuelle.
**En soutenance** : lire le tableau de bord de Logistique et publier une action en direct.

---

## E — Infra, données & qualité

**Fichiers** : `docker-compose.yml`, `docker-compose.prod.yml`, `deploy/Caddyfile`, `ops/`, `backend/Dockerfile`,
`frontend/Dockerfile.web`, `frontend/nginx.conf`, `.github/workflows/ci.yml`, configs ESLint / Prettier,
`backend/tests/globalSetup.ts`, `vitest.config.mts`, `e2e/`, `DEMO.md`, `PRODUCTION.md`, et la base Postgres /
Supabase : `backend/prisma/postgres/` (schéma généré, migrations, sécurité au niveau des lignes),
`backend/scripts/sync-postgres-schema.mjs`, `backend/scripts/with-env.mjs`, `backend/.env.supabase.example`,
`backend/tests/postgresSchema.test.ts`.

**À comprendre d'abord**
- Le démarrage du conteneur API : `prisma migrate deploy` puis `node dist/index.js`, base sur le volume `moodly-data`.
- Le build web : l'URL de l'API est figée dans le bundle au build (`WEB_API_URL`).
- La base de test jetable et `TEST_DATABASE_URL` (déjà validé sur Postgres 16).

**Tâches**
1. ✅ **Tests de bout en bout** (`e2e/`, 9 parcours Playwright, job CI). Playwright sur l'app web : connexion → saisie → déconnexion → manager → action
   publiée → visible côté employé. Lancés dans la CI contre `docker compose up`.
2. ✅ **Postgres dans la CI et sur Supabase** (variante `prisma/postgres/`, job CI Postgres 17, base Supabase
   installée avec un rôle dédié et la sécurité au niveau des lignes). **P2** restant : un service `db` Postgres
   optionnel dans `docker-compose.yml` (profil `postgres`), pour travailler en local sans Supabase.
3. ✅ **Remise à zéro de la démo** (`ops/demo-reset.sh`). Une commande qui remet les données de démo à aujourd'hui (le scénario est calé sur
   la date du seed) et vérifie que l'API répond.
4. ✅ **Vidéo de présentation** (`video/`, versions 87 s et 30 s, 16:9 et 9:16), régénérée depuis les vrais écrans.

5. **P1 — Restauration testée.** Jouer pour de vrai la restauration d'une sauvegarde (`ops/backup.sh`, procédure de
   `PRODUCTION.md`) et l'automatiser dans un script `ops/restore.sh`.
6. **P2 — Supervision.** Sonde de disponibilité sur `/api/ready` et alerte (Uptime Kuma dans le compose de prod).

**Tests attendus** : e2e verts en CI, tests backend verts sur SQLite et Postgres, restauration vérifiée.
**En soutenance** : l'architecture (schéma), Docker, la CI, et la migration vers Supabase.

---

## Règles communes

- **Une issue = une tâche = une branche = une PR** : `feat/<périmètre>-<sujet>` (ex. `feat/b-preuve-anonymat`), PR
  avec le modèle, une revue par son binôme avant fusion. Binômes : A ↔ B, C ↔ D, E relit tout ce qui touche Docker,
  la CI ou la base. Le détail : [`CONTRIBUTING.md`](CONTRIBUTING.md).
- **Personne ne pousse sur `main`** : tout passe par une PR, CI verte, une approbation.
- **Fichiers partagés** — on prévient avant de les modifier :

  | Fichier | Responsable | Règle |
  | --- | --- | --- |
  | `backend/prisma/schema.prisma` | B | Toute modification passe par B (une migration à la fois). |
  | `backend/API.md` + `frontend/src/api/types.ts` | A | Contrat modifié dans la **même PR** des deux côtés. |
  | `package.json` / `package-lock.json` | chacun dans son projet | Une seule PR de dépendances à la fois. |
  | `frontend/src/theme/palette.js`, `tailwind.config.js` | D | Pas de couleur codée en dur ailleurs. |

- **Avant chaque PR** : `npm run typecheck && npm run lint && npm test` dans le projet concerné.
- **Anonymisation** : toute nouvelle donnée renvoyée au manager ou à la direction est relue par B.
