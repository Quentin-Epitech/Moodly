import { Router } from 'express';
import * as moodsController from '../controllers/moodsController';
import { requireAuth, requireRole } from '../middlewares/auth';

export const moodsRouter = Router();

// Réservé aux employés : un manager ne saisit pas d'humeur
moodsRouter.use(requireAuth, requireRole('EMPLOYEE'));

// GET  /moods/today → { submitted }
moodsRouter.get('/today', moodsController.getToday);
// POST /moods      → 201 | 409 si déjà saisi aujourd'hui
moodsRouter.post('/', moodsController.submit);
