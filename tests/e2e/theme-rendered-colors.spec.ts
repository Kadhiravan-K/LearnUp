import { test, expect } from '@playwright/test';

test.describe('Theme Rendered Colors & Real Refresh Regression', () => {
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
    await page.goto('/dashboard', { waitUntil: 'networkidle' });

    // 2. Clear LearnUp_theme
    await page.evaluate(() => {
      localStorage.removeItem('LearnUp_theme');
    });

    // 3. Reload the application
    await page.reload({ waitUntil: 'networkidle' });

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
    expect(defaultStyles.varBg.toLowerCase()).toBe('#f8fafc');
    expect(defaultStyles.varSurface.toLowerCase()).toBe('#ffffff');
    expect(defaultStyles.varTextPrimary.toLowerCase()).toBe('#0f172a');
    expect(defaultStyles.varPrimary.toLowerCase()).toBe('#6366f1');

    // 5. Verify explicit light mode
    await page.evaluate(() => {
      localStorage.setItem('LearnUp_theme', 'light');
    });
    await page.reload({ waitUntil: 'networkidle' });

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
    expect(lightStyles.varBg.toLowerCase()).toBe('#f8fafc');
    expect(lightStyles.varSurface.toLowerCase()).toBe('#ffffff');

    // 6. Switch to dark
    await page.evaluate(() => {
      localStorage.setItem('LearnUp_theme', 'dark');
    });

    // 7. Reload
    await page.reload({ waitUntil: 'networkidle' });

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
    expect(darkStyles.varBg.toLowerCase()).toBe('#0b0f19');
    expect(darkStyles.varSurface.toLowerCase()).toBe('#111827');
    expect(darkStyles.varTextPrimary.toLowerCase()).toBe('#f8fafc');
    expect(darkStyles.varPrimary.toLowerCase()).toBe('#818cf8');

    // 9. Switch back to light
    await page.evaluate(() => {
      localStorage.setItem('LearnUp_theme', 'light');
    });

    // 10. Reload
    await page.reload({ waitUntil: 'networkidle' });

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
    expect(lightAgainStyles.varBg.toLowerCase()).toBe('#f8fafc');
    expect(lightAgainStyles.varSurface.toLowerCase()).toBe('#ffffff');
    expect(lightAgainStyles.varTextPrimary.toLowerCase()).toBe('#0f172a');
    expect(lightAgainStyles.varPrimary.toLowerCase()).toBe('#6366f1');

    await context.close();
  });
});
