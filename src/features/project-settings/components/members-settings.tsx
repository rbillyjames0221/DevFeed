'use client';

import { ProjectRole } from '@/features/projects/roles';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Icons } from '@/components/icons';
import { leaveProjectAction } from '@/features/project-settings/actions';
import {
  addProjectMemberAction,
  updateMemberDisplayNameAction,
  removeProjectMemberAction,
  updateProjectMemberRoleAction
} from '@/features/projects/actions';
import { useLocale, useT } from '@/i18n/client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

export interface SettingsMember {
  userId: string;
  username: string;
  name: string | null;
  avatarUrl: string | null;
  role: ProjectRole;
  joinedAt: Date;
}

function roleLabel(role: ProjectRole): string {
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

interface MembersSettingsProps {
  projectId: string;
  members: SettingsMember[];
  currentUserId: string;
  isOwner: boolean;
}

type Confirm = { kind: 'remove'; member: SettingsMember } | { kind: 'leave' } | null;

export function MembersSettings({
  projectId,
  members,
  currentUserId,
  isOwner
}: MembersSettingsProps) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<ProjectRole>(ProjectRole.MEMBER);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [editingMember, setEditingMember] = useState<SettingsMember | null>(null);
  const [editingDisplayName, setEditingDisplayName] = useState('');
  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' });

  const run = (action: () => Promise<{ ok: boolean; error?: string }>, success?: string) =>
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error ?? t('common.somethingWrong'));
        return;
      }
      if (success) toast.success(success);
      router.refresh();
    });

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>{t('projectSettings.members.title')}</CardTitle>
          <CardDescription>
            {t('projectSettings.members.count', { count: members.length })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className='divide-border divide-y'>
            {members.map((member) => {
              const isSelf = member.userId === currentUserId;
              return (
                <li key={member.userId} className='flex flex-wrap items-center gap-3 py-3'>
                  <Avatar className='size-8'>
                    {member.avatarUrl && <AvatarImage src={member.avatarUrl} alt='' />}
                    <AvatarFallback>{member.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className='min-w-0 flex-1'>
                    <div className='flex items-center gap-1.5'>
                      <p className='truncate text-sm font-medium'>
                        {member.name || member.username}
                      </p>
                      {isSelf && (
                        <Badge variant='outline' className='ml-0.5 text-[10px]'>
                          {t('common.you')}
                        </Badge>
                      )}
                      {(isOwner || isSelf) && (
                        <Button
                          variant='ghost'
                          size='icon-xs'
                          className='text-muted-foreground hover:text-foreground size-5 shrink-0'
                          title='Edit display name'
                          aria-label='Edit display name'
                          onClick={() => {
                            setEditingMember(member);
                            setEditingDisplayName(member.name ?? '');
                          }}
                        >
                          <Icons.edit className='size-3' />
                        </Button>
                      )}
                    </div>
                    <p className='text-muted-foreground truncate text-xs'>
                      @{member.username} ·{' '}
                      {t('projectSettings.members.joined', {
                        date: dateFormat.format(member.joinedAt)
                      })}
                    </p>
                  </div>
                  {isOwner && !isSelf ? (
                    <>
                      <NativeSelect
                        aria-label={t('projectSettings.members.role')}
                        value={member.role}
                        disabled={pending}
                        onChange={(event) =>
                          run(() =>
                            updateProjectMemberRoleAction({
                              projectId,
                              memberUserId: member.userId,
                              role: event.target.value
                            })
                          )
                        }
                      >
                        <option value={ProjectRole.MEMBER}>{roleLabel(ProjectRole.MEMBER)}</option>
                        <option value={ProjectRole.LEAD}>{roleLabel(ProjectRole.LEAD)}</option>
                        <option value={ProjectRole.PROJECT_MANAGER}>{roleLabel(ProjectRole.PROJECT_MANAGER)}</option>
                        <option value={ProjectRole.OWNER}>{roleLabel(ProjectRole.OWNER)}</option>
                        <option value={ProjectRole.VIEWER}>{roleLabel(ProjectRole.VIEWER)}</option>
                      </NativeSelect>
                      <Button
                        variant='ghost'
                        size='icon'
                        aria-label={t('common.remove')}
                        onClick={() => setConfirm({ kind: 'remove', member })}
                      >
                        <Icons.trash />
                      </Button>
                    </>
                  ) : (
                    <Badge variant={member.role === ProjectRole.OWNER || member.role === ProjectRole.PROJECT_MANAGER ? 'default' : 'secondary'}>
                      {roleLabel(member.role)}
                    </Badge>
                  )}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle>{t('projectSettings.members.addTitle')}</CardTitle>
            <CardDescription>{t('projectSettings.members.addHint')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className='flex max-w-xl flex-wrap gap-2'
              onSubmit={(event) => {
                event.preventDefault();
                const name = username.trim().replace(/^@/, '');
                if (!name) return;
                run(
                  async () => {
                    const result = await addProjectMemberAction({
                      projectId,
                      username: name,
                      role
                    });
                    if (result.ok) setUsername('');
                    return result;
                  },
                  t('projectSettings.members.added', { username: name })
                );
              }}
            >
              <Input
                className='min-w-48 flex-1'
                placeholder={t('projectSettings.members.username')}
                aria-label={t('projectSettings.members.username')}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
              <NativeSelect
                aria-label={t('projectSettings.members.role')}
                value={role}
                onChange={(event) => setRole(event.target.value as ProjectRole)}
              >
                <option value={ProjectRole.MEMBER}>{roleLabel(ProjectRole.MEMBER)}</option>
                <option value={ProjectRole.LEAD}>{roleLabel(ProjectRole.LEAD)}</option>
                <option value={ProjectRole.PROJECT_MANAGER}>{roleLabel(ProjectRole.PROJECT_MANAGER)}</option>
                <option value={ProjectRole.OWNER}>{roleLabel(ProjectRole.OWNER)}</option>
                <option value={ProjectRole.VIEWER}>{roleLabel(ProjectRole.VIEWER)}</option>
              </NativeSelect>
              <Button type='submit' disabled={pending || !username.trim()}>
                <Icons.add /> {t('common.add')}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div>
        <Button variant='outline' onClick={() => setConfirm({ kind: 'leave' })}>
          <Icons.logout /> {t('projectSettings.members.leave')}
        </Button>
      </div>

      <AlertDialog open={confirm !== null} onOpenChange={(open: boolean) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.kind === 'remove'
                ? t('projectSettings.members.removeTitle', { username: confirm.member.username })
                : t('projectSettings.members.leaveTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === 'remove'
                ? t('projectSettings.members.removeDescription')
                : t('projectSettings.members.leaveDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              variant='destructive'
              onClick={() => {
                const current = confirm;
                setConfirm(null);
                if (current?.kind === 'remove') {
                  run(() =>
                    removeProjectMemberAction({ projectId, memberUserId: current.member.userId })
                  );
                } else if (current?.kind === 'leave') {
                  startTransition(async () => {
                    const result = await leaveProjectAction({ projectId });
                    if (!result.ok) {
                      toast.error(result.error);
                      return;
                    }
                    router.push('/projects');
                  });
                }
              }}
            >
              {confirm?.kind === 'remove' ? t('common.remove') : t('projectSettings.members.leave')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={editingMember !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingMember(null);
            setEditingDisplayName('');
          }
        }}
      >
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Edit display name</DialogTitle>
            <DialogDescription>
              Set how @{editingMember?.username} appears on boards, tickets, and reports. Leave blank to default to their username.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!editingMember) return;
              run(
                () =>
                  updateMemberDisplayNameAction({
                    projectId,
                    memberUserId: editingMember.userId,
                    displayName: editingDisplayName
                  }),
                'Display name updated'
              );
              setEditingMember(null);
            }}
            className='space-y-4 pt-2'
          >
            <div className='space-y-1.5'>
              <label htmlFor='display-name-input' className='text-xs font-medium'>
                Display name
              </label>
              <Input
                id='display-name-input'
                placeholder={editingMember ? `@${editingMember.username}` : 'Display name'}
                value={editingDisplayName}
                onChange={(e) => setEditingDisplayName(e.target.value)}
                maxLength={60}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => {
                  setEditingMember(null);
                  setEditingDisplayName('');
                }}
              >
                Cancel
              </Button>
              <Button type='submit' disabled={pending}>
                Save name
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}