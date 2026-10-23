// Génère prisma/postgres/schema.prisma à partir de prisma/schema.prisma (SQLite) :
// même modèle, seul le fournisseur change. Lancer après toute modification du schéma
// (npm run pg:schema) ; tests/postgresSchema.test.ts échoue si on l'oublie.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const source = readFileSync(`${root}prisma/schema.prisma`, 'utf8');

export function toPostgres(schema) {
  const converted = schema.replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"');
  if (converted === schema) throw new Error('Fournisseur "sqlite" introuvable dans prisma/schema.prisma');
  return (
    '// FICHIER GÉNÉRÉ par scripts/sync-postgres-schema.mjs : ne pas modifier à la main.\n' +
    '// Source : prisma/schema.prisma (SQLite). Variante Postgres / Supabase.\n\n' +
    converted
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(`${root}prisma/postgres/schema.prisma`, toPostgres(source));
  console.log('prisma/postgres/schema.prisma à jour');
}
