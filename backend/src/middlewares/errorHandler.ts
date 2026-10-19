import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError, z } from 'zod';
import { HttpError } from '../lib/errors';

// 404 pour les routes inconnues, au format { error }
export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: 'Route introuvable' });
};

// Toutes les erreurs ressortent au format { error: string } avec le bon code HTTP.
// Express 5 transmet automatiquement les rejets de promesses des handlers async.
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({ error: z.prettifyError(err) });
    return;
  }

  // JSON mal formé ou trop gros, refusé par le body-parser
  if (typeof err === 'object' && err !== null && 'type' in err) {
    if (err.type === 'entity.parse.failed') {
      res.status(400).json({ error: 'JSON invalide' });
      return;
    }
    if (err.type === 'entity.too.large') {
      res.status(413).json({ error: 'Requête trop volumineuse' });
      return;
    }
  }

  // Détail de l'erreur dans les journaux uniquement, jamais dans la réponse
  req.log.error({ err }, 'Erreur non gérée');
  res.status(500).json({ error: 'Erreur interne' });
};
