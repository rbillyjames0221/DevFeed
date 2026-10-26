import PageContainer from '@/components/layout/page-container';
import { PortfolioView } from '@/features/portfolio/components/portfolio-view';
import { getPortfolioOverview } from '@/features/portfolio/service';
import { requireUser } from '@/lib/auth/session';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Portfolio Overview' };

export default async function PortfolioOverviewPage() {
  const user = await requireUser();
  const projects = await getPortfolioOverview(user.id);
  const isElevated = user.role === 'ADMIN';

  return (
    <PageContainer
      pageTitle='Portfolio Overview'
      pageDescription='Delivery health, velocity trends, and cross-project tracking.'
    >
      <PortfolioView
        projects={projects}
        canGenerateReports={isElevated || projects.length > 0}
      />
    </PageContainer>
  );
}
