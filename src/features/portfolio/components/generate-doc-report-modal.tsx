'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { generateDocReportAction } from '@/features/reports/actions';
import type { ProjectHealthSummary } from '@/features/portfolio/service';
import { toast } from 'sonner';

interface GenerateDocReportModalProps {
  project: ProjectHealthSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ReportType = 'weekly' | 'monthly' | 'custom';
type ReportScope = 'overall' | 'member';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

function getStartAndEndOfWeek(date: Date): { start: string; end: string } {
  const d = new Date(date);
  const day = d.getDay();
  // Monday as start of week: day 0 is Sunday, so diff is -6 or 1 - day
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10)
  };
}

function getStartAndEndOfMonth(year: number, monthZeroIndexed: number): { start: string; end: string } {
  const start = new Date(Date.UTC(year, monthZeroIndexed, 1));
  const end = new Date(Date.UTC(year, monthZeroIndexed + 1, 0));
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10)
  };
}

export function GenerateDocReportModal({
  project,
  open,
  onOpenChange
}: GenerateDocReportModalProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [now] = useState(() => new Date());
  const todayStr = useMemo(() => now.toISOString().slice(0, 10), [now]);

  // Form states
  const [scope, setScope] = useState<ReportScope>('overall');
  const [memberUserId, setMemberUserId] = useState<string>('');
  const [reportType, setReportType] = useState<ReportType>('weekly');

  // Date controls
  const [weekReferenceDate, setWeekReferenceDate] = useState<string>(todayStr);
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [customStart, setCustomStart] = useState<string>(
    new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [customEnd, setCustomEnd] = useState<string>(todayStr);

  if (!project) return null;

  // Selected member details
  const selectedMember = project.members.find((m) => m.id === memberUserId);
  const memberDisplayName = selectedMember
    ? selectedMember.name || selectedMember.username
    : 'Member';

  // Compute active date range based on reportType
  let activeStartDate = todayStr;
  let activeEndDate = todayStr;
  let dateRangeLabel = '';

  if (reportType === 'weekly') {
    const parsedRef = new Date(`${weekReferenceDate}T00:00:00Z`);
    const week = getStartAndEndOfWeek(isNaN(parsedRef.getTime()) ? now : parsedRef);
    activeStartDate = week.start;
    activeEndDate = week.end;
    dateRangeLabel = `${week.start} to ${week.end}`;
  } else if (reportType === 'monthly') {
    const month = getStartAndEndOfMonth(selectedYear, selectedMonth);
    activeStartDate = month.start;
    activeEndDate = month.end;
    dateRangeLabel = `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;
  } else {
    activeStartDate = customStart;
    activeEndDate = customEnd;
    dateRangeLabel = `${customStart} to ${customEnd}`;
  }

  // Preview Title and Folder
  const previewTitle =
    scope === 'member'
      ? `${reportType === 'weekly' ? 'Weekly' : reportType === 'monthly' ? 'Monthly' : 'Custom'} Report — ${memberDisplayName} (${dateRangeLabel})`
      : `${reportType === 'weekly' ? 'Weekly Status Report' : reportType === 'monthly' ? 'Monthly Delivery Report' : 'Custom Status Report'} — ${project.name} (${dateRangeLabel})`;

  const previewFolder =
    reportType === 'weekly'
      ? 'Reports/Weekly'
      : reportType === 'monthly'
        ? 'Reports/Monthly'
        : 'Reports/Custom';

  const handleGenerate = () => {
    if (scope === 'member' && !memberUserId) {
      toast.error('Please select a project member for this report');
      return;
    }

    startTransition(async () => {
      const res = await generateDocReportAction({
        projectId: project.id,
        scope,
        memberUserId: scope === 'member' ? memberUserId : undefined,
        reportType,
        startDate: activeStartDate,
        endDate: activeEndDate,
        monthYear: reportType === 'monthly' ? `${MONTH_NAMES[selectedMonth]} ${selectedYear}` : undefined
      });

      if (res.ok && res.slug) {
        toast.success(`Generated: ${res.title || previewTitle}`);
        onOpenChange(false);
        router.push(`/projects/${project.id}/docs?page=${encodeURIComponent(res.slug)}`);
      } else {
        toast.error(res.error || 'Failed to generate status report');
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] sm:max-w-xl overflow-y-auto overflow-x-hidden'>
        <DialogHeader className='border-b pb-3 text-left'>
          <div className='flex items-center gap-2'>
            <Badge variant='outline' className='text-[10px]'>
              Docs Report Generator
            </Badge>
            <span className='text-muted-foreground text-xs'>{project.name}</span>
          </div>
          <DialogTitle className='text-lg font-bold sm:text-xl'>
            Generate Project Status Report
          </DialogTitle>
          <DialogDescription className='text-xs'>
            Choose your target scope and date range. The report will be generated as a markdown document in Project Docs.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 pt-1'>
          {/* 1. REPORT SCOPE */}
          <div className='space-y-2'>
            <span className='block text-xs font-semibold tracking-tight text-foreground'>
              1. Report Scope
            </span>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
              <button
                type='button'
                onClick={() => setScope('overall')}
                className={`flex cursor-pointer flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors min-w-0 ${
                  scope === 'overall'
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border/80 bg-background hover:bg-muted/50'
                }`}
              >
                <div className='flex items-center gap-1.5 font-medium text-xs'>
                  <Icons.dashboard className='size-3.5 text-primary shrink-0' />
                  <span>Overall Project</span>
                </div>
                <p className='text-muted-foreground text-[11px] leading-tight'>
                  All members, boards, and cross-team deliveries.
                </p>
              </button>

              <button
                type='button'
                onClick={() => {
                  setScope('member');
                  if (!memberUserId && project.members[0]) {
                    setMemberUserId(project.members[0].id);
                  }
                }}
                className={`flex cursor-pointer flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors min-w-0 ${
                  scope === 'member'
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border/80 bg-background hover:bg-muted/50'
                }`}
              >
                <div className='flex items-center gap-1.5 font-medium text-xs'>
                  <Icons.user className='size-3.5 text-primary shrink-0' />
                  <span>Individual Member</span>
                </div>
                <p className='text-muted-foreground text-[11px] leading-tight'>
                  Progress and tickets for a specific team member or manager.
                </p>
              </button>
            </div>

            {/* Member Selection Dropdown (if member scope chosen) */}
            {scope === 'member' && (
              <div className='pt-1'>
                <label htmlFor='member-select' className='text-muted-foreground text-[11px] font-medium'>
                  Select team member:
                </label>
                <select
                  id='member-select'
                  value={memberUserId}
                  onChange={(e) => setMemberUserId(e.target.value)}
                  className='bg-background border-input text-foreground mt-1 h-9 w-full rounded-md border px-3 text-xs shadow-2xs outline-none'
                >
                  {project.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name || m.username} (@{m.username}) — {m.role}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 2. REPORT PERIOD / TYPE */}
          <div className='space-y-2'>
            <span className='block text-xs font-semibold tracking-tight text-foreground'>
              2. Report Period
            </span>
            <div className='grid grid-cols-3 gap-2'>
              {(
                [
                  { id: 'weekly', label: 'Weekly', desc: '7-day window' },
                  { id: 'monthly', label: 'Monthly', desc: 'Calendar month' },
                  { id: 'custom', label: 'Custom', desc: 'Specific dates' }
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type='button'
                  onClick={() => setReportType(tab.id)}
                  className={`flex cursor-pointer flex-col items-center rounded-lg border p-2.5 text-center transition-colors min-w-0 ${
                    reportType === tab.id
                      ? 'border-primary bg-primary/5 font-semibold text-primary ring-1 ring-primary'
                      : 'border-border/80 bg-background text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  <span className='text-xs truncate w-full'>{tab.label}</span>
                  <span className='text-[10px] opacity-75 truncate w-full'>{tab.desc}</span>
                </button>
              ))}
            </div>

            {/* Date Pickers based on Report Type */}
            <div className='rounded-lg border bg-muted/20 p-3'>
              {reportType === 'weekly' && (
                <div className='space-y-1.5'>
                  <label htmlFor='week-date' className='text-xs font-medium'>
                    Select target week:
                  </label>
                  <Input
                    id='week-date'
                    type='date'
                    value={weekReferenceDate}
                    onChange={(e) => setWeekReferenceDate(e.target.value)}
                    className='h-8 bg-background text-xs'
                  />
                  <p className='text-muted-foreground text-[11px]'>
                    Evaluates work from <strong>{activeStartDate}</strong> to <strong>{activeEndDate}</strong>.
                  </p>
                </div>
              )}

              {reportType === 'monthly' && (
                <div className='grid grid-cols-2 gap-2'>
                  <div>
                    <label htmlFor='month-select' className='text-xs font-medium'>
                      Month:
                    </label>
                    <select
                      id='month-select'
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                      className='bg-background border-input text-foreground mt-1 h-8 w-full rounded-md border px-2.5 text-xs shadow-2xs outline-none'
                    >
                      {MONTH_NAMES.map((name, index) => (
                        <option key={name} value={index}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor='year-select' className='text-xs font-medium'>
                      Year:
                    </label>
                    <select
                      id='year-select'
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className='bg-background border-input text-foreground mt-1 h-8 w-full rounded-md border px-2.5 text-xs shadow-2xs outline-none'
                    >
                      {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((yr) => (
                        <option key={yr} value={yr}>
                          {yr}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {reportType === 'custom' && (
                <div className='grid grid-cols-2 gap-2'>
                  <div>
                    <label htmlFor='custom-start' className='text-xs font-medium'>
                      From:
                    </label>
                    <Input
                      id='custom-start'
                      type='date'
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className='mt-1 h-8 bg-background text-xs'
                    />
                  </div>
                  <div>
                    <label htmlFor='custom-end' className='text-xs font-medium'>
                      To:
                    </label>
                    <Input
                      id='custom-end'
                      type='date'
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className='mt-1 h-8 bg-background text-xs'
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3. LIVE PREVIEW */}
          <div className='rounded-lg border bg-muted/40 p-3 space-y-1 text-xs'>
            <span className='text-muted-foreground block text-[10px] font-semibold uppercase tracking-wider'>
              Target Doc in Project Docs
            </span>
            <p className='font-semibold text-foreground truncate'>
              {previewTitle}
            </p>
            <div className='flex flex-wrap items-center gap-x-2 gap-y-1 pt-0.5 text-[11px] text-muted-foreground'>
              <span>Folder: <code className='text-primary font-mono'>{previewFolder}</code></span>
              <span>·</span>
              <span>Date range: <strong className='text-foreground'>{activeStartDate}</strong> to <strong className='text-foreground'>{activeEndDate}</strong></span>
            </div>
          </div>
        </div>

        <DialogFooter className='flex flex-row items-center justify-end gap-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type='button'
            size='sm'
            disabled={pending}
            onClick={handleGenerate}
            className='gap-1.5'
          >
            {pending ? (
              <>
                <Icons.spinner className='size-3.5 animate-spin' />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Icons.post className='size-3.5' />
                <span>Generate in Docs</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
