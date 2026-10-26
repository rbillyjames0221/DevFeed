import PageContainer from '@/components/layout/page-container';
import { TeamsView } from '@/features/teams/components/teams-view';
import { listTeams } from '@/features/teams/api/service';
import { requireUser } from '@/lib/auth/session';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Teams' };

export default async function TeamsPage() {
  const user = await requireUser();
  const teams = await listTeams(user.id);
  const canManageTeams = user.role === 'ADMIN';

  return (
    <PageContainer
      pageTitle='Teams'
      pageDescription='Cross-project engineering teams, leads, and capacity planning.'
    >
      <TeamsView teams={teams} canManageTeams={canManageTeams} />
    </PageContainer>
  );
}
