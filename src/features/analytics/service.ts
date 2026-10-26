import { getPrisma } from '@/lib/db/prisma';
import { requirePermission } from '@/lib/permissions';

function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

export async function getProjectAnalytics(
  userId: string,
  projectId: string,
  sprintId?: string
) {
  await requirePermission(userId, projectId, 'analytics.team');
  const db = getPrisma();

  // 1. Fetch Sprint details if requested
  const sprint = sprintId
    ? await db.sprint.findUnique({
        where: { id: sprintId },
        include: { issues: { select: { id: true, estimate: true, status: true } } }
      })
    : null;

  // 2. Burndown Snapshots for the sprint or recent project history (last 14 days)
  const snapshots = await db.dailySnapshot.findMany({
    where: {
      projectId,
      ...(sprintId ? { sprintId } : { sprintId: null })
    },
    orderBy: { date: 'asc' },
    take: 30
  });

  const burndownData = snapshots.map((s) => ({
    date: s.date.toISOString().slice(0, 10),
    scope: s.scope,
    remaining: s.open,
    done: s.done
  }));

  // 3. Velocity across past completed sprints
  const completedSprints = await db.sprint.findMany({
    where: { projectId, status: 'COMPLETED' },
    include: {
      issues: {
        select: {
          id: true,
          estimate: true,
          status: true
        }
      }
    },
    orderBy: { endsAt: 'desc' },
    take: 6
  });

  const velocityData = completedSprints.reverse().map((s) => {
    const committed = s.committedPoints ?? s.issues.reduce((acc, i) => acc + (i.estimate ?? 1), 0);
    const completed = s.issues
      .filter((i) => /^(done|closed|complete|completed|resolved|shipped|released)$/i.test(i.status))
      .reduce((acc, i) => acc + (i.estimate ?? 1), 0);

    return {
      sprintName: s.name,
      committed,
      completed
    };
  });

  // 4. Cycle time (startedAt -> completedAt) & Lead time (createdAt -> completedAt) in days
  const doneIssues = await db.issue.findMany({
    where: {
      projectId,
      completedAt: { not: null }
    },
    select: {
      id: true,
      issueKey: true,
      title: true,
      createdAt: true,
      startedAt: true,
      completedAt: true
    },
    take: 100,
    orderBy: { completedAt: 'desc' }
  });

  const cycleTimes: number[] = [];
  const leadTimes: number[] = [];

  for (const issue of doneIssues) {
    if (issue.completedAt) {
      const completed = issue.completedAt.getTime();
      const created = issue.createdAt.getTime();
      const leadDays = Math.max(0.1, Number(((completed - created) / (1000 * 60 * 60 * 24)).toFixed(1)));
      leadTimes.push(leadDays);

      if (issue.startedAt) {
        const started = issue.startedAt.getTime();
        const cycleDays = Math.max(0.1, Number(((completed - started) / (1000 * 60 * 60 * 24)).toFixed(1)));
        cycleTimes.push(cycleDays);
      }
    }
  }

  const cycleTimeP50 = percentile(cycleTimes, 50);
  const cycleTimeP85 = percentile(cycleTimes, 85);
  const leadTimeP50 = percentile(leadTimes, 50);
  const leadTimeP85 = percentile(leadTimes, 85);

  // 5. Workload vs Capacity per member
  const members = await db.projectMember.findMany({
    where: { projectId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          name: true,
          avatarUrl: true
        }
      }
    }
  });

  const openIssues = await db.issue.findMany({
    where: {
      projectId,
      archivedAt: null,
      status: { notIn: ['DONE', 'Done', 'Closed', 'Completed'] }
    },
    select: {
      assigneeId: true,
      estimate: true
    }
  });

  const workloadData = members.map((member) => {
    const userIssues = openIssues.filter((i) => i.assigneeId === member.userId);
    const assignedPoints = userIssues.reduce((sum, i) => sum + (i.estimate ?? 1), 0);

    return {
      userId: member.userId,
      username: member.user.name || member.user.username,
      assignedPoints,
      weeklyCapacity: 40 // default or read from TeamMember
    };
  });

  return {
    burndownData,
    velocityData,
    cycleTimes: {
      p50: cycleTimeP50,
      p85: cycleTimeP85,
      sampleSize: cycleTimes.length
    },
    leadTimes: {
      p50: leadTimeP50,
      p85: leadTimeP85,
      sampleSize: leadTimes.length
    },
    workloadData
  };
}
