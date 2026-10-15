import { test, expect } from '@playwright/test';

test.describe('Marketplace E2E: Search, Filtering & Preview Drawer', () => {
  test.beforeEach(async ({ context }) => {
    // Authenticate as guest session
    await context.addCookies([
      {
        name: 'LearnUp_guest_mode',
        value: 'true',
        domain: 'localhost',
        path: '/'
      },
      {
        name: 'LearnUp_guest_session_id',
        value: '00000000-0000-4000-8000-000000000001',
        domain: 'localhost',
        path: '/'
      }
    ]);
  });

  test('opens marketplace, searches templates, inspects preview drawer and verifies curriculum syllabus', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    // Open templates modal via sidebar button
    const browseBtn = page.getByRole('button', { name: /Browse Community Blueprints & Templates/i });
    await expect(browseBtn).toBeVisible();
    await browseBtn.click();

    // Verify modal is open
    const modal = page.locator('[class*="modalContainer"]').first();
    await expect(modal).toBeVisible();

    // 1. Search for Karpathy
    const searchInput = page.getByPlaceholder(/Search templates by subject/i);
    await searchInput.fill('Karpathy');
    await expect(page.getByText('Andrej Karpathy: Neural Networks Zero to Hero')).toBeVisible();

    // Clear search
    await searchInput.fill('');
    await expect(searchInput).toHaveValue('');

    // 2. Filter by Category: Roadmap Tracks
    const roadmapTab = page.getByRole('tab', { name: /Roadmap Tracks/i }).or(page.getByText('Roadmap Tracks')).first();
    await roadmapTab.click();
    await expect(page.getByText('Full-Stack Cloud & Distributed Systems Blueprint')).toBeVisible();

    // 3. Inspect Blueprint to open Preview Drawer
    const inspectBtn = page.getByRole('button', { name: /Inspect/i }).first();
    await inspectBtn.click();

    // Verify Preview Drawer is open
    const previewDrawer = page.locator('[class*="previewDrawer"]').first();
    await expect(previewDrawer).toBeVisible();
    await expect(page.getByText('Workspace Isolation')).toBeVisible();
    await expect(page.getByText(/Curriculum Milestones/i)).toBeVisible();

    // 4. Close preview drawer via Escape key
    await page.keyboard.press('Escape');
    await expect(previewDrawer).not.toBeVisible();
    await expect(modal).toBeVisible();

    // 5. Close main modal via Escape key
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
  });
});
