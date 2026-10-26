import { ProjectRole, UserRole } from '@/generated/prisma/client';
import { getPrisma } from '@/lib/db/prisma';
import { ROLE_PERMISSIONS } from '@/lib/permissions/matrix';
import type { PermissionCapability } from '@/lib/permissions/types';

export class PermissionDeniedError extends Error {
  constructor(message = 'Permission denied') {
    super(message);
    this.name = 'PermissionDeniedError';
  }
}

export async function resolveProjectRole(
  userId: string,
  projectId: string
): Promise<{ role: ProjectRole; isGlobalAdmin: boolean } | null> {
  const db = getPrisma();
  const [user, membership] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { role: true }
    }),
    db.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { role: true }
    })
  ]);

  if (!user) return null;
  const isGlobalAdmin = user.role === UserRole.ADMIN;

  if (isGlobalAdmin && !membership) {
    return { role: ProjectRole.OWNER, isGlobalAdmin: true };
  }

  if (!membership) return null;
  return { role: membership.role, isGlobalAdmin };
}

export async function hasPermission(
  userId: string,
  projectId: string,
  capability: PermissionCapability
): Promise<boolean> {
  const resolved = await resolveProjectRole(userId, projectId);
  if (!resolved) return false;
  if (resolved.isGlobalAdmin || resolved.role === ProjectRole.OWNER) return true;

  const allowed = ROLE_PERMISSIONS[resolved.role] ?? [];
  return allowed.includes(capability);
}

export async function requirePermission(
  userId: string,
  projectId: string,
  capability: PermissionCapability
): Promise<ProjectRole> {
  const resolved = await resolveProjectRole(userId, projectId);
  if (!resolved) {
    throw new PermissionDeniedError('Project access denied');
  }

  if (resolved.isGlobalAdmin || resolved.role === ProjectRole.OWNER) {
    return resolved.role;
  }

  const allowed = ROLE_PERMISSIONS[resolved.role] ?? [];
  if (!allowed.includes(capability)) {
    throw new PermissionDeniedError(`Requires permission: ${capability}`);
  }

  return resolved.role;
}
