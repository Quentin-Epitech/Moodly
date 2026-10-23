import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
export const PROVISIONAL_FILE = path.join(__dirname, '.auth', 'provisional.json');

// Données de démo calées sur aujourd'hui + un compte au mot de passe provisoire (créé par la CLI)
export default function globalSetup() {
  const api = (command: string) =>
    execSync(`docker compose exec -T api ${command}`, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

  api('node dist/seed.js');

  const email = 'nouvelle@moodly.app';
  const output = api(`node dist/cli/users.js add --email ${email} --team Produit --role EMPLOYEE`);
  const line = output.split('\n').find((row) => row.startsWith(`${email},`));
  if (!line) throw new Error(`Compte provisoire non créé :\n${output}`);

  mkdirSync(path.dirname(PROVISIONAL_FILE), { recursive: true });
  writeFileSync(PROVISIONAL_FILE, JSON.stringify({ email, password: line.split(',')[3] }));
}
