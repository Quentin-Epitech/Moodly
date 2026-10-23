// Charger la config avant d'instancier le client : Prisma lit DATABASE_URL dans process.env
import '../config/env';
import { PrismaClient } from '@prisma/client';

// Un seul client Prisma pour toute l'application (pool de connexions partagé)
export const prisma = new PrismaClient();
