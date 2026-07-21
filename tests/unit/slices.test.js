import { describe, it, expect } from 'vitest';
import { progressReducer, PROGRESS_INITIAL_STATE } from '../../src/scripts/store/slices/progressSlice.js';
import { quizReducer, QUIZ_INITIAL_STATE } from '../../src/scripts/store/slices/quizSlice.js';
import { uiReducer, UI_INITIAL_STATE } from '../../src/scripts/store/slices/uiSlice.js';
import { xpReducer, XP_INITIAL_STATE } from '../../src/scripts/store/slices/xpSlice.js';

describe('progressReducer', () => {
  it('records a completed lesson', () => {
    const next = progressReducer(PROGRESS_INITIAL_STATE, {
      type: 'progress/completeLesson',
      payload: { lessonId: 'py-vars', score: 90, timeSpent: 120 },
    });
    expect(next.byLessonId['py-vars']).toMatchObject({ lessonId: 'py-vars', score: 90, timeSpent: 120 });
  });

  it('accumulates timeSpent across repeated completions', () => {
    const first = progressReducer(PROGRESS_INITIAL_STATE, {
      type: 'progress/completeLesson',
      payload: { lessonId: 'py-vars', score: 90, timeSpent: 100 },
    });
    const second = progressReducer(first, {
      type: 'progress/completeLesson',
      payload: { lessonId: 'py-vars', score: 95, timeSpent: 50 },
    });
    expect(second.byLessonId['py-vars'].timeSpent).toBe(150);
  });

  it('caps recentlyViewed at 20 entries and dedupes', () => {
    let state = PROGRESS_INITIAL_STATE;
    for (let i = 0; i < 25; i += 1) {
      state = progressReducer(state, {
        type: 'progress/recordView',
        payload: { lessonId: `lesson-${i}` },
      });
    }
    expect(state.recentlyViewed).toHaveLength(20);
    expect(state.recentlyViewed[0]).toBe('lesson-24');

    const revisited = progressReducer(state, {
      type: 'progress/recordView',
      payload: { lessonId: 'lesson-24' },
    });
    expect(revisited.recentlyViewed.filter((id) => id === 'lesson-24')).toHaveLength(1);
    expect(revisited.recentlyViewed).toHaveLength(20);
  });
});

describe('quizReducer', () => {
  it('marks first attempt score and increments attempts', () => {
    const next = quizReducer(QUIZ_INITIAL_STATE, {
      type: 'quiz/recordAttempt',
      payload: { quizId: 'py-vars-q1', score: 75 },
    });
    expect(next.byQuizId['py-vars-q1']).toMatchObject({ attempts: 1, bestScore: 75, firstAttemptScore: 75 });
  });

  it('keeps firstAttemptScore fixed and bestScore as the max across retries', () => {
    let state = quizReducer(QUIZ_INITIAL_STATE, {
      type: 'quiz/recordAttempt',
      payload: { quizId: 'q1', score: 50 },
    });
    state = quizReducer(state, { type: 'quiz/recordAttempt', payload: { quizId: 'q1', score: 90 } });
    expect(state.byQuizId.q1.firstAttemptScore).toBe(50);
    expect(state.byQuizId.q1.bestScore).toBe(90);
    expect(state.byQuizId.q1.attempts).toBe(2);
  });
});

describe('uiReducer', () => {
  it('opens and closes a modal', () => {
    const opened = uiReducer(UI_INITIAL_STATE, {
      type: 'ui/openModal',
      payload: { id: 'shortcuts', props: { foo: 'bar' } },
    });
    expect(opened.activeModal).toEqual({ id: 'shortcuts', props: { foo: 'bar' } });

    const closed = uiReducer(opened, { type: 'ui/closeModal' });
    expect(closed.activeModal).toBeNull();
  });

  it('pushes and dismisses toasts', () => {
    const withToast = uiReducer(UI_INITIAL_STATE, {
      type: 'ui/pushToast',
      payload: { id: 't1', variant: 'success', message: 'Saved!' },
    });
    expect(withToast.toasts).toHaveLength(1);

    const dismissed = uiReducer(withToast, { type: 'ui/dismissToast', payload: { id: 't1' } });
    expect(dismissed.toasts).toHaveLength(0);
  });
});

describe('xpReducer', () => {
  it('awards xp and records history', () => {
    const next = xpReducer(XP_INITIAL_STATE, {
      type: 'xp/award',
      payload: { source: 'lesson-complete', amount: 100 },
    });
    expect(next.total).toBe(100);
    expect(next.history).toHaveLength(1);
    expect(next.history[0]).toMatchObject({ source: 'lesson-complete', amount: 100 });
  });
});
