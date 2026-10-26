import { notFound } from 'next/navigation';
import PageContainer from '@/components/layout/page-container';
import { ProjectWorkTabs } from '@/features/projects/components/project-work-tabs';
import { TeamsView } from '@/features/teams/components/teams-view';
import { listTeams } from '@/features/teams/api/service';
import { listProjectsForUser } from '@/features/projects/service';
import { requireUser } from '@/lib/auth/session';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Project Teams' };

interface ProjectTeamsPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectTeamsPage({ params }: ProjectTeamsPageProps) {
  const user = await requireUser();
  const { projectId } = await params;

  const projects = await listProjectsForUser(user.id);
  const activeProject = projects.find((entry) => entry.id === projectId);
  if (!activeProject) notFound();

  const teams = await listTeams(user.id);
  const canManageTeams = user.role === 'ADMIN';

  return (
    <PageContainer
      pageTitle='Engineering Teams'
      pageDescription={`Teams, squads, and capacity for ${activeProject.name}.`}
    >
      <div className='min-w-0 space-y-6'>
        <ProjectWorkTabs projectId={projectId} active='board' />
        <TeamsView teams={teams} canManageTeams={canManageTeams} />
      </div>
    </PageContainer>
  );
}
