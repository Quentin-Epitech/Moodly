import type { Href } from 'expo-router';
import type { User } from '@/api';

/**
 * L'écran d'accueil d'un utilisateur connecté : changement du mot de passe
 * provisoire d'abord, puis onboarding la première fois, puis selon le rôle.
 */
export function homeHref(user: User, onboardingDone: boolean): Href {
  if (user.mustChangePassword) return '/password';
  if (!onboardingDone) return '/onboarding';
  switch (user.role) {
    case 'MANAGER':
      return '/manager';
    case 'HR':
      return '/hr';
    default:
      return '/employee';
  }
}
