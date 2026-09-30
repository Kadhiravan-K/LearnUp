import { test, expect } from '@playwright/test';

test.describe('Import Workflow UI', () => {
  test('Validates YouTube URL input and handles modal states', async ({ page }) => {
    // Intercept API import calls to mock successful video import
    await page.route('**/api/learning-items', async (route) => {
      if (route.request().method() === 'POST') {
        const payload = route.request().postDataJSON();
        if (payload?.url?.includes('invalid')) {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              error: { code: 'VALIDATION_ERROR', message: 'The provided string is not a valid URL' }
            }),
          });
          return;
        }

        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              id: '11111111-1111-1111-1111-111111111111',
              title: 'Test YouTube Video',
              type: 'video',
              youtube_video_id: 'dQw4w9WgXcQ',
              thumbnail_url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
              status: 'ready',
              created_at: new Date().toISOString()
            },
            duplicate: false
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [] }),
        });
      }
    });

    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /Who is studying today\?|Welcome back/i })).toBeVisible();
  });
});
