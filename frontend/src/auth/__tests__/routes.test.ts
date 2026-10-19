import type { User } from '@/api';
import { homeHref } from '@/auth/routes';

const user = (role: User['role'], mustChangePassword = false): User => ({
  id: 1,
  email: 'x@moodly.app',
  role,
  teamName: 'Produit',
  anonymityThreshold: 3,
  mustChangePassword,
});

describe('homeHref', () => {
  it('impose d’abord le changement du mot de passe provisoire', () => {
    expect(homeHref(user('EMPLOYEE', true), false)).toBe('/password');
    expect(homeHref(user('HR', true), true)).toBe('/password');
  });

  it('envoie vers l’onboarding la première fois', () => {
    expect(homeHref(user('EMPLOYEE'), false)).toBe('/onboarding');
  });

  it('aiguille selon le rôle ensuite', () => {
    expect(homeHref(user('EMPLOYEE'), true)).toBe('/employee');
    expect(homeHref(user('MANAGER'), true)).toBe('/manager');
    expect(homeHref(user('HR'), true)).toBe('/hr');
  });
});
