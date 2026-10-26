import { DEVFEED_SECTIONS } from '@/config/devfeed-sections';
import type { NavGroup } from '@/types';
export const navGroups: NavGroup[] = [
  {
    label: 'Workspace',
    items: [
      {
        title: 'Dashboard',
        url: '/dashboard/overview',
        icon: 'dashboard',
        isActive: false,
        shortcut: ['d', 'd'],
        items: []
      },
      {
        title: 'Inbox',
        url: '/inbox',
        icon: 'notification',
        isActive: false,
        items: []
      },
      {
        title: 'Portfolio',
        url: '/org/default/overview',
        icon: 'trendingUp',
        isActive: false,
        items: []
      },
      {
        title: 'Teams',
        url: '/teams',
        icon: 'teams',
        isActive: false,
        items: []
      },
      // ERD lives as a tab inside Database now, so it has no nav entry of its own.
      ...DEVFEED_SECTIONS.filter((section) => !['docs', 'erd'].includes(section.slug)).map(
        (section) => ({
          title: section.title,
          url: `/dashboard/${section.slug}`,
          icon: section.icon,
          isActive: false,
          // Docs and Drawings are tabs of the Board, so Board stays highlighted on them.
          activeFor: section.slug === 'issues' ? ['/dashboard/docs', '/dashboard/drawings'] : [],
          items: []
        })
      )
    ]
  }
];
