export const ProjectRole = {
  OWNER: 'OWNER',
  PROJECT_MANAGER: 'PROJECT_MANAGER',
  LEAD: 'LEAD',
  MEMBER: 'MEMBER',
  VIEWER: 'VIEWER'
} as const;

export type ProjectRole = (typeof ProjectRole)[keyof typeof ProjectRole];
