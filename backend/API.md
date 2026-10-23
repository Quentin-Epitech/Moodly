# Contrat d'API Moodly

Ce document est la **source de vérité** du contrat entre le backend et l'app mobile.
Le frontend le reflète dans `frontend/src/api/types.ts` : toute modification ici se reporte là-bas.

Base URL : `http://<hôte>:4000` (port configurable via `PORT`). Tout est en JSON.

## Conventions

- **Authentification** : `Authorization: Bearer <token>` sur toutes les routes sauf `GET /health`, `GET /ready` et
  `POST /auth/login`. Le token est un JWT (HS256, secret `JWT_SECRET`, expiration 7 jours, pas de refresh token) qui
  porte l'identifiant de l'utilisateur et une **version de session** ; le rôle et l'équipe sont relus en base à chaque
  requête. Déconnexion, changement ou réinitialisation du mot de passe, changement d'équipe ou de rôle incrémentent la
  version : tous les tokens émis avant sont refusés (`401`).
- **Mot de passe provisoire** : un compte créé ou réinitialisé par la CLI a `mustChangePassword: true`. Tant qu'il ne
  l'a pas changé (`POST /me/password`), seules `GET /me`, `POST /me/password` et `POST /auth/logout` répondent ; tout le
  reste renvoie `403`.
- **Rôles** : `EMPLOYEE` (saisit son humeur), `MANAGER` (agrégats de sa propre équipe, publie des actions),
  `HR` (vue direction : agrégats de toutes les équipes). L'équipe d'un manager ou d'un employé est **toujours déduite
  du token**, jamais d'un paramètre d'URL.
- **Jours** : chaînes `"YYYY-MM-DD"` dans le fuseau du serveur (`TIMEZONE`, `Europe/Paris` par défaut).
- **Erreurs** : `{ "error": "message" }` avec le code HTTP adapté :
  `400` corps ou paramètre invalide · `401` token manquant/invalide ou identifiants incorrects ·
  `403` rôle insuffisant ou mot de passe provisoire à changer · `404` ressource introuvable · `409` humeur déjà saisie
  aujourd'hui · `413` corps trop gros · `429` trop de tentatives de connexion (`LOGIN_RATE_LIMIT`, 20 par quart d'heure et par IP, ou
  compte verrouillé 15 minutes après 5 échecs).
- **Jours clos** : les statistiques (manager, direction) s'arrêtent **hier**. La journée en cours n'est jamais
  exposée : voir « aujourd'hui » passer de 3 à 4 réponses permettrait de déduire la note de la dernière personne
  (attaque par différence).
- **Seuil d'anonymat** (`MIN_RESPONSES`, 3 par défaut) : un jour avec moins de réponses est *masqué* —
  `hidden: true`, `avg: null`, `topTags: []` — et **exclu de tous les agrégats** (KPI, précisions, totaux entreprise).
  Seul son `count` est renvoyé : c'est une information de participation, pas d'humeur.
- **Raisons d'un jour** : sur un jour visible, une raison n'apparaît dans `topTags` que si elle a été cochée **au moins
  deux fois** (une mention unique désignerait une personne). Les agrégats sur plusieurs jours (`summary.topTags`,
  `alert.drivers`) comptent toutes les mentions.
- **Sécurité** : en-têtes `helmet`, corps JSON limité à 50 ko, CORS configurable (`CORS_ORIGIN`).

## Vue d'ensemble

