import { describe, it, expect, vi, beforeEach } from 'vitest';

// awardQuizXp dispatches to the real Store singleton, so we spy on
// store.dispatch to verify the XP *calculation* without needing a DOM
// or a full app boot.
import { store } from '../../src/scripts/store/Store.js';
import { awardQuizXp } from '../../src/scripts/quizzes/Feedback.js';

describe('awardQuizXp', () => {
  beforeEach(() => {
    vi.spyOn(store, 'dispatch').mockImplementation(() => {});
  });

  it('awards full XP when no hints were used', () => {
    awardQuizXp({ id: 'q1', xp: 100 }, false);
    expect(store.dispatch).toHaveBeenCalledWith({
      type: 'xp/award',
      payload: { source: 'quiz:q1', amount: 100 },
    });
  });

  it('awards half XP (rounded) when hints were used', () => {
    awardQuizXp({ id: 'q2', xp: 25 }, true);
    expect(store.dispatch).toHaveBeenCalledWith({
      type: 'xp/award',
      payload: { source: 'quiz:q2', amount: 13 }, // round(12.5) = 13
    });
  });

  it('handles xp values that halve evenly', () => {
    awardQuizXp({ id: 'q3', xp: 40 }, true);
    expect(store.dispatch).toHaveBeenCalledWith({
      type: 'xp/award',
      payload: { source: 'quiz:q3', amount: 20 },
    });
  });
});
