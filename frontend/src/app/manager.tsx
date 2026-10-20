import { useGuard } from '@/auth/useGuard';
import { AccountMenu } from '@/components/AccountMenu';
import { RoleNav } from '@/components/RoleNav';
import { TeamDashboard } from '@/components/TeamDashboard';
import { TopBar } from '@/components/TopBar';
import { UpcomingAgenda } from '@/components/UpcomingAgenda';

export default function ManagerScreen() {
  const user = useGuard('MANAGER');
  if (!user) return null;

  return (
    <TeamDashboard
      team="me"
      canManageActions
      header={<TopBar right={<AccountMenu />} />}
      footer={<RoleNav />}
      aside={<UpcomingAgenda className="mt-8" />}
    />
  );
}
