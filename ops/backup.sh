#!/usr/bin/env sh
# Sauvegarde à chaud de la base SQLite (cohérente même pendant des écritures) dans ./backups,
# en gardant les 14 dernières. Usage : ./ops/backup.sh [fichier compose]   (défaut : docker-compose.prod.yml)
# À planifier chaque nuit (cron) sur le serveur. Pour Postgres/Supabase : sauvegardes de la plateforme ou pg_dump.
set -eu
cd "$(dirname "$0")/.."

COMPOSE_FILE="${1:-docker-compose.prod.yml}"
API_CONTAINER="$(docker compose -f "$COMPOSE_FILE" ps -q api)"
[ -n "$API_CONTAINER" ] || { echo "Conteneur api introuvable ($COMPOSE_FILE)" >&2; exit 1; }

mkdir -p backups
STAMP="$(date +%Y-%m-%d-%H%M%S)"

docker run --rm --volumes-from "$API_CONTAINER" -v "$PWD/backups:/backups" alpine:3.20 sh -c \
  "apk add --no-cache sqlite >/dev/null && sqlite3 /data/moodly.db \".backup /backups/moodly-$STAMP.db\" && sqlite3 /backups/moodly-$STAMP.db 'PRAGMA integrity_check;'"

ls -1t backups/moodly-*.db | tail -n +15 | xargs -r rm -f
echo "Sauvegarde : backups/moodly-$STAMP.db"
