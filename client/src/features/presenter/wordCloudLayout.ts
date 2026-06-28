import type { WordResult } from '../../../../shared/results';

export const WORD_CLOUD_WIDTH = 720;
export const WORD_CLOUD_HEIGHT = 380;

export interface WordPlacement {
  word: WordResult;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
}

export function calculateWordSize(count: number, maxCount: number): number {
  const minSize = 28;
  const maxSize = 96;
  if (maxCount <= 1) return minSize;
  const ratio = Math.max(0, (count - 1) / (maxCount - 1));
  return Math.round(minSize + (maxSize - minSize) * Math.sqrt(ratio));
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function graphemeCount(value: string): number {
  if (typeof Intl.Segmenter === 'function') {
    return [...new Intl.Segmenter('th', { granularity: 'grapheme' }).segment(value)].length;
  }
  return Array.from(value).length;
}

function estimateBounds(label: string, fontSize: number) {
  return {
    width: Math.max(fontSize * 1.15, graphemeCount(label) * fontSize * 0.58),
    height: fontSize * 1.08,
  };
}

function collides(candidate: WordPlacement, placements: readonly WordPlacement[]): boolean {
  const padding = 8;
  return placements.some((placed) =>
    !(
      candidate.x + candidate.width / 2 + padding <= placed.x - placed.width / 2 ||
      placed.x + placed.width / 2 + padding <= candidate.x - candidate.width / 2 ||
      candidate.y + candidate.height / 2 + padding <= placed.y - placed.height / 2 ||
      placed.y + placed.height / 2 + padding <= candidate.y - candidate.height / 2
    ),
  );
}

function isInside(candidate: WordPlacement): boolean {
  const inset = 8;
  return (
    candidate.x - candidate.width / 2 >= inset &&
    candidate.x + candidate.width / 2 <= WORD_CLOUD_WIDTH - inset &&
    candidate.y - candidate.height / 2 >= inset &&
    candidate.y + candidate.height / 2 <= WORD_CLOUD_HEIGHT - inset
  );
}

export function layoutWordCloud(words: readonly WordResult[]): WordPlacement[] {
  if (words.length === 0) return [];

  const maxCount = Math.max(...words.map((word) => word.count));
  const ordered = words
    .map((word, index) => ({ word, index }))
    .sort((left, right) => right.word.count - left.word.count || left.index - right.index);
  const placements: WordPlacement[] = [];

  for (const { word } of ordered) {
    const preferredSize = calculateWordSize(word.count, maxCount);
    let placed: WordPlacement | undefined;

    for (let fontSize = preferredSize; fontSize >= 16 && !placed; fontSize -= 2) {
      const bounds = estimateBounds(word.label, fontSize);
      const angleOffset = (stableHash(word.key) / 0xffffffff) * Math.PI * 2;

      for (let attempt = 0; attempt < 2500; attempt += 1) {
        const radius = attempt === 0 ? 0 : 6 * Math.sqrt(attempt);
        const angle = angleOffset + attempt * 0.47;
        const candidate: WordPlacement = {
          word,
          x: Math.round((WORD_CLOUD_WIDTH / 2 + Math.cos(angle) * radius) * 100) / 100,
          y: Math.round((WORD_CLOUD_HEIGHT / 2 + Math.sin(angle) * radius * 0.58) * 100) / 100,
          width: bounds.width,
          height: bounds.height,
          fontSize,
        };

        if (isInside(candidate) && !collides(candidate, placements)) {
          placed = candidate;
          break;
        }
      }
    }

    if (placed) placements.push(placed);
  }

  return placements;
}
