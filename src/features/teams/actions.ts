'use server';

import { requireUser } from '@/lib/auth/session';
import {
  createTeam,
  addTeamMember,
  updateTeamMemberCapacity,
  removeTeamMember,
  linkTeamToProject
} from '@/features/teams/api/service';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

const createTeamSchema = z.object({
  organizationId: z.string().default('default'),
  name: z.string().trim().min(1, 'Enter a team name').max(80),
  description: z.string().trim().max(300).optional(),
  leadId: z.string().optional()
});

export async function createTeamAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = createTeamSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  try {
    const result = await createTeam(user.id, parsed.data);
    revalidatePath('/teams');
    return { ok: true, id: result.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not create team' };
  }
}

const updateCapacitySchema = z.object({
  teamId: z.string().min(1),
  memberUserId: z.string().min(1),
  weeklyCapacity: z.coerce.number().min(0).max(168)
});

export async function updateCapacityAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = updateCapacitySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Invalid capacity input' };
  }

  try {
    await updateTeamMemberCapacity(
      user.id,
      parsed.data.teamId,
      parsed.data.memberUserId,
      parsed.data.weeklyCapacity
    );
    revalidatePath('/teams');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not update capacity' };
  }
}

const addMemberSchema = z.object({
  teamId: z.string().min(1),
  memberUserId: z.string().min(1),
  weeklyCapacity: z.coerce.number().min(0).max(168).default(40)
});

export async function addTeamMemberAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = addMemberSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Invalid input' };
  }

  try {
    await addTeamMember(
      user.id,
      parsed.data.teamId,
      parsed.data.memberUserId,
      parsed.data.weeklyCapacity
    );
    revalidatePath('/teams');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not add member' };
  }
}

const removeMemberSchema = z.object({
  teamId: z.string().min(1),
  memberUserId: z.string().min(1)
});

export async function removeTeamMemberAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = removeMemberSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Invalid input' };
  }

  try {
    await removeTeamMember(user.id, parsed.data.teamId, parsed.data.memberUserId);
    revalidatePath('/teams');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not remove member' };
  }
}

const linkProjectSchema = z.object({
  teamId: z.string().min(1),
  projectId: z.string().min(1)
});

export async function linkTeamToProjectAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = linkProjectSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Invalid input' };
  }

  try {
    await linkTeamToProject(user.id, parsed.data.teamId, parsed.data.projectId);
    revalidatePath('/teams');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not link project' };
  }
}
