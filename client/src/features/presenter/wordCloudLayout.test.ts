import { describe, expect, it } from 'vitest';
import type { WordResult } from '../../../../shared/results';
import { calculateWordSize, layoutWordCloud } from './wordCloudLayout';

const words: WordResult[] = [
  { key: 'ai', label: 'AI', count: 20 },
  { key: 'creative', label: 'สร้างสรรค์', count: 12 },
  { key: 'tools', label: 'เครื่องมือ', count: 9 },
  { key: 'apply', label: 'ประยุกต์ใช้', count: 7 },
  { key: 'classroom', label: 'ห้องเรียน', count: 6 },
  { key: 'fun', label: 'สนุก', count: 5 },
  { key: 'ideas', label: 'ไอเดีย', count: 4 },
  { key: 'activity', label: 'กิจกรรม', count: 3 },
  { key: 'technique', label: 'เทคนิค', count: 2 },
  { key: 'inspiration', label: 'แรงบันดาลใจ', count: 1 },
];

function overlaps(
  left: ReturnType<typeof layoutWordCloud>[number],
  right: ReturnType<typeof layoutWordCloud>[number],
) {
  return !(
    left.x + left.width / 2 + 4 <= right.x - right.width / 2 ||
    right.x + right.width / 2 + 4 <= left.x - left.width / 2 ||
    left.y + left.height / 2 + 4 <= right.y - right.height / 2 ||
    right.y + right.height / 2 + 4 <= left.y - left.height / 2
  );
}

describe('calculateWordSize', () => {
  it('uses the approved square-root scale from 28px to 96px', () => {
    expect(calculateWordSize(20, 20)).toBe(96);
    expect(calculateWordSize(5, 20)).toBe(59);
    expect(calculateWordSize(1, 20)).toBe(28);
  });
});

describe('layoutWordCloud', () => {
  it('returns the same deterministic placement on every run', () => {
    expect(layoutWordCloud(words)).toEqual(layoutWordCloud(words));
  });

  it('keeps every word inside the canvas without collisions', () => {
    const placements = layoutWordCloud(words);

    expect(placements).toHaveLength(words.length);
    for (const placement of placements) {
      expect(placement.x - placement.width / 2).toBeGreaterThanOrEqual(8);
      expect(placement.x + placement.width / 2).toBeLessThanOrEqual(712);
      expect(placement.y - placement.height / 2).toBeGreaterThanOrEqual(8);
      expect(placement.y + placement.height / 2).toBeLessThanOrEqual(372);
    }

    for (let left = 0; left < placements.length; left += 1) {
      for (let right = left + 1; right < placements.length; right += 1) {
        expect(overlaps(placements[left], placements[right])).toBe(false);
      }
    }
  });

  it('anchors the most frequent word at the visual center', () => {
    const [first] = layoutWordCloud(words);
    expect(first.word.key).toBe('ai');
    expect(first).toMatchObject({ x: 360, y: 190, fontSize: 96 });
  });
});
