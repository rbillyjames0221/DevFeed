import { NotificationKind } from '@/generated/prisma/client';
import { getPrisma } from '@/lib/db/prisma';

export interface CreateNotificationInput {
  userId: string;
  actorId?: string | null;
  kind: NotificationKind;
  issueId?: string | null;
  projectId?: string | null;
  title: string;
  body?: string | null;
  data?: Record<string, unknown>;
}

export async function createNotification(input: CreateNotificationInput) {
  // Don't notify oneself
  if (input.actorId && input.actorId === input.userId) return null;

  return getPrisma().notification.create({
    data: {
      userId: input.userId,
      actorId: input.actorId ?? null,
      kind: input.kind,
      issueId: input.issueId ?? null,
      projectId: input.projectId ?? null,
      title: input.title,
      body: input.body ?? null,
      data: input.data ? JSON.parse(JSON.stringify(input.data)) : undefined
    }
  });
}

export async function listNotifications(
  userId: string,
  options: { unreadOnly?: boolean; limit?: number } = {}
) {
  const { unreadOnly = false, limit = 50 } = options;
  return getPrisma().notification.findMany({
    where: {
      userId,
      ...(unreadOnly ? { readAt: null } : {})
    },
    include: {
      actor: {
        select: {
          id: true,
          username: true,
          name: true,
          avatarUrl: true
        }
      },
      issue: {
        select: {
          id: true,
          issueKey: true,
          title: true,
          status: true
        }
      },
      project: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: limit
  });
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  return getPrisma().notification.count({
    where: { userId, readAt: null }
  });
}

export async function markNotificationRead(userId: string, notificationId: string) {
  return getPrisma().notification.updateMany({
    where: { id: notificationId, userId },
    data: { readAt: new Date() }
  });
}

export async function markAllNotificationsRead(userId: string) {
  return getPrisma().notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() }
  });
}

/** Parses @username in text and notifies matched project members */
export async function notifyMentionedUsers(
  actorId: string,
  projectId: string,
  issueId: string,
  issueKey: string,
  text: string
) {
  const matches = text.match(/@([a-zA-Z0-9_\-]+)/g);
  if (!matches || matches.length === 0) return;

  const usernames = [...new Set(matches.map((m) => m.slice(1).toLowerCase()))];
  const db = getPrisma();

  const members = await db.projectMember.findMany({
    where: {
      projectId,
      user: { username: { in: usernames, mode: 'insensitive' } }
    },
    select: { userId: true, user: { select: { username: true } } }
  });

  const actor = await db.user.findUnique({
    where: { id: actorId },
    select: { username: true, name: true }
  });
  const actorName = actor?.name || actor?.username || 'Someone';

  await Promise.all(
    members.map((member) =>
      createNotification({
        userId: member.userId,
        actorId,
        kind: NotificationKind.MENTIONED,
        projectId,
        issueId,
        title: `${actorName} mentioned you in ${issueKey}`,
        body: text.slice(0, 150)
      })
    )
  );
}
