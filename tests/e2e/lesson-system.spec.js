import { test, expect } from '@playwright/test';

test.describe('Slice 3 — Lesson System', () => {
  test('lesson page renders sanitized HTML content', async ({ page }) => {
    await page.goto('/#/language/python/easy/variables');
    await expect(page.locator('h1', { hasText: 'Variables' })).toBeVisible();
    await expect(page.getByText('dynamically typed')).toBeVisible();
  });

  test('breadcrumb shows language / tier / lesson', async ({ page }) => {
    await page.goto('/#/language/python/easy/variables');
    const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]');
    await expect(breadcrumb.getByText('Python')).toBeVisible();
    await expect(breadcrumb.getByText('Easy')).toBeVisible();
  });

  test('next button navigates to the following lesson', async ({ page }) => {
    await page.goto('/#/language/python/easy/variables');
    await page.locator('[data-nav="next"]').click();
    await expect(page).toHaveURL(/control-flow/);
  });

  test('prev button is disabled on the first lesson in a tier', async ({ page }) => {
    await page.goto('/#/language/python/easy/variables');
    await expect(page.locator('[data-nav="prev"]')).toBeDisabled();
  });

  test('code blocks render with a copy button', async ({ page }) => {
    await page.goto('/#/language/python/easy/variables');
    await expect(page.locator('.code-copy-btn').first()).toBeVisible();
  });

  test('editor pane shows the Slice 4 placeholder honestly', async ({ page }) => {
    await page.goto('/#/language/python/easy/variables');
    await expect(page.getByText('Live editor arrives in the next build slice')).toBeVisible();
  });

  test('J/K keyboard shortcuts navigate between lessons', async ({ page }) => {
    await page.goto('/#/language/python/easy/variables');
    await page.keyboard.press('j');
    await expect(page).toHaveURL(/control-flow/);
    await page.keyboard.press('k');
    await expect(page).toHaveURL(/\/variables$/);
  });
});
