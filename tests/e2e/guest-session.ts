import type { Page } from '@playwright/test';

export async function startGuestSession(page: Page) {
  await page.context().addCookies([{
    name: 'LearnUp_guest_mode',
    value: 'true',
    domain: 'localhost',
    path: '/'
  }]);
  await page.addInitScript(() => {
    localStorage.setItem('LearnUp_is_guest', 'true');
  });
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
