import { test, expect } from '@playwright/test';

test.describe('Slice 1 — Foundation smoke test', () => {
  test('app boots to the home view', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Coding Hub');
  });

  test('bottom nav navigates between routes', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Progress' }).click();
    await expect(page).toHaveURL(/#\/progress/);
    await expect(page.locator('h1')).toContainText('Your Progress');
  });

  test('skip link is focusable and jumps to main content', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    await expect(page.locator('.skip-link')).toBeFocused();
  });

  test('unmatched route shows a 404 with a way back home', async ({ page }) => {
    await page.goto('/#/this-route-does-not-exist');
    await expect(page.locator('h1')).toContainText('Page not found');
    await page.getByRole('link', { name: 'Back to Home' }).click();
    await expect(page).toHaveURL(/#\/home/);
  });
});
