import type { RequestHandler } from 'express';
import { z } from 'zod';
import { currentUser } from '../lib/auth';
import * as authService from '../services/authService';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Mot de passe actuel requis').max(200),
  newPassword: z.string().max(200),
});

export const getMe: RequestHandler = async (req, res) => {
  res.json(await authService.getMe(currentUser(req).id));
};

export const changePassword: RequestHandler = async (req, res) => {
  const body = changePasswordSchema.parse(req.body);
  res.json(await authService.changePassword(currentUser(req).id, body.currentPassword, body.newPassword));
};
