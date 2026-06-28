import { describe, expect, it } from 'vitest';
import { groupAnswers, normalizeAnswer, similarity } from './wordNormalizer';

describe('normalizeAnswer', () => {
  it('normalizes Unicode, whitespace, punctuation, and English casing', () => {
    expect(normalizeAnswer('  AI!!!  ')).toBe('ai');
    expect(normalizeAnswer('นำ   ไปใช้')).toBe('นำ ไปใช้');
  });
});

describe('similarity', () => {
  it('returns one for equal values and a lower score for edits', () => {
    expect(similarity('เครื่องมือ', 'เครื่องมือ')).toBe(1);
    expect(similarity('เครื่องมือ', 'เครื่องมื')).toBeGreaterThanOrEqual(0.88);
  });
});

describe('groupAnswers', () => {
  it('groups case, punctuation, aliases, and close misspellings', () => {
    const words = groupAnswers([' AI ', 'ai!', 'เอไอ', 'เครื่องมือ', 'เครื่องมื']);

    expect(words).toEqual([
      { key: 'ai', label: 'AI', count: 3 },
      { key: 'เครื่องมือ', label: 'เครื่องมือ', count: 2 },
    ]);
  });

  it('does not merge unrelated Thai words', () => {
    expect(groupAnswers(['สนุก', 'สงบ'])).toEqual([
      { key: 'สนุก', label: 'สนุก', count: 1 },
      { key: 'สงบ', label: 'สงบ', count: 1 },
    ]);
  });

  it('uses the most frequent original form as the display label', () => {
    expect(groupAnswers(['ไอเดีย', 'ไอเดีย', 'ไอเดีย!'])).toEqual([
      { key: 'ไอเดีย', label: 'ไอเดีย', count: 3 },
    ]);
  });
});
