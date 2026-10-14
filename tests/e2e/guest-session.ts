import type { Page } from '@playwright/test';

export async function startGuestSession(page: Page) {
  const guestSessionId = '00000000-0000-4000-8000-000000000001';
  await page.context().addCookies([
    {
      name: 'LearnUp_guest_mode',
      value: 'true',
      domain: 'localhost',
      path: '/'
    },
    {
      name: 'LearnUp_guest_session_id',
      value: guestSessionId,
      domain: 'localhost',
      path: '/'
    }
  ]);
  await page.addInitScript((id) => {
    localStorage.setItem('LearnUp_is_guest', 'true');
    localStorage.setItem('LearnUp_guest_session_id', id);
  }, guestSessionId);
  await page.route('**/api/**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ data: [] })
  }));
}

export async function mockLibraryData(
  page: Page,
  items: Array<Record<string, unknown>>,
  progress: Array<Record<string, unknown>> = []
) {
  await page.route('**/api/learning-items', (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: items })
      });
    }
    return route.fallback();
  });
  await page.route('**/api/progress/library', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ data: progress })
  }));
}
