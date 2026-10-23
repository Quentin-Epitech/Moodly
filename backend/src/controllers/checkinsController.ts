import type { RequestHandler } from 'express';
import { z } from 'zod';
import { currentUser } from '../lib/auth';
import { currentWeekKey } from '../lib/dates';
import * as weeklyService from '../services/weeklyService';

const scale = z.number().int().min(1).max(5);
const checkinSchema = z.object({ score: scale, workload: scale, stress: scale });

export const getWeek: RequestHandler = async (req, res) => {
  const week = currentWeekKey();
  res.json({ week, submitted: await weeklyService.hasSubmittedWeek(currentUser(req).id, week) });
};

export const submit: RequestHandler = async (req, res) => {
  const user = currentUser(req);
  const body = checkinSchema.parse(req.body);
  // La semaine vient du serveur : un bilan par semaine, point.
  await weeklyService.submitWeekly({ userId: user.id, teamId: user.teamId, week: currentWeekKey(), ...body });
  res.status(201).json({ submitted: true });
};
