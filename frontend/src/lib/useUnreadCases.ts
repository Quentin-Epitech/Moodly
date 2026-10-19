import { useEffect, useState } from 'react';
import { api } from '@/api';
import { useAuth } from '@/auth/AuthContext';
import { listAnonymousCases } from './anonymousCases';

/**
 * Nombre de demandes avec une réponse non lue (pastille de la navigation).
 * Pour un employé, s'y ajoutent ses signalements anonymes retrouvés via les codes
 * gardés sur l'appareil. Pas de notification push : la pastille est mise à jour à
 * l'ouverture des écrans.
 */
export function useUnreadCases(): number {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user || user.mustChangePassword) return;
    let cancelled = false;
    (async () => {
      try {
        const { count: nominative } = await api.getUnreadCases();
        let anonymous = 0;
        if (user.role === 'EMPLOYEE') {
          const refs = await listAnonymousCases(user.id);
          if (refs.length > 0) {
            anonymous = (await api.lookupCases(refs.map((ref) => ref.token))).filter((c) => c.unread).length;
          }
        }
        if (!cancelled) setCount(nominative + anonymous);
      } catch {
        // Pastille facultative : une erreur réseau ne doit rien bloquer
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return count;
}
