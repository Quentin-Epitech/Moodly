import { Router } from 'express';
import * as questionsController from '../controllers/questionsController';
import { requireAuth } from '../middlewares/auth';

export const questionsRouter = Router();

// GET /questions — questionnaire adaptatif (questions + options + conditions)
questionsRouter.get('/', requireAuth, questionsController.listQuestions);
