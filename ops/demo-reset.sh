#!/usr/bin/env sh
# Remet les données de démo à aujourd'hui (le scénario est calé sur la date du seed)
# puis vérifie que l'API et l'app web répondent. Stack locale uniquement.
set -eu
cd "$(dirname "$0")/.."

docker compose exec -T api node dist/seed.js

curl -fsS "http://localhost:${API_PORT:-4000}/ready" >/dev/null && echo "API prête : http://localhost:${API_PORT:-4000}"
curl -fsS "http://localhost:${WEB_PORT:-8080}/api/ready" >/dev/null && echo "App web prête : http://localhost:${WEB_PORT:-8080}"
