# Travailler à cinq sur Moodly

Une règle simple : **une issue = une tâche = une branche = une pull request (PR)**. Personne ne pousse directement
sur `main`. Chacun travaille dans son périmètre ([`EQUIPE.md`](EQUIPE.md)), avec ses propres commits, sous son
propre nom.

## 0. Tant que rien n'est sur GitHub

Le projet circule en fichiers `git bundle` (le code et tout son historique, en un seul fichier).

```bash
# Récupérer le projet envoyé par Paul
git clone -b setup/scaffold moodly.bundle moodly && cd moodly

# Rendre une tâche : envoyer sa branche à Paul (seulement ses propres commits)
git bundle create b-preuve-anonymat.bundle setup/scaffold..feat/b-preuve-anonymat

# Côté Paul : relire puis intégrer la branche reçue
git fetch ../b-preuve-anonymat.bundle feat/b-preuve-anonymat:feat/b-preuve-anonymat
git switch setup/scaffold && git merge --no-ff feat/b-preuve-anonymat
```

Les commits gardent le nom de leur auteur : l'historique montre qui a fait quoi, comme avec des PR. Le jour où le
dépôt GitHub est ouvert, la suite de ce document s'applique telle quelle.

## 1. Une fois, au début (avec GitHub)

```bash
git clone https://github.com/Quentin-Epitech/Moodly.git moodly && cd moodly
git config user.name "Prénom Nom"            # votre nom, tel qu'il apparaîtra dans l'historique
git config user.email "vous@epitech.eu"      # l'email de votre compte GitHub
cp backend/.env.example backend/.env
docker compose up --build -d && ./ops/demo-reset.sh
```

Puis, dans chaque projet que vous touchez : `npm install` (dans `backend/`, `frontend/`, `e2e/` ou `video/`).
Les comptes de démo et le parcours de test sont dans [`DEMO.md`](DEMO.md).

## 2. Pour chaque tâche

1. **Prendre l'issue** sur GitHub (onglet *Issues*, filtre par votre périmètre) : s'assigner, la passer *En cours*
   dans le tableau.
2. **Partir de `main` à jour** :

   ```bash
   git switch main && git pull
   git switch -c feat/b-preuve-anonymat        # feat/<périmètre>-<sujet>, ou fix/… pour une correction
   ```

3. **Coder par petits commits**, au format [Conventional Commits](https://www.conventionalcommits.org/fr) :

   ```bash
   git add backend/src/…
   git commit -m "feat(backend): script qui montre les tables Submission et MoodEntry"
   ```

   Types : `feat` (fonctionnalité), `fix` (correction), `test`, `docs`, `refactor`, `chore` (outillage).
   Portée : `backend`, `frontend`, `e2e`, `video`, `infra`.

4. **Vérifier avant de pousser** (dans chaque projet modifié) :

   ```bash
   npm run typecheck && npm run lint && npm test
   ```

5. **Pousser et ouvrir la PR** :

   ```bash
   git push -u origin feat/b-preuve-anonymat
   gh pr create --fill        # ou le bouton « Compare & pull request » sur GitHub
   ```

   Remplir le modèle de PR, écrire `Closes #12` (numéro de l'issue) pour la fermer à la fusion, demander la revue
   de son binôme.

6. **Revue** : le binôme relit sous 24 h, commente, approuve. On corrige par de nouveaux commits sur la même branche
   (`git push`, sans `--force`).
7. **Fusion** : quand la CI est verte et la PR approuvée, l'auteur clique sur *Squash and merge*, puis supprime la
   branche. Retour à l'étape 2 pour la tâche suivante.

## 3. Relire une PR

- Ça fait ce que dit l'issue, et rien de plus ?
- Les tests couvrent le changement ? La CI est verte ?
- **Anonymisation** : aucune donnée individuelle renvoyée au manager ou à la direction, seuil respecté, journée en
  cours jamais exposée. Au moindre doute, demander à B.
- Lancer en local si la PR touche l'interface : `gh pr checkout 12`, puis la démo.

Approuver avec un commentaire qui dit ce qui a été vérifié (« testé le parcours bob, CI verte »), pas juste « ok ».

## 4. En cas de conflit

```bash
git switch feat/ma-branche
git fetch origin && git merge origin/main      # résoudre les conflits dans l'éditeur
git add . && git commit && git push
```

Les fichiers partagés (schéma Prisma, contrat d'API, palette) ont un responsable : voir [`EQUIPE.md`](EQUIPE.md).
Prévenez sur le groupe avant de les modifier, une seule PR à la fois dessus.

## 5. À ne jamais faire

- Pousser sur `main`, ou `git push --force` sur une branche partagée.
- Commiter un secret : `.env`, `.env.supabase`, `.env.production` (ils sont ignorés par git, gardez-les ainsi).
- Fusionner sa propre PR sans approbation, ou avec la CI rouge.
- Commiter au nom de quelqu'un d'autre : chacun ses commits, sous son identité.
