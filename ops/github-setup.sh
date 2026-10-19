#!/usr/bin/env bash
# Crée sur GitHub les étiquettes et les issues de l'équipe à partir de ops/backlog.tsv,
# et assigne chaque issue au responsable de son périmètre. Sans effet sur une issue déjà créée.
#
#   PSEUDO_A=… PSEUDO_B=… PSEUDO_C=… PSEUDO_D=… PSEUDO_E=… ./ops/github-setup.sh
#
# À lancer une fois, après avoir poussé le socle (gh doit être connecté : gh auth status).
set -euo pipefail
cd "$(dirname "$0")/.."

declare -A NAMES=(
  [A]="A — API, auth & sécurité"
  [B]="B — Anonymisation & statistiques"
  [C]="C — App mobile"
  [D]="D — Tableaux de bord"
  [E]="E — Infra & qualité"
)
declare -A COLORS=([A]="5B3DF5" [B]="16B36E" [C]="FF8A2A" [D]="FFC21A" [E]="86C3FF")

for key in A B C D E; do
  gh label create "${NAMES[$key]}" --color "${COLORS[$key]}" --description "Périmètre $key (EQUIPE.md)" --force >/dev/null
done
gh label create "P1" --color "FF5A45" --description "Avant la démo" --force >/dev/null
gh label create "P2" --color "D9D0FF" --description "Si le temps le permet" --force >/dev/null

existing="$(gh issue list --state all --limit 500 --json title --jq '.[].title')"

tail -n +2 ops/backlog.tsv | while IFS=$'\t' read -r key priority title body; do
  full="[$key] $title"
  if grep -Fxq "$full" <<<"$existing"; then
    echo "· déjà créée : $full"
    continue
  fi
  owner_var="PSEUDO_$key"
  assignee="${!owner_var:-}"
  args=(--title "$full" --body "$body

Périmètre : ${NAMES[$key]} · Priorité : $priority · Détails : EQUIPE.md" --label "${NAMES[$key]}" --label "$priority")
  [ -n "$assignee" ] && args+=(--assignee "$assignee")
  gh issue create "${args[@]}" >/dev/null
  echo "✓ $full${assignee:+ → @$assignee}"
done
