import type { EmojiId } from './emoji';

export interface WordResult {
  key: string;
  label: string;
  count: number;
}

export interface EmojiResult {
  id: EmojiId;
  count: number;
}

export interface ResultsSnapshot {
  totalSubmissions: number;
  words: WordResult[];
  emojis: EmojiResult[];
  updatedAt: string;
}
