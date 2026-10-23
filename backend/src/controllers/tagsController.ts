import type { RequestHandler } from 'express';
import * as tagService from '../services/tagService';

export const listTags: RequestHandler = async (_req, res) => {
  res.json(await tagService.listTags());
};
