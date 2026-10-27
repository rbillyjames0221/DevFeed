import { getPrisma } from '@/lib/db/prisma';

export interface ProjectMemberSummary {
  id: string;
  username: string;
  name: string | null;
  role: string;
}

export interface ProjectHealthSummary {
  id: string;
  name: string;
  slug: string;
  issuePrefix: string;
  health: 'ON_TRACK' | 'AT_RISK' | 'LATE';
  totalIssues: number;
  openIssues: number;
  doneIssues: number;
  overdueIssues: number;
  stuckIssues: number;
  activeSprint: {
    id: string;
    name: string;
    committedPoints: number | null;
  } | null;
  members: ProjectMemberSummary[];
}

export async function getPortfolioOverview(userId: string): Promise<ProjectHealthSummary[]> {
  const db = getPrisma();
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const projects = await db.project.findMany({
    where: { members: { some: { userId } } },
    include: {
      issues: {
        where: { archivedAt: null },
        select: {
          id: true,
          status: true,
          targetDate: true,
          startedAt: true,
          updatedAt: true
        }
      },
      sprints: {
        where: { status: 'ACTIVE' },
        select: { id: true, name: true, committedPoints: true },
        take: 1
      },
      members: {
        select: {
          role: true,
          user: {
            select: { id: true, username: true, name: true }
          }
        }
      }
    },
    orderBy: { updatedAt: 'desc' }
  });

  return projects.map((project) => {
    const isDone = (status: string) =>
      /^(done|closed|complete|completed|resolved|shipped|released)$/i.test(status);

    const totalIssues = project.issues.length;
    const doneIssues = project.issues.filter((i) => isDone(i.status)).length;
    const openIssues = totalIssues - doneIssues;

    const overdueIssues = project.issues.filter(
      (i) => !isDone(i.status) && i.targetDate && i.targetDate < now
    ).length;

    const stuckIssues = project.issues.filter(
      (i) =>
        !isDone(i.status) &&
        i.startedAt &&
        i.status !== 'BACKLOG' &&
        i.updatedAt < sevenDaysAgo
    ).length;

    const overdueRate = openIssues > 0 ? overdueIssues / openIssues : 0;

    let health: 'ON_TRACK' | 'AT_RISK' | 'LATE' = 'ON_TRACK';
    if (overdueRate > 0.2 || stuckIssues >= 5) {
      health = 'LATE';
    } else if (overdueRate > 0.1 || stuckIssues >= 2) {
      health = 'AT_RISK';
    }

    return {
      id: project.id,
      name: project.name,
      slug: project.slug,
      issuePrefix: project.issuePrefix,
      health,
      totalIssues,
      openIssues,
      doneIssues,
      overdueIssues,
      stuckIssues,
      activeSprint: project.sprints[0] ?? null,
      members: project.members.map((m) => ({
        id: m.user.id,
        username: m.user.username,
        name: m.user.name,
        role: m.role
      }))
    };
  });
}
