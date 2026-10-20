import type { RequestHandler } from 'express';
import { z } from 'zod';
import { currentUser } from '../lib/auth';
import * as actionService from '../services/actionService';
import { slotSchema } from '../services/meetingService';
import * as teamStatsService from '../services/teamStatsService';
import * as weeklyService from '../services/weeklyService';

const daysQuery = z.object({
  days: z.coerce.number().int().min(1).max(90).default(30),
});

const weeksQuery = z.object({
  weeks: z.coerce.number().int().min(1).max(26).default(12),
});

const teamIdParam = z.object({ teamId: z.coerce.number().int().positive() });
const idParam = z.object({ id: z.coerce.number().int().positive() });

const actionBody = z.object({
  message: z.string().trim().min(3, 'Message trop court').max(280, '280 caractères maximum'),
  /** Rendez-vous d'équipe facultatif */
  event: slotSchema.optional(),
});

// --- Manager : son équipe est celle du token, tout teamId dans l'URL est ignoré ---

export const getMyTeamMoods: RequestHandler = async (req, res) => {
  const { days } = daysQuery.parse(req.query);
  res.json(await teamStatsService.getTeamMoodReport(currentUser(req).teamId, days));
};

export const getMyTeamInsights: RequestHandler = async (req, res) => {
  const { days } = daysQuery.parse(req.query);
  res.json(await teamStatsService.getTeamInsights(currentUser(req).teamId, days));
};

export const getMyTeamWeekly: RequestHandler = async (req, res) => {
  const { weeks } = weeksQuery.parse(req.query);
  res.json(await weeklyService.getTeamWeeklyReport(currentUser(req).teamId, weeks));
};

export const listMyTeamActions: RequestHandler = async (req, res) => {
  res.json(await actionService.listActions(currentUser(req).teamId));
};

export const createMyTeamAction: RequestHandler = async (req, res) => {
  const { message, event } = actionBody.parse(req.body);
  res.status(201).json(await actionService.createAction(currentUser(req).teamId, message, { event }));
};

export const deleteMyTeamAction: RequestHandler = async (req, res) => {
  const { id } = idParam.parse(req.params);
  await actionService.deleteAction(currentUser(req).teamId, id);
  res.status(204).end();
};

// --- RH : vue direction, agrégats de n'importe quelle équipe (même seuil) ---

export const getOverview: RequestHandler = async (req, res) => {
  const { days } = daysQuery.parse(req.query);
  res.json(await teamStatsService.getCompanyOverview(days));
};

export const getTeamMoods: RequestHandler = async (req, res) => {
  const { teamId } = teamIdParam.parse(req.params);
  const { days } = daysQuery.parse(req.query);
  res.json(await teamStatsService.getTeamMoodReport(teamId, days));
};

export const getTeamInsights: RequestHandler = async (req, res) => {
  const { teamId } = teamIdParam.parse(req.params);
  const { days } = daysQuery.parse(req.query);
  res.json(await teamStatsService.getTeamInsights(teamId, days));
};

export const getTeamWeekly: RequestHandler = async (req, res) => {
  const { teamId } = teamIdParam.parse(req.params);
  const { weeks } = weeksQuery.parse(req.query);
  res.json(await weeklyService.getTeamWeeklyReport(teamId, weeks));
};

export const listTeamActions: RequestHandler = async (req, res) => {
  const { teamId } = teamIdParam.parse(req.params);
  res.json(await actionService.listActions(teamId));
};
