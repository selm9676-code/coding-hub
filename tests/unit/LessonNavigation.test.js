import { describe, it, expect } from 'vitest';
import { computeAdjacentLessons } from '../../src/scripts/lessons/LessonNavigation.js';

const tierData = {
  label: 'Easy',
  lessons: [
    { id: 'variables', title: 'Variables' },
    { id: 'control-flow', title: 'Control Flow' },
    { id: 'functions', title: 'Functions' },
  ],
};

describe('computeAdjacentLessons', () => {
  it('returns null prev for the first lesson', () => {
    const result = computeAdjacentLessons(tierData, 'variables');
    expect(result.prev).toBeNull();
    expect(result.next).toEqual({ id: 'control-flow', title: 'Control Flow' });
    expect(result.index).toBe(0);
    expect(result.total).toBe(3);
  });

  it('returns both prev and next for a middle lesson', () => {
    const result = computeAdjacentLessons(tierData, 'control-flow');
    expect(result.prev).toEqual({ id: 'variables', title: 'Variables' });
    expect(result.next).toEqual({ id: 'functions', title: 'Functions' });
    expect(result.index).toBe(1);
  });

  it('returns null next for the last lesson', () => {
    const result = computeAdjacentLessons(tierData, 'functions');
    expect(result.next).toBeNull();
    expect(result.prev).toEqual({ id: 'control-flow', title: 'Control Flow' });
    expect(result.index).toBe(2);
  });

  it('returns index -1 and null prev/next for an unknown lesson id', () => {
    const result = computeAdjacentLessons(tierData, 'nonexistent');
    expect(result.index).toBe(-1);
    expect(result.prev).toBeNull();
    expect(result.next).toBeNull();
  });

  it('handles an empty or missing tierData gracefully', () => {
    const result = computeAdjacentLessons(undefined, 'variables');
    expect(result.total).toBe(0);
    expect(result.index).toBe(-1);
    expect(result.prev).toBeNull();
    expect(result.next).toBeNull();
  });

  it('handles a tier with a single lesson', () => {
    const singleTier = { label: 'Easy', lessons: [{ id: 'only', title: 'Only Lesson' }] };
    const result = computeAdjacentLessons(singleTier, 'only');
    expect(result.prev).toBeNull();
    expect(result.next).toBeNull();
    expect(result.total).toBe(1);
  });
});
