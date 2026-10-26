'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  createTeamAction,
  addTeamMemberAction,
  updateCapacityAction,
  removeTeamMemberAction
} from '@/features/teams/actions';
import type { TeamSummary } from '@/features/teams/api/types';
import { toast } from 'sonner';

interface TeamsViewProps {
  teams: TeamSummary[];
  canManageTeams: boolean;
}

export function TeamsView({ teams, canManageTeams }: TeamsViewProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleCreateTeam = () => {
    if (!name.trim()) return;
    startTransition(async () => {
      const res = await createTeamAction({
        organizationId: 'default',
        name: name.trim(),
        description: description.trim() || undefined
      });
      if (res.ok) {
        toast.success(`Team ${name} created`);
        setCreateOpen(false);
        setName('');
        setDescription('');
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to create team');
      }
    });
  };

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-lg font-semibold'>Engineering Teams</h2>
          <p className='text-muted-foreground text-sm'>
            Group engineers into specialized squads, assign team leads, and manage weekly capacity.
          </p>
        </div>
        {canManageTeams && (
          <Button onClick={() => setCreateOpen(true)}>
            <Icons.add className='mr-1.5 size-4' /> New Team
          </Button>
        )}
      </div>

      {teams.length === 0 ? (
        <Card className='border-dashed'>
          <CardContent className='flex flex-col items-center justify-center py-12 text-center'>
            <Icons.teams className='text-muted-foreground mb-3 size-10' />
            <p className='font-medium text-sm'>No teams created yet</p>
            <p className='text-muted-foreground text-xs'>
              Form your first team to assign team leads and manage sprint capacities.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {teams.map((team) => (
            <Card key={team.id} className='flex flex-col justify-between'>
              <CardHeader>
                <div className='flex items-center justify-between'>
                  <CardTitle className='text-base'>{team.name}</CardTitle>
                  <Badge variant='outline'>{team.memberCount} members</Badge>
                </div>
                {team.description && (
                  <CardDescription className='text-xs line-clamp-2'>
                    {team.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className='space-y-3 pt-0'>
                <div className='flex items-center justify-between text-xs text-muted-foreground'>
                  <span>Team Lead:</span>
                  <div className='flex items-center gap-1.5'>
                    <Avatar className='size-5'>
                      {team.lead?.avatarUrl && <AvatarImage src={team.lead.avatarUrl} alt='' />}
                      <AvatarFallback className='text-[9px]'>
                        {(team.lead?.username ?? 'NA').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className='font-medium text-foreground'>
                      {team.lead?.name || team.lead?.username || 'Unassigned'}
                    </span>
                  </div>
                </div>

                <div className='flex items-center justify-between text-xs text-muted-foreground'>
                  <span>Projects:</span>
                  <span className='font-medium text-foreground'>{team.projectCount} active</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog: Create Team */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Team</DialogTitle>
            <DialogDescription>
              Form a functional group (e.g. Backend, Frontend, DevOps) for cross-project work.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-2'>
            <div className='space-y-1.5'>
              <label className='text-xs font-medium'>Team Name</label>
              <Input
                placeholder='e.g. Core Infrastructure'
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className='space-y-1.5'>
              <label className='text-xs font-medium'>Description</label>
              <Input
                placeholder='e.g. Owns API gateway, databases, and deployment pipelines'
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button disabled={pending || !name.trim()} onClick={handleCreateTeam}>
              Create Team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
