import type { Request, RequestHandler } from 'express';
import { z } from 'zod';
import { currentUser } from '../lib/auth';
import * as caseService from '../services/caseService';

const idParam = z.object({ id: z.coerce.number().int().positive() });
const lookupBody = z.object({ tokens: z.array(z.string().trim().min(8).max(40)).max(50) });
const statusBody = z.object({ status: caseService.caseStatusSchema });

/** Code de suivi d'une demande anonyme : en en-tête, jamais dans l'URL (pas de trace dans les journaux) */
function caseToken(req: Request): string | undefined {
  const value = req.headers['x-case-token'];
  return typeof value === 'string' && value.length <= 40 ? value : undefined;
}

export const listTypes: RequestHandler = (_req, res) => {
  res.json(caseService.listCaseTypes());
};

export const list: RequestHandler = async (req, res) => {
  res.json(await caseService.listCases(currentUser(req)));
};

export const unread: RequestHandler = async (req, res) => {
  res.json({ count: await caseService.unreadCount(currentUser(req)) });
};

export const create: RequestHandler = async (req, res) => {
  const body = caseService.createCaseSchema.parse(req.body);
  res.status(201).json(await caseService.createCase(currentUser(req), body));
};

export const lookup: RequestHandler = async (req, res) => {
  const { tokens } = lookupBody.parse(req.body);
  res.json(await caseService.lookupAnonymousCases(tokens));
};

export const get: RequestHandler = async (req, res) => {
  const { id } = idParam.parse(req.params);
  res.json(await caseService.getCase(currentUser(req), id, caseToken(req)));
};

export const addMessage: RequestHandler = async (req, res) => {
  const { id } = idParam.parse(req.params);
  const { body } = caseService.messageSchema.parse(req.body);
  res.status(201).json(await caseService.addMessage(currentUser(req), id, body, caseToken(req)));
};

export const setStatus: RequestHandler = async (req, res) => {
  const { id } = idParam.parse(req.params);
  const { status } = statusBody.parse(req.body);
  res.json(await caseService.setCaseStatus(currentUser(req), id, status));
};
