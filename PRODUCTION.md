# Mise en production

Ce document décrit comment exploiter Moodly pour une vraie entreprise : déploiement, comptes, données personnelles,
sauvegardes, mises à jour et limites connues. La stack de production (`docker-compose.prod.yml`) a été testée de bout en
bout : HTTPS, API non exposée, création de compte par la CLI, connexion, journaux.

## Architecture

```
Internet ──HTTPS──▶ Caddy ──▶ nginx (app web + relais /api) ──▶ API Express ──▶ SQLite (volume) ou Postgres
           :443     certificat Let's Encrypt,   en-têtes CSP,          non exposée,        sauvegardes
                    HSTS                         X-Frame-Options…       journaux JSON       quotidiennes
```

- L'app web et l'API partagent la même origine (`https://domaine/` et `https://domaine/api/…`) : pas de CORS.
- Les apps mobiles appellent `https://domaine/api` (URL fixée au build, voir [Apps mobiles](#apps-mobiles)).
- Seuls les ports 80 (redirection) et 443 sont publiés.

## Déployer

Prérequis : une VM Linux avec Docker (2 Go de RAM suffisent), un nom de domaine dont l'enregistrement DNS pointe
vers la VM, les ports 80 et 443 ouverts.

```bash
git clone <dépôt> moodly && cd moodly
cp backend/.env.production.example backend/.env.production
# Renseigner JWT_SECRET (l'API refuse de démarrer sans secret fort) :
sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$(openssl rand -hex 32)/" backend/.env.production

DOMAIN=moodly.mon-entreprise.fr docker compose -f docker-compose.prod.yml up --build -d
curl https://moodly.mon-entreprise.fr/api/ready      # → {"ok":true}
```

Au démarrage, l'API applique les migrations (`prisma migrate deploy`), puis purge les données expirées (puis toutes
les heures). En production elle **refuse de démarrer** si `JWT_SECRET` fait moins de 32 caractères ou si
`CORS_ORIGIN` vaut `*`, et **refuse le seed de démo** (qui vide la base).

### Variables (`backend/.env.production`)

| Variable | Défaut | Rôle |
| --- | --- | --- |
| `JWT_SECRET` | — | Obligatoire, ≥ 32 caractères aléatoires |
| `DATABASE_URL` | `file:/data/moodly.db` | SQLite sur le volume, ou `postgresql://…` |
| `MIN_RESPONSES` | `3` | Seuil d'anonymat par jour |
| `DATA_RETENTION_DAYS` | `395` | Conservation des réponses anonymes, bilans et actions (13 mois) |
| `CASE_RETENTION_DAYS` | `365` | Conservation d'une demande après sa résolution |
| `TIMEZONE` | `Europe/Paris` | Détermine « aujourd'hui » |
| `TRUST_PROXY` | `2` | Nombre de proxys devant l'API (Caddy + nginx) |
| `CORS_ORIGIN` | vide | Vide = CORS désactivé (même origine) |
| `LOG_LEVEL` | `info` | Niveau des journaux |
| `LOGIN_RATE_LIMIT` | `20` | Tentatives de connexion par quart d'heure et par IP |

## Comptes

Il n'y a ni inscription ni écran d'admin : l'exploitant crée les comptes à partir de la liste RH, avec la CLI.

```bash
api() { docker compose -f docker-compose.prod.yml exec api node dist/cli/users.js "$@"; }

api import /data/comptes.csv          # en-tête : email,team,role (EMPLOYEE, MANAGER, HR)
api add --email jeanne@acme.fr --team Produit --role EMPLOYEE
api list --team Produit
api reset-password --email jeanne@acme.fr    # mot de passe oublié
api unlock --email jeanne@acme.fr            # compte verrouillé après 5 échecs
api update --email jeanne@acme.fr --team Support --role MANAGER
api remove --email jeanne@acme.fr --yes      # départ de l'entreprise
```

Pour importer un fichier, copiez-le d'abord dans le conteneur :
`docker compose -f docker-compose.prod.yml cp comptes.csv api:/data/comptes.csv`.

Les mots de passe provisoires s'affichent une seule fois : transmettez-les par un canal sûr (remise en main propre,
messagerie interne chiffrée), jamais par email en clair avec l'identifiant. À la première connexion, l'app impose d'en
choisir un nouveau (10 caractères minimum) ; tant que ce n'est pas fait, l'API refuse tout le reste (403).

