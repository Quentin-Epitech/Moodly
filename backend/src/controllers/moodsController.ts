import type { RequestHandler } from 'express';
import { z } from 'zod';
import { currentUser } from '../lib/auth';
import { todayKey } from '../lib/dates';
import * as moodService from '../services/moodService';

const MAX_TAGS = 3;

const submitSchema = z.object({
  score: z.number().int().min(1).max(5),
  tagIds: z.array(z.number().int().positive()).max(MAX_TAGS, `${MAX_TAGS} tags maximum`).default([]),
  answers: z
    .array(
      z.object({
        questionId: z.number().int().positive(),
        optionIds: z.array(z.number().int().positive()).max(10),
      }),
    )
    .max(20)
    .default([]),
});

export const getToday: RequestHandler = async (req, res) => {
  const submitted = await moodService.hasSubmitted(currentUser(req).id, todayKey());
  res.json({ submitted });
};

export const submit: RequestHandler = async (req, res) => {
  const user = currentUser(req);
  const body = submitSchema.parse(req.body);

  // La date vient du serveur, jamais du client : une saisie par jour, point.
  await moodService.submitMood({
    userId: user.id,
    teamId: user.teamId,
    date: todayKey(),
    score: body.score,
    tagIds: body.tagIds,
    answers: body.answers,
  });

  res.status(201).json({ submitted: true });
};
