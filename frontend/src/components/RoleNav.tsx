import { router, usePathname, type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import type { Role } from '@/api';
import { useAuth } from '@/auth/AuthContext';
import { useUnreadCases } from '@/lib/useUnreadCases';

type Item = { href: Href; label: string; match: (path: string) => boolean; badge?: boolean };

const startsWith = (prefix: string) => (path: string) => path === prefix || path.startsWith(`${prefix}/`);

const ITEMS: Record<Role, Item[]> = {
  EMPLOYEE: [
    { href: '/employee', label: "Aujourd'hui", match: (p) => p === '/employee' || p === '/bilan' },
    { href: '/suivi', label: 'Mon suivi', match: startsWith('/suivi') },
    { href: '/demandes', label: 'Demandes', match: startsWith('/demandes'), badge: true },
    { href: '/conseils', label: 'Conseils', match: startsWith('/conseils') },
  ],
  MANAGER: [
    { href: '/manager', label: 'Mon équipe', match: startsWith('/manager') },
    { href: '/demandes', label: 'Demandes', match: startsWith('/demandes'), badge: true },
    { href: '/conseils', label: 'Conseils', match: startsWith('/conseils') },
  ],
  HR: [
    { href: '/hr', label: 'Entreprise', match: (p) => p === '/hr' || p.startsWith('/team/') },
    { href: '/demandes', label: 'Demandes', match: startsWith('/demandes'), badge: true },
    { href: '/conseils', label: 'Conseils', match: startsWith('/conseils') },
  ],
};

// Navigation principale, en bas de l'écran, selon le rôle
export function RoleNav() {
  const { user } = useAuth();
  const pathname = usePathname();
  const unread = useUnreadCases();
  if (!user) return null;

  return (
    <View accessibilityRole="tablist" className="mx-auto w-full max-w-[1040px] flex-row px-2">
      {ITEMS[user.role].map((item) => {
        const active = item.match(pathname);
        const badge = item.badge && unread > 0 ? unread : 0;
        return (
          <Pressable
            key={item.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={badge ? `${item.label}, ${badge} non lue${badge > 1 ? 's' : ''}` : item.label}
            onPress={() => {
              if (!active) router.replace(item.href);
            }}
            className="flex-1 items-center py-3 active:opacity-60 hover:opacity-80"
          >
            <View className="flex-row items-center gap-1.5">
              <Text className={`text-[13px] ${active ? 'font-sans-semibold text-accent' : 'font-sans text-ink/50'}`}>
                {item.label}
              </Text>
              {badge > 0 && (
                <View className="h-[18px] min-w-[18px] items-center justify-center rounded-full bg-mood-1 px-1">
                  <Text className="font-sans-semibold text-[10px] text-white">{badge}</Text>
                </View>
              )}
            </View>
            <View className={`mt-1.5 h-1 w-6 rounded-full ${active ? 'bg-accent' : 'bg-transparent'}`} />
          </Pressable>
        );
      })}
    </View>
  );
}
