import { getPrisma } from '@/lib/db/prisma';

function startOfDate(d: Date): Date {
  return new Date(`${d.toISOString().slice(0, 10)}T00:00:00Z`);
}

export async function captureDailySnapshot(projectId: string, forDate: Date = new Date()) {
  const db = getPrisma();
  const date = startOfDate(forDate);

  const [projectIssues, activeSprints] = await Promise.all([
    db.issue.findMany({
      where: { projectId, archivedAt: null },
      select: { id: true, status: true, estimate: true, sprintId: true }
    }),
    db.sprint.findMany({
      where: { projectId, status: 'ACTIVE' },
      select: { id: true }
    })
  ]);

  const isDone = (status: string) =>
    /^(done|closed|complete|completed|resolved|shipped|released)$/i.test(status);

  // 1. Snapshot for the entire project
  const projectScope = projectIssues.reduce((sum, i) => sum + (i.estimate ?? 1), 0);
  const projectDone = projectIssues
    .filter((i) => isDone(i.status))
    .reduce((sum, i) => sum + (i.estimate ?? 1), 0);
  const projectOpen = projectScope - projectDone;

  const projectByStatus: Record<string, number> = {};
  for (const issue of projectIssues) {
    projectByStatus[issue.status] =
      (projectByStatus[issue.status] ?? 0) + (issue.estimate ?? 1);
  }

  await db.dailySnapshot.upsert({
    where: {
      projectId_sprintId_date: {
        projectId,
        sprintId: '',
        date
      }
    },
    create: {
      projectId,
      sprintId: null,
      date,
      scope: projectScope,
      done: projectDone,
      open: projectOpen,
      byStatus: projectByStatus
    },
    update: {
      scope: projectScope,
      done: projectDone,
      open: projectOpen,
      byStatus: projectByStatus
    }
  }).catch(async () => {
    // If sprintId null unique handling is needed
    const existing = await db.dailySnapshot.findFirst({
      where: { projectId, sprintId: null, date }
    });
    if (existing) {
      await db.dailySnapshot.update({
        where: { id: existing.id },
        data: { scope: projectScope, done: projectDone, open: projectOpen, byStatus: projectByStatus }
      });
    } else {
      await db.dailySnapshot.create({
        data: { projectId, sprintId: null, date, scope: projectScope, done: projectDone, open: projectOpen, byStatus: projectByStatus }
      });
    }
  });

  // 2. Snapshot for each active sprint
  for (const sprint of activeSprints) {
    const sprintIssues = projectIssues.filter((i) => i.sprintId === sprint.id);
    const sprintScope = sprintIssues.reduce((sum, i) => sum + (i.estimate ?? 1), 0);
    const sprintDone = sprintIssues
      .filter((i) => isDone(i.status))
      .reduce((sum, i) => sum + (i.estimate ?? 1), 0);
    const sprintOpen = sprintScope - sprintDone;

    const sprintByStatus: Record<string, number> = {};
    for (const issue of sprintIssues) {
      sprintByStatus[issue.status] =
        (sprintByStatus[issue.status] ?? 0) + (issue.estimate ?? 1);
    }

    const existing = await db.dailySnapshot.findFirst({
      where: { projectId, sprintId: sprint.id, date }
    });
    if (existing) {
      await db.dailySnapshot.update({
        where: { id: existing.id },
        data: { scope: sprintScope, done: sprintDone, open: sprintOpen, byStatus: sprintByStatus }
      });
    } else {
      await db.dailySnapshot.create({
        data: { projectId, sprintId: sprint.id, date, scope: sprintScope, done: sprintDone, open: sprintOpen, byStatus: sprintByStatus }
      });
    }
  }
}
