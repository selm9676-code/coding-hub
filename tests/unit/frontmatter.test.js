import { describe, it, expect } from 'vitest';
import { parseFrontmatter } from '../../build-plugins/frontmatter.js';

describe('parseFrontmatter', () => {
  it('extracts flat string, number, and boolean values', () => {
    const raw = `---
id: variables
title: Variables & Data Types
tier: easy
duration: 15
xp: 100
---

# Body content here`;
    const { frontmatter, body } = parseFrontmatter(raw);
    expect(frontmatter.id).toBe('variables');
    expect(frontmatter.title).toBe('Variables & Data Types');
    expect(frontmatter.duration).toBe(15);
    expect(frontmatter.xp).toBe(100);
    expect(body).toBe('# Body content here');
  });

  it('extracts array values', () => {
    const raw = `---
tags: ["basics", "memory"]
prerequisites: []
---
body`;
    const { frontmatter } = parseFrontmatter(raw);
    expect(frontmatter.tags).toEqual(['basics', 'memory']);
    expect(frontmatter.prerequisites).toEqual([]);
  });

  it('returns empty frontmatter for content with no frontmatter block', () => {
    const raw = '# Just a heading\n\nSome body text.';
    const { frontmatter, body } = parseFrontmatter(raw);
    expect(frontmatter).toEqual({});
    expect(body).toBe(raw);
  });

  it('parses boolean-looking values as booleans', () => {
    const raw = `---
featured: true
archived: false
---
body`;
    const { frontmatter } = parseFrontmatter(raw);
    expect(frontmatter.featured).toBe(true);
    expect(frontmatter.archived).toBe(false);
  });
});