Sécurité des sessions : un token dure 7 jours (pas de refresh token). La déconnexion, le changement de mot de passe,
la réinitialisation et le changement d'équipe ou de rôle ferment toutes les sessions ouvertes. 5 échecs de connexion
verrouillent le compte 15 minutes ; 20 tentatives par quart d'heure et par IP sont acceptées au maximum.

## Données personnelles (RGPD)

| Donnée | Lien avec la personne | Conservation |
| --- | --- | --- |
| Compte (email, équipe, rôle, mot de passe haché) | Oui | Jusqu'à la suppression du compte |
| `Submission` (« a répondu tel jour ») | Oui | Jusqu'au lendemain (purge horaire) : aucun historique de participation |
| Réponses (note, raisons, précisions) | **Non** (équipe + jour) | `DATA_RETENTION_DAYS` (13 mois), puis suppression |
| Actions d'équipe | Non | `DATA_RETENTION_DAYS` |
| `WeeklySubmission` (« a fait son bilan telle semaine ») | Oui | Jusqu'à la semaine suivante |
| Bilans hebdomadaires (note, charge, stress) | **Non** (équipe + semaine, sans horodatage) | `DATA_RETENTION_DAYS` |
| Demandes et messages | Oui (sauf signalement anonyme) | `CASE_RETENTION_DAYS` (1 an) après résolution |
| Rendez-vous (date, durée, lieu) | Oui, via la demande nominative | Supprimés avec la demande |
| Points d'équipe datés | Non (équipe) | `DATA_RETENTION_DAYS`, comme les actions |
| Suivi personnel de l'employé | Sur son appareil uniquement | Jusqu'à ce qu'il l'efface ou change d'appareil |
| Fichiers d'agenda (`.ics`) et rappels | Générés sur l'appareil, jamais envoyés | Dans l'agenda de la personne |
| Journaux | Identifiant de requête, route, code ; jamais de corps ni de token | Rotation Docker (5 × 10 Mo) |

