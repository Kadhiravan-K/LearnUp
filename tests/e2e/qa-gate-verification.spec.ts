import { test, expect } from '@playwright/test';

test.describe('QA Gate: Native Selects & Browse Templates Modal Verification', () => {
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

  test('verifies native select dropdowns render appropriate surfaces and options in light and dark mode', async ({ page }) => {
    // 1. Light Mode Verification
    await page.goto('/settings?tab=learning-prefs', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.setItem('LearnUp_theme', 'light');
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.style.colorScheme = 'light';
    });
    await page.reload({ waitUntil: 'domcontentloaded' });

    // Look for native select element in learning-prefs (srs-select)
    const select = page.locator('select#srs-select').first();
    await expect(select).toBeVisible();

    // Verify light mode select computed background
    const lightSelectBg = await select.evaluate((el) => getComputedStyle(el).backgroundColor);
    // Should be white or near-white surface (#FFFFFF or #F7FAF9)
    expect(['rgb(255, 255, 255)', 'rgb(247, 250, 249)']).toContain(lightSelectBg);

    // 2. Dark Mode Verification
    await page.evaluate(() => {
      localStorage.setItem('LearnUp_theme', 'dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.style.colorScheme = 'dark';
    });
    await page.reload({ waitUntil: 'domcontentloaded' });

    await expect(select).toBeVisible();
    const darkSelectBg = await select.evaluate((el) => getComputedStyle(el).backgroundColor);
    // Dark mode background must NOT be pure white (rgb(255, 255, 255))!
    expect(darkSelectBg).not.toBe('rgb(255, 255, 255)');
    const darkSelectColor = await select.evaluate((el) => getComputedStyle(el).color);
    expect(darkSelectColor).not.toBe('rgb(0, 0, 0)');
  });

  test('verifies Browse Community Templates modal layout on mobile viewport (375x667)', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 }
    });
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

    const page = await context.newPage();
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    // Open mobile navigation menu
    const menuBtn = page.getByRole('button', { name: /toggle navigation menu/i });
    if (await menuBtn.isVisible()) {
      await menuBtn.click();
    }

    // Click Browse Templates button in sidebar
    const browseBtn = page.getByRole('button', { name: /Browse Community Blueprints & Templates/i });
    await expect(browseBtn).toBeVisible();
    await browseBtn.click();

    const modal = page.locator('[class*="modalContainer"]').first();
    await expect(modal).toBeVisible();

    // Ensure modal does not overflow the 375px viewport
    const box = await modal.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.width).toBeLessThanOrEqual(375);
    }

    await context.close();
  });
});
