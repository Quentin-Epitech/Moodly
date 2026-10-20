import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import path from 'node:path';

// Base de test : SQLite jetable par défaut (prisma/test.db, ignorée par git), ou
// n'importe quelle base via TEST_DATABASE_URL (ex. Postgres pour valider la
// portabilité, avec npm run test:pg). Dans les deux cas on applique les migrations comme en prod.
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'file:./test.db';

export default function setup() {
  if (TEST_DATABASE_URL.startsWith('file:')) {
    const file = path.resolve(process.cwd(), 'prisma', TEST_DATABASE_URL.replace('file:', ''));
    for (const suffix of ['', '-journal']) rmSync(`${file}${suffix}`, { force: true });
  }

  // Postgres : variante générée du schéma, avec ses propres migrations
  const schema = TEST_DATABASE_URL.startsWith('postgres') ? 'prisma/postgres/schema.prisma' : 'prisma/schema.prisma';
  try {
    execSync(`npx prisma migrate deploy --schema ${schema}`, {
      env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
      stdio: 'pipe',
    });
  } catch (err) {
    console.error(String((err as { stderr?: Buffer }).stderr ?? err));
    throw err;
  }
}