| Méthode  | Route                          | Rôle                | Description                                        |
| -------- | ------------------------------ | ------------------- | -------------------------------------------------- |
| `GET`    | `/health`                      | public              | Liveness                                           |
| `GET`    | `/ready`                       | public              | Readiness (la base répond)                         |
| `POST`   | `/auth/login`                  | public              | Connexion                                          |
| `POST`   | `/auth/logout`                 | tous ¹              | Ferme toutes les sessions de l'utilisateur         |
| `GET`    | `/me`                          | tous ¹              | Profil de l'utilisateur connecté                   |
| `POST`   | `/me/password`                 | tous ¹              | Change le mot de passe, renvoie une nouvelle session |
| `GET`    | `/tags`                        | tous                | Raisons proposées (6)                              |
| `GET`    | `/questions`                   | tous                | Questionnaire adaptatif                            |
| `GET`    | `/moods/today`                 | `EMPLOYEE`          | A-t-on déjà répondu aujourd'hui ?                  |
| `POST`   | `/moods`                       | `EMPLOYEE`          | Saisie du jour                                     |
| `GET`    | `/checkins/week`               | `EMPLOYEE`          | Bilan de la semaine déjà fait ?                    |
| `POST`   | `/checkins`                    | `EMPLOYEE`          | Bilan de la semaine (note, charge, stress)         |
| `GET`    | `/cases/types`                 | `EMPLOYEE`          | Types de demandes et règles de routage             |
| `GET`    | `/cases`                       | tous                | Mes demandes (employé) / demandes reçues (manager, RH) |
| `GET`    | `/cases/unread`                | tous                | Nombre de demandes avec une réponse non lue        |
| `POST`   | `/cases`                       | `EMPLOYEE`          | Nouvelle demande ou signalement                    |
| `POST`   | `/cases/lookup`                | `EMPLOYEE`          | Signalements anonymes retrouvés par code de suivi  |
| `GET`    | `/cases/:id`                   | demandeur ou destinataire | Fil de messages (marque comme lu)            |
| `POST`   | `/cases/:id/messages`          | demandeur ou destinataire | Répondre                                     |
| `POST`   | `/cases/:id/status`            | `MANAGER` `HR` (destinataire) | Changer le statut                        |
| `POST`   | `/cases/:id/meetings`          | demandeur ou destinataire | Proposer un rendez-vous (demande nominative) |
| `POST`   | `/meetings/:id/respond`        | l'autre côté        | Accepter ou refuser une proposition                |
| `POST`   | `/meetings/:id/cancel`         | demandeur ou destinataire | Retirer sa proposition / annuler un rendez-vous |
| `GET`    | `/agenda`                      | tous                | Prochains rendez-vous (demandes + points d'équipe) |
| `GET`    | `/teams/me/moods?days=30`      | `MANAGER`           | Courbe + KPI + alerte de son équipe                |
| `GET`    | `/teams/me/insights?days=30`   | `MANAGER`           | Réponses au questionnaire, cumulées                |
| `GET`    | `/teams/me/weekly?weeks=12`    | `EMPLOYEE` `MANAGER`| Bilans hebdomadaires agrégés de son équipe         |
| `GET`    | `/teams/me/actions`            | `EMPLOYEE` `MANAGER`| Actions publiées pour l'équipe                     |
| `POST`   | `/teams/me/actions`            | `MANAGER`           | Publier une action                                 |
| `DELETE` | `/teams/me/actions/:id`        | `MANAGER`           | Supprimer une action de son équipe                 |
| `GET`    | `/teams/overview?days=30`      | `HR`                | Toutes les équipes + total entreprise              |
| `GET`    | `/teams/:teamId/moods`         | `HR`                | Comme `/teams/me/moods` pour une équipe donnée     |
| `GET`    | `/teams/:teamId/insights`      | `HR`                | Comme `/teams/me/insights`                         |
| `GET`    | `/teams/:teamId/weekly`        | `HR`                | Comme `/teams/me/weekly`                           |
| `GET`    | `/teams/:teamId/actions`       | `HR`                | Comme `/teams/me/actions`                          |

¹ accessibles aussi avec un mot de passe provisoire. Une matrice de tests (`tests/accessMatrix.test.ts`) vérifie chaque
route avec chaque rôle.

## Détail des endpoints

### `GET /health`

```json
{ "ok": true }
```

### `GET /ready`

`{ "ok": true }` si la base répond, sinon `503 { "error": "Base de données injoignable" }`.

### `POST /auth/login`

```json
// requête
{ "email": "alice@moodly.app", "password": "password123" }
// 200
{
  "token": "eyJ…",
  "user": {
    "id": 2, "email": "alice@moodly.app", "role": "EMPLOYEE", "teamName": "Produit",
    "anonymityThreshold": 3, "mustChangePassword": false
  }
}
// 401 — même réponse (et même temps de réponse) pour un email inconnu
{ "error": "Email ou mot de passe incorrect" }
// 429 — compte verrouillé (5 échecs consécutifs, 15 minutes)
{ "error": "Trop de tentatives pour ce compte, réessayez dans quelques minutes" }
```

`anonymityThreshold` est la valeur de `MIN_RESPONSES`, pour que l'app affiche le vrai seuil (onboarding).

### `POST /auth/logout`

`204`. Toutes les sessions de l'utilisateur (tous appareils) sont fermées.

### `GET /me`

Même objet `user` que le login.

### `POST /me/password`

```json
// requête
{ "currentPassword": "…", "newPassword": "au moins 10 caractères" }
// 200 — nouvelle session ; les autres sessions sont fermées, mustChangePassword passe à false
{ "token": "eyJ…", "user": { … } }
// 400 — mot de passe actuel incorrect, nouveau trop court ou identique
```

### `GET /tags`

```json
[{ "id": 1, "label": "Charge de travail" }, { "id": 2, "label": "Ambiance d'équipe" }, …]
```

### `GET /questions`

Le questionnaire adaptatif. Une question est **posée** (et acceptée par `POST /moods`) seulement si ses conditions
sont remplies : `tagId` (raison cochée) et/ou `minScore` / `maxScore` (bornes inclusives sur la note).
`null` = pas de condition. L'app et l'API appliquent la même règle.

```json
[
  {
    "id": 1, "key": "since_when", "label": "Depuis quand ça ne va pas ?",
    "kind": "single", "tagId": null, "minScore": null, "maxScore": 2,
    "options": [{ "id": 1, "label": "Juste aujourd'hui" }, { "id": 2, "label": "Depuis quelques jours" }, …]
  },
  {
    "id": 2, "key": "workload", "label": "Côté charge de travail, qu'est-ce qui pèse le plus ?",
    "kind": "multi", "tagId": 1, "minScore": null, "maxScore": null,
    "options": [{ "id": 4, "label": "Trop de tâches en parallèle" }, …]
  }
]
```

`kind` : `single` (une seule option) ou `multi` (plusieurs options, l'app en limite le nombre à 3).

### `GET /moods/today` — `EMPLOYEE`

```json
{ "submitted": false }
```

### `POST /moods` — `EMPLOYEE`

```json
// requête
{
  "score": 2,
  "tagIds": [1, 5],
  "answers": [
    { "questionId": 1, "optionIds": [2] },
    { "questionId": 2, "optionIds": [4, 5] }
  ]
}
// 201
{ "submitted": true }
```

- `score` : entier de 1 à 5 · `tagIds` : 0 à 3 identifiants de `/tags` · `answers` : facultatif.
- Validation (→ `400`) : tag inconnu, question inconnue ou non applicable à cette saisie, option étrangère à la
  question, plusieurs options pour une question `single`.
- `409` si l'utilisateur a déjà répondu aujourd'hui. La date est celle du serveur, jamais celle du client.
- Côté stockage : `Submission(userId, date)` et `MoodEntry(teamId, date, score, tags, answers)` sont écrites dans une
  même transaction, **sans aucun lien entre elles** (voir `prisma/schema.prisma`). `MoodEntry.createdAt` est arrondi
  au jour : l'instant exact de la saisie n'est jamais stocké.

### `GET /teams/me/moods?days=30` — `MANAGER` (et `GET /teams/:teamId/moods` — `HR`)

`days` : 1 à 90, défaut 30. Les `days` derniers jours **clos** sont toujours renvoyés, du plus ancien à **hier**, y
compris sans réponse (`count: 0, hidden: true`).

```json
{
  "teamId": 1,
  "teamName": "Produit",
  "threshold": 3,
  "days": [
    { "date": "2026-09-13", "avg": 3.75, "count": 4, "hidden": false,
      "topTags": [{ "label": "Sens du travail", "count": 2 }] },
    { "date": "2026-09-14", "avg": null, "count": 2, "hidden": true, "topTags": [] },
    …
  ],
  "summary": {
    "teamSize": 8,
    "responses": 173,
    "participation": 0.72,
    "avg7": 3.3,
    "avgPrev7": 2.68,
    "trend": "up",
    "distribution": [{ "score": 1, "count": 9 }, { "score": 2, "count": 31 }, …, { "score": 5, "count": 20 }],
    "topTags": [{ "label": "Charge de travail", "count": 61 }, …],
    "alert": { "level": "none", "message": "Moral correct cette semaine : 3,3 / 5 contre 2,7 la semaine précédente.", "drivers": [ … ] }
  }
}
```

`summary` (tout est calculé **sur les jours visibles uniquement**, sauf `responses` et `participation`) :

| Champ           | Signification                                                                                 |
| --------------- | --------------------------------------------------------------------------------------------- |
| `teamSize`      | Nombre d'employés de l'équipe                                                                 |
| `responses`     | Réponses sur la période, tous jours confondus                                                 |
| `participation` | `responses / (days × teamSize)`, entre 0 et 1                                                 |
| `avg7`          | Moyenne des notes des 7 derniers jours visibles, `null` s'il n'y en a aucun                   |
| `avgPrev7`      | Idem pour les 7 jours précédents                                                              |
| `trend`         | `up` / `down` si l'écart `avg7 − avgPrev7` dépasse ±0,3, sinon `flat` ; `null` sans comparaison |
| `distribution`  | Nombre de notes 1, 2, 3, 4, 5                                                                 |
| `topTags`       | Jusqu'à 5 raisons les plus citées                                                             |
| `alert`         | Voir ci-dessous                                                                                |

**Règles d'alerte** (`alert.level`), évaluées sur `avg7` et la baisse `avgPrev7 − avg7` :

| Niveau  | Condition                                          |
| ------- | -------------------------------------------------- |
| `alert` | baisse ≥ 0,8 **ou** `avg7` < 2,8                   |
| `watch` | baisse ≥ 0,4 **ou** `avg7` < 3,2                   |
| `none`  | sinon (ou pas assez de réponses cette semaine)     |

`alert.drivers` : les 3 raisons les plus citées sur les 7 derniers jours visibles. `alert.message` est une phrase prête
à afficher.

### `GET /teams/me/insights?days=30` — `MANAGER` (et `GET /teams/:teamId/insights` — `HR`)

Réponses au questionnaire **cumulées sur la période**, jamais ventilées par jour, en ne comptant que les réponses des
jours au-dessus du seuil.

```json
{
  "teamId": 4, "teamName": "Logistique", "threshold": 3, "days": 30,
  "basedOnDays": 30,
  "responses": 126,
  "questions": [
    {
      "id": 4, "key": "management", "label": "Côté management ?", "kind": "multi",
      "responses": 22,
      "options": [
        { "id": 20, "label": "Objectifs flous", "count": 14, "ratio": 0.64 },
        { "id": 19, "label": "Manque de reconnaissance", "count": 11, "ratio": 0.5 },
        …
      ]
    }
  ]
}
```

`responses` d'une question = nombre de saisies ayant répondu à cette question ; `ratio = count / responses`.
Les options sont triées par `count` décroissant. Toutes les questions sont renvoyées (avec des zéros si personne n'a répondu).

### `GET /teams/me/actions` — `EMPLOYEE`, `MANAGER` (et `GET /teams/:teamId/actions` — `HR`)

Les 20 dernières actions de l'équipe, de la plus récente à la plus ancienne.

```json
[
  { "id": 5, "message": "Point d'équipe vendredi : bilan d'Atlas.", "createdAt": "2026-10-13T09:00:00.000Z",
    "event": { "startsAt": "2026-10-16T08:00:00.000Z", "durationMin": 45, "location": "Salle Atlas" } },
  { "id": 3, "message": "Les délais du projet Atlas sont décalés de deux semaines.", "createdAt": "2026-10-09T09:00:00.000Z",
    "event": null }
]
```

`event` : point d'équipe daté, que chacun peut ajouter à son agenda depuis l'app (`null` pour une simple action).

### `POST /teams/me/actions` — `MANAGER`

```json
// requête ; event est facultatif
{
  "message": "Point d'équipe jeudi pour expliquer les nouveaux objectifs.",
  "event": { "startsAt": "2026-10-15T12:00:00.000Z", "durationMin": 45, "location": "Salle de réunion" }
}
// 201
{ "id": 4, "message": "Point d'équipe jeudi pour expliquer les nouveaux objectifs.",
  "createdAt": "2026-10-12T10:41:12.000Z", "event": { "startsAt": "2026-10-15T12:00:00.000Z", "durationMin": 45, "location": "Salle de réunion" } }
```

`message` : 3 à 280 caractères (espaces de bord retirés). `event` : même créneau qu'un rendez-vous (voir plus bas).
`400` sinon.

### `DELETE /teams/me/actions/:id` — `MANAGER`

`204` sans corps. `404` si l'action n'existe pas **ou n'appartient pas à l'équipe du manager**.

### `GET /teams/overview?days=30` — `HR`

```json
{
  "threshold": 3,
  "days": 30,
  "dates": ["2026-09-13", …, "2026-10-12"],
  "company": {
    "teams": 4, "employees": 22, "responses": 447, "participation": 0.68,
    "avg7": 3.33, "avgPrev7": 3.29, "trend": "flat", "alerts": 1
  },
  "teams": [
    {
      "teamId": 4, "teamName": "Logistique", "teamSize": 6,
      "responses": 126, "participation": 0.7,
      "avg7": 2.38, "avgPrev7": 3.64, "trend": "down",
      "alert": { "level": "alert", "message": "Baisse nette du moral cette semaine : 2,4 / 5 contre 3,6 la semaine précédente.", "drivers": [ … ] },
      "visibleDays": 30, "hiddenDays": 0,
      "topTags": [{ "label": "Sens du travail", "count": 44 }, …],
      "series": [3.75, null, 4.17, …]
    }
  ]
}
```

- Les équipes sans employé (ex. « Direction ») ne sont pas listées.
- `series` : moyenne par jour alignée sur `dates`, `null` pour un jour masqué.
- **Le total `company` n'inclut que les jours visibles de chaque équipe** : sinon un jour masqué pourrait se déduire
  par soustraction à partir des autres équipes.

### `GET /checkins/week` — `EMPLOYEE`

```json
{ "week": "2026-10-12", "submitted": false }
```

`week` est le lundi de la semaine en cours (fuseau `TIMEZONE`).

### `POST /checkins` — `EMPLOYEE`

```json
// requête : trois notes de 1 à 5
{ "score": 3, "workload": 4, "stress": 4 }
// 201
{ "submitted": true }
```

- `score` : comment s'est passée la semaine (1 très difficile → 5 très bonne) · `workload` : charge ressentie
  (1 très légère → 5 très lourde) · `stress` : stress ressenti (1 aucun → 5 très élevé).
- `409` si le bilan de la semaine est déjà fait. Même séparation que l'humeur : `WeeklySubmission(userId, week)` et
  `WeeklyCheckin(teamId, week, score, workload, stress)` sans lien, **sans aucun horodatage** sur le bilan.

### `GET /teams/me/weekly?weeks=12` — `EMPLOYEE`, `MANAGER` (et `GET /teams/:teamId/weekly` — `HR`)

`weeks` : 1 à 26, défaut 12. Semaines **closes** uniquement (la semaine en cours n'est jamais exposée).

```json
{
  "teamId": 4, "teamName": "Logistique", "threshold": 3,
  "weeks": [
    { "week": "2026-09-28", "count": 2, "hidden": true, "avgScore": null, "avgWorkload": null, "avgStress": null },
    { "week": "2026-10-05", "count": 5, "hidden": false, "avgScore": 2.4, "avgWorkload": 3.8, "avgStress": 4.2 }
  ],
  "alert": { "level": "alert", "message": "Semaine dernière très chargée : stress 4,2 / 5, charge 3,8 / 5." }
}
```

Alerte sur la dernière semaine close : `alert` si stress ou charge ≥ 4, `watch` si ≥ 3,5. La vue direction
(`/teams/overview`) ajoute à chaque équipe `weekly: { stats, alert }` et compte une équipe en alerte si son moral **ou**
son bilan l'est.

### Demandes et signalements — `/cases`

Canal **nominatif** (sauf option anonyme), entièrement séparé des humeurs et des bilans. Routage :

| `type` | Destinataire | Anonyme possible |
| --- | --- | --- |
| `ACTION_REQUEST` (demande d'action : alléger ma charge, priorités, délais…) | managers de l'équipe | non |
| `COLLEAGUE_ISSUE` (problème avec un collègue) | managers de l'équipe | oui |
| `MANAGER_ISSUE` (problème avec mon manager) | RH — **jamais visible du manager** | oui |
| `CONTACT` (échanger avec quelqu'un) | au choix : `recipient: "MANAGER"` ou `"HR"` | non |

```json
// POST /cases
{
  "type": "COLLEAGUE_ISSUE", "category": "Tension ou conflit",
  "subject": "Ambiance tendue en réunion", "message": "Les réunions du lundi tournent au conflit.",
  "anonymous": true
}
// 201 — accessToken n'est renvoyé qu'une fois, et seulement pour une demande anonyme
{ "case": { …CaseDetail… }, "accessToken": "K7QM-2HXP-…" }
```

- `subject` 3 à 120 caractères, `message` 10 à 2 000, `category` parmi celles de `GET /cases/types`.
- Demande anonyme : aucun auteur stocké, seule l'empreinte SHA-256 du code de suivi est gardée, heures arrondies.
  Le demandeur y accède avec l'en-tête `X-Case-Token: <code>` (jamais dans l'URL) ou `POST /cases/lookup
  { "tokens": [...] }`.
- Accès : le demandeur (auteur ou code de suivi) et le destinataire. Pour tous les autres, `404` (on ne révèle pas
  qu'une demande existe).
- `CaseSummary` : `id`, `type`, `typeLabel`, `category`, `subject`, `recipient`, `recipientLabel`, `status`
  (`OPEN`, `IN_PROGRESS`, `RESOLVED`), `anonymous`, `teamName`, `requester` (email, seulement pour le destinataire
  d'une demande nominative), `viewer` (`REQUESTER` ou `HANDLER`), `unread`, `createdAt`, `lastMessageAt`.
  `CaseDetail` y ajoute `messages: [{ id, sender, authorLabel, mine, body, createdAt }]`.
- Une réponse du destinataire passe la demande en `IN_PROGRESS` ; une réponse du demandeur rouvre une demande
  résolue. `POST /cases/:id/status { "status": "RESOLVED" }` est réservé au destinataire.
- Conservation : une demande résolue est supprimée `CASE_RETENTION_DAYS` jours après sa résolution (365 par défaut).
- Chaque message a un `kind` : `TEXT`, ou `MEETING_PROPOSED` / `MEETING_ACCEPTED` / `MEETING_DECLINED` /
  `MEETING_CANCELLED` pour les étapes d'un rendez-vous (un `MEETING_PROPOSED` porte le rendez-vous dans son état
  actuel : `meeting`).

### Rendez-vous — `/cases/:id/meetings`, `/meetings/:id/*`

Dans une demande **nominative**, le demandeur ou le destinataire propose un créneau ; l'autre accepte ou refuse.
Pour un signalement anonyme : `400` (se rencontrer révélerait l'auteur).

```json
// POST /cases/:id/meetings — créneau (aussi utilisé par event des actions d'équipe)
{ "startsAt": "2026-10-20T08:00:00.000Z", "durationMin": 45, "location": "Bureau RH, 2e étage" }
// 201 : la demande à jour ; le dernier message est la proposition
{ "kind": "MEETING_PROPOSED", "body": "Rendez-vous proposé : mardi 20 octobre à 10:00 (45 min) · Bureau RH, 2e étage",
  "meeting": { "id": 2, "startsAt": "2026-10-20T08:00:00.000Z", "durationMin": 45, "location": "Bureau RH, 2e étage",
               "status": "PROPOSED", "proposedBy": "HANDLER", "canRespond": false, "canCancel": true } }

// POST /meetings/:id/respond
{ "response": "ACCEPT" }   // ou "DECLINE"
```

- `startsAt` : à venir (au moins 5 minutes) et dans les 120 jours ; `durationMin` : 15, 30, 45, 60 ou 90 ;
  `location` : 2 à 80 caractères. `400` sinon.
- Une nouvelle proposition remplace celle qui attend encore une réponse (`CANCELLED`).
- `respond` : seulement l'autre côté (`403` pour le proposant), une seule fois (`409`), avant le créneau (`409`).
- `cancel` : le proposant retire sa proposition, ou l'un des deux annule un rendez-vous accepté. `409` sinon.
- Accès : celui de la demande. Pour tous les autres, `404`.

### `GET /agenda` — tous

Prochains rendez-vous de l'utilisateur, triés par date (20 au plus) : rendez-vous `PROPOSED` ou `ACCEPTED` de ses
demandes (celles qu'il a déposées, ou qu'il traite), et points d'équipe datés de son équipe (pas pour les RH).

```json
[
  { "kind": "MEETING", "id": 1, "caseId": 61, "subject": "Trop de sujets en parallèle depuis Atlas",
    "withLabel": "Manager de l'équipe", "recipient": "MANAGER", "viewer": "REQUESTER",
    "startsAt": "2026-10-15T12:00:00.000Z", "durationMin": 30, "location": "Bureau du manager",
    "status": "ACCEPTED", "proposedBy": "HANDLER", "canRespond": false, "canCancel": true },
  { "kind": "TEAM_EVENT", "id": 5, "title": "Point d'équipe vendredi : bilan d'Atlas.", "teamName": "Produit",
    "startsAt": "2026-10-16T08:00:00.000Z", "durationMin": 45, "location": "Salle Atlas" }
]
```

L'ajout à l'agenda se fait **dans l'app** : elle génère un fichier `.ics` sur l'appareil (aucun appel à Google ou
Microsoft), avec un titre neutre (« Point avec les RH », « Point avec mon manager ») qui ne révèle jamais l'objet de
la demande.

## Ce que l'API ne renvoie jamais

- une note individuelle, un identifiant d'utilisateur ou un email dans les agrégats ;
- la journée ou la semaine en cours dans une statistique ;
- l'auteur d'un signalement anonyme, ou un signalement concernant un manager à ce manager ;
- un rendez-vous lié à un signalement anonyme (il n'en existe pas) ou à une demande adressée aux RH, au manager ;
- une moyenne, des raisons ou des précisions pour un jour sous le seuil ;
- des précisions (réponses au questionnaire) ventilées par jour ;
- les données d'une autre équipe à un manager (`/teams/:teamId/*` est réservé au rôle `HR`).

Ces garanties sont couvertes par les tests (`backend/tests/`).
