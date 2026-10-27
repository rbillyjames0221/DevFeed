'use server';

import { requireUser } from '@/lib/auth/session';
import { generateDocReport, generateWeeklyStatusReport } from '@/features/reports/service';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const docReportSchema = z.object({
  projectId: z.string().min(1),
  scope: z.enum(['overall', 'member']),
  memberUserId: z.string().optional(),
  reportType: z.enum(['weekly', 'monthly', 'custom']),
  startDate: z.string().min(10),
  endDate: z.string().min(10),
  monthYear: z.string().optional()
});

export async function generateDocReportAction(input: unknown) {
  const user = await requireUser();
  const parsed = docReportSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid options' };
  }

  try {
    const report = await generateDocReport(user.id, parsed.data);
    revalidatePath(`/projects/${parsed.data.projectId}/docs`);
    return { ok: true, slug: report.slug, title: report.title };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not generate report' };
  }
}

export async function generateWeeklyReportAction(input: unknown) {
  const user = await requireUser();
  const parsed = z.object({ projectId: z.string().min(1) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid project ID' };

  try {
    const report = await generateWeeklyStatusReport(user.id, parsed.data.projectId);
    revalidatePath(`/projects/${parsed.data.projectId}/docs`);
    return { ok: true, report, slug: report.slug };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not generate report' };
  }
}
