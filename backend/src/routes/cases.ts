import { Router } from 'express';
import * as casesController from '../controllers/casesController';
import * as meetingsController from '../controllers/meetingsController';
import { requireAuth, requireRole } from '../middlewares/auth';

export const casesRouter = Router();

casesRouter.use(requireAuth);

// Types de demandes et règles de routage (formulaire de l'employé)
casesRouter.get('/types', requireRole('EMPLOYEE'), casesController.listTypes);
// Employé : ses demandes nominatives · Manager / RH : les demandes qu'ils traitent
casesRouter.get('/', casesController.list);
casesRouter.get('/unread', casesController.unread);
casesRouter.post('/', requireRole('EMPLOYEE'), casesController.create);
// Demandes anonymes, retrouvées par leur code de suivi
casesRouter.post('/lookup', requireRole('EMPLOYEE'), casesController.lookup);
// Fil de discussion (demandeur, ou destinataire ; code de suivi en en-tête X-Case-Token)
casesRouter.get('/:id', casesController.get);
casesRouter.post('/:id/messages', casesController.addMessage);
casesRouter.post('/:id/status', requireRole('MANAGER', 'HR'), casesController.setStatus);
// Proposer un rendez-vous (demandes nominatives uniquement)
casesRouter.post('/:id/meetings', meetingsController.propose);
