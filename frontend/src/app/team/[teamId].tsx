import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useGuard } from '@/auth/useGuard';
import { AccountMenu } from '@/components/AccountMenu';
import { RoleNav } from '@/components/RoleNav';
import { TeamDashboard } from '@/components/TeamDashboard';
import { TopBar } from '@/components/TopBar';

// Détail d'une équipe pour la direction : même tableau de bord que le manager, en lecture seule
export default function TeamScreen() {
  const user = useGuard('HR');
  const { teamId } = useLocalSearchParams<{ teamId: string }>();
  const id = Number(teamId);

  if (!user) return null;
  if (!Number.isInteger(id) || id <= 0) return <Redirect href="/hr" />;

  return (
    <TeamDashboard
      team={id}
      canManageActions={false}
      footer={<RoleNav />}
      header={<TopBar back={{ label: 'Vue direction', onPress: () => router.back() }} right={<AccountMenu />} />}
    />
  );
}
