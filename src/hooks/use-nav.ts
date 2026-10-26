'use client';

import type { NavItem, NavGroup } from '@/types';

export function filterNavItem(item: NavItem): boolean {
  if (item.disabled) return false;
  // If no access requirement, it's visible
  if (!item.access) return true;
  return true;
}

export function useFilteredNavItems(items: NavItem[]): NavItem[] {
  return items
    .filter(filterNavItem)
    .map((item) => ({
      ...item,
      items: item.items ? item.items.filter(filterNavItem) : undefined
    }));
}

export function useFilteredNavGroups(groups: NavGroup[]): NavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: useFilteredNavItems(group.items)
    }))
    .filter((group) => group.items.length > 0);
}
