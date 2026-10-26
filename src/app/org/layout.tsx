import DashboardShell from '@/components/layout/dashboard-shell';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Organization',
  description: 'DevFeed organization and portfolio'
};

export default async function OrgLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
