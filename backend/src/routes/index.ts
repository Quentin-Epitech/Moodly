import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authRouter } from './auth';
import { casesRouter } from './cases';
import { checkinsRouter } from './checkins';
import { agendaRouter, meetingsRouter } from './meetings';
import { meRouter } from './me';
import { moodsRouter } from './moods';
import { questionsRouter } from './questions';
import { tagsRouter } from './tags';
import { teamsRouter } from './teams';

// Point d'entrée de toutes les routes. Chaque fichier de routes ne fait que
// brancher des middlewares et des controllers (aucune logique métier ici).
export const router = Router();

// Vivant : le processus répond
router.get('/health', (_req, res) => {
  res.json({ ok: true });
});

// Prêt : la base répond aussi (utilisé par les healthchecks Docker)
router.get('/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true });
  } catch {
    res.status(503).json({ error: 'Base de données injoignable' });
  }
});

router.use('/auth', authRouter);
router.use('/me', meRouter);
router.use('/tags', tagsRouter);
router.use('/questions', questionsRouter);
router.use('/moods', moodsRouter);
router.use('/checkins', checkinsRouter);
router.use('/cases', casesRouter);
router.use('/meetings', meetingsRouter);
router.use('/agenda', agendaRouter);
router.use('/teams', teamsRouter);
