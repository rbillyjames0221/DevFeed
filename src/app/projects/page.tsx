import PageContainer from '@/components/layout/page-container';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/components/ui/empty';
import { Icons } from '@/components/icons';
import { ProjectCard } from '@/features/projects/components/project-card';
import { CreateProjectDialog } from '@/features/projects/components/create-project-dialog';
import {
  listConnectionsForUser,
  listProjectRepositories,
  listProviderRepositories
} from '@/features/git/service';
import { listProjectMembers, listProjectsForUser } from '@/features/projects/service';
import { requireUser } from '@/lib/auth/session';
import { isDemoMode } from '@/lib/demo';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Projects' };

export default async function ProjectsPage() {
  const user = await requireUser();
  const projects = await listProjectsForUser(user.id);
  const membersByProject = new Map(
    await Promise.all(
      projects.map(async (project) => {
        const members = await listProjectMembers(user.id, project.id).catch(() => []);
        return [project.id, members] as const;
      })
    )
  );
  const linkedByProject = new Map(
    await Promise.all(
      projects.map(async (project) => {
        const linked = await listProjectRepositories(user.id, project.id).catch(() => []);
        return [project.id, linked] as const;
      })
    )
  );
  const connections = await listConnectionsForUser(user.id);
  const providerRepos = (
    await Promise.all(
      connections.map(async (connection) => {
        const repositories = await listProviderRepositories(user.id, connection.id).catch(() => []);
        return repositories.map((repository) => ({
          connectionId: connection.id,
          providerRepositoryId: repository.providerRepositoryId,
          fullName: repository.fullName
        }));
      })
    )
  ).flat();

  // Find repositories that are already linked to any project
  const allLinkedRepoNames = new Set(
    Array.from(linkedByProject.values()).flatMap((repos) => repos.map((repository) => repository.fullName))
  );
  const unlinkedProviderRepos = providerRepos.filter(
    (repository) => !allLinkedRepoNames.has(repository.fullName)
  );

  return (
    <PageContainer
      pageTitle='Projects'
      pageDescription='Connect repositories, issues, databases, and environments in one project.'
      pageHeaderAction={
        !isDemoMode() ? (
          <CreateProjectDialog unlinkedRepositories={unlinkedProviderRepos} />
        ) : undefined
      }
    >
      <div className='space-y-6'>
        {projects.length === 0 ? (
          <Empty className='bg-card min-h-80 border'>
            <EmptyHeader>
              <EmptyMedia variant='icon'>
                <Icons.workspace aria-hidden='true' />
              </EmptyMedia>
              <EmptyTitle>No projects yet</EmptyTitle>
              <EmptyDescription>
                Create a new project or link a repository to start tracking work across issues, code, and environments.
              </EmptyDescription>
              {!isDemoMode() && (
                <div className='mt-4 flex justify-center'>
                  <CreateProjectDialog unlinkedRepositories={unlinkedProviderRepos} />
                </div>
              )}
            </EmptyHeader>
          </Empty>
        ) : (
          <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
            {projects.map((project) => {
              const members = membersByProject.get(project.id) ?? [];
              const isOwner = members.some(
                (member) => member.userId === user.id && member.role === 'OWNER'
              );
              const linked = linkedByProject.get(project.id) ?? [];
              const linkedNames = new Set(linked.map((repository) => repository.fullName));
              return (
                <ProjectCard
                  key={project.id}
                  project={project}
                  members={members}
                  currentUserId={user.id}
                  isOwner={isOwner}
                  linkedRepos={linked.map((repository) => ({
                    id: repository.id,
                    fullName: repository.fullName
                  }))}
                  linkableRepos={providerRepos.filter(
                    (repository) => !linkedNames.has(repository.fullName)
                  )}
                />
              );
            })}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
