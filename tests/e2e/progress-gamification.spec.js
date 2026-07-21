import { test, expect } from '@playwright/test';

test.describe('Slice 6 — Progress + Gamification', () => {
  test('progress dashboard shows level, streak, and lesson count', async ({ page }) => {
    await page.goto('/#/progress');
    await expect(page.getByText(/Level/)).toBeVisible();
    await expect(page.getByText(/Current Streak/)).toBeVisible();
    await expect(page.getByText(/Lessons Completed/)).toBeVisible();
  });

  test('activity heatmap renders 30 days', async ({ page }) => {
    await page.goto('/#/progress');
    await expect(page.getByText(/last 30 days/)).toBeVisible();
  });

  test('bookmarking a lesson persists across reload', async ({ page }) => {
    await page.goto('/#/language/python/easy/variables');
    await page.getByRole('button', { name: 'Bookmark this lesson' }).click();
    await page.reload();
    const bookmarkBtn = page.getByRole('button', { name: 'Bookmark this lesson' });
    await expect(bookmarkBtn).toHaveAttribute('aria-pressed', 'true');
  });

  test('bookmarked lesson appears on the Bookmarks page', async ({ page }) => {
    await page.goto('/#/language/python/easy/variables');
    await page.getByRole('button', { name: 'Bookmark this lesson' }).click();
    await page.goto('/#/bookmarks');
    await expect(page.getByText('variables')).toBeVisible();
  });

  test('saving a note persists it across reload', async ({ page }) => {
    await page.goto('/#/language/python/easy/variables');
    await page.locator('textarea').fill('My test note content');
    await page.getByRole('button', { name: 'Save note' }).click();
    await page.reload();
    await expect(page.locator('textarea')).toHaveValue('My test note content');
  });

  test('lesson completion and XP survive a reload', async ({ page }) => {
    await page.goto('/#/language/python/easy/variables');
    await page.getByText("<class 'int'>").click();
    await page.goto('/#/progress');
    const xpTextBefore = await page.getByText(/XP to next level/).textContent();
    await page.reload();
    const xpTextAfter = await page.getByText(/XP to next level/).textContent();
    expect(xpTextAfter).toBe(xpTextBefore);
  });
});
