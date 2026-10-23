import { Router } from 'express';
import * as authController from '../controllers/authController';
import { requireSession } from '../middlewares/auth';

export const authRouter = Router();

// POST /auth/login — pas d'inscription : les comptes sont créés par la CLI (npm run users)
authRouter.post('/login', authController.login);
// POST /auth/logout — invalide toutes les sessions de l'utilisateur
authRouter.post('/logout', requireSession, authController.logout);
