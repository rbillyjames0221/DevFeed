import DashboardShell from '@/components/layout/dashboard-shell';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Inbox',
  description: 'DevFeed notifications and inbox'
};

export default async function InboxLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
