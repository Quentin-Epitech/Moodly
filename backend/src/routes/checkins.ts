import { Router } from 'express';
import * as checkinsController from '../controllers/checkinsController';
import { requireAuth, requireRole } from '../middlewares/auth';

export const checkinsRouter = Router();

// Bilan hebdomadaire : réservé aux employés
checkinsRouter.use(requireAuth, requireRole('EMPLOYEE'));

// GET  /checkins/week → { week, submitted }
checkinsRouter.get('/week', checkinsController.getWeek);
// POST /checkins      → 201 | 409 si déjà fait cette semaine
checkinsRouter.post('/', checkinsController.submit);
