'use server';

import { requireUser } from '@/lib/auth/session';
import { generateWeeklyStatusReport } from '@/features/reports/service';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

export async function generateWeeklyReportAction(input: unknown) {
  const user = await requireUser();
  const parsed = z.object({ projectId: z.string().min(1) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid project ID' };

  try {
    const report = await generateWeeklyStatusReport(user.id, parsed.data.projectId);
    revalidatePath(`/projects/${parsed.data.projectId}/docs`);
    return { ok: true, report };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not generate report' };
  }
}
