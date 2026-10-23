import { Router } from 'express';
import * as meController from '../controllers/meController';
import { requireSession } from '../middlewares/auth';

export const meRouter = Router();

// Routes du compte : accessibles même avec un mot de passe provisoire
meRouter.use(requireSession);

// GET  /me
meRouter.get('/', meController.getMe);
// POST /me/password → nouvelle session, les autres sont fermées
meRouter.post('/password', meController.changePassword);
