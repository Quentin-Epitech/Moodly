import { Router } from 'express';
import * as teamsController from '../controllers/teamsController';
import { requireAuth, requireRole } from '../middlewares/auth';

export const teamsRouter = Router();

teamsRouter.use(requireAuth);

// --- Mon équipe (déduite du token, jamais de l'URL) ---
// Manager : agrégats
teamsRouter.get('/me/moods', requireRole('MANAGER'), teamsController.getMyTeamMoods);
teamsRouter.get('/me/insights', requireRole('MANAGER'), teamsController.getMyTeamInsights);
// Bilans hebdomadaires agrégés : visibles aussi par les employés (tendance de leur équipe)
teamsRouter.get('/me/weekly', requireRole('EMPLOYEE', 'MANAGER'), teamsController.getMyTeamWeekly);
// Actions : lues par l'équipe, publiées par le manager
teamsRouter.get('/me/actions', requireRole('EMPLOYEE', 'MANAGER'), teamsController.listMyTeamActions);
teamsRouter.post('/me/actions', requireRole('MANAGER'), teamsController.createMyTeamAction);
teamsRouter.delete('/me/actions/:id', requireRole('MANAGER'), teamsController.deleteMyTeamAction);

// --- Vue direction (RH) : toutes les équipes, agrégats uniquement ---
teamsRouter.get('/overview', requireRole('HR'), teamsController.getOverview);
teamsRouter.get('/:teamId/moods', requireRole('HR'), teamsController.getTeamMoods);
teamsRouter.get('/:teamId/insights', requireRole('HR'), teamsController.getTeamInsights);
teamsRouter.get('/:teamId/weekly', requireRole('HR'), teamsController.getTeamWeekly);
teamsRouter.get('/:teamId/actions', requireRole('HR'), teamsController.listTeamActions);
