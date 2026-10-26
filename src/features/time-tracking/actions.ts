'use server';

import { requireUser } from '@/lib/auth/session';
import { logTime, deleteTimeEntry, listTimeEntriesForIssue } from '@/features/time-tracking/service';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const logTimeSchema = z.object({
  issueId: z.string().min(1),
  projectId: z.string().min(1),
  minutes: z.coerce.number().min(1).max(1440),
  note: z.string().trim().max(500).optional(),
  loggedAt: z.coerce.date().optional()
});

export async function logTimeAction(input: unknown) {
  const user = await requireUser();
  const parsed = logTimeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid time entry' };
  }

  try {
    await logTime(
      user.id,
      parsed.data.issueId,
      parsed.data.minutes,
      parsed.data.note,
      parsed.data.loggedAt
    );
    revalidatePath(`/projects/${parsed.data.projectId}/issues`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not log time' };
  }
}

export async function deleteTimeEntryAction(input: unknown) {
  const user = await requireUser();
  const parsed = z.object({ timeEntryId: z.string().min(1), projectId: z.string().min(1) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };

  try {
    await deleteTimeEntry(user.id, parsed.data.timeEntryId);
    revalidatePath(`/projects/${parsed.data.projectId}/issues`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not delete entry' };
  }
}

export async function getIssueTimeEntriesAction(input: unknown) {
  await requireUser();
  const parsed = z.object({ issueId: z.string().min(1) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid issue' };

  try {
    const entries = await listTimeEntriesForIssue(parsed.data.issueId);
    return { ok: true, entries };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not load entries' };
  }
}
