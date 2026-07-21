import { test, expect } from '@playwright/test';

test.describe('Slice 4 — Editor + Execution', () => {
  test('editor renders with Run/Reset/Copy toolbar', async ({ page }) => {
    await page.goto('/#/language/python/easy/variables');
    await expect(page.getByRole('button', { name: /Run/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reset' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Copy' })).toBeVisible();
  });

  test('running JavaScript code shows real output', async ({ page }) => {
    await page.goto('/#/language/javascript/easy/variables');
    // Type into CodeMirror's content-editable surface.
    await page.locator('.cm-content').click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type('console.log("hello from e2e")');
    await page.getByRole('button', { name: /Run/ }).click();
    await expect(page.getByText('hello from e2e')).toBeVisible({ timeout: 10000 });
  });

  test('C++ shows an honest simulated-output message, not a fake success', async ({ page }) => {
    await page.goto('/#/language/cpp/easy/variables');
    await page.getByRole('button', { name: /Run/ }).click();
    await expect(page.getByText(/doesn't compile live/)).toBeVisible({ timeout: 10000 });
  });

  test('reset restores the starter code after edits', async ({ page }) => {
    await page.goto('/#/language/javascript/easy/variables');
    await page.locator('.cm-content').click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type('totally different code');
    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(page.locator('.cm-content')).not.toContainText('totally different code');
  });

  test('fullscreen toggle via toolbar button expands the editor', async ({ page }) => {
    await page.goto('/#/language/python/easy/variables');
    await page.getByRole('button', { name: 'Toggle fullscreen' }).click();
    await expect(page.locator('.editor--fullscreen-host')).toBeVisible();
  });
});
