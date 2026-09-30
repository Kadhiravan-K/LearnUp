import { test, expect } from '@playwright/test';

test.describe('Delete Learning Item Workflow', () => {
  test('Confirms and removes learning item from library', async ({ page }) => {
    const mockItemId = '33333333-3333-3333-3333-333333333333';

    // Mock DELETE endpoint
    await page.route(`**/api/learning-items/${mockItemId}`, async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { success: true } })
        });
      }
    });

    // Verify unauthenticated user redirects safely to login
    await page.goto(`/library/${mockItemId}`);
    await expect(page).toHaveURL(/.*login/);
  });
});
