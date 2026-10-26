'use client';

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from '@/components/ui/chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis
} from 'recharts';

interface AnalyticsData {
  burndownData: { date: string; scope: number; remaining: number; done: number }[];
  velocityData: { sprintName: string; committed: number; completed: number }[];
  cycleTimes: { p50: number | null; p85: number | null; sampleSize: number };
  leadTimes: { p50: number | null; p85: number | null; sampleSize: number };
  workloadData: { userId: string; username: string; assignedPoints: number; weeklyCapacity: number }[];
}

const burndownConfig = {
  remaining: { label: 'Remaining Points', color: 'var(--primary)' },
  done: { label: 'Completed Points', color: 'var(--chart-2, #22c55e)' }
} satisfies ChartConfig;

const velocityConfig = {
  committed: { label: 'Committed Points', color: 'color-mix(in oklab, var(--muted-foreground) 40%, transparent)' },
  completed: { label: 'Delivered Points', color: 'var(--primary)' }
} satisfies ChartConfig;

const workloadConfig = {
  assignedPoints: { label: 'Assigned Points', color: 'var(--primary)' },
  weeklyCapacity: { label: 'Target Capacity (pts)', color: 'var(--chart-3, #f59e0b)' }
} satisfies ChartConfig;

export function AnalyticsDashboard({ data }: { data: AnalyticsData }) {
  return (
    <div className='space-y-6'>
      {/* Top Metric Cards: Cycle & Lead Times */}
      <div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
        <Card>
          <CardHeader className='pb-2'>
            <CardDescription className='text-xs'>Cycle Time (p50)</CardDescription>
            <CardTitle className='text-2xl font-bold'>
              {data.cycleTimes.p50 ? `${data.cycleTimes.p50} d` : '—'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-muted-foreground text-xs'>Started → Done (50% shipped faster)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardDescription className='text-xs'>Cycle Time (p85)</CardDescription>
            <CardTitle className='text-2xl font-bold'>
              {data.cycleTimes.p85 ? `${data.cycleTimes.p85} d` : '—'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-muted-foreground text-xs'>Target delivery SLA benchmark</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardDescription className='text-xs'>Lead Time (p50)</CardDescription>
            <CardTitle className='text-2xl font-bold'>
              {data.leadTimes.p50 ? `${data.leadTimes.p50} d` : '—'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-muted-foreground text-xs'>Created → Shipped turnaround</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardDescription className='text-xs'>Recent Velocity</CardDescription>
            <CardTitle className='text-2xl font-bold'>
              {data.velocityData.length > 0
                ? Math.round(
                    data.velocityData.reduce((acc, v) => acc + v.completed, 0) /
                      data.velocityData.length
                  )
                : '—'}{' '}
              <span className='text-sm font-normal text-muted-foreground'>pts/sprint</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-muted-foreground text-xs'>Average completed per sprint</p>
          </CardContent>
        </Card>
      </div>

      {/* Sprint Velocity Chart */}
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Sprint Velocity & Commitment</CardTitle>
          <CardDescription className='text-xs'>
            Committed story points vs. points completed across the last sprint cycles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.velocityData.length === 0 ? (
            <div className='flex h-48 items-center justify-center text-muted-foreground text-sm italic'>
              Complete your first sprint to generate velocity history.
            </div>
          ) : (
            <ChartContainer config={velocityConfig} className='aspect-auto h-64 w-full'>
              <BarChart data={data.velocityData} margin={{ left: -15, right: 10, top: 10 }}>
                <CartesianGrid vertical={false} strokeDasharray='3 3' />
                <XAxis dataKey='sprintName' tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent indicator='dot' />} />
                <Bar
                  dataKey='committed'
                  fill='var(--color-committed)'
                  radius={[4, 4, 0, 0]}
                  maxBarSize={30}
                />
                <Bar
                  dataKey='completed'
                  fill='var(--color-completed)'
                  radius={[4, 4, 0, 0]}
                  maxBarSize={30}
                />
                <ChartLegend content={<ChartLegendContent />} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Burndown Trend */}
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Daily Scope & Burndown</CardTitle>
          <CardDescription className='text-xs'>
            Remaining points versus completed points tracked daily.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.burndownData.length === 0 ? (
            <div className='flex h-48 items-center justify-center text-muted-foreground text-sm italic'>
              No snapshots recorded yet. Daily snapshots are captured as tasks progress.
            </div>
          ) : (
            <ChartContainer config={burndownConfig} className='aspect-auto h-64 w-full'>
              <LineChart data={data.burndownData} margin={{ left: -15, right: 10, top: 10 }}>
                <CartesianGrid vertical={false} strokeDasharray='3 3' />
                <XAxis dataKey='date' tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent indicator='line' />} />
                <Line
                  type='monotone'
                  dataKey='remaining'
                  stroke='var(--color-remaining)'
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type='monotone'
                  dataKey='done'
                  stroke='var(--color-done)'
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <ChartLegend content={<ChartLegendContent />} />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Workload vs Capacity */}
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Member Workload Distribution</CardTitle>
          <CardDescription className='text-xs'>
            Open story points assigned per team member.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.workloadData.length === 0 ? (
            <div className='flex h-48 items-center justify-center text-muted-foreground text-sm italic'>
              No assigned tasks.
            </div>
          ) : (
            <ChartContainer config={workloadConfig} className='aspect-auto h-56 w-full'>
              <BarChart data={data.workloadData} margin={{ left: -15, right: 10, top: 10 }}>
                <CartesianGrid vertical={false} strokeDasharray='3 3' />
                <XAxis dataKey='username' tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent indicator='dot' />} />
                <Bar
                  dataKey='assignedPoints'
                  fill='var(--color-assignedPoints)'
                  radius={[4, 4, 0, 0]}
                  maxBarSize={30}
                />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
