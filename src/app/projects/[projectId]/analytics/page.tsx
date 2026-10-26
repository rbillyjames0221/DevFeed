import { notFound } from 'next/navigation';
import PageContainer from '@/components/layout/page-container';
import { ProjectWorkTabs } from '@/features/projects/components/project-work-tabs';
import { AnalyticsDashboard } from '@/features/analytics/components/analytics-dashboard';
import { getProjectAnalytics } from '@/features/analytics/service';
import { listProjectsForUser } from '@/features/projects/service';
import { requireUser } from '@/lib/auth/session';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Analytics' };

interface AnalyticsPageProps {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ sprintId?: string }>;
}

export default async function AnalyticsPage({ params, searchParams }: AnalyticsPageProps) {
  const user = await requireUser();
  const { projectId } = await params;
  const { sprintId } = await searchParams;

  const projects = await listProjectsForUser(user.id);
  const activeProject = projects.find((entry) => entry.id === projectId);
  if (!activeProject) notFound();

  const data = await getProjectAnalytics(user.id, projectId, sprintId);

  return (
    <PageContainer
      pageTitle='Team Analytics'
      pageDescription='Flow metrics, sprint velocity, cycle time, and workload distribution.'
    >
      <div className='min-w-0 space-y-6'>
        <ProjectWorkTabs projectId={projectId} active='analytics' />
        <AnalyticsDashboard data={data} />
      </div>
    </PageContainer>
  );
}
