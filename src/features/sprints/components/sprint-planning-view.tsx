'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Icons } from '@/components/icons';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  createSprintAction,
  startSprintAction,
  closeSprintAction,
  deleteSprintAction
} from '@/features/issues/actions';
import { toast } from 'sonner';

export interface SprintItem {
  id: string;
  projectId: string;
  name: string;
  goal: string | null;
  status: 'PLANNED' | 'ACTIVE' | 'COMPLETED';
  capacity: number | null;
  committedPoints: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  issueCount: number;
  doneCount: number;
  totalPoints: number;
  donePoints: number;
  issues: {
    id: string;
    estimate: number | null;
    status: string;
  }[];
}

interface SprintPlanningViewProps {
  projectId: string;
  sprints: SprintItem[];
  canManageSprints: boolean;
}

export function SprintPlanningView({
  projectId,
  sprints,
  canManageSprints
}: SprintPlanningViewProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [createOpen, setCreateOpen] = useState(false);
  const [sprintName, setSprintName] = useState('');
  const [sprintGoal, setSprintGoal] = useState('');
  const [sprintCapacity, setSprintCapacity] = useState('40');

  const [startSprintModal, setStartSprintModal] = useState<SprintItem | null>(null);
  const [closeSprintModal, setCloseSprintModal] = useState<SprintItem | null>(null);

  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );

  const handleCreateSprint = () => {
    if (!sprintName.trim()) return;
    startTransition(async () => {
      const res = await createSprintAction({
        projectId,
        name: sprintName.trim(),
        goal: sprintGoal.trim() || undefined
      });
      if (res.ok) {
        toast.success('Sprint created');
        setCreateOpen(false);
        setSprintName('');
        setSprintGoal('');
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to create sprint');
      }
    });
  };

  const handleStartSprint = (sprint: SprintItem) => {
    startTransition(async () => {
      const res = await startSprintAction({
        projectId,
        sprintId: sprint.id,
        startsAt: new Date(startDate),
        endsAt: new Date(endDate),
        goal: sprint.goal || undefined
      });
      if (res.ok) {
        toast.success(`Started sprint ${sprint.name}`);
        setStartSprintModal(null);
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to start sprint');
      }
    });
  };

  const handleCloseSprint = (sprint: SprintItem) => {
    startTransition(async () => {
      const res = await closeSprintAction({
        projectId,
        sprintId: sprint.id
      });
      if (res.ok) {
        toast.success(`Completed sprint ${sprint.name}`);
        setCloseSprintModal(null);
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to close sprint');
      }
    });
  };

  const handleDeleteSprint = (sprintId: string) => {
    if (!confirm('Are you sure you want to delete this sprint?')) return;
    startTransition(async () => {
      const res = await deleteSprintAction({ projectId, sprintId });
      if (res.ok) {
        toast.success('Sprint deleted');
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to delete sprint');
      }
    });
  };

  const activeSprint = sprints.find((s) => s.status === 'ACTIVE');
  const plannedSprints = sprints.filter((s) => s.status === 'PLANNED');
  const completedSprints = sprints.filter((s) => s.status === 'COMPLETED');

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-lg font-semibold'>Sprint Planning</h2>
          <p className='text-muted-foreground text-sm'>
            Organize backlogs into iterative sprint cycles and monitor velocity.
          </p>
        </div>
        {canManageSprints && (
          <Button onClick={() => setCreateOpen(true)}>
            <Icons.add className='mr-1.5 size-4' /> New Sprint
          </Button>
        )}
      </div>

      {/* Active Sprint Section */}
      {activeSprint ? (
        <Card className='border-primary/40 bg-card'>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <div className='space-y-1'>
                <div className='flex items-center gap-2'>
                  <CardTitle className='text-base'>{activeSprint.name}</CardTitle>
                  <Badge variant='default'>ACTIVE</Badge>
                </div>
                {activeSprint.goal && (
                  <CardDescription className='text-sm italic'>
                    Goal: {activeSprint.goal}
                  </CardDescription>
                )}
              </div>
              {canManageSprints && (
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setCloseSprintModal(activeSprint)}
                >
                  <Icons.check className='mr-1.5 size-4' /> Complete Sprint
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='grid grid-cols-2 gap-4 text-sm sm:grid-cols-4'>
              <div className='border-border/60 rounded-md border p-3'>
                <div className='text-muted-foreground text-xs'>Issues</div>
                <div className='text-lg font-semibold'>
                  {activeSprint.doneCount} / {activeSprint.issueCount}
                </div>
              </div>
              <div className='border-border/60 rounded-md border p-3'>
                <div className='text-muted-foreground text-xs'>Story Points Done</div>
                <div className='text-lg font-semibold'>
                  {activeSprint.donePoints} / {activeSprint.totalPoints}
                </div>
              </div>
              <div className='border-border/60 rounded-md border p-3'>
                <div className='text-muted-foreground text-xs'>Committed Points</div>
                <div className='text-lg font-semibold'>
                  {activeSprint.committedPoints ?? activeSprint.totalPoints}
                </div>
              </div>
              <div className='border-border/60 rounded-md border p-3'>
                <div className='text-muted-foreground text-xs'>Target End Date</div>
                <div className='text-lg font-semibold'>
                  {activeSprint.endsAt
                    ? new Date(activeSprint.endsAt).toLocaleDateString()
                    : 'Not set'}
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className='space-y-1.5'>
              <div className='flex justify-between text-xs text-muted-foreground'>
                <span>Sprint Progress</span>
                <span>
                  {activeSprint.totalPoints > 0
                    ? Math.round((activeSprint.donePoints / activeSprint.totalPoints) * 100)
                    : 0}
                  %
                </span>
              </div>
              <Progress
                value={
                  activeSprint.totalPoints > 0
                    ? (activeSprint.donePoints / activeSprint.totalPoints) * 100
                    : 0
                }
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className='border-dashed'>
          <CardContent className='flex flex-col items-center justify-center py-8 text-center'>
            <Icons.kanban className='text-muted-foreground mb-2 size-8' />
            <p className='text-sm font-medium'>No active sprint</p>
            <p className='text-muted-foreground text-xs'>
              Start a planned sprint below to begin tracking active execution.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Planned Sprints */}
      <div className='space-y-3'>
        <h3 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider'>
          Planned Sprints ({plannedSprints.length})
        </h3>
        {plannedSprints.length === 0 ? (
          <p className='text-muted-foreground text-sm italic'>No upcoming sprints planned.</p>
        ) : (
          <div className='space-y-3'>
            {plannedSprints.map((sprint) => (
              <Card key={sprint.id}>
                <CardHeader className='py-4'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <div className='flex items-center gap-2'>
                        <span className='font-medium text-sm'>{sprint.name}</span>
                        <Badge variant='outline'>PLANNED</Badge>
                      </div>
                      {sprint.goal && (
                        <p className='text-muted-foreground text-xs mt-1'>{sprint.goal}</p>
                      )}
                    </div>
                    <div className='flex items-center gap-2'>
                      <span className='text-muted-foreground text-xs'>
                        {sprint.issueCount} tasks · {sprint.totalPoints} pts
                      </span>
                      {canManageSprints && (
                        <>
                          <Button
                            size='sm'
                            variant='default'
                            onClick={() => setStartSprintModal(sprint)}
                          >
                            Start Sprint
                          </Button>
                          <Button
                            size='icon'
                            variant='ghost'
                            onClick={() => handleDeleteSprint(sprint.id)}
                          >
                            <Icons.trash className='size-4 text-destructive' />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Completed Sprints History */}
      {completedSprints.length > 0 && (
        <div className='space-y-3 pt-4'>
          <h3 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider'>
            Completed Sprints ({completedSprints.length})
          </h3>
          <div className='divide-border divide-y rounded-md border'>
            {completedSprints.map((sprint) => (
              <div
                key={sprint.id}
                className='flex items-center justify-between p-3 text-sm'
              >
                <div>
                  <span className='font-medium'>{sprint.name}</span>
                  {sprint.endsAt && (
                    <span className='text-muted-foreground text-xs ml-2'>
                      Closed {new Date(sprint.endsAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className='flex items-center gap-3'>
                  <span className='text-xs text-muted-foreground'>
                    Delivered {sprint.donePoints} of {sprint.committedPoints ?? sprint.totalPoints} pts
                  </span>
                  <Badge variant='secondary'>COMPLETED</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dialog: Create Sprint */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Sprint</DialogTitle>
            <DialogDescription>
              Set up a sprint to plan and commit team capacity for a 1-to-2 week cycle.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-2'>
            <div className='space-y-1.5'>
              <label className='text-xs font-medium'>Sprint Name</label>
              <Input
                placeholder='e.g. Sprint 14'
                value={sprintName}
                onChange={(e) => setSprintName(e.target.value)}
              />
            </div>
            <div className='space-y-1.5'>
              <label className='text-xs font-medium'>Sprint Goal (Optional)</label>
              <Input
                placeholder='e.g. Ship OAuth & RBAC settings'
                value={sprintGoal}
                onChange={(e) => setSprintGoal(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button disabled={pending || !sprintName.trim()} onClick={handleCreateSprint}>
              Create Sprint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Start Sprint */}
      <Dialog
        open={Boolean(startSprintModal)}
        onOpenChange={(open) => !open && setStartSprintModal(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Sprint: {startSprintModal?.name}</DialogTitle>
            <DialogDescription>
              Committing {startSprintModal?.totalPoints} story points across{' '}
              {startSprintModal?.issueCount} tasks.
            </DialogDescription>
          </DialogHeader>
          <div className='grid grid-cols-2 gap-4 py-2'>
            <div className='space-y-1.5'>
              <label className='text-xs font-medium'>Start Date</label>
              <Input
                type='date'
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className='space-y-1.5'>
              <label className='text-xs font-medium'>End Date</label>
              <Input
                type='date'
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setStartSprintModal(null)}>
              Cancel
            </Button>
            <Button
              disabled={pending}
              onClick={() => startSprintModal && handleStartSprint(startSprintModal)}
            >
              Confirm & Start
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Close Sprint */}
      <Dialog
        open={Boolean(closeSprintModal)}
        onOpenChange={(open) => !open && setCloseSprintModal(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Sprint: {closeSprintModal?.name}</DialogTitle>
            <DialogDescription>
              Delivered {closeSprintModal?.donePoints} / {closeSprintModal?.totalPoints} points (
              {closeSprintModal?.doneCount} / {closeSprintModal?.issueCount} tasks completed).
            </DialogDescription>
          </DialogHeader>
          <div className='py-2 text-sm text-muted-foreground'>
            Any incomplete tasks will remain in the backlog for subsequent sprint planning.
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setCloseSprintModal(null)}>
              Cancel
            </Button>
            <Button
              disabled={pending}
              onClick={() => closeSprintModal && handleCloseSprint(closeSprintModal)}
            >
              Complete Sprint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
