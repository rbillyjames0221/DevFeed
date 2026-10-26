import DashboardShell from '@/components/layout/dashboard-shell';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Teams',
  description: 'DevFeed engineering teams'
};

export default async function TeamsLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
