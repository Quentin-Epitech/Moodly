import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, setAuthToken, setUnauthorizedHandler, type User } from '@/api';
import { onboardingStorage, tokenStorage } from './storage';

type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

type AuthState = {
  status: AuthStatus;
  user: User | null;
  onboardingDone: boolean;
};

type AuthContextValue = AuthState & {
  signIn: (email: string, password: string) => Promise<void>;
  /** Ferme la session côté serveur (tous les appareils) puis localement */
  signOut: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<User>;
  completeOnboarding: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const SIGNED_OUT: AuthState = { status: 'signedOut', user: null, onboardingDone: false };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null, onboardingDone: false });

  // Oublie la session sur cet appareil (sans appel réseau)
  const clearSession = useCallback(async () => {
    setAuthToken(null);
    await tokenStorage.clear();
    setState(SIGNED_OUT);
  }, []);

  const startSession = useCallback(async (token: string, user: User) => {
    await tokenStorage.set(token);
    setAuthToken(token);
    setState({ status: 'signedIn', user, onboardingDone: await onboardingStorage.isDone(user.id) });
  }, []);

  // Au lancement : token en stock ? On revalide auprès de l'API (GET /me).
  useEffect(() => {
    // Session expirée ou fermée depuis un autre appareil : retour à la connexion
    setUnauthorizedHandler(() => {
      void clearSession();
    });

    (async () => {
      const token = await tokenStorage.get();
      if (!token) {
        setState(SIGNED_OUT);
        return;
      }
      setAuthToken(token);
      try {
        const user = await api.getMe();
        setState({ status: 'signedIn', user, onboardingDone: await onboardingStorage.isDone(user.id) });
      } catch {
        // Token expiré ou API injoignable : on repasse par l'écran de connexion
        await clearSession();
      }
    })();

    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { token, user } = await api.login({ email, password });
      await startSession(token, user);
    },
    [startSession],
  );

  const signOut = useCallback(async () => {
    // Si le serveur est injoignable, on se déconnecte quand même localement
    await api.logout().catch(() => undefined);
    await clearSession();
  }, [clearSession]);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      const { token, user } = await api.changePassword({ currentPassword, newPassword });
      await startSession(token, user);
      return user;
    },
    [startSession],
  );

  const completeOnboarding = useCallback(async () => {
    if (!state.user) return;
    await onboardingStorage.markDone(state.user.id);
    setState((current) => ({ ...current, onboardingDone: true }));
  }, [state.user]);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, signIn, signOut, changePassword, completeOnboarding }),
    [state, signIn, signOut, changePassword, completeOnboarding],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return context;
}
