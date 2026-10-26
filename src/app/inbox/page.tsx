import PageContainer from '@/components/layout/page-container';
import { InboxView } from '@/features/notifications/components/inbox-view';
import { listNotifications } from '@/features/notifications/service';
import { requireUser } from '@/lib/auth/session';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Inbox' };

export default async function InboxPage() {
  const user = await requireUser();
  const notifications = await listNotifications(user.id, { limit: 100 });

  return (
    <PageContainer
      pageTitle='Inbox'
      pageDescription='Mentions, task assignments, and workspace activity.'
    >
      <InboxView notifications={notifications} />
    </PageContainer>
  );
}
