'use client';

import { useState } from 'react';
import { Icons } from '@/components/icons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ProjectDashboard } from '@/features/projects/dashboard';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface ProjectReportModalProps {
  report: ProjectDashboard['report'];
  projectId: string;
}

function roleBadgeVariant(role: string): 'default' | 'secondary' | 'outline' {
  switch (role) {
    case 'OWNER':
    case 'PROJECT_MANAGER':
      return 'default';
    case 'LEAD':
      return 'secondary';
    default:
      return 'outline';
  }
}

function roleLabel(role: string): string {
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

export function ProjectReportModal({ report, projectId }: ProjectReportModalProps) {
  const [open, setOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('all');

  const { overall, members, unassigned, projectName, generatedAt } = report;
  const formattedDate = new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(generatedAt));

  const filteredMembers =
    selectedMemberId === 'all'
      ? members
      : members.filter((m) => m.userId === selectedMemberId);

  return (
    <>
      <Button
        variant='outline'
        size='sm'
        className='gap-1.5'
        onClick={() => setOpen(true)}
      >
        <Icons.post className='size-3.5' aria-hidden='true' />
        <span>Generate Report</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='max-h-[90vh] max-w-4xl overflow-y-auto p-4 sm:p-6'>
        <DialogHeader className='flex flex-row flex-wrap items-start justify-between gap-4 border-b pb-4 text-left'>
          <div className='space-y-1'>
            <div className='flex items-center gap-2'>
              <Badge variant='outline' className='text-[10px]'>
                Project Report
              </Badge>
              <span className='text-muted-foreground text-xs font-medium'>
                Generated {formattedDate}
              </span>
            </div>
            <DialogTitle className='text-xl font-bold sm:text-2xl'>
              {projectName} Status &amp; Progress Report
            </DialogTitle>
            <DialogDescription className='text-xs sm:text-sm'>
              Executive summary of overall delivery health, board distribution, and individual member progress.
            </DialogDescription>
          </div>

          <div className='flex items-center gap-2 print:hidden'>
            <Button
              variant='outline'
              size='sm'
              className='gap-1.5 text-xs'
              onClick={() => window.print()}
            >
              <Icons.download className='size-3.5' />
              <span>Print / PDF</span>
            </Button>
          </div>
        </DialogHeader>

        <Tabs defaultValue='overall' className='w-full pt-2'>
          <TabsList className='grid w-full grid-cols-2 print:hidden'>
            <TabsTrigger value='overall'>Overall Report</TabsTrigger>
            <TabsTrigger value='individual'>Individual Member Reports</TabsTrigger>
          </TabsList>

          {/* OVERALL REPORT TAB */}
          <TabsContent value='overall' className='space-y-6 pt-4'>
            {/* Top Metric Cards */}
            <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5'>
              <Card className='p-3 sm:p-4'>
                <p className='text-muted-foreground text-xs font-medium'>Total Tasks</p>
                <p className='mt-1 text-2xl font-bold tracking-tight'>{overall.totalTasks}</p>
                <p className='text-muted-foreground mt-0.5 text-[11px]'>Across all boards</p>
              </Card>

              <Card className='p-3 sm:p-4'>
                <p className='text-muted-foreground text-xs font-medium'>Completed</p>
                <div className='mt-1 flex items-baseline gap-1.5'>
                  <span className='text-2xl font-bold text-emerald-600 dark:text-emerald-400'>
                    {overall.totalDone}
                  </span>
                  <span className='text-muted-foreground text-xs'>
                    ({overall.overallCompletionRate}%)
                  </span>
                </div>
                <p className='text-muted-foreground mt-0.5 text-[11px]'>Work marked done</p>
              </Card>

              <Card className='p-3 sm:p-4'>
                <p className='text-muted-foreground text-xs font-medium'>In Progress</p>
                <p className='mt-1 text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400'>
                  {overall.totalInProgress}
                </p>
                <p className='text-muted-foreground mt-0.5 text-[11px]'>Active development</p>
              </Card>

              <Card className='p-3 sm:p-4'>
                <p className='text-muted-foreground text-xs font-medium'>Backlog / Todo</p>
                <p className='mt-1 text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400'>
                  {overall.totalBacklog}
                </p>
                <p className='text-muted-foreground mt-0.5 text-[11px]'>Waiting to start</p>
              </Card>

              <Card className='p-3 sm:p-4'>
                <p className='text-muted-foreground text-xs font-medium'>Overdue</p>
                <p
                  className={cn(
                    'mt-1 text-2xl font-bold tracking-tight',
                    overall.totalOverdue > 0 ? 'text-destructive' : 'text-foreground'
                  )}
                >
                  {overall.totalOverdue}
                </p>
                <p className='text-muted-foreground mt-0.5 text-[11px]'>Past target date</p>
              </Card>
            </div>

            {/* Overall Progress Bar */}
            <Card>
              <CardHeader className='pb-3'>
                <div className='flex items-center justify-between'>
                  <CardTitle className='text-sm font-semibold'>Overall Delivery Completion</CardTitle>
                  <span className='text-sm font-bold'>{overall.overallCompletionRate}%</span>
                </div>
                <CardDescription className='text-xs'>
                  {overall.totalDone} of {overall.totalTasks} total tasks finished.
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-2'>
                <div className='bg-muted relative h-3 w-full overflow-hidden rounded-full'>
                  <div
                    className='bg-emerald-500 transition-all duration-300'
                    style={{ width: `${overall.overallCompletionRate}%`, height: '100%' }}
                  />
                </div>
                <div className='text-muted-foreground flex justify-between text-[11px]'>
                  <span>Velocity: {overall.doneThisWeek} completed this week</span>
                  <span>Lead time: {overall.leadTimeDays ? `${overall.leadTimeDays}d median` : '—'}</span>
                </div>
              </CardContent>
            </Card>

            {/* Board Distribution */}
            <Card>
              <CardHeader className='pb-3'>
                <CardTitle className='text-sm font-semibold'>Board Distribution</CardTitle>
                <CardDescription className='text-xs'>
                  Status breakdown across each board in this project.
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                {overall.boards.map((b) => (
                  <div key={b.id} className='space-y-1.5 rounded-lg border p-3'>
                    <div className='flex items-center justify-between text-xs'>
                      <span className='font-semibold'>{b.name}</span>
                      <span className='text-muted-foreground'>
                        {b.total === 0 ? 'No tasks' : `${b.columns.find((c) => c.done)?.count ?? 0} / ${b.total} done`}
                      </span>
                    </div>
                    <div className='bg-muted flex h-2 gap-0.5 overflow-hidden rounded-full'>
                      {b.columns.map((col) => (
                        <div
                          key={col.name}
                          title={`${col.name}: ${col.count}`}
                          className='bg-primary/80 first:rounded-l-full last:rounded-r-full'
                          style={{
                            flexGrow: col.count,
                            ...(col.color ? { backgroundColor: col.color } : {})
                          }}
                        />
                      ))}
                    </div>
                    <div className='flex flex-wrap gap-x-3 gap-y-1 pt-1 text-[10px] text-muted-foreground'>
                      {b.columns.map((col) => (
                        <span key={col.name} className='inline-flex items-center gap-1'>
                          <span
                            className='size-1.5 rounded-full'
                            style={{ backgroundColor: col.color ?? 'currentColor' }}
                          />
                          {col.name}: <strong className='text-foreground'>{col.count}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* INDIVIDUAL MEMBER REPORT TAB */}
          <TabsContent value='individual' className='space-y-6 pt-4'>
            {/* Filter controls */}
            <div className='flex flex-wrap items-center justify-between gap-3 print:hidden'>
              <div className='flex items-center gap-2'>
                <span className='text-muted-foreground text-xs font-medium'>Filter by member:</span>
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className='bg-background border-input text-foreground h-8 rounded-md border px-2.5 text-xs shadow-2xs outline-none'
                >
                  <option value='all'>All Members ({members.length})</option>
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.displayName} (@{m.username}) — {roleLabel(m.role)}
                    </option>
                  ))}
                </select>
              </div>

              <span className='text-muted-foreground text-xs'>
                Showing {filteredMembers.length} member report{filteredMembers.length === 1 ? '' : 's'}
              </span>
            </div>

            {/* Member Cards */}
            <div className='space-y-4'>
              {filteredMembers.map((member) => (
                <Card key={member.userId} className='overflow-hidden border'>
                  <CardHeader className='bg-muted/30 border-b p-3 sm:p-4'>
                    <div className='flex flex-wrap items-center justify-between gap-3'>
                      <div className='flex items-center gap-3'>
                        <Avatar className='size-9'>
                          {member.avatarUrl && <AvatarImage src={member.avatarUrl} alt='' />}
                          <AvatarFallback className='text-xs font-semibold'>
                            {member.username.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className='flex items-center gap-2'>
                            <span className='text-sm font-bold text-foreground'>
                              {member.displayName}
                            </span>
                            <Badge variant={roleBadgeVariant(member.role)} className='text-[10px]'>
                              {roleLabel(member.role)}
                            </Badge>
                          </div>
                          <span className='text-muted-foreground font-mono text-xs'>
                            @{member.username}
                          </span>
                        </div>
                      </div>

                      {/* Completion Badge */}
                      <div className='text-right'>
                        <div className='flex items-center gap-2 text-xs font-medium'>
                          <span className='text-muted-foreground'>Completion Rate:</span>
                          <span className='font-bold text-foreground'>{member.completionRate}%</span>
                        </div>
                        <span className='text-muted-foreground text-[11px]'>
                          {member.doneCount} of {member.totalAssigned} tickets done
                        </span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className='space-y-4 p-3 sm:p-4'>
                    {/* Progress Bar */}
                    <div className='space-y-1.5'>
                      <div className='bg-muted relative h-2 w-full overflow-hidden rounded-full'>
                        <div
                          className='bg-emerald-500 transition-all duration-300'
                          style={{ width: `${member.completionRate}%`, height: '100%' }}
                        />
                      </div>
                      <div className='grid grid-cols-4 gap-2 text-center text-xs'>
                        <div className='rounded bg-muted/40 p-1.5'>
                          <span className='text-muted-foreground block text-[10px]'>Assigned</span>
                          <span className='font-bold'>{member.totalAssigned}</span>
                        </div>
                        <div className='rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 p-1.5'>
                          <span className='block text-[10px]'>In Progress</span>
                          <span className='font-bold'>{member.inProgressCount}</span>
                        </div>
                        <div className='rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 p-1.5'>
                          <span className='block text-[10px]'>Done</span>
                          <span className='font-bold'>{member.doneCount}</span>
                        </div>
                        <div className={cn(
                          'rounded p-1.5',
                          member.overdueCount > 0 ? 'bg-destructive/10 text-destructive' : 'bg-muted/40 text-muted-foreground'
                        )}>
                          <span className='block text-[10px]'>Overdue</span>
                          <span className='font-bold'>{member.overdueCount}</span>
                        </div>
                      </div>
                    </div>

                    {/* Task List */}
                    {member.tasks.length > 0 ? (
                      <div className='space-y-1.5 pt-1'>
                        <p className='text-muted-foreground text-xs font-medium'>
                          Assigned Tickets ({member.tasks.length}):
                        </p>
                        <div className='divide-border/60 max-h-56 divide-y overflow-y-auto rounded-md border text-xs'>
                          {member.tasks.map((task) => (
                            <div
                              key={task.id}
                              className='flex items-center justify-between gap-3 p-2 hover:bg-muted/30'
                            >
                              <div className='flex min-w-0 items-center gap-2'>
                                <Link
                                  href={`/projects/${projectId}/issues?board=${task.boardId}`}
                                  className='text-muted-foreground font-mono font-medium hover:underline'
                                >
                                  {task.issueKey}
                                </Link>
                                <span className={cn('truncate', task.isDone && 'line-through text-muted-foreground')}>
                                  {task.title}
                                </span>
                              </div>
                              <div className='flex shrink-0 items-center gap-1.5'>
                                {task.isOverdue && (
                                  <Badge variant='destructive' className='text-[9px] py-0 px-1'>
                                    Overdue
                                  </Badge>
                                )}
                                <Badge variant={task.isDone ? 'default' : 'secondary'} className='text-[9px] py-0 px-1.5 font-normal'>
                                  {task.status}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className='text-muted-foreground text-xs italic'>
                        No tickets currently assigned to this member.
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}

              {/* Unassigned Bucket */}
              {selectedMemberId === 'all' && unassigned.total > 0 && (
                <Card className='border-dashed'>
                  <CardHeader className='p-3 sm:p-4'>
                    <div className='flex items-center justify-between'>
                      <CardTitle className='text-sm font-semibold text-muted-foreground'>
                        Unassigned Tickets ({unassigned.total})
                      </CardTitle>
                      <span className='text-xs text-muted-foreground'>
                        {unassigned.open} open, {unassigned.done} done
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className='p-3 pt-0 sm:p-4 sm:pt-0'>
                    <div className='divide-border/60 max-h-40 divide-y overflow-y-auto rounded-md border text-xs'>
                      {unassigned.tasks.map((task) => (
                        <div key={task.id} className='flex items-center justify-between p-2'>
                          <span className='text-muted-foreground font-mono'>{task.issueKey}</span>
                          <span className='truncate pr-2'>{task.title}</span>
                          <Badge variant='outline' className='text-[9px]'>{task.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
