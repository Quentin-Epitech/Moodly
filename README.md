# Moodly

Application mobile de **mood tracking en entreprise** (démarche RSE) : chaque jour, un employé indique en trente
secondes comment il va, pourquoi, et ce qui l'aiderait. Son manager voit **des tendances d'équipe, jamais des réponses
individuelles**, reçoit une alerte quand le moral décroche et publie ce qu'il change en retour. La direction compare
les équipes avec les mêmes garanties d'anonymat.

Projet Epitech, une semaine, équipe de 4-5. Prêt pour un déploiement réel : HTTPS, comptes gérés en ligne de
commande, sessions révocables, minimisation des données, sauvegardes — voir [`PRODUCTION.md`](PRODUCTION.md).

- [Fonctionnalités](#fonctionnalités)
- [Stack](#stack)
- [Prérequis](#prérequis)
- [Lancer le backend](#lancer-le-backend) (avec ou sans Docker)
- [Lancer l'app mobile](#lancer-lapp-mobile)
- [Lancer l'app web](#lancer-lapp-web)
- [Comptes de test](#comptes-de-test)
- [Anonymisation by design](#anonymisation-by-design)
- [Structure du repo](#structure-du-repo)
- [Scripts, tests, CI](#scripts-tests-ci)
- [Postgres / Supabase](#postgres--supabase)
- [Mise en production](PRODUCTION.md)
- [Dépannage](#dépannage)

## Fonctionnalités

**Employé**

- Saisie du jour sur une seule page : humeur (1 à 5), puis les sections apparaissent — raisons (3 max parmi 6),
  **questionnaire adaptatif** (les questions dépendent de la note et des raisons : « Depuis quand ça ne va pas ? »,
  « Côté charge de travail… », « Qu'est-ce qui t'aiderait cette semaine ? »…), envoi avec rappel d'anonymat.
- Une seule saisie par jour ; ensuite, écran « Merci, à demain ».
- Onboarding à la première connexion : ce que le manager voit, et surtout ce qu'il ne voit pas.
- La dernière **action publiée par le manager** (« ce qu'on change ») est visible sur l'écran de saisie.
- **Bilan de la semaine** (trois questions : la semaine, la charge de travail, le stress), anonyme lui aussi.
- **Mon suivi** : mini-graphiques de son humeur, de sa charge et de son stress semaine après semaine, calculés à
  partir d'un historique gardé **uniquement sur son appareil**, et la tendance hebdomadaire de son équipe.
- **Demandes et signalements**, avec messagerie : demande d'action (alléger sa charge, revoir des délais…) et
  problème avec un collègue → manager ; problème avec son manager → RH (jamais montré au manager) ; demande
  d'échange → au choix. Signalement anonyme possible, suivi par un code.
- **Conseils** : gérer sa charge, le stress, la déconnexion, les difficultés relationnelles, qui contacter.
- **Rendez-vous** dans une demande : l'un propose un créneau (jour, heure, durée, lieu en quelques gestes), l'autre
  accepte ou refuse ; **« Ajouter à mon agenda »** en un geste (Outlook, Apple Calendar, Google Agenda).
- **Prochains rendez-vous** sur l'accueil (rendez-vous et points d'équipe datés) et **rappels dans son propre agenda**
  (humeur du jour en semaine, bilan le vendredi) à la place des notifications.

**Tous les comptes**

- Pas d'inscription : comptes créés par l'exploitant (CLI), mot de passe provisoire à changer à la première connexion.
- Changement de mot de passe, déconnexion qui ferme les sessions sur tous les appareils.
- Page **Confidentialité** (accessible sans compte) : ce qui est enregistré, qui voit quoi, combien de temps.

**Manager** (sa propre équipe uniquement)

- Courbe du moral sur 7 / 30 / 90 jours **clos** (jusqu'à hier), avec les jours sous le seuil d'anonymat masqués
  (trous, jamais à zéro), détail d'un jour au tap ou au glissement.
- KPI : moyenne 7 jours et tendance vs semaine précédente, participation, jours masqués, raison n°1.
- **Alerte** automatique (baisse nette ou moral bas) avec les raisons dominantes.
- Répartition des notes, raisons les plus citées, **précisions** du questionnaire cumulées sur la période.
- Publication / suppression d'**actions d'équipe**, pour fermer la boucle retour → action.
- **Charge et stress** par semaine (bilans hebdomadaires agrégés), avec alerte.
- **Demandes reçues** de son équipe : répondre, proposer un rendez-vous, prendre en charge, résoudre ; une demande
  ouverte depuis plus de 7 jours est signalée.
- **Points d'équipe datés** : une action peut porter une date, que toute l'équipe ajoute à son agenda.

**Direction (RH)**

- Vue de toutes les équipes : moyenne, tendance, alerte (moral ou bilan hebdomadaire), participation ; total
  entreprise.
- **Demandes adressées aux RH** : signalements concernant un manager, demandes d'échange, rendez-vous.
- Détail d'une équipe (même tableau de bord que le manager, en lecture seule).

**Direction visuelle** : éditoriale et sobre — titres en serif (Fraunces), interface en Inter, blanc pur et noir
profond, panneaux gris clair, filets fins, boutons pilule noirs, sections numérotées « 01 / … ». Pas de couleur
décorative : seules les tendances et alertes ont une teinte. Tout est en français.

**App web** : la même app tourne dans un navigateur, avec une mise en page adaptée aux grands écrans (colonne
centrée, chiffres clés sur quatre colonnes, sections côte à côte, sommaire). Voir [Lancer l'app web](#lancer-lapp-web).

### Écarts assumés par rapport au sujet initial

Le sujet de départ interdisait l'historique employé, le champ commentaire libre et les notifications push. L'équipe a
élargi le périmètre, en gardant intact ce qui est évalué en priorité, l'anonymisation :

- **Historique employé** : il existe, mais **uniquement sur l'appareil** de l'employé. Le serveur ne garde toujours
  aucun lien entre une personne et ses réponses.
- **Texte libre** : jamais dans les réponses du jour ni dans les bilans. Il n'existe que dans les demandes et
  signalements, canal séparé et nominatif par défaut (l'anonymat y est un choix explicite, avec un avertissement).
- **Notifications push, refresh token, écran d'admin** : toujours absents (pastilles « non lu » à l'ouverture de l'app,
  rappels que chacun ajoute à **son** agenda, comptes gérés en ligne de commande).
- **Agenda** : les fichiers `.ics` sont générés sur l'appareil, rien n'est envoyé à Google ou Microsoft, et leur titre
  reste neutre (« Point avec les RH ») : un agenda partagé ne révèle jamais l'objet d'une demande. Pas de rendez-vous
  pour un signalement anonyme : il révélerait son auteur.

Une **vidéo de présentation** (87 s, 16:9 et 9:16, appareils en 3D avec les vrais écrans de l'app) se génère depuis
[`video/`](video/README.md). Le scénario de démonstration minute par minute est dans [`DEMO.md`](DEMO.md) ; la répartition technique de
l'équipe (périmètres, tâches, règles de travail) dans [`EQUIPE.md`](EQUIPE.md).

## Stack

| Côté      | Techno                                                                                             |
| --------- | -------------------------------------------------------------------------------------------------- |
| Mobile    | Expo SDK 57 · expo-router · NativeWind 4 (Tailwind) · expo-secure-store · react-native-gifted-charts · Fraunces + Inter (expo-google-fonts) · lucide-react-native |
| API       | Node 22 · Express 5 · zod · bcrypt · JWT (7 jours) · helmet · limitation de débit sur la connexion    |
| Web       | Export statique Expo (`expo export --platform web`) servi par nginx dans Docker                     |
| Base      | SQLite via Prisma 6 (portable vers Postgres / Supabase, voir plus bas)                              |
| Outillage | Docker Compose · Caddy (HTTPS) · vitest + supertest · jest-expo · Playwright · ESLint · Prettier · GitHub Actions |

Frontend et backend sont **deux projets indépendants** qui ne communiquent qu'en HTTP. Le contrat d'API est documenté
dans [`backend/API.md`](backend/API.md) et reflété dans `frontend/src/api/types.ts`.

## Prérequis

- **Node.js 22** et npm.
- **Docker Desktop** (optionnel, pour lancer l'API en conteneur).
- Un téléphone avec **Expo Go** (App Store / Play Store), **sur le même Wi-Fi** que la machine qui fait tourner l'API.

## Lancer le backend

Dans les deux cas, commencez par créer la configuration :

```bash
cp backend/.env.example backend/.env
```

Les valeurs par défaut suffisent pour le développement (`PORT=4000`, `MIN_RESPONSES=3`, `TIMEZONE=Europe/Paris`).

### Avec Docker (recommandé pour la démo)

```bash
docker compose up --build -d              # API + app web, migrations appliquées au boot
./ops/demo-reset.sh                       # données de démo calées sur aujourd'hui (remet tout à zéro)
docker compose logs -f api                # journaux (JSON, une ligne par requête)
docker compose down                       # arrêt (les données restent dans le volume moodly-data)
```

L'app web répond sur `http://localhost:8080` et appelle l'API via `/api` (relais nginx, même origine) ; l'API reste
aussi joignable directement sur `http://localhost:4000` pour les apps mobiles (`curl localhost:4000/ready` →
`{"ok":true}`). Si un port est pris : `API_PORT=5000 WEB_PORT=3000 docker compose up -d`.

Cette stack locale tourne en `NODE_ENV=development` (secret de dev, seed autorisé). La stack de production
(`docker-compose.prod.yml`, HTTPS, API non exposée) est décrite dans [`PRODUCTION.md`](PRODUCTION.md).

### Sans Docker

```bash
cd backend
npm install              # génère aussi le client Prisma
npx prisma migrate dev   # crée backend/prisma/dev.db et applique les migrations
npm run db:seed          # données de démo
npm run dev              # API en mode watch sur http://localhost:4000
```

## Lancer l'app mobile

L'app ne tourne **pas** dans Docker : elle est lancée avec Expo Go sur le téléphone et doit joindre l'API via l'**IP
LAN** de votre machine (pas `localhost`).

1. Trouver son IP :
   - macOS : `ipconfig getifaddr en0` (ou `en1` en Ethernet)
   - Linux : `hostname -I | awk '{print $1}'`
   - Windows : `ipconfig` → ligne « Adresse IPv4 »
2. Configurer et lancer :

   ```bash
   cd frontend
   cp .env.example .env           # puis EXPO_PUBLIC_API_URL=http://<votre IP>:4000
   npm install
   npm start                      # scanner le QR code avec Expo Go
   ```

   Les variables `EXPO_PUBLIC_*` sont injectées au démarrage : relancer `npm start` après avoir modifié `.env`.

## Lancer l'app web

La même base de code tourne dans un navigateur, avec une mise en page pensée pour les grands écrans.

- **En développement** : `cd frontend && npm run web` (avec `EXPO_PUBLIC_API_URL=http://localhost:4000` dans
  `frontend/.env`, le backend tournant à côté). Ouvre `http://localhost:8081`.
- **Build statique** : `npm run build:web` produit `frontend/dist/` (HTML + JS + polices), à servir par n'importe quel
  serveur statique avec un repli sur `index.html` (routage côté client).
- **Avec Docker** : le service `web` du `docker-compose.yml` fait ce build et le sert avec nginx sur
  `http://localhost:8080` (voir ci-dessus).

## Comptes de test

Mot de passe commun : **`password123`**. Le seed crée 90 jours d'historique (les vues 7 / 30 / 90 jours sont
toutes remplies).

| Équipe         | Scénario                                                                                           | Comptes                                                                                |
| -------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **Produit**    | Moral correct, chute nette de J-15 à J-9 (« Charge de travail »), remontée après deux actions du manager | `manager.produit@moodly.app` · `alice`, `bob`, `chloe`, `david`, `emma`, `farid`, `gaelle`, `hugo` `@moodly.app` |
| **Support**    | Participation faible : la plupart des jours sont masqués par le seuil                              | `manager.support@moodly.app` · `ines`, `jules`, `karim`                                |
| **Ventes**     | Moral stable et bon                                                                                | `manager.ventes@moodly.app` · `lea`, `marc`, `nadia`, `omar`, `paula`                  |
| **Logistique** | **Chute cette semaine** (management, sens du travail) sans action publiée → alerte active          | `manager.logistique@moodly.app` · `quentin`, `rania`, `samir`, `tania`, `ugo`, `victor` |
| **Direction**  | Vue RH de toutes les équipes                                                                       | `rh@moodly.app`                                                                        |

Pour la démo en live : **`alice@moodly.app`** (et la plupart des employés) n'a pas encore répondu aujourd'hui ;
`manager.logistique@moodly.app` voit l'alerte et peut publier une action en direct. Les tableaux de bord s'arrêtent à
hier : une saisie du jour apparaît le lendemain (voir l'anonymisation ci-dessous). Relancer le seed remet tout à zéro.

Pour créer de vrais comptes : `npm run users -- add --email … --team … --role …` (ou `import fichier.csv`), voir
[`PRODUCTION.md`](PRODUCTION.md#comptes).

## Anonymisation by design

C'est le cœur du projet : plutôt que de promettre « on n'affiche pas qui a répondu », la base de données **ne sait pas
qui a répondu quoi**.

```
  Qui a répondu ?                          Qu'est-ce qui a été répondu ?
┌──────────────────────────┐             ┌──────────────────────────────────────────────┐
│ Submission               │             │ MoodEntry                                    │
│  userId  ───► User       │   aucun     │  id        UUID aléatoire (pas d'auto-incr.) │
│  date    "2026-10-12"    │ ◄─ lien ─►  │  teamId  ───► Team                           │
│  UNIQUE(userId, date)    │             │  date      "2026-10-12"                      │
│                          │             │  score     1..5                              │
│  → bloque la double      │             │  tags      MoodEntryTag[]                    │
│    saisie, rien d'autre  │             │  answers   MoodEntryAnswer[] (questionnaire) │
└──────────────────────────┘             └──────────────────────────────────────────────┘
```

- Les deux lignes sont écrites dans **une même transaction** (`backend/src/services/moodService.ts`) : soit les deux
  existent, soit aucune. Mais rien ne les relie : pas de clé étrangère, pas d'identifiant commun, `MoodEntry.id` est un
  UUID (pas d'ordre d'insertion lisible) et `MoodEntry.createdAt` est arrondi au jour (pas d'instant de saisie). Même
  un administrateur de la base ne retrouve pas la note d'une personne. Limite connue : SQLite garde un `rowid` interne
  par table ; Postgres (la cible Supabase) n'expose aucun ordre d'insertion, c'est la bonne base pour une mise en
  production.
- Sur un jour visible, une raison n'est affichée que si elle a été cochée **au moins deux fois** : avec trois réponses,
  une raison citée une seule fois désignerait quelqu'un.
- Le manager ne reçoit que des **agrégats** par jour (moyenne, nombre, raisons les plus citées), calculés dans
  `backend/src/services/teamStatsService.ts`, **pour sa propre équipe** (déduite du token, jamais de l'URL).
- **Seuil d'anonymat** (`MIN_RESPONSES`, 3 par défaut) : un jour avec moins de réponses est masqué (`hidden: true`,
  `avg: null`, aucune raison) et exclu de tous les calculs — KPI, précisions, et même du total entreprise de la vue
  RH (sinon il se déduirait par soustraction).
- Les réponses au questionnaire ne sont **jamais ventilées par jour** : seulement cumulées sur la période, à partir des
  jours visibles.
- **La journée en cours n'est jamais montrée** : si le manager voyait « aujourd'hui » passer de 3 à 4 réponses et la
  moyenne bouger, il pourrait déduire la note de la personne qui vient de répondre (attaque par différence). Les
  statistiques s'arrêtent donc au dernier jour clos.
- **Aucun historique de participation** : les `Submission` (« a répondu tel jour ») ne servent qu'à bloquer une
  deuxième saisie le jour même et sont purgées le lendemain. Les réponses anonymes sont supprimées après 13 mois
  (`DATA_RETENTION_DAYS`).
- Le seed de démo passe par le même service que l'API : les données de démo respectent les mêmes règles.

Le commentaire en tête de [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma) reprend tout ça pour la
soutenance ; les tests `backend/tests/` vérifient chaque garantie.

## Structure du repo

```
Moodly/
├── backend/                  # API Express — projet npm indépendant
│   ├── API.md                # contrat d'API (source de vérité)
│   ├── Dockerfile            # multi-stage : build TS puis image de run légère
│   ├── prisma/
│   │   ├── schema.prisma     # modèle + commentaire « anonymisation by design »
│   │   └── migrations/
│   ├── src/
│   │   ├── routes/ → controllers/ → services/ → Prisma
│   │   ├── middlewares/      # auth JWT, rôles, erreurs { error }
│   │   ├── lib/              # dates, erreurs, jwt
│   │   ├── config/env.ts     # .env validé par zod
│   │   └── seed.ts           # scénario de démo
│   └── tests/                # vitest + supertest (25 tests)
├── frontend/                 # app Expo (mobile + web) — projet npm indépendant
│   ├── Dockerfile.web        # export web statique + nginx
│   └── src/
│       ├── app/              # écrans (expo-router) : login, onboarding, employee, manager, hr, team/[teamId]
│       ├── api/              # SEULE couche qui parle HTTP ; types.ts reflète backend/API.md
│       ├── auth/             # session (token dans expo-secure-store), aiguillage par rôle
│       ├── components/       # UI stylée avec NativeWind (typographie, sections numérotées, graphe, stats…)
│       ├── lib/              # dates, règle d'applicabilité des questions
│       └── theme/palette.js  # couleurs (importées par tailwind.config.js)
├── DEMO.md                   # scénario de démonstration
├── EQUIPE.md                 # répartition technique de l'équipe
├── PRODUCTION.md             # déploiement, comptes, RGPD, sauvegardes, checklist
├── docker-compose.yml        # stack locale : api (+ volume SQLite) et web (export Expo + relais /api)
├── docker-compose.prod.yml   # production : Caddy (HTTPS) → web → api non exposée
├── deploy/Caddyfile          # HTTPS automatique + HSTS
├── ops/                      # demo-reset.sh, backup.sh
├── e2e/                      # tests de bout en bout Playwright (projet npm indépendant)
├── .github/workflows/ci.yml  # typecheck + lint + tests + build Docker
└── .github/pull_request_template.md
```

## Scripts, tests, CI

| Backend (`cd backend`) | Rôle                                                  |
| ---------------------- | ----------------------------------------------------- |
| `npm run dev`          | API en mode watch                                     |
| `npm run build` / `npm start` | compilation TypeScript / lancement de `dist/`  |
| `npm run db:migrate`   | `prisma migrate dev`                                  |
| `npm run db:seed`      | données de démo (refusé en production)                |
| `npm run users -- …`   | gestion des comptes : list, add, import, reset-password, unlock, update, remove |
| `npm test`             | vitest + supertest (base de test jetable `prisma/test.db`) |
| `npm run typecheck` / `npm run lint` / `npm run format` | qualité            |

| Frontend (`cd frontend`) | Rôle                                                |
| ------------------------ | --------------------------------------------------- |
| `npm start`              | serveur Expo (QR code pour Expo Go)                 |
| `npm run web`            | app web en développement                            |
| `npm run build:web`      | export statique dans `dist/`                        |
| `npm test`               | jest-expo (client réseau, règles du questionnaire, dates, aiguillage, composant de saisie) |
| `npm run typecheck` / `npm run lint` | qualité                                 |

| Bout en bout (`cd e2e`)  | Rôle                                                |
| ------------------------ | --------------------------------------------------- |
| `npm test`               | Playwright contre la stack Docker locale (`PW_CHANNEL=chrome` pour utiliser Chrome installé) |

Les **78 tests backend** couvrent : seuil respecté, aucune donnée individuelle dans les réponses, journée en cours
jamais exposée, horodatage arrondi au jour, purge de rétention, un manager ne lit que sa propre équipe, **matrice
d'accès** (chaque route × chaque rôle), sessions révocables, verrouillage de compte, mot de passe provisoire, CLI des
comptes, 409 en double saisie, validation du questionnaire, KPI et alertes, précisions, actions, vue direction,
bilan hebdomadaire (semaine en cours jamais exposée), demandes (routage manager / RH, signalement anonyme sans
auteur, code de suivi, 404 hors destinataires), rendez-vous (qui propose, qui répond, remplacement, annulation,
interdits pour un signalement anonyme, invisibles du manager quand ils concernent les RH), agenda par rôle. Ils
tournent sur SQLite par défaut et sur Postgres avec `npm run test:pg` (validés sur Postgres 17, en local et en CI).

Les **36 tests frontend** couvrent le client réseau (délai, nouvel essai des lectures seulement, sessions expirées),
l'aiguillage, les règles du questionnaire, les semaines, l'historique local, les codes de suivi, les fichiers
d'agenda (format, échappement, repli des lignes, rappels répétés, titres neutres) et les composants.
Les **18 tests de bout en bout** jouent les vrais parcours dans un navigateur : saisie, bilan de la semaine et suivi,
alerte et action du manager reçue par l'équipe, demande d'action et réponse, signalement anonyme, signalement aux RH
invisible du manager, conseils, rendez-vous proposé puis accepté et ajouté à l'agenda (contenu du fichier vérifié),
point d'équipe daté, rappels sans aucun appel au serveur, demandes en attente signalées aux RH, vue direction, mot de
passe provisoire, déconnexion côté serveur, confidentialité, en-têtes de sécurité, aucune erreur console.

La CI GitHub Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) lance tout cela sur chaque PR, plus
l'export web et le build des deux images Docker.

## Postgres / Supabase

SQLite reste la base par défaut : rien à installer, tests en une commande. La variante Postgres est prête et testée :

- `backend/prisma/postgres/schema.prisma` est **généré** depuis le schéma SQLite (`npm run pg:schema` après toute
  modification du schéma ; un test échoue si on l'oublie) ;
- `backend/prisma/postgres/migrations/` contient les migrations Postgres, dont l'activation de la **sécurité au
  niveau des lignes** sur chaque table : l'API REST publique de Supabase ne peut ni lire ni écrire quoi que ce soit,
  seule l'API Moodly accède aux données ;
- `npm run test:pg` lance **les 78 tests** sur un Postgres (`TEST_DATABASE_URL=postgresql://…`), validés sur
  Postgres 17 (la version de Supabase) en local et dans la CI.

### Brancher le projet Supabase « moodly »

Projet créé dans l'organisation Finarios, région Paris (`eu-west-3`, données dans l'UE). **Déjà installé** : les
migrations sont appliquées et les données de démo chargées.

- L'API s'y connecte avec un **compte dédié `moodly_app`** (pas le compte administrateur `postgres`) : il possède ses
  tables dans `public` et n'a aucun autre droit (ni super-utilisateur, ni création de rôles, ni contournement de la
  sécurité au niveau des lignes). Son mot de passe a été généré sur la machine ; Supabase n'en a reçu que l'empreinte
  SCRAM.
- Vérifié : avec la clé publique du projet, l'API REST de Supabase répond `401` sur toutes les tables, en lecture
  comme en écriture. L'audit de sécurité Supabase ne signale que « RLS sans politique » (voulu : personne d'autre que
  l'API Moodly).

```bash
cd backend                               # .env.supabase doit exister (voir ci-dessous)
npm run pg:generate                      # client Prisma pour Postgres
npm run pg:dev                           # l'API locale (port de .env), branchée sur Supabase
npm run pg:studio                        # parcourir les tables
npm run pg:migrate                       # appliquer une nouvelle migration Postgres
npm run pg:seed                          # recharger les données de démo (vide la base !)
npm run db:generate                      # revenir à SQLite
```

`.env.supabase` (ignoré par git) contient la chaîne de connexion de `moodly_app` : ne la partagez que par un canal
sûr. Pour un nouveau poste, soit on transmet ce fichier, soit on change le mot de passe du rôle depuis Supabase
(*SQL Editor* : `ALTER ROLE moodly_app PASSWORD '…'`) et chacun met à jour son fichier.
Modèle : [`backend/.env.supabase.example`](backend/.env.supabase.example).

En production (Docker) : `PRISMA_SCHEMA=prisma/postgres/schema.prisma` au build (voir `docker-compose.prod.yml`) et
`DATABASE_URL` vers Supabase dans `backend/.env.production` ; les migrations s'appliquent au démarrage.

## Dépannage

- **Le téléphone n'atteint pas l'API** : même Wi-Fi ? IP LAN correcte dans `frontend/.env` et `npm start` relancé ?
  Pare-feu qui bloque le port 4000 ? Testez `http://<IP>:4000/health` depuis le navigateur du téléphone.
- **Port 4000 déjà utilisé** : changez `PORT` dans `backend/.env` (sans Docker) ou `API_PORT=… docker compose up`
  (avec Docker), et l'URL côté frontend.
- **« Humeur déjà saisie aujourd'hui »** : une seule saisie par jour et par compte ; utilisez un autre compte employé
  ou relancez le seed.
- **Les données de démo sont périmées** (le scénario est calé sur « aujourd'hui ») : `./ops/demo-reset.sh`, il se
  recale automatiquement.
- **« Trop de tentatives pour ce compte »** : 5 mots de passe faux verrouillent le compte 15 minutes ;
  `npm run users -- unlock --email …` pour le débloquer.
- **« Session expirée, reconnectez-vous »** : la session a été fermée (déconnexion sur un autre appareil, changement
  de mot de passe) ou a plus de 7 jours.
