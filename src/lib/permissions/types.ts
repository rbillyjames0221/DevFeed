export type PermissionCapability =
  | 'project.view'
  | 'project.create'
  | 'project.settings'
  | 'project.delete'
  | 'members.view'
  | 'members.manage'
  | 'sprint.view'
  | 'sprint.manage'
  | 'issue.view'
  | 'issue.create'
  | 'issue.edit'
  | 'issue.assign_any'
  | 'issue.assign_self'
  | 'issue.approve_done'
  | 'issue.delete'
  | 'time.log'
  | 'time.view_all'
  | 'secret.reveal'
  | 'db.write_prod'
  | 'terminal.connect'
  | 'analytics.personal'
  | 'analytics.team'
  | 'analytics.portfolio'
  | 'report.generate'
  | 'audit.view';

export interface UserProjectAccess {
  userId: string;
  projectId: string;
  role: 'OWNER' | 'PROJECT_MANAGER' | 'LEAD' | 'MEMBER' | 'VIEWER';
  isGlobalAdmin: boolean;
  capabilities: Set<PermissionCapability>;
}
