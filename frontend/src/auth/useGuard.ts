import { router } from 'expo-router';
import { useEffect } from 'react';
import type { Role, User } from '@/api';
import { useAuth } from './AuthContext';
import { homeHref } from './routes';

/**
 * Protège un écran : renvoie l'utilisateur s'il est connecté, du bon rôle et sans
 * mot de passe provisoire, sinon redirige vers le bon écran (login, mot de passe,
 * onboarding, rôle…).
 */
export function useGuard(role?: Role): User | null {
  const { status, user, onboardingDone } = useAuth();
  const allowed = status === 'signedIn' && user !== null && !user.mustChangePassword && (!role || user.role === role);

  useEffect(() => {
    if (status === 'loading' || allowed) return;
    router.replace(user ? homeHref(user, onboardingDone) : '/login');
  }, [status, allowed, user, onboardingDone]);

  return allowed ? user : null;
}
