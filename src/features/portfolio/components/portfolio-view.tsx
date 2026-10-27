'use client';

import { useState } from 'react';
import { GenerateDocReportModal } from '@/features/portfolio/components/generate-doc-report-modal';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import type { ProjectHealthSummary } from '@/features/portfolio/service';
import { toast } from 'sonner';

interface PortfolioViewProps {
  projects: ProjectHealthSummary[];
  canGenerateReports: boolean;
}

export function PortfolioView({
  projects,
  canGenerateReports
}: PortfolioViewProps) {
  const [reportProject, setReportProject] = useState<ProjectHealthSummary | null>(null);

  const onTrackCount = projects.filter((p) => p.health === 'ON_TRACK').length;
  const atRiskCount = projects.filter((p) => p.health === 'AT_RISK').length;
  const lateCount = projects.filter((p) => p.health === 'LATE').length;

  return (
    <div className='space-y-6'>
      {/* Portfolio Health Summary Cards */}
      <div className='grid grid-cols-2 gap-4 sm:grid-cols-4'>
        <Card>
          <CardHeader className='pb-2'>
            <CardDescription className='text-xs'>Active Projects</CardDescription>
            <CardTitle className='text-2xl font-bold'>{projects.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-muted-foreground text-xs'>Total projects in portfolio</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardDescription className='text-xs'>On Track</CardDescription>
            <CardTitle className='text-2xl font-bold text-emerald-600 dark:text-emerald-400'>
              {onTrackCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-muted-foreground text-xs'>Zero overdue or blocked spikes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardDescription className='text-xs'>At Risk</CardDescription>
            <CardTitle className='text-2xl font-bold text-amber-600 dark:text-amber-400'>
              {atRiskCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-muted-foreground text-xs'>Tasks overdue or untouched ≥7d</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardDescription className='text-xs'>Late / Behind</CardDescription>
            <CardTitle className='text-2xl font-bold text-rose-600 dark:text-rose-400'>
              {lateCount}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-muted-foreground text-xs'>Severe overdue or stuck backlog</p>
          </CardContent>
        </Card>
      </div>

      {/* Projects Health Table */}
      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Portfolio Delivery Matrix</CardTitle>
          <CardDescription className='text-xs'>
            Aggregated cross-project delivery velocity, health indicators, and active sprint targets.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='overflow-x-auto'>
            <table className='w-full text-left text-sm'>
              <thead className='border-b text-xs text-muted-foreground uppercase'>
                <tr>
                  <th className='py-3 pr-4'>Project</th>
                  <th className='px-4 py-3'>Health</th>
                  <th className='px-4 py-3'>Open / Total</th>
                  <th className='px-4 py-3'>Overdue</th>
                  <th className='px-4 py-3'>Stuck (≥7d)</th>
                  <th className='px-4 py-3'>Active Sprint</th>
                  <th className='py-3 pl-4 text-right'>Actions</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-border'>
                {projects.map((p) => {
                  return (
                    <tr key={p.id} className='hover:bg-muted/40 transition-colors'>
                      <td className='py-3 pr-4 font-medium'>
                        <Link
                          href={`/projects/${p.id}/issues`}
                          className='hover:underline font-semibold'
                        >
                          {p.name}
                        </Link>
                        <span className='text-muted-foreground text-xs ml-2'>
                          ({p.issuePrefix})
                        </span>
                      </td>

                      <td className='px-4 py-3'>
                        <Badge
                          variant={
                            p.health === 'ON_TRACK'
                              ? 'default'
                              : p.health === 'AT_RISK'
                              ? 'secondary'
                              : 'destructive'
                          }
                          className={
                            p.health === 'ON_TRACK'
                              ? 'bg-emerald-600 hover:bg-emerald-600 text-white'
                              : p.health === 'AT_RISK'
                              ? 'bg-amber-500 hover:bg-amber-500 text-white'
                              : ''
                          }
                        >
                          {p.health.replace('_', ' ')}
                        </Badge>
                      </td>

                      <td className='px-4 py-3 text-muted-foreground'>
                        {p.openIssues} / {p.totalIssues}
                      </td>

                      <td className='px-4 py-3'>
                        {p.overdueIssues > 0 ? (
                          <span className='font-semibold text-rose-600 dark:text-rose-400'>
                            {p.overdueIssues}
                          </span>
                        ) : (
                          <span className='text-muted-foreground'>0</span>
                        )}
                      </td>

                      <td className='px-4 py-3'>
                        {p.stuckIssues > 0 ? (
                          <span className='font-semibold text-amber-600 dark:text-amber-400'>
                            {p.stuckIssues}
                          </span>
                        ) : (
                          <span className='text-muted-foreground'>0</span>
                        )}
                      </td>

                      <td className='px-4 py-3'>
                        {p.activeSprint ? (
                          <span className='text-xs font-medium'>
                            {p.activeSprint.name}
                            {p.activeSprint.committedPoints && (
                              <span className='text-muted-foreground ml-1'>
                                ({p.activeSprint.committedPoints} pts)
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className='text-muted-foreground text-xs italic'>None</span>
                        )}
                      </td>

                      <td className='py-3 pl-4 text-right'>
                        <div className='flex items-center justify-end gap-2'>
                          {canGenerateReports && (
                            <Button
                              size='sm'
                              variant='outline'
                              onClick={() => setReportProject(p)}
                              title='Configure and generate status report in Project Docs'
                            >
                              <Icons.page className='mr-1 size-3.5' /> Report
                            </Button>
                          )}
                          <Link href={`/projects/${p.id}/analytics`}>
                            <Button size='sm' variant='ghost'>
                              <Icons.trendingUp className='size-3.5' />
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <GenerateDocReportModal
        project={reportProject}
        open={reportProject !== null}
        onOpenChange={(open) => !open && setReportProject(null)}
      />
    </div>
  );
}
