'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import {
  markNotificationReadAction,
  markAllNotificationsReadAction
} from '@/features/notifications/actions';
import { toast } from 'sonner';

export interface NotificationItem {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  readAt: Date | null;
  createdAt: Date;
  actor: {
    id: string;
    username: string;
    name: string | null;
    avatarUrl: string | null;
  } | null;
  issue: {
    id: string;
    issueKey: string;
    title: string;
    status: string;
  } | null;
  project: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export function InboxView({
  notifications
}: {
  notifications: NotificationItem[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<'all' | 'unread' | 'mentions'>('all');

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.readAt;
    if (filter === 'mentions') return n.kind === 'MENTIONED';
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const handleMarkRead = (id: string) => {
    startTransition(async () => {
      const res = await markNotificationReadAction({ notificationId: id });
      if (res.ok) router.refresh();
    });
  };

  const handleMarkAllRead = () => {
    startTransition(async () => {
      const res = await markAllNotificationsReadAction();
      if (res.ok) {
        toast.success('Marked all as read');
        router.refresh();
      }
    });
  };

  return (
    <div className='max-w-4xl space-y-4'>
      <div className='flex items-center justify-between'>
        <div className='flex gap-2'>
          <Button
            size='sm'
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            size='sm'
            variant={filter === 'unread' ? 'default' : 'outline'}
            onClick={() => setFilter('unread')}
          >
            Unread ({unreadCount})
          </Button>
          <Button
            size='sm'
            variant={filter === 'mentions' ? 'default' : 'outline'}
            onClick={() => setFilter('mentions')}
          >
            Mentions
          </Button>
        </div>

        {unreadCount > 0 && (
          <Button
            size='sm'
            variant='ghost'
            disabled={pending}
            onClick={handleMarkAllRead}
          >
            <Icons.check className='mr-1.5 size-4' /> Mark all as read
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <Card className='border-dashed'>
          <CardContent className='flex flex-col items-center justify-center py-12 text-center'>
            <Icons.notification className='text-muted-foreground mb-3 size-10' />
            <p className='font-medium text-sm'>No notifications</p>
            <p className='text-muted-foreground text-xs'>
              {filter === 'unread' ? 'You have caught up with all updates.' : 'Activity and mentions will appear here.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className='divide-border divide-y rounded-md border bg-card'>
          {filtered.map((item) => (
            <div
              key={item.id}
              className={`flex items-start gap-3 p-4 transition-colors ${
                !item.readAt ? 'bg-muted/40 font-medium' : ''
              }`}
            >
              <Avatar className='size-8 mt-0.5'>
                {item.actor?.avatarUrl && (
                  <AvatarImage src={item.actor.avatarUrl} alt='' />
                )}
                <AvatarFallback>
                  {(item.actor?.username ?? 'DF').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className='min-w-0 flex-1 space-y-1'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2 text-sm'>
                    <span className='font-semibold'>{item.title}</span>
                    <Badge variant='outline' className='text-[10px] uppercase'>
                      {item.kind.replace('_', ' ')}
                    </Badge>
                  </div>
                  <span className='text-muted-foreground text-xs'>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {item.body && (
                  <p className='text-muted-foreground text-xs line-clamp-2'>
                    {item.body}
                  </p>
                )}

                {item.issue && item.project && (
                  <div className='pt-1'>
                    <Link
                      href={`/projects/${item.project.id}/issues`}
                      onClick={() => !item.readAt && handleMarkRead(item.id)}
                      className='text-primary hover:underline text-xs inline-flex items-center gap-1'
                    >
                      <span>View {item.issue.issueKey}: {item.issue.title}</span>
                      <Icons.chevronRight className='size-3' />
                    </Link>
                  </div>
                )}
              </div>

              {!item.readAt && (
                <Button
                  size='icon'
                  variant='ghost'
                  className='size-7'
                  onClick={() => handleMarkRead(item.id)}
                  title='Mark as read'
                >
                  <Icons.check className='size-3.5' />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
