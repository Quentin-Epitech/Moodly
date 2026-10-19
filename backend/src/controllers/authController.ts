import type { RequestHandler } from 'express';
import { z } from 'zod';
import { currentUser } from '../lib/auth';
import * as authService from '../services/authService';

const loginSchema = z.object({
  email: z.email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis').max(200),
});

export const login: RequestHandler = async (req, res) => {
  const body = loginSchema.parse(req.body);
  const result = await authService.login(body.email.trim().toLowerCase(), body.password);
  res.json(result);
};

export const logout: RequestHandler = async (req, res) => {
  await authService.logout(currentUser(req).id);
  res.status(204).end();
};
