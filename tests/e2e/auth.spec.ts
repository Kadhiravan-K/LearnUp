import { test, expect } from '@playwright/test';

test.describe('Authentication Journey', () => {
  test('Signup -> Login navigation and validation checks', async ({ page }) => {
    // 1. Visit Signup Page
    await page.goto('/signup');
    await expect(page.getByRole('heading', { name: 'Create an account' })).toBeVisible();
    await expect(page.getByLabel('Email address')).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Confirm password')).toBeVisible();

    // 2. Navigate to Login via Link
    await page.getByRole('link', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/.*login.*/);
    await expect(page.getByRole('heading', { name: /Who's learning today\?|Who is studying today\?|Welcome back/i })).toBeVisible();
  });
});
