# ---- Étape 1 : build TypeScript ------------------------------------------
FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
# Le schéma doit être présent avant `npm ci` : @prisma/client génère le client au postinstall
COPY prisma ./prisma
RUN npm ci

# Base de données : SQLite par défaut, ou Postgres / Supabase avec
# --build-arg PRISMA_SCHEMA=prisma/postgres/schema.prisma
ARG PRISMA_SCHEMA=prisma/schema.prisma
RUN npx prisma generate --schema ${PRISMA_SCHEMA}

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# ---- Étape 2 : image de run légère (dépendances de prod uniquement) --------
FROM node:22-bookworm-slim

ENV NODE_ENV=production

# openssl est requis par le moteur Prisma
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

ARG PRISMA_SCHEMA=prisma/schema.prisma
ENV PRISMA_SCHEMA=${PRISMA_SCHEMA}
COPY prisma ./prisma
RUN npx prisma generate --schema ${PRISMA_SCHEMA}

COPY --from=build /app/dist ./dist

# Le fichier SQLite vit dans /data (volume nommé, voir docker-compose.yml)
RUN mkdir -p /data && chown node:node /data
USER node

EXPOSE 4000

# Applique les migrations puis démarre l'API (`exec` : node reçoit bien SIGTERM)
CMD ["sh", "-c", "npx prisma migrate deploy --schema \"$PRISMA_SCHEMA\" && exec node dist/index.js"]
