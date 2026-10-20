import type { RequestHandler } from 'express';
import { z } from 'zod';
import { currentUser } from '../lib/auth';
import * as agendaService from '../services/agendaService';
import * as meetingService from '../services/meetingService';

const idParam = z.object({ id: z.coerce.number().int().positive() });

export const propose: RequestHandler = async (req, res) => {
  const { id } = idParam.parse(req.params);
  const slot = meetingService.slotSchema.parse(req.body);
  res.status(201).json(await meetingService.proposeMeeting(currentUser(req), id, slot));
};

export const respond: RequestHandler = async (req, res) => {
  const { id } = idParam.parse(req.params);
  const { response } = meetingService.meetingResponseSchema.parse(req.body);
  res.json(await meetingService.respondToMeeting(currentUser(req), id, response));
};

export const cancel: RequestHandler = async (req, res) => {
  const { id } = idParam.parse(req.params);
  res.json(await meetingService.cancelMeeting(currentUser(req), id));
};

export const agenda: RequestHandler = async (req, res) => {
  res.json(await agendaService.getAgenda(currentUser(req)));
};
