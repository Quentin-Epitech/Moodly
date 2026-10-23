import type { RequestHandler } from 'express';
import * as questionService from '../services/questionService';

export const listQuestions: RequestHandler = async (_req, res) => {
  res.json(await questionService.listQuestions());
};
