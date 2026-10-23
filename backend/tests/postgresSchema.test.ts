import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error script Node sans déclaration de types
import { toPostgres } from '../scripts/sync-postgres-schema.mjs';

// La variante Postgres / Supabase doit suivre le schéma SQLite, et chaque table
// doit être fermée à l'API REST publique de Supabase (sécurité au niveau des lignes).

// Chemins relatifs au dossier backend/ (les tests sont lancés depuis ce dossier)
const read = (file: string) => readFileSync(path.join(__dirname, '..', file), 'utf8');
const migrationsDir = 'prisma/postgres/migrations';
const migrations = readdirSync(path.join(__dirname, '..', migrationsDir), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => read(`${migrationsDir}/${entry.name}/migration.sql`))
  .join('\n');

describe('variante Postgres', () => {
  it('prisma/postgres/schema.prisma est à jour (npm run pg:schema)', () => {
    expect(read('prisma/postgres/schema.prisma')).toBe(toPostgres(read('prisma/schema.prisma')));
  });

  it('chaque modèle a sa table dans les migrations Postgres', () => {
    const models = [...read('prisma/schema.prisma').matchAll(/^model (\w+) \{/gm)].map((match) => match[1]);
    for (const model of models) expect(migrations, model).toContain(`CREATE TABLE "${model}"`);
  });

  it('chaque table a la sécurité au niveau des lignes activée', () => {
    const tables = [...migrations.matchAll(/CREATE TABLE "(\w+)"/g)].map((match) => match[1]);
    for (const table of [...tables, '_prisma_migrations']) {
      expect(migrations, table).toContain(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
    }
  });
});
