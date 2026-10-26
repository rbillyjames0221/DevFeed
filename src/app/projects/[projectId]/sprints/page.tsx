import { notFound } from 'next/navigation';
import PageContainer from '@/components/layout/page-container';
import { ProjectWorkTabs } from '@/features/projects/components/project-work-tabs';
import { SprintPlanningView } from '@/features/sprints/components/sprint-planning-view';
import { listSprints } from '@/features/issues/service';
import { listProjectsForUser } from '@/features/projects/service';
import { requireUser } from '@/lib/auth/session';
import { hasPermission } from '@/lib/permissions';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Sprints' };

interface SprintsPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function SprintsPage({ params }: SprintsPageProps) {
  const user = await requireUser();
  const { projectId } = await params;

  const projects = await listProjectsForUser(user.id);
  const activeProject = projects.find((entry) => entry.id === projectId);
  if (!activeProject) notFound();

  const [sprints, canManageSprints] = await Promise.all([
    listSprints(user.id, projectId),
    hasPermission(user.id, projectId, 'sprint.manage')
  ]);

  return (
    <PageContainer
      pageTitle='Sprints'
      pageDescription='Sprint iterations, backlog planning, and delivery milestones.'
    >
      <div className='min-w-0 space-y-6'>
        <ProjectWorkTabs projectId={projectId} active='sprints' />
        <SprintPlanningView
          projectId={projectId}
          sprints={sprints}
          canManageSprints={canManageSprints}
        />
      </div>
    </PageContainer>
  );
}
