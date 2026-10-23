import { Router } from 'express';
import * as tagsController from '../controllers/tagsController';
import { requireAuth } from '../middlewares/auth';

export const tagsRouter = Router();

// GET /tags
tagsRouter.get('/', requireAuth, tagsController.listTags);
