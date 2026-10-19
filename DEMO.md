# Scénario de démo (≈ 90 secondes)

Objectif : montrer la boucle complète **retour anonyme → tendance → alerte → action**, et faire toucher du doigt
l'anonymisation. Tout tourne sur les données du seed ; relancer le seed avant chaque prise pour repartir propre.

```bash
./ops/demo-reset.sh                            # avec Docker (seed + vérification que tout répond)
# ou, sans Docker :  cd backend && npm run db:seed
```

Mot de passe de tous les comptes : `password123`.

## 1. L'employé (20 s) — `alice@moodly.app`

1. Connexion → **onboarding** : lire à voix haute « ce que votre manager ne voit pas ».
2. Saisie du jour : choisir la note **2**, cocher **Management**, répondre « Depuis quelques jours » et « Objectifs
   flous », envoyer.
3. Écran « Merci. À demain. » : montrer l'action publiée par le manager Produit (« Les délais du projet Atlas… »),
   preuve que les retours servent.

> Point clé à dire : la base contient « alice a répondu aujourd'hui » d'un côté, « quelqu'un de Produit a mis 2 » de
> l'autre, et rien ne relie les deux. La première trace est même supprimée demain.
>
> Et sa réponse n'apparaîtra chez le manager que **demain** : si le manager voyait « aujourd'hui » passer de 3 à 4
> réponses et la moyenne bouger, il devinerait la note d'alice. C'est l'attaque par différence, et c'est voulu.

## 2. Le manager (40 s) — `manager.logistique@moodly.app`

1. Le tableau de bord s'ouvre sur l'**alerte** : « Baisse nette du moral cette semaine : 2,4 / 5 contre 3,6 »,
   raisons dominantes Management · Sens du travail.
2. Faire glisser le doigt sur la **courbe** : les moyennes par jour, jamais une personne, et la courbe s'arrête à
   « Hier ».
3. Descendre jusqu'aux **précisions** : « Depuis quand ça ne va pas ? → depuis quelques jours (57 %) »,
   « Côté management ? → objectifs flous (64 %) ». Dire que ces réponses sont cumulées sur la période, jamais
   détaillées par jour.
4. **Publier une action** en direct : « Point d'équipe jeudi pour expliquer les nouveaux objectifs. » Elle apparaît
   aussitôt pour toute l'équipe.

Variante : `manager.support@moodly.app` pour montrer les **jours masqués** (moins de 3 réponses → trou dans la
courbe, « Jour masqué », aucune raison affichée).

## 3. La direction (20 s) — `rh@moodly.app`

1. Vue direction : moyenne entreprise, **1 équipe en alerte sur 4**, lignes numérotées par équipe.
2. Toucher **Logistique** : même tableau de bord, en lecture seule.
3. Conclure sur la règle unique : les jours sous le seuil sont exclus de tous les totaux, même ceux de l'entreprise.

## 4. Les nouveautés (40 s)

1. **alice** : depuis « Aujourd'hui », faire le **bilan de la semaine** (Correcte, Lourde, Élevé), puis ouvrir
   **Mon suivi** : ses propres graphiques (gardés sur le téléphone, jamais sur le serveur) et la tendance de l'équipe.
2. **alice** → **Demandes** → « Nouvelle demande » → *Problème avec un collègue*, cocher **Envoyer anonymement** :
   le code de suivi s'affiche. Puis **manager.produit** → Demandes : « De : demandeur anonyme ».
3. **manager.produit** → la demande de bob (« Trop de sujets en parallèle ») : montrer le fil et répondre.
4. **rh@moodly.app** → Demandes : le signalement de rania sur son manager (Logistique), que
   **manager.logistique** ne voit pas.
5. **Conseils** : repères et contacts utiles, chaque conseil mène à la bonne demande.
6. **Agenda** — **bob** : sur « Aujourd'hui », *Prochains rendez-vous* (point avec son manager jeudi, accepté ; point
   d'équipe vendredi) → « Ajouter à mon agenda ». **samir** : la proposition des RH pour mardi, à accepter. **rh** :
   la demande de rania « Ouverte depuis 9 jours : à traiter ». Dire que le titre dans l'agenda reste neutre et que
   rien ne part chez Google ou Microsoft.
7. **Rappels** : en bas de « Aujourd'hui » (après la réponse) ou de « Mon suivi », choisir 17:00 → « Ajouter les
   rappels à mon agenda » : la réponse aux « pas de notifications » du sujet.

## 5. Si on a 15 secondes de plus — l'app web

Ouvrir `http://localhost:8080` (Docker) ou `npm run web` : même app, mise en page large pour les managers et la
direction (chiffres clés sur quatre colonnes, sections côte à côte).

## 6. Si on a 30 secondes de plus — prêt pour la production

