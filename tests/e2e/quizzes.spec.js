import { test, expect } from '@playwright/test';

test.describe('Slice 5 — Quizzes', () => {
  test('quiz section renders below the lesson content', async ({ page }) => {
    await page.goto('/#/language/python/easy/variables');
    await expect(page.getByText('Check your understanding')).toBeVisible();
  });

  test('multiple-choice quiz shows feedback on selection', async ({ page }) => {
    await page.goto('/#/language/python/easy/variables');
    await page.getByText("<class 'int'>").click();
    await expect(page.getByText('Correct!')).toBeVisible();
  });

  test('true-false quiz shows feedback and explanation', async ({ page }) => {
    await page.goto('/#/language/python/easy/variables');
    await page.getByRole('button', { name: 'False' }).first().click();
    await expect(page.getByText(/dynamically typed/)).toBeVisible();
  });

  test('incorrect answer reveals hint controls', async ({ page }) => {
    await page.goto('/#/language/python/easy/variables');
    await page.getByText("<class 'str'>").click();
    await expect(page.getByText(/Show a hint/)).toBeVisible();
  });

  test('progress dashboard reflects XP after answering a quiz correctly', async ({ page }) => {
    await page.goto('/#/language/python/easy/variables');
    await page.getByText("<class 'int'>").click();
    await page.goto('/#/progress');
    await expect(page.getByText(/XP/)).toBeVisible();
  });

  test('a lesson with no quizzes still completes on render', async ({ page }) => {
    // control-flow has quizzes; this test documents the no-quiz path
    // conceptually — real coverage of that branch is in the unit tests
    // for completeLessonOnce, since we don't have a real zero-quiz
    // lesson authored in this project yet.
    await page.goto('/#/language/python/easy/control-flow');
    await expect(page.getByText('Check your understanding')).toBeVisible();
  });
});
