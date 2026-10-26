'use server';

import { requireUser } from '@/lib/auth/session';
import {
  listNotifications,
  countUnreadNotifications,
  markNotificationRead,
  markAllNotificationsRead
} from '@/features/notifications/service';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

export async function getNotificationsAction(options?: { unreadOnly?: boolean; limit?: number }) {
  const user = await requireUser();
  const notifications = await listNotifications(user.id, options);
  const unreadCount = await countUnreadNotifications(user.id);
  return { ok: true, notifications, unreadCount };
}

export async function markNotificationReadAction(input: unknown) {
  const user = await requireUser();
  const parsed = z.object({ notificationId: z.string().min(1) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid notification ID' };

  await markNotificationRead(user.id, parsed.data.notificationId);
  revalidatePath('/inbox');
  return { ok: true };
}

export async function markAllNotificationsReadAction() {
  const user = await requireUser();
  await markAllNotificationsRead(user.id);
  revalidatePath('/inbox');
  return { ok: true };
}
