import { getPrisma } from '@/lib/db/prisma';
import type {
  TeamSummary,
  TeamDetails,
  CreateTeamPayload
} from '@/features/teams/api/types';

export class TeamAccessError extends Error {
  constructor(message = 'Team not found or access denied') {
    super(message);
    this.name = 'TeamAccessError';
  }
}

export async function listTeams(userId: string): Promise<TeamSummary[]> {
  const db = getPrisma();
  const teams = await db.team.findMany({
    include: {
      lead: {
        select: {
          id: true,
          username: true,
          name: true,
          avatarUrl: true
        }
      },
      _count: {
        select: {
          members: true,
          projects: true
        }
      }
    },
    orderBy: { name: 'asc' }
  });

  return teams.map((team) => ({
    id: team.id,
    organizationId: team.organizationId,
    name: team.name,
    description: team.description,
    leadId: team.leadId,
    lead: team.lead,
    memberCount: team._count.members,
    projectCount: team._count.projects,
    createdAt: team.createdAt
  }));
}

export async function getTeam(userId: string, teamId: string): Promise<TeamDetails> {
  const db = getPrisma();
  const team = await db.team.findUnique({
    where: { id: teamId },
    include: {
      lead: {
        select: {
          id: true,
          username: true,
          name: true,
          avatarUrl: true
        }
      },
      members: {
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
        orderBy: { user: { username: 'asc' } }
      },
      projects: {
        include: {
          project: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        }
      },
      _count: {
        select: {
          members: true,
          projects: true
        }
      }
    }
  });

  if (!team) throw new TeamAccessError();

  return {
    id: team.id,
    organizationId: team.organizationId,
    name: team.name,
    description: team.description,
    leadId: team.leadId,
    lead: team.lead,
    memberCount: team._count.members,
    projectCount: team._count.projects,
    createdAt: team.createdAt,
    members: team.members.map((m) => ({
      teamId: m.teamId,
      userId: m.userId,
      weeklyCapacity: m.weeklyCapacity,
      user: m.user
    })),
    projects: team.projects.map((p) => p.project)
  };
}

export async function createTeam(
  userId: string,
  payload: CreateTeamPayload
): Promise<{ id: string }> {
  const db = getPrisma();

  // If organization doesn't exist, create a default one
  let orgId = payload.organizationId;
  const existingOrg = await db.organization.findUnique({
    where: { id: orgId }
  });

  if (!existingOrg) {
    const defaultOrg = await db.organization.upsert({
      where: { slug: 'default' },
      create: {
        name: 'Workspace Organization',
        slug: 'default'
      },
      update: {}
    });
    orgId = defaultOrg.id;
  }

  const team = await db.team.create({
    data: {
      organizationId: orgId,
      name: payload.name,
      description: payload.description,
      leadId: payload.leadId
    }
  });

  // Automatically add the creator or lead as a team member
  const memberId = payload.leadId ?? userId;
  await db.teamMember.create({
    data: {
      teamId: team.id,
      userId: memberId,
      weeklyCapacity: 40
    }
  });

  return { id: team.id };
}

export async function addTeamMember(
  userId: string,
  teamId: string,
  memberUserId: string,
  weeklyCapacity = 40
): Promise<void> {
  const db = getPrisma();
  await db.teamMember.upsert({
    where: { teamId_userId: { teamId, userId: memberUserId } },
    create: { teamId, userId: memberUserId, weeklyCapacity },
    update: { weeklyCapacity }
  });
}

export async function updateTeamMemberCapacity(
  userId: string,
  teamId: string,
  memberUserId: string,
  weeklyCapacity: number
): Promise<void> {
  const db = getPrisma();
  await db.teamMember.update({
    where: { teamId_userId: { teamId, userId: memberUserId } },
    data: { weeklyCapacity }
  });
}

export async function removeTeamMember(
  userId: string,
  teamId: string,
  memberUserId: string
): Promise<void> {
  const db = getPrisma();
  await db.teamMember.delete({
    where: { teamId_userId: { teamId, userId: memberUserId } }
  });
}

export async function linkTeamToProject(
  userId: string,
  teamId: string,
  projectId: string
): Promise<void> {
  const db = getPrisma();
  await db.teamProject.upsert({
    where: { teamId_projectId: { teamId, projectId } },
    create: { teamId, projectId },
    update: {}
  });
}
