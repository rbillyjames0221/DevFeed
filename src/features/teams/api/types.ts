export interface TeamSummary {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  leadId: string | null;
  lead: {
    id: string;
    username: string;
    name: string | null;
    avatarUrl: string | null;
  } | null;
  memberCount: number;
  projectCount: number;
  createdAt: Date;
}

export interface TeamMemberDetails {
  teamId: string;
  userId: string;
  weeklyCapacity: number | null;
  user: {
    id: string;
    username: string;
    name: string | null;
    avatarUrl: string | null;
  };
}

export interface TeamDetails extends TeamSummary {
  members: TeamMemberDetails[];
  projects: {
    id: string;
    name: string;
    slug: string;
  }[];
}

export interface CreateTeamPayload {
  organizationId: string;
  name: string;
  description?: string;
  leadId?: string;
}

export interface UpdateCapacityPayload {
  teamId: string;
  userId: string;
  weeklyCapacity: number;
}