1. Créer un compte comme le ferait l'exploitant :
   `docker compose exec api node dist/cli/users.js add --email nouveau@moodly.app --team Produit --role EMPLOYEE`
   → un mot de passe provisoire s'affiche.
2. Se connecter avec : l'app impose de choisir un mot de passe personnel avant tout le reste.
3. Montrer la page **Confidentialité** (lien sur l'écran de connexion) et citer `PRODUCTION.md` : HTTPS, sauvegardes,
   rétention de 13 mois, aucun historique de participation.

## Montrer la base de données au jury

```bash
cd backend && npx prisma studio      # ou npm run pg:studio pour la base Supabase
```

Version Supabase, devant le jury : même avec la clé publique du projet, l'API REST de Supabase refuse tout.

```bash
curl -s https://ujttnilbkzuhyjloemyi.supabase.co/rest/v1/MoodEntry -H "apikey: <clé publique>"   # → 401
```

Ouvrir `MoodEntry` : équipe, jour, note, **aucune colonne utilisateur ni heure**. Puis `Submission` : seulement les
réponses d'aujourd'hui (« a répondu »), sans la note. Rien ne relie les deux tables : c'est la preuve d'anonymat.

## Réglages utiles

- `MIN_RESPONSES` dans `backend/.env` pour changer le seuil d'anonymat (3 par défaut) — l'onboarding et les
  tableaux de bord affichent la valeur réelle.
- Dans le seed, `bob`, `chloe`, `david` (Produit), `lea`, `marc`, `nadia` (Ventes) et `quentin`, `rania`, `samir`,
  `tania` (Logistique) ont déjà répondu aujourd'hui ; `alice`, `emma`, `farid`, `gaelle`, `hugo` sont libres pour la
  saisie en live.
- Les tests de bout en bout (`e2e/`) utilisent ces mêmes comptes : relancer `./ops/demo-reset.sh` après les avoir
  lancés.

## Tester tous les profils

Même mot de passe pour tous les comptes (voir en haut de ce fichier). Pour être connecté à **deux profils en même
temps** (employé + manager), ouvrir le second dans une fenêtre de navigation privée ou un autre navigateur : la
session est gardée par navigateur. `./ops/demo-reset.sh` remet tout à zéro.

| Profil | Compte | À tester |
| --- | --- | --- |
| Employé | `alice@moodly.app` (Produit) | Seule à pouvoir faire **et** la saisie du jour **et** le bilan de la semaine |
| Employé | `emma`, `farid`, `gaelle`, `hugo` (Produit), `ines`, `jules`, `karim` (Support), `omar`, `paula` (Ventes), `ugo`, `victor` (Logistique) | Saisie du jour, demandes, conseils (bilan de la semaine déjà fait) |
| Employé | `bob@moodly.app` | Rendez-vous **accepté** avec son manager, point d'équipe daté, ajout à l'agenda |
| Employé | `samir@moodly.app` | Proposition de rendez-vous des RH **à accepter** ; `lea@moodly.app` : une demande résolue |
| Manager | `manager.produit@moodly.app` | Demandes reçues (dont un signalement anonyme), charge et stress |
| Manager | `manager.logistique@moodly.app` | Équipe en **alerte**, publier une action ; ne voit pas le signalement de rania sur lui |
| Manager | `manager.support@moodly.app` | **Jours masqués** (petite équipe, moins de 3 réponses) |
| Manager | `manager.ventes@moodly.app` | Équipe qui va bien, une demande résolue |
| RH | `rh@moodly.app` | Vue entreprise, demandes adressées aux RH, demande **en attente depuis 9 jours** |
| Nouveau compte | créé avec la CLI (section 6) | Mot de passe provisoire à changer à la première connexion |

Parcours conseillés :

1. **Demande nominative** : `hugo` → Demandes → Demande d'action → `manager.produit` répond → `hugo` voit la réponse.
2. **Signalement anonyme** : `emma` → Problème avec un collègue → « Envoyer anonymement » → noter le code de suivi →
   `manager.produit` voit « demandeur anonyme » et répond → `emma` retrouve la réponse.
3. **Problème avec son manager** : `gaelle` → Problème avec mon manager → arrive chez `rh`, jamais chez
   `manager.produit`.
4. **Boucle retour → action** : `manager.logistique` publie une action → `ugo` la voit sur son écran du jour.
5. **Anonymat** : `farid` répond aujourd'hui → `manager.produit` ne voit rien de nouveau avant demain.
6. **Rendez-vous** : `hugo` fait une demande → `manager.produit` « Proposer un rendez-vous » (jour, heure, lieu) →
   `hugo` accepte → « Ajouter à mon agenda ». Dans un signalement anonyme, le bouton n'existe pas.
7. **Point d'équipe daté** : `manager.logistique` publie une action en cochant « C'est un point d'équipe » → `ugo` l'a
   sur son accueil, avec « Ajouter à mon agenda ».
