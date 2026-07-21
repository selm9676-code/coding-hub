import { describe, it, expect } from 'vitest';
import { compileLesson } from '../../build-plugins/vite-plugin-lessons.js';

const SAMPLE_LESSON = `---
id: variables
title: Variables & Data Types
tier: easy
duration: 15
xp: 100
prerequisites: []
tags: ["basics", "memory"]
---

# Variables

Some text.

\`\`\`python
x = 5
\`\`\`

More text.

\`\`\`python
y = 10
\`\`\`
`;

describe('compileLesson', () => {
  it('extracts frontmatter fields into the compiled shape', () => {
    const compiled = compileLesson(SAMPLE_LESSON, 'python', 'easy');
    expect(compiled.id).toBe('variables');
    expect(compiled.title).toBe('Variables & Data Types');
    expect(compiled.duration).toBe(15);
    expect(compiled.xp).toBe(100);
    expect(compiled.tags).toEqual(['basics', 'memory']);
    expect(compiled.languageId).toBe('python');
  });

  it('renders the body to HTML', () => {
    const compiled = compileLesson(SAMPLE_LESSON, 'python', 'easy');
    expect(compiled.html).toContain('<h1');
    expect(compiled.html).toContain('Variables');
  });

  it('extracts all fenced code blocks separately', () => {
    const compiled = compileLesson(SAMPLE_LESSON, 'python', 'easy');
    expect(compiled.codeBlocks).toHaveLength(2);
    expect(compiled.codeBlocks[0]).toEqual({ language: 'python', code: 'x = 5' });
    expect(compiled.codeBlocks[1]).toEqual({ language: 'python', code: 'y = 10' });
  });

  it('defaults tier to the folder tier when frontmatter omits it', () => {
    const raw = SAMPLE_LESSON.replace('tier: easy\n', '');
    const compiled = compileLesson(raw, 'python', 'easy');
    expect(compiled.tier).toBe('easy');
  });
});
