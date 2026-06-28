import { EMOJI_IDS, type EmojiId } from '../../../shared/emoji';
import type { ResultsSnapshot } from '../../../shared/results';
import { groupAnswers } from '../../../shared/wordNormalizer';

export interface AggregateSource {
  totalSubmissions: number;
  answers: readonly string[];
  emojiCounts: ReadonlyArray<{ id: EmojiId; count: number }>;
}

export function buildResults(source: AggregateSource, now = new Date()): ResultsSnapshot {
  const counts = new Map(source.emojiCounts.map((item) => [item.id, item.count]));

  return {
    totalSubmissions: source.totalSubmissions,
    words: groupAnswers(source.answers),
    emojis: EMOJI_IDS.map((id) => ({ id, count: counts.get(id) ?? 0 })),
    updatedAt: now.toISOString(),
  };
}

export class ResultsService {
  constructor(private readonly repository: { getAggregateSource(): Promise<AggregateSource> }) {}

  async getResults(): Promise<ResultsSnapshot> {
    const source = await this.repository.getAggregateSource();
    return buildResults(source);
  }
}
