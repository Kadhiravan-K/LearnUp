import { test, expect } from '@playwright/test';

/**
 * Normalizes CSS hex color representations (e.g., #fff -> #ffffff).
 * Ensures color comparisons are semantic rather than format-dependent.
 */
function normalizeHex(hex: string): string {
  const trimmed = hex.trim().toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`;
  }
  return trimmed;
}

test.describe('Theme Rendered Colors & Real Refresh Regression', () => {
  test('keeps rendered rewards surfaces in sync with light and dark theme tokens', async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([{
      name: 'LearnUp_guest_mode',
      value: 'true',
      domain: 'localhost',
      path: '/',
    }]);

    const page = await context.newPage();
    await page.goto('/rewards', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('No rewards to display')).toBeVisible();

    const emptyState = page.getByText('No rewards to display').locator('..');
    await expect.poll(() => emptyState.evaluate((element) => getComputedStyle(element).backgroundColor))
      .toBe('rgb(248, 250, 252)');

    await page.evaluate(() => localStorage.setItem('LearnUp_theme', 'dark'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByText('No rewards to display')).toBeVisible();
    await expect.poll(() => emptyState.evaluate((element) => getComputedStyle(element).backgroundColor))
      .toBe('rgb(11, 15, 25)');

    await context.close();
  });

  test('verifies computed rendered styles switch correctly across reloads', async ({ browser }) => {
    // 1. Start with a fresh browser context
    const context = await browser.newContext({
      colorScheme: 'no-preference',
      extraHTTPHeaders: { 'Cache-Control': 'no-cache' },
    });

    // Support guest session access to dashboard
    await context.addCookies([{
      name: 'LearnUp_guest_mode',
      value: 'true',
      domain: 'localhost',
      path: '/',
    }]);

    const page = await context.newPage();
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    // 2. Clear LearnUp_theme
    await page.evaluate(() => {
      localStorage.removeItem('LearnUp_theme');
    });

    // 3. Reload the application
    await page.reload({ waitUntil: 'domcontentloaded' });

    // 4. Verify actual computed rendered colors (Default / Light)
    const defaultStyles = await page.evaluate(() => {
      const docStyle = getComputedStyle(document.documentElement);
      const bodyStyle = getComputedStyle(document.body);
      return {
        theme: document.documentElement.dataset.theme,
        bodyBg: bodyStyle.backgroundColor,
        bodyColor: bodyStyle.color,
        varBg: docStyle.getPropertyValue('--sf-color-bg').trim(),
        varSurface: docStyle.getPropertyValue('--sf-color-surface').trim(),
        varTextPrimary: docStyle.getPropertyValue('--sf-color-text-primary').trim(),
        varPrimary: docStyle.getPropertyValue('--sf-color-primary').trim(),
      };
    });

    expect(defaultStyles.theme).toBe('light');
    expect(defaultStyles.bodyBg).toBe('rgb(248, 250, 252)');
    expect(defaultStyles.bodyColor).toBe('rgb(15, 23, 42)');
    expect(normalizeHex(defaultStyles.varBg)).toBe('#f8fafc');
    expect(normalizeHex(defaultStyles.varSurface)).toBe('#ffffff');
    expect(normalizeHex(defaultStyles.varTextPrimary)).toBe('#0f172a');
    expect(normalizeHex(defaultStyles.varPrimary)).toBe('#6366f1');

    // 5. Verify explicit light mode
    await page.evaluate(() => {
      localStorage.setItem('LearnUp_theme', 'light');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });

    const lightStyles = await page.evaluate(() => {
      const docStyle = getComputedStyle(document.documentElement);
      const bodyStyle = getComputedStyle(document.body);
      return {
        theme: document.documentElement.dataset.theme,
        bodyBg: bodyStyle.backgroundColor,
        bodyColor: bodyStyle.color,
        varBg: docStyle.getPropertyValue('--sf-color-bg').trim(),
        varSurface: docStyle.getPropertyValue('--sf-color-surface').trim(),
      };
    });

    expect(lightStyles.theme).toBe('light');
    expect(lightStyles.bodyBg).toBe('rgb(248, 250, 252)');
    expect(lightStyles.bodyColor).toBe('rgb(15, 23, 42)');
    expect(normalizeHex(lightStyles.varBg)).toBe('#f8fafc');
    expect(normalizeHex(lightStyles.varSurface)).toBe('#ffffff');

    // 6. Switch to dark
    await page.evaluate(() => {
      localStorage.setItem('LearnUp_theme', 'dark');
    });

    // 7. Reload
    await page.reload({ waitUntil: 'domcontentloaded' });

    // 8. Verify actual dark colors
    const darkStyles = await page.evaluate(() => {
      const docStyle = getComputedStyle(document.documentElement);
      const bodyStyle = getComputedStyle(document.body);
      return {
        theme: document.documentElement.dataset.theme,
        bodyBg: bodyStyle.backgroundColor,
        bodyColor: bodyStyle.color,
        varBg: docStyle.getPropertyValue('--sf-color-bg').trim(),
        varSurface: docStyle.getPropertyValue('--sf-color-surface').trim(),
        varTextPrimary: docStyle.getPropertyValue('--sf-color-text-primary').trim(),
        varPrimary: docStyle.getPropertyValue('--sf-color-primary').trim(),
      };
    });

    expect(darkStyles.theme).toBe('dark');
    expect(darkStyles.bodyBg).toBe('rgb(11, 15, 25)');
    expect(darkStyles.bodyColor).toBe('rgb(248, 250, 252)');
    expect(normalizeHex(darkStyles.varBg)).toBe('#0b0f19');
    expect(normalizeHex(darkStyles.varSurface)).toBe('#111827');
    expect(normalizeHex(darkStyles.varTextPrimary)).toBe('#f8fafc');
    expect(normalizeHex(darkStyles.varPrimary)).toBe('#818cf8');

    // 9. Switch back to light
    await page.evaluate(() => {
      localStorage.setItem('LearnUp_theme', 'light');
    });

    // 10. Reload
    await page.reload({ waitUntil: 'domcontentloaded' });

    // 11. Verify actual light colors
    const lightAgainStyles = await page.evaluate(() => {
      const docStyle = getComputedStyle(document.documentElement);
      const bodyStyle = getComputedStyle(document.body);
      return {
        theme: document.documentElement.dataset.theme,
        bodyBg: bodyStyle.backgroundColor,
        bodyColor: bodyStyle.color,
        varBg: docStyle.getPropertyValue('--sf-color-bg').trim(),
        varSurface: docStyle.getPropertyValue('--sf-color-surface').trim(),
        varTextPrimary: docStyle.getPropertyValue('--sf-color-text-primary').trim(),
        varPrimary: docStyle.getPropertyValue('--sf-color-primary').trim(),
      };
    });

    expect(lightAgainStyles.theme).toBe('light');
    expect(lightAgainStyles.bodyBg).toBe('rgb(248, 250, 252)');
    expect(lightAgainStyles.bodyColor).toBe('rgb(15, 23, 42)');
    expect(normalizeHex(lightAgainStyles.varBg)).toBe('#f8fafc');
    expect(normalizeHex(lightAgainStyles.varSurface)).toBe('#ffffff');
    expect(normalizeHex(lightAgainStyles.varTextPrimary)).toBe('#0f172a');
    expect(normalizeHex(lightAgainStyles.varPrimary)).toBe('#6366f1');

    await page.goto('/settings?tab=customization', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Apply Workspace Theme' }).waitFor();
    await page.getByRole('button', { name: 'Apply Workspace Theme' }).click();
    await page.getByRole('button', { name: 'Switch to Dark Theme' }).click();
    await page.waitForTimeout(500);

    const darkAfterWorkspaceTheme = await page.evaluate(() => {
      const docStyle = getComputedStyle(document.documentElement);
      return {
        theme: document.documentElement.dataset.theme,
        primary: docStyle.getPropertyValue('--sf-color-primary').trim(),
        inlinePrimary: document.documentElement.style.getPropertyValue('--sf-color-primary'),
      };
    });

    expect(darkAfterWorkspaceTheme.theme).toBe('dark');
    expect(normalizeHex(darkAfterWorkspaceTheme.primary)).toBe('#818cf8');
    expect(darkAfterWorkspaceTheme.inlinePrimary).toBe('');

    await context.close();
  });
});
