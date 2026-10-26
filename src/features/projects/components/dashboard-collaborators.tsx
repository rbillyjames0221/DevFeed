'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Icons } from '@/components/icons';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { addProjectMemberAction } from '@/features/projects/actions';
import { ProjectRole } from '@/features/projects/roles';
import { toast } from 'sonner';

export interface DashboardMember {
  userId: string;
  username: string;
  name: string | null;
  avatarUrl?: string | null;
  role: string;
}

export interface AssignableUser {
  id: string;
  username: string;
  name: string | null;
}

interface DashboardCollaboratorsProps {
  projectId: string;
  members: DashboardMember[];
  canManageMembers: boolean;
  assignableFromGit?: AssignableUser[];
}

function roleBadgeVariant(role: string): 'default' | 'secondary' | 'outline' {
  switch (role) {
    case 'OWNER':
    case 'PROJECT_MANAGER':
      return 'default';
    case 'LEAD':
      return 'secondary';
    case 'VIEWER':
      return 'outline';
    default:
      return 'secondary';
  }
}

function roleDisplayName(role: string): string {
  switch (role) {
    case 'OWNER':
      return 'Owner';
    case 'PROJECT_MANAGER':
      return 'Project Manager';
    case 'LEAD':
      return 'Team Lead';
    case 'MEMBER':
      return 'Member';
    case 'VIEWER':
      return 'Viewer';
    default:
      return role;
  }
}

export function DashboardCollaborators({
  projectId,
  members,
  canManageMembers,
  assignableFromGit = []
}: DashboardCollaboratorsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<ProjectRole>(ProjectRole.MEMBER);

  // Collaborators discovered from linked Git repositories that aren't yet project members
  const memberUsernames = new Set(members.map((m) => m.username.toLowerCase()));
  const gitSuggestions = assignableFromGit.filter(
    (u) => !memberUsernames.has(u.username.toLowerCase())
  );

  const handleAddMember = (userToAdd?: string) => {
    const targetUsername = (userToAdd ?? username).trim().replace(/^@/, '');
    if (!targetUsername) return;

    startTransition(async () => {
      const res = await addProjectMemberAction({
        projectId,
        username: targetUsername,
        role
      });
      if (res.ok) {
        toast.success(`Added @${targetUsername} as ${roleDisplayName(role)}`);
        setUsername('');
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to add collaborator');
      }
    });
  };

  return (
    <>
      <Card>
        <CardHeader className='flex flex-row items-center justify-between pb-3'>
          <div>
            <CardTitle className='text-base'>Collaborators</CardTitle>
            <CardDescription className='text-xs'>
              {members.length} member{members.length === 1 ? '' : 's'} with workspace access.
            </CardDescription>
          </div>
          {canManageMembers && (
            <Button size='sm' variant='outline' onClick={() => setOpen(true)}>
              <Icons.add className='mr-1.5 size-3.5' /> Add Collaborator
            </Button>
          )}
        </CardHeader>
        <CardContent className='space-y-3'>
          <div className='divide-border divide-y'>
            {members.slice(0, 8).map((member) => (
              <div
                key={member.userId}
                className='flex items-center justify-between py-2 text-sm first:pt-0 last:pb-0'
              >
                <div className='flex items-center gap-2.5 min-w-0'>
                  <Avatar className='size-7'>
                    {member.avatarUrl && <AvatarImage src={member.avatarUrl} alt='' />}
                    <AvatarFallback className='text-xs'>
                      {member.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className='truncate'>
                    <div className='font-medium text-xs truncate'>
                      {member.name || member.username}
                    </div>
                    <div className='text-muted-foreground text-[11px] truncate'>
                      @{member.username}
                    </div>
                  </div>
                </div>

                <Badge variant={roleBadgeVariant(member.role)} className='text-[10px]'>
                  {roleDisplayName(member.role)}
                </Badge>
              </div>
            ))}
          </div>

          {members.length > 8 && (
            <p className='text-muted-foreground text-xs text-center pt-1'>
              +{members.length - 8} more collaborators
            </p>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Add Collaborator Directly */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Add Collaborator</DialogTitle>
            <DialogDescription>
              Grant project access to a user directly without having to invite them through GitHub.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 py-2'>
            {/* Quick Suggestions from GitHub */}
            {gitSuggestions.length > 0 && (
              <div className='space-y-2 rounded-lg border bg-muted/30 p-3'>
                <div className='flex items-center gap-1.5 text-xs font-medium text-muted-foreground'>
                  <Icons.github className='size-3.5' /> Discovered from Git Repositories
                </div>
                <div className='flex flex-wrap gap-1.5'>
                  {gitSuggestions.slice(0, 6).map((gitUser) => (
                    <Button
                      key={gitUser.id}
                      size='sm'
                      variant='outline'
                      className='h-7 text-xs'
                      onClick={() => handleAddMember(gitUser.username)}
                      disabled={pending}
                    >
                      <Icons.add className='mr-1 size-3' />
                      @{gitUser.username}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className='space-y-1.5'>
              <label className='text-xs font-medium'>Username</label>
              <Input
                placeholder='e.g. alex or dev-lead'
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddMember();
                  }
                }}
              />
            </div>

            <div className='space-y-1.5'>
              <label className='text-xs font-medium'>Project Role</label>
              <NativeSelect
                value={role}
                onChange={(e) => setRole(e.target.value as ProjectRole)}
              >
                <option value={ProjectRole.MEMBER}>Member (Standard developer)</option>
                <option value={ProjectRole.LEAD}>Team Lead (Backlog, sprints & done approvals)</option>
                <option value={ProjectRole.PROJECT_MANAGER}>Project Manager (Settings & delivery)</option>
                <option value={ProjectRole.VIEWER}>Viewer (Read-only)</option>
              </NativeSelect>
            </div>
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={pending || !username.trim()}
              onClick={() => handleAddMember()}
            >
              Add to Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
