import { describe, it, expect } from 'vitest';
import { computeCurrentStreak, computeActivityHeatmap } from '../../src/scripts/progress/StreakTracker.js';

function daysAgo(n, hour = 12) {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

describe('computeCurrentStreak', () => {
  it('returns 0 for no history', () => {
    expect(computeCurrentStreak([])).toBe(0);
  });

  it('returns 1 for activity only today', () => {
    const history = [{ date: daysAgo(0) }];
    expect(computeCurrentStreak(history)).toBe(1);
  });

  it('counts consecutive days ending today', () => {
    const history = [{ date: daysAgo(0) }, { date: daysAgo(1) }, { date: daysAgo(2) }];
    expect(computeCurrentStreak(history)).toBe(3);
  });

  it('stops counting at the first gap', () => {
    const history = [{ date: daysAgo(0) }, { date: daysAgo(1) }, { date: daysAgo(3) }];
    expect(computeCurrentStreak(history)).toBe(2);
  });

  it('still counts a streak if today has no activity yet but yesterday does', () => {
    const history = [{ date: daysAgo(1) }, { date: daysAgo(2) }];
    expect(computeCurrentStreak(history)).toBe(2);
  });

  it('returns 0 if the most recent activity was 2+ days ago', () => {
    const history = [{ date: daysAgo(2) }, { date: daysAgo(3) }];
    expect(computeCurrentStreak(history)).toBe(0);
  });

  it('multiple entries on the same day only count once', () => {
    const history = [{ date: daysAgo(0, 9) }, { date: daysAgo(0, 14) }, { date: daysAgo(0, 20) }];
    expect(computeCurrentStreak(history)).toBe(1);
  });
});

describe('computeActivityHeatmap', () => {
  it('returns exactly 30 entries', () => {
    const heatmap = computeActivityHeatmap([]);
    expect(heatmap).toHaveLength(30);
  });

  it('marks today (last entry) as active when there is activity today', () => {
    const history = [{ date: daysAgo(0) }];
    const heatmap = computeActivityHeatmap(history);
    expect(heatmap[29].active).toBe(true);
  });

  it('marks days without activity as inactive', () => {
    const heatmap = computeActivityHeatmap([]);
    expect(heatmap.every((d) => d.active === false)).toBe(true);
  });

  it('orders days oldest first', () => {
    const heatmap = computeActivityHeatmap([]);
    const firstDate = new Date(heatmap[0].dateKey);
    const lastDate = new Date(heatmap[29].dateKey);
    expect(firstDate.getTime()).toBeLessThan(lastDate.getTime());
  });
});
