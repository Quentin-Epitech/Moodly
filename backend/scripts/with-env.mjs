// Lance une commande avec les variables d'un fichier d'environnement donné, prioritaires
// sur .env (ex. node scripts/with-env.mjs .env.supabase prisma migrate deploy …).
// Les valeurs (mot de passe de la base) ne sont jamais affichées.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import dotenv from 'dotenv';

const [file, command, ...args] = process.argv.slice(2);
if (!file || !command) {
  console.error('Usage : node scripts/with-env.mjs <fichier .env> <commande> [arguments…]');
  process.exit(2);
}
if (!existsSync(file)) {
  console.error(`${file} introuvable : copiez ${file}.example et renseignez-le.`);
  process.exit(2);
}

const parsed = dotenv.parse(readFileSync(file));
const result = spawnSync(command, args, { stdio: 'inherit', env: { ...process.env, ...parsed }, shell: false });
process.exit(result.status ?? 1);
