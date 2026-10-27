'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
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
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Icons } from '@/components/icons';
import { deleteProjectAction, updateProjectAction } from '@/features/projects/actions';
import { linkRepositoryAction, unlinkRepositoryAction } from '@/features/git/actions';
import {
  RepositoryPicker,
  repositoryPickerValue,
  type PickerRepository
} from '@/features/git/components/repository-picker';

export interface ProjectCardMember {
  id: string;
  userId: string;
  role: string;
  user: { id: string; username: string; name: string | null };
}

export interface ProjectCardRepo {
  id: string;
  fullName: string;
}

export interface LinkableRepo extends PickerRepository {}

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    slug: string;
    issuePrefix: string;
    description: string | null;
    memberCount: number;
    updatedAt: Date;
  };
  members: ProjectCardMember[];
  currentUserId: string;
  isOwner: boolean;
  linkedRepos: ProjectCardRepo[];
  linkableRepos: LinkableRepo[];
}

export function ProjectCard({
  project,
  members,
  currentUserId: _currentUserId,
  isOwner,
  linkedRepos,
  linkableRepos
}: ProjectCardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // Modals state
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? '');

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTyped, setDeleteTyped] = useState('');

  const [linkOpen, setLinkOpen] = useState(false);
  const [selectedRepoToLink, setSelectedRepoToLink] = useState(
    linkableRepos.length > 0 ? repositoryPickerValue(linkableRepos[0]) : ''
  );

  function handleUpdateProject(event: React.FormEvent) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName.length < 2) return;

    startTransition(async () => {
      const result = await updateProjectAction({
        projectId: project.id,
        name: trimmedName,
        description: description.trim() || undefined
      });
      if (!result.ok) {
        toast.error(result.error ?? 'Could not update project');
        return;
      }
      toast.success('Project details updated');
      setEditOpen(false);
      router.refresh();
    });
  }

  function handleDeleteProject() {
    startTransition(async () => {
      const result = await deleteProjectAction({ projectId: project.id });
      if (!result.ok) {
        toast.error(result.error ?? 'Could not delete project');
        return;
      }
      toast.success(`Project "${project.name}" deleted`);
      setDeleteOpen(false);
      router.refresh();
    });
  }

  function handleLinkRepo(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedRepoToLink) return;
    const [connectionId, ...rest] = selectedRepoToLink.split(':');
    const providerRepositoryId = rest.join(':');

    startTransition(async () => {
      const result = await linkRepositoryAction({
        projectId: project.id,
        connectionId,
        providerRepositoryId
      });
      if (!result.ok) {
        toast.error(result.error ?? 'Could not link repository');
        return;
      }
      toast.success('Repository linked');
      setLinkOpen(false);
      router.refresh();
    });
  }

  function handleUnlinkRepo(repositoryId: string, repoName: string) {
    startTransition(async () => {
      const result = await unlinkRepositoryAction({
        projectId: project.id,
        repositoryId
      });
      if (!result.ok) {
        toast.error(result.error ?? 'Could not unlink repository');
        return;
      }
      toast.success(`Unlinked ${repoName}`);
      router.refresh();
    });
  }

  const formattedDate = new Intl.DateTimeFormat('en', {
    dateStyle: 'medium'
  }).format(new Date(project.updatedAt));

  return (
    <>
      <Card className='flex flex-col justify-between transition-all hover:border-foreground/20 hover:shadow-sm'>
        <div>
          <CardHeader className='pb-3'>
            <div className='flex items-start justify-between gap-3'>
              <div className='min-w-0 space-y-1'>
                <CardTitle className='text-lg leading-tight font-semibold'>
                  <Link
                    href={`/projects/${project.id}`}
                    className='hover:underline hover:text-primary transition-colors'
                  >
                    {project.name}
                  </Link>
                </CardTitle>
                <CardDescription className='flex items-center gap-2 text-xs'>
                  <span className='font-mono'>/{project.slug}</span>
                  <span>•</span>
                  <span>Prefix: <span className='font-semibold'>{project.issuePrefix}</span></span>
                </CardDescription>
              </div>

              <div className='flex items-center gap-1.5 shrink-0'>
                <Badge variant={isOwner ? 'default' : 'secondary'} className='text-xs font-medium'>
                  {isOwner ? 'Owner' : 'Member'}
                </Badge>

                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant='ghost' size='icon-xs' aria-label='Project options'>
                        <Icons.ellipsis className='size-4' />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align='end' className='w-48'>
                    <DropdownMenuItem
                      render={
                        <Link href={`/projects/${project.id}`} className='flex items-center gap-2'>
                          <Icons.dashboard className='size-4' />
                          <span>Open Workspace</span>
                        </Link>
                      }
                    />
                    <DropdownMenuItem
                      render={
                        <Link href={`/projects/${project.id}/settings`} className='flex items-center gap-2'>
                          <Icons.settings className='size-4' />
                          <span>Settings</span>
                        </Link>
                      }
                    />

                    {isOwner && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setName(project.name);
                            setDescription(project.description ?? '');
                            setEditOpen(true);
                          }}
                          className='flex items-center gap-2 cursor-pointer'
                        >
                          <Icons.edit className='size-4' />
                          <span>Edit Details</span>
                        </DropdownMenuItem>

                        {linkableRepos.length > 0 && (
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedRepoToLink(repositoryPickerValue(linkableRepos[0]));
                              setLinkOpen(true);
                            }}
                            className='flex items-center gap-2 cursor-pointer'
                          >
                            <Icons.link className='size-4' />
                            <span>Link Repository</span>
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setDeleteTyped('');
                            setDeleteOpen(true);
                          }}
                          className='text-destructive focus:text-destructive flex items-center gap-2 cursor-pointer'
                        >
                          <Icons.trash className='size-4' />
                          <span>Delete Project</span>
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>

          <CardContent className='space-y-4 text-sm pb-4'>
            {/* Description */}
            <p className='text-muted-foreground text-sm line-clamp-2 min-h-5'>
              {project.description || <span className='italic opacity-60'>No description provided</span>}
            </p>

            {/* Repositories */}
            <div className='rounded-lg border bg-muted/30 p-2.5 space-y-2'>
              <div className='flex items-center justify-between text-xs font-medium text-muted-foreground'>
                <span className='flex items-center gap-1.5'>
                  <Icons.github className='size-3.5' />
                  <span>Repositories</span>
                </span>
                {isOwner && linkableRepos.length > 0 && (
                  <button
                    type='button'
                    onClick={() => {
                      setSelectedRepoToLink(repositoryPickerValue(linkableRepos[0]));
                      setLinkOpen(true);
                    }}
                    className='text-primary hover:underline text-[11px] font-medium'
                  >
                    + Link repo
                  </button>
                )}
              </div>

              {linkedRepos.length === 0 ? (
                <p className='text-muted-foreground text-xs'>No repositories linked yet.</p>
              ) : (
                <div className='flex flex-wrap gap-1.5'>
                  {linkedRepos.map((repo) => (
                    <div
                      key={repo.id}
                      className='inline-flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-xs font-mono font-medium'
                    >
                      <span className='truncate max-w-[200px]'>{repo.fullName}</span>
                      {isOwner && (
                        <button
                          type='button'
                          disabled={pending}
                          onClick={() => handleUnlinkRepo(repo.id, repo.fullName)}
                          className='text-muted-foreground hover:text-destructive transition-colors ml-0.5'
                          title={`Unlink ${repo.fullName}`}
                          aria-label={`Unlink ${repo.fullName}`}
                        >
                          <Icons.close className='size-3' />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Members summary */}
            <div className='flex items-center justify-between text-xs text-muted-foreground'>
              <Link
                href={`/projects/${project.id}/settings?tab=members`}
                className='flex items-center gap-1.5 hover:text-foreground transition-colors'
              >
                <div className='flex -space-x-1.5 overflow-hidden'>
                  {members.slice(0, 3).map((m) => (
                    <span
                      key={m.id}
                      className='inline-flex size-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-semibold ring-2 ring-background'
                    >
                      {m.user.username.slice(0, 1).toUpperCase()}
                    </span>
                  ))}
                </div>
                <span>
                  {project.memberCount} member{project.memberCount === 1 ? '' : 's'}
                </span>
              </Link>

              <span>Updated {formattedDate}</span>
            </div>
          </CardContent>
        </div>

        <CardFooter className='border-t pt-3 flex gap-2'>
          <Button
            nativeButton={false}
            render={
              <Link
                href={`/projects/${project.id}`}
                aria-label={`Open project ${project.name}`}
                className='flex-1 justify-between group'
              />
            }
          >
            <span>Open Project</span>
            <Icons.arrowRight className='size-4 transition-transform group-hover:translate-x-0.5' />
          </Button>

          <Button
            variant='outline'
            size='icon'
            nativeButton={false}
            render={
              <Link
                href={`/projects/${project.id}/settings`}
                aria-label={`Settings for ${project.name}`}
              />
            }
          >
            <Icons.settings className='size-4' />
          </Button>
        </CardFooter>
      </Card>

      {/* Edit Project Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Modify name and description for {project.name}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateProject} className='space-y-4 pt-2'>
            <div className='space-y-2'>
              <Label htmlFor={`edit-name-${project.id}`}>Project name *</Label>
              <Input
                id={`edit-name-${project.id}`}
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                disabled={pending}
                required
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor={`edit-desc-${project.id}`}>Description</Label>
              <Textarea
                id={`edit-desc-${project.id}`}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={500}
                rows={3}
                placeholder='Optional project description...'
                disabled={pending}
              />
            </div>
            <DialogFooter className='pt-2'>
              <Button
                type='button'
                variant='outline'
                disabled={pending}
                onClick={() => setEditOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type='submit'
                disabled={pending || name.trim().length < 2}
              >
                {pending ? 'Saving…' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Link Repository Dialog */}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Link a Repository</DialogTitle>
            <DialogDescription>
              Connect a git repository to {project.name} to track branches, commits, and PRs.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleLinkRepo} className='space-y-4 pt-2'>
            <div className='space-y-2'>
              <Label>Repository</Label>
              <RepositoryPicker
                repositories={linkableRepos}
                value={selectedRepoToLink}
                onChange={setSelectedRepoToLink}
                disabled={pending}
                placeholder='Select a repository…'
              />
            </div>
            <DialogFooter className='pt-2'>
              <Button
                type='button'
                variant='outline'
                disabled={pending}
                onClick={() => setLinkOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type='submit'
                disabled={pending || !selectedRepoToLink}
              >
                {pending ? 'Linking…' : 'Link Repository'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Project Alert Dialog */}
      <AlertDialog
        open={deleteOpen}
        onOpenChange={(next) => {
          setDeleteOpen(next);
          if (!next) setDeleteTyped('');
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-destructive'>
              Delete {project.name}?
            </AlertDialogTitle>
            <AlertDialogDescription className='space-y-2'>
              <span>
                This will permanently remove the project and its issues, boards, sprints, and
                repository links. This action cannot be undone.
              </span>
              <span className='block text-xs font-medium text-foreground pt-1'>
                To confirm, type <strong className='font-bold'>{project.name}</strong> below:
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={deleteTyped}
            onChange={(event) => setDeleteTyped(event.target.value)}
            placeholder={project.name}
            aria-label='Confirm project name to delete'
            disabled={pending}
            className='font-mono'
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <Button
              variant='destructive'
              disabled={deleteTyped !== project.name || pending}
              onClick={handleDeleteProject}
            >
              {pending ? 'Deleting…' : 'Delete Project'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
