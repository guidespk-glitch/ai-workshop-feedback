import React from 'react';
import { getEmojiOption, type EmojiId } from '../../../../shared/emoji';
import type { EmojiResult } from '../../../../shared/results';

interface EmojiResultsCardProps {
  emojis: EmojiResult[];
}

const EMOJI_DISPLAY_ORDER: Record<EmojiId, number> = {
  love: 1,
  wow: 2,
  excited: 3,
  fun: 4,
  okay: 5,
  bored: 6,
  dissatisfied: 7,
  angry: 8,
};

export const emojiSize = (count: number, maxCount: number): number => {
  if (maxCount <= 0) return 48;
  return Math.round(48 + 72 * Math.sqrt(count / maxCount));
};

export const EmojiResultsCard: React.FC<EmojiResultsCardProps> = ({ emojis }) => {
  const maxCount = emojis.length > 0 ? Math.max(...emojis.map((e) => e.count)) : 0;

  // Sort by count descending, then by display order to keep layout stable when counts are equal
  const sortedEmojis = [...emojis].sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }
    return EMOJI_DISPLAY_ORDER[a.id] - EMOJI_DISPLAY_ORDER[b.id];
  });

  return (
    <div className="presenter-card emoji-results-card">
      <h2 className="presenter-card-title">ผลคำตอบข้อ 2: ความรู้สึกในการอบรม (Emoji)</h2>

      <div className="emoji-list-container">
        {sortedEmojis.map((item, index) => {
          const option = getEmojiOption(item.id);
          const size = emojiSize(item.count, maxCount);
          const rank = index + 1;

          return (
            <div
              key={item.id}
              className="emoji-result-item"
              aria-label={`${option.label} ${item.count} คน`}
              data-rank={rank}
              style={{
                transition: 'all 0.3s ease',
              }}
            >
              <div className="emoji-result-rank-badge">{rank}</div>
              
              <div
                className="emoji-result-graphic"
                style={{
                  fontSize: `${size}px`,
                  lineHeight: '1',
                  transition: 'font-size 0.3s ease',
                }}
              >
                {option.emoji}
              </div>

              <div className="emoji-result-details">
                <span className="emoji-result-label">{option.label}</span>
                <div className="emoji-result-progress-bar-container">
                  <div
                    className="emoji-result-progress-bar"
                    style={{
                      width: `${maxCount > 0 ? (item.count / maxCount) * 100 : 0}%`,
                      transition: 'width 0.3s ease',
                    }}
                  ></div>
                </div>
              </div>

              <span className="emoji-result-count">
                <strong>{item.count}</strong> คน
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
