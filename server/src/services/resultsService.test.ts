import { describe, expect, it } from 'vitest';
import { EMOJI_IDS } from '../../../shared/emoji';
import { buildResults } from './resultsService';

describe('buildResults', () => {
  it('builds a complete, stable aggregate snapshot', () => {
    const updatedAt = new Date('2026-06-28T05:00:00.000Z');
    const result = buildResults(
      {
        totalSubmissions: 2,
        answers: ['AI', 'เอไอ', 'สร้างสรรค์', 'ห้องเรียน', 'สนุก', 'AI'],
        emojiCounts: [
          { id: 'wow', count: 2 },
          { id: 'fun', count: 1 },
        ],
      },
      updatedAt,
    );

    expect(result.totalSubmissions).toBe(2);
    expect(result.words[0]).toEqual({ key: 'ai', label: 'AI', count: 3 });
    expect(result.emojis.map((item) => item.id)).toEqual(EMOJI_IDS);
    expect(result.emojis.find((item) => item.id === 'wow')?.count).toBe(2);
    expect(result.emojis.find((item) => item.id === 'angry')?.count).toBe(0);
    expect(result.updatedAt).toBe('2026-06-28T05:00:00.000Z');
  });

  it('returns a valid empty snapshot', () => {
    const result = buildResults(
      { totalSubmissions: 0, answers: [], emojiCounts: [] },
      new Date(0),
    );

    expect(result.words).toEqual([]);
    expect(result.emojis).toHaveLength(8);
    expect(result.emojis.every((item) => item.count === 0)).toBe(true);
  });
});
