import { describe, it, expect } from 'vitest';
import { getHeaderTitleAndBreadcrumbs } from '@/components/layout/Header';

describe('Header Title and Breadcrumb Resolution (SF-034)', () => {
  it('resolves Dashboard title for /dashboard and root /', () => {
    expect(getHeaderTitleAndBreadcrumbs('/dashboard')).toEqual({
      title: 'Dashboard'
    });
    expect(getHeaderTitleAndBreadcrumbs('/')).toEqual({
      title: 'Dashboard'
    });
  });

  it('resolves Library title for /library', () => {
    expect(getHeaderTitleAndBreadcrumbs('/library')).toEqual({
      title: 'Library'
    });
  });

  it('resolves Learn title and breadcrumbs for /library/[id]', () => {
    const result = getHeaderTitleAndBreadcrumbs('/library/33333333-3333-3333-3333-333333333333');
    expect(result.title).toBe('Learn');
    expect(result.breadcrumbs).toEqual([
      { label: 'Library', href: '/library' },
      { label: 'Learn' }
    ]);
  });

  it('resolves Settings title for /settings and subroutes', () => {
    expect(getHeaderTitleAndBreadcrumbs('/settings')).toEqual({
      title: 'Settings'
    });
    expect(getHeaderTitleAndBreadcrumbs('/settings/account')).toEqual({
      title: 'Settings'
    });
  });

  it('resolves Focus Sanctuary title and breadcrumbs for /focus', () => {
    expect(getHeaderTitleAndBreadcrumbs('/focus')).toEqual({
      title: 'Focus Sanctuary',
      breadcrumbs: [
        { label: 'Workspace', href: '/dashboard' },
        { label: 'Focus' }
      ]
    });
  });

  it('provides a safe default fallback for unmatched routes', () => {
    expect(getHeaderTitleAndBreadcrumbs('/unknown-route')).toEqual({
      title: 'LearnUp'
    });
  });
});
