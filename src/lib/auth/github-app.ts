import { ProjectRole } from '@/generated/prisma/client';

export interface GitHubRepoPermission {
  admin: boolean;
  maintain: boolean;
  push: boolean;
  triage: boolean;
  pull: boolean;
}

export function mapGitHubPermissionToRole(permission: GitHubRepoPermission | string): ProjectRole {
  if (typeof permission === 'string') {
    switch (permission.toLowerCase()) {
      case 'admin':
        return ProjectRole.LEAD;
      case 'maintain':
      case 'write':
      case 'push':
        return ProjectRole.MEMBER;
      case 'triage':
      case 'read':
      case 'pull':
      default:
        return ProjectRole.VIEWER;
    }
  }

  if (permission.admin) return ProjectRole.LEAD;
  if (permission.maintain || permission.push) return ProjectRole.MEMBER;
  return ProjectRole.VIEWER;
}

export function isGitHubAppConfigured(): boolean {
  return Boolean(
    process.env.DEVFEED_GITHUB_APP_ID && process.env.DEVFEED_GITHUB_APP_PRIVATE_KEY
  );
}

export function isPatLoginAllowed(): boolean {
  return process.env.DEVFEED_ALLOW_PAT_LOGIN !== 'false';
}
