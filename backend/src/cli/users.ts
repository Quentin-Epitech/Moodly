/**
 * Gestion des comptes en ligne de commande (pas d'écran d'admin dans l'app).
 *
 *   npm run users -- list [--team Produit]
 *   npm run users -- add --email jeanne@acme.fr --team Produit --role EMPLOYEE
 *   npm run users -- import comptes.csv          (en-tête : email,team,role)
 *   npm run users -- reset-password --email jeanne@acme.fr
 *   npm run users -- unlock --email jeanne@acme.fr
 *   npm run users -- update --email jeanne@acme.fr [--team Support] [--role MANAGER]
 *   npm run users -- remove --email jeanne@acme.fr --yes
 *
 * Dans Docker : docker compose exec api node dist/cli/users.js <commande> …
 * Les mots de passe provisoires ne sont affichés qu'une fois : à transmettre par un
 * canal sûr. Ils doivent être changés à la première connexion.
 */
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { prisma } from '../lib/prisma';
import {
  addAccount,
  importAccounts,
  listAccounts,
  removeAccount,
  resetAccountPassword,
  unlockAccount,
  updateAccount,
  type CreatedAccount,
} from '../services/accountService';

const USAGE = `Usage : users <commande> [options]

  list            [--team <équipe>]
  add             --email <email> --team <équipe> --role <EMPLOYEE|MANAGER|HR>
  import          <fichier.csv>                     (en-tête : email,team,role)
  reset-password  --email <email>
  unlock          --email <email>
  update          --email <email> [--team <équipe>] [--role <rôle>]
  remove          --email <email> --yes`;

function printCredentials(accounts: CreatedAccount[]) {
  console.log('email,team,role,temporaryPassword');
  for (const account of accounts) {
    console.log([account.email, account.team, account.role, account.temporaryPassword].join(','));
  }
  console.error('\nMots de passe provisoires : à transmettre par un canal sûr, à changer à la première connexion.');
}

function required(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Option --${name} obligatoire\n\n${USAGE}`);
  return value;
}

async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      email: { type: 'string' },
      team: { type: 'string' },
      role: { type: 'string' },
      yes: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });
  const [command, file] = positionals;

  switch (values.help ? 'help' : command) {
    case 'list': {
      const accounts = await listAccounts(values.team);
      console.table(accounts);
      break;
    }
    case 'add': {
      const account = await addAccount({
        email: required(values.email, 'email'),
        team: required(values.team, 'team'),
        role: required(values.role, 'role').toUpperCase() as CreatedAccount['role'],
      });
      printCredentials([account]);
      break;
    }
    case 'import': {
      const { created, errors } = await importAccounts(readFileSync(required(file, 'fichier'), 'utf8'));
      printCredentials(created);
      for (const error of errors) console.error(`Erreur ${error}`);
      if (errors.length > 0) process.exitCode = 1;
      break;
    }
    case 'reset-password': {
      const email = required(values.email, 'email');
      const temporaryPassword = await resetAccountPassword(email);
      console.log(`email,temporaryPassword\n${email},${temporaryPassword}`);
      console.error('\nMot de passe provisoire : à transmettre par un canal sûr. Les sessions ouvertes sont fermées.');
      break;
    }
    case 'unlock':
      await unlockAccount(required(values.email, 'email'));
      console.log('Compte déverrouillé.');
      break;
    case 'update':
      await updateAccount(required(values.email, 'email'), { team: values.team, role: values.role });
      console.log('Compte mis à jour (sessions fermées).');
      break;
    case 'remove':
      if (!values.yes) throw new Error('Suppression définitive : ajoutez --yes pour confirmer');
      await removeAccount(required(values.email, 'email'));
      console.log('Compte supprimé. Ses réponses passées, anonymes, restent dans les statistiques.');
      break;
    default:
      console.log(USAGE);
      if (!values.help) process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
