'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Icons } from '@/components/icons';
import { createProjectAction } from '@/features/projects/actions';
import { linkRepositoryToNewProjectAction } from '@/features/git/actions';
import {
  RepositoryPicker,
  repositoryPickerValue,
  suggestProjectName,
  type PickerRepository
} from '@/features/git/components/repository-picker';

interface CreateProjectDialogProps {
  unlinkedRepositories: PickerRepository[];
  trigger?: React.ReactNode;
}

export function CreateProjectDialog({
  unlinkedRepositories,
  trigger
}: CreateProjectDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  // Blank project state
  const [blankName, setBlankName] = useState('');
  const [blankDesc, setBlankDesc] = useState('');

  // Git import state
  const [selectedRepo, setSelectedRepo] = useState(
    unlinkedRepositories.length > 0 ? repositoryPickerValue(unlinkedRepositories[0]) : ''
  );
  const [repoProjectName, setRepoProjectName] = useState('');
  const [repoNameTouched, setRepoNameTouched] = useState(false);

  const activeRepo = unlinkedRepositories.find(
    (repo) => repositoryPickerValue(repo) === selectedRepo
  );
  const repoSuggestion = suggestProjectName(
    activeRepo?.fullName ?? unlinkedRepositories[0]?.fullName ?? ''
  );

  function reset() {
    setBlankName('');
    setBlankDesc('');
    setRepoProjectName('');
    setRepoNameTouched(false);
    if (unlinkedRepositories.length > 0) {
      setSelectedRepo(repositoryPickerValue(unlinkedRepositories[0]));
    }
  }

  function handleCreateBlank(event: React.FormEvent) {
    event.preventDefault();
    const name = blankName.trim();
    if (name.length < 2) return;

    startTransition(async () => {
      const result = await createProjectAction({
        name,
        description: blankDesc.trim() || undefined
      });
      if (!result.ok) {
        toast.error(result.error ?? 'Could not create project');
        return;
      }
      toast.success(`Project "${name}" created`);
      setOpen(false);
      reset();
      router.refresh();
    });
  }

  function handleCreateFromRepo(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedRepo) return;
    const [connectionId, ...rest] = selectedRepo.split(':');
    const providerRepositoryId = rest.join(':');
    const finalName = (repoNameTouched ? repoProjectName : repoProjectName || repoSuggestion).trim();

    startTransition(async () => {
      const result = await linkRepositoryToNewProjectAction({
        connectionId,
        providerRepositoryId,
        projectName: finalName || undefined
      });
      if (!result.ok) {
        toast.error(result.error ?? 'Could not create project from repository');
        return;
      }
      toast.success(
        result.joined
          ? 'Joined existing project for this repository'
          : `Project created and linked`
      );
      setOpen(false);
      reset();
      router.refresh();
    });
  }

  const hasGitRepos = unlinkedRepositories.length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={
          trigger ? (
            (trigger as React.ReactElement)
          ) : (
            <Button size='sm' className='gap-1.5'>
              <Icons.add className='size-4' />
              <span>New Project</span>
            </Button>
          )
        }
      />
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Create Project</DialogTitle>
          <DialogDescription>
            Create a new workspace project to manage issues, sprints, code, and databases.
          </DialogDescription>
        </DialogHeader>

        {hasGitRepos ? (
          <Tabs defaultValue='blank' className='w-full'>
            <TabsList className='grid w-full grid-cols-2'>
              <TabsTrigger value='blank'>New Project</TabsTrigger>
              <TabsTrigger value='git'>Import from Git</TabsTrigger>
            </TabsList>

            <TabsContent value='blank' className='pt-4'>
              <form onSubmit={handleCreateBlank} className='space-y-4'>
                <div className='space-y-2'>
                  <Label htmlFor='project-name'>Project name *</Label>
                  <Input
                    id='project-name'
                    value={blankName}
                    onChange={(event) => setBlankName(event.target.value)}
                    placeholder='e.g. Acme Web App'
                    maxLength={80}
                    disabled={pending}
                    autoFocus
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='project-desc'>Description (optional)</Label>
                  <Textarea
                    id='project-desc'
                    value={blankDesc}
                    onChange={(event) => setBlankDesc(event.target.value)}
                    placeholder='Brief overview of what this project encompasses...'
                    maxLength={500}
                    rows={3}
                    disabled={pending}
                  />
                </div>
                <DialogFooter className='pt-2'>
                  <Button
                    type='button'
                    variant='outline'
                    disabled={pending}
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type='submit'
                    disabled={pending || blankName.trim().length < 2}
                  >
                    {pending ? 'Creating…' : 'Create Project'}
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>

            <TabsContent value='git' className='pt-4'>
              <form onSubmit={handleCreateFromRepo} className='space-y-4'>
                <div className='space-y-2'>
                  <Label>Repository</Label>
                  <RepositoryPicker
                    repositories={unlinkedRepositories}
                    value={selectedRepo}
                    onChange={(next) => {
                      setSelectedRepo(next);
                      if (!repoNameTouched) setRepoProjectName('');
                    }}
                    disabled={pending}
                    placeholder='Choose a repository…'
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='git-project-name'>Project name</Label>
                  <Input
                    id='git-project-name'
                    value={repoNameTouched ? repoProjectName : repoProjectName || repoSuggestion}
                    onChange={(event) => {
                      setRepoNameTouched(true);
                      setRepoProjectName(event.target.value);
                    }}
                    placeholder={repoSuggestion}
                    maxLength={80}
                    disabled={pending}
                  />
                  <p className='text-muted-foreground text-xs'>
                    Suggested from {activeRepo?.fullName ?? 'repository'}.
                  </p>
                </div>
                <DialogFooter className='pt-2'>
                  <Button
                    type='button'
                    variant='outline'
                    disabled={pending}
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type='submit'
                    disabled={pending || !selectedRepo}
                  >
                    {pending ? 'Creating…' : 'Create & Link'}
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>
          </Tabs>
        ) : (
          <form onSubmit={handleCreateBlank} className='space-y-4 pt-2'>
            <div className='space-y-2'>
              <Label htmlFor='single-project-name'>Project name *</Label>
              <Input
                id='single-project-name'
                value={blankName}
                onChange={(event) => setBlankName(event.target.value)}
                placeholder='e.g. Acme Web App'
                maxLength={80}
                disabled={pending}
                autoFocus
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='single-project-desc'>Description (optional)</Label>
              <Textarea
                id='single-project-desc'
                value={blankDesc}
                onChange={(event) => setBlankDesc(event.target.value)}
                placeholder='Brief overview of what this project encompasses...'
                maxLength={500}
                rows={3}
                disabled={pending}
              />
            </div>
            <DialogFooter className='pt-2'>
              <Button
                type='button'
                variant='outline'
                disabled={pending}
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type='submit'
                disabled={pending || blankName.trim().length < 2}
              >
                {pending ? 'Creating…' : 'Create Project'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
