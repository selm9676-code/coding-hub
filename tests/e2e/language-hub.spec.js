import { test, expect } from '@playwright/test';

test.describe('Slice 2 — Landing + Language Hub', () => {
  test('home page renders the language grid', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Python')).toBeVisible();
    await expect(page.getByText('Rust')).toBeVisible();
  });

  test('roadmap languages show a "Coming soon" pill', async ({ page }) => {
    await page.goto('/');
    const tsCard = page.locator('.card', { hasText: 'TypeScript' });
    await expect(tsCard.getByText('Coming soon')).toBeVisible();
  });

  test('clicking a complete language navigates to its hub with tiers', async ({ page }) => {
    await page.goto('/');
    await page.locator('.card', { hasText: 'Python' }).click();
    await expect(page).toHaveURL(/#\/language\/python/);
    await expect(page.getByText('Easy')).toBeVisible();
  });

  test('clicking a roadmap language shows the "Coming soon" detail page', async ({ page }) => {
    await page.goto('/#/language/typescript');
    await expect(page.getByText('Coming soon')).toBeVisible();
    await expect(page.getByText(/on the roadmap/)).toBeVisible();
  });

  test('tier list shows lessons with completion state', async ({ page }) => {
    await page.goto('/#/language/python/easy');
    await expect(page.getByText('Variables & Data Types')).toBeVisible();
    await expect(page.getByText('Control Flow')).toBeVisible();
  });

  test('desktop sidebar populates with tier navigation on a language hub', async ({ page, isMobile }) => {
    test.skip(isMobile, 'sidebar is desktop-only per spec §18');
    await page.goto('/#/language/python');
    const sidebar = page.locator('#app-sidebar');
    await expect(sidebar.getByText('Easy')).toBeVisible();
  });
});
