import { getPrisma } from '@/lib/db/prisma';

export async function logTime(
  userId: string,
  issueId: string,
  minutes: number,
  note?: string,
  loggedAt?: Date
) {
  const issue = await getPrisma().issue.findUniqueOrThrow({
    where: { id: issueId },
    select: { id: true, projectId: true }
  });

  return getPrisma().timeEntry.create({
    data: {
      issueId: issue.id,
      userId,
      minutes,
      note: note || null,
      loggedAt: loggedAt ?? new Date()
    }
  });
}

export async function listTimeEntriesForIssue(issueId: string) {
  return getPrisma().timeEntry.findMany({
    where: { issueId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          name: true,
          avatarUrl: true
        }
      }
    },
    orderBy: { loggedAt: 'desc' }
  });
}

export async function listTimeEntriesForUser(
  userId: string,
  options: { since?: Date; until?: Date } = {}
) {
  return getPrisma().timeEntry.findMany({
    where: {
      userId,
      loggedAt: {
        gte: options.since,
        lte: options.until
      }
    },
    include: {
      issue: {
        select: {
          id: true,
          issueKey: true,
          title: true,
          projectId: true,
          project: { select: { name: true } }
        }
      }
    },
    orderBy: { loggedAt: 'desc' }
  });
}

export async function deleteTimeEntry(userId: string, timeEntryId: string) {
  const entry = await getPrisma().timeEntry.findUniqueOrThrow({
    where: { id: timeEntryId },
    select: { userId: true }
  });
  if (entry.userId !== userId) {
    throw new Error('You can only delete your own time entries');
  }
  return getPrisma().timeEntry.delete({ where: { id: timeEntryId } });
}