- Les managers et la direction ne voient que des agrégats de **jours clos** (jusqu'à hier) avec au moins
  `MIN_RESPONSES` réponses ; une raison n'est affichée sur un jour que si elle est citée au moins deux fois.
- La page **Confidentialité** de l'app (accessible sans compte) informe les salariés de tout ce qui précède.
- Droit à l'effacement : `users remove` supprime le compte et ses `Submission` ; les réponses anonymes ne sont plus
  rattachables à la personne et restent dans les statistiques. Ses demandes nominatives restent consultables par
  leur destinataire, sans auteur.
- **Demandes et signalements** : ce sont des données nominatives (sauf anonymat choisi) qui peuvent concerner des
  situations graves (harcèlement). L'entreprise doit définir qui les traite, en combien de temps, et rappeler les
  autres canaux (référent harcèlement, CSE, médecine du travail), que la page Conseils mentionne. Le texte libre peut
  identifier son auteur même en mode anonyme : l'app le dit à l'employé au moment de l'envoi.

À faire par l'entreprise avant le déploiement (en France) : inscription au registre des traitements, analyse
d'impact (AIPD) recommandée pour un outil de mesure du bien-être au travail, information-consultation du CSE,
information individuelle des salariés (la page Confidentialité peut servir de base), désignation d'un contact
(DPO ou RH) à indiquer aux salariés.

## Sauvegardes

```bash
./ops/backup.sh            # sauvegarde à chaud de SQLite dans ./backups, garde les 14 dernières
# crontab -e  →  15 3 * * *  cd /srv/moodly && ./ops/backup.sh >> backups/backup.log 2>&1
```

Restaurer : arrêter l'API, remplacer le fichier de base dans le volume, redémarrer.

```bash
docker compose -f docker-compose.prod.yml stop api
docker run --rm --volumes-from "$(docker compose -f docker-compose.prod.yml ps -aq api)" \
  -v "$PWD/backups:/backups" alpine:3.20 cp /backups/moodly-AAAA-MM-JJ-HHMMSS.db /data/moodly.db
docker compose -f docker-compose.prod.yml start api
```

Copiez aussi les sauvegardes hors du serveur (stockage objet, autre machine). Avec Postgres / Supabase, utilisez
les sauvegardes de la plateforme.

## Mises à jour

```bash
git pull
DOMAIN=moodly.mon-entreprise.fr docker compose -f docker-compose.prod.yml up --build -d
```

Les migrations s'appliquent au démarrage de l'API. Faites une sauvegarde juste avant toute mise à jour qui contient
une migration (`backend/prisma/migrations/`).

## Supervision

- `GET /api/health` : le processus répond. `GET /api/ready` : la base répond aussi (utilisé par les healthchecks).
- Journaux JSON sur la sortie standard (`docker compose logs api`), une ligne par requête avec `X-Request-Id`
  (aussi renvoyé au client), prêts pour n'importe quel collecteur (Loki, Datadog, CloudWatch…).
- À brancher : une sonde externe sur `/api/ready` (Uptime Kuma, Better Stack…) avec alerte.

## Postgres / Supabase

Recommandé dès que plusieurs instances de l'API sont nécessaires, ou pour bénéficier des sauvegardes gérées.
Procédure dans le [README](README.md#postgres--supabase) : build avec `PRISMA_SCHEMA=prisma/postgres/schema.prisma`,
`DATABASE_URL` vers la base. Validée sur Postgres 17 (78 tests, seed, migrations). Avec Postgres, aucun ordre
d'insertion n'est exposé (contrairement au `rowid` interne de SQLite).

Avec **Supabase** :
- choisir une région de l'Union européenne (le projet « moodly » est à Paris, `eu-west-3`) ;
- la sécurité au niveau des lignes est activée sur toutes les tables par les migrations : l'API REST publique de
  Supabase (clé `anon`) ne voit rien (vérifié : `401` partout). On peut aussi désactiver cette API dans
  *Project Settings → Data API* ;
- l'API se connecte avec un rôle dédié (`moodly_app`), propriétaire de ses tables et sans autre droit, jamais avec
  le compte administrateur `postgres` ;
- le mot de passe de la base ne va que dans `.env.production` / `.env.supabase` (jamais dans git) ;
- les sauvegardes quotidiennes sont faites par Supabase (offre Pro) : `ops/backup.sh` ne sert qu'à SQLite.

## Apps mobiles

La configuration de build est dans `frontend/eas.json` (profils `development`, `preview`, `production`) et
`frontend/app.json` (identifiants `com.moodly.app`, à remplacer par celui de l'entreprise).

```bash
cd frontend
npx eas-cli@latest build --profile production --platform all   # compte Expo requis
npx eas-cli@latest submit --profile production
```

Mettre l'URL réelle dans `eas.json` (`EXPO_PUBLIC_API_URL=https://moodly.mon-entreprise.fr/api`). Pour un déploiement
interne, la distribution `internal` (profil `preview`) évite de passer par les stores.

## Limites connues

- **Une seule instance de l'API** : la limitation de débit par IP est en mémoire. Pour plusieurs instances, passer à
  Postgres et à un stockage partagé du limiteur (Redis). Le verrouillage par compte, lui, est déjà en base.
- **Pas d'envoi d'emails** : les mots de passe provisoires sont transmis par l'exploitant ; pas de « mot de passe
  oublié » en libre-service.
- **Pas de SSO** (Azure AD, Google Workspace) : à prévoir pour une grande entreprise.
- Pas encore d'audit de sécurité externe ni de test de charge.

## Checklist avant ouverture

- [ ] DNS du domaine vers la VM, ports 80/443 ouverts, `https://domaine/api/ready` répond `{"ok":true}`
- [ ] `backend/.env.production` : secret généré, `MIN_RESPONSES` et `DATA_RETENTION_DAYS` validés avec les RH
- [ ] Sauvegarde nocturne planifiée **et une restauration testée**
- [ ] Sonde de disponibilité branchée sur `/api/ready`
- [ ] Comptes importés, mots de passe provisoires transmis par un canal sûr
- [ ] Registre, AIPD, CSE et information des salariés faits ; contact RH/DPO communiqué
- [ ] Apps mobiles construites avec l'URL de production
