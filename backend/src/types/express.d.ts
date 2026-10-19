import type { AuthUser } from '../lib/auth';

// Ajoute `req.user` au type Request d'Express (renseigné par middlewares/auth.ts)
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
