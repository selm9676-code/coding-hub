import { describe, it, expect } from 'vitest';
import {
  selectLevelFromXp,
  selectCompletedLessonCount,
  selectLanguageCompletionRatio,
} from '../../src/scripts/store/selectors.js';

describe('selectLevelFromXp', () => {
  it('returns level 1 for 0 xp', () => {
    expect(selectLevelFromXp(0)).toMatchObject({ level: 1, xpIntoLevel: 0 });
  });

  it('levels up once enough xp is earned', () => {
    const level1 = selectLevelFromXp(50);
    expect(level1.level).toBe(1);

    const level2 = selectLevelFromXp(250);
    expect(level2.level).toBeGreaterThan(1);
  });
});

describe('selectCompletedLessonCount', () => {
  it('counts entries in progress.byLessonId', () => {
    const state = { progress: { byLessonId: { a: {}, b: {} } } };
    expect(selectCompletedLessonCount(state)).toBe(2);
  });
});

describe('selectLanguageCompletionRatio', () => {
  it('returns 0 for an empty lesson list', () => {
    const state = { progress: { byLessonId: {} } };
    expect(selectLanguageCompletionRatio(state, 'python', [])).toBe(0);
  });

  it('computes the ratio of completed to total lessons', () => {
    const state = { progress: { byLessonId: { 'py-1': {}, 'py-2': {} } } };
    const ratio = selectLanguageCompletionRatio(state, 'python', ['py-1', 'py-2', 'py-3', 'py-4']);
    expect(ratio).toBe(0.5);
  });
});
