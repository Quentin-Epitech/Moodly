import { Router } from 'express';
import * as meetingsController from '../controllers/meetingsController';
import { requireAuth } from '../middlewares/auth';

// Rendez-vous des demandes : accès vérifié sur la demande (demandeur ou destinataire, 404 sinon)
export const meetingsRouter = Router();

meetingsRouter.use(requireAuth);
meetingsRouter.post('/:id/respond', meetingsController.respond);
meetingsRouter.post('/:id/cancel', meetingsController.cancel);

// Prochains rendez-vous de l'utilisateur (demandes + rendez-vous d'équipe)
export const agendaRouter = Router();

agendaRouter.use(requireAuth);
agendaRouter.get('/', meetingsController.agenda);
