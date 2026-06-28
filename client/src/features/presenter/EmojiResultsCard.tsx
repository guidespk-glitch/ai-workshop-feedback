import React from 'react';
import { getEmojiOption, type EmojiId } from '../../../../shared/emoji';
import type { EmojiResult } from '../../../../shared/results';

interface EmojiResultsCardProps {
  emojis: EmojiResult[];
}

const DEFAULT_ORDER: Record<EmojiId, number> = {
  love: 1,
  wow: 2,
  excited: 3,
  fun: 4,
  okay: 5,
  bored: 6,
  dissatisfied: 7,
  angry: 8,
};

export const EmojiResultsCard: React.FC<EmojiResultsCardProps> = ({ emojis }) => {
  const maxCount = emojis.length > 0 ? Math.max(...emojis.map((e) => e.count)) : 0;

  // Sort all emojis by count descending. Tie-breaker is the default order.
  const sorted = [...emojis].sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }
    return DEFAULT_ORDER[a.id] - DEFAULT_ORDER[b.id];
  });

  const calculateEmojiSize = (count: number, max: number): number => {
    const minSize = 44; // base size for 0 votes
    if (max <= 0 || count <= 0) {
      return minSize;
    }

    // Determine the maximum target size based on absolute max count to allow progressive growth
    let targetMaxSize = 110;
    if (max === 1) targetMaxSize = 64;
    else if (max === 2) targetMaxSize = 80;
    else if (max === 3) targetMaxSize = 96;

    const ratio = count / max;
    return Math.round(minSize + (targetMaxSize - minSize) * Math.sqrt(ratio));
  };

  // Group into podium tiers:
  // High Tier (Ranks 1-3)
  const rank1 = sorted[0];
  const rank2 = sorted[1];
  const rank3 = sorted[2];
  
  // Mid Tier (Ranks 4-5)
  const rank4 = sorted[3];
  const rank5 = sorted[4];
  
  // Low Tier (Ranks 6-8)
  const rank6 = sorted[5];
  const rank7 = sorted[6];
  const rank8 = sorted[7];

  // Layout order:
  // Row 1: [Rank 3, Rank 1, Rank 2]
  const row1 = [rank3, rank1, rank2].filter(Boolean);
  // Row 2: [Rank 4, Rank 5]
  const row2 = [rank4, rank5].filter(Boolean);
  // Row 3: [Rank 6, Rank 7, Rank 8]
  const row3 = [rank6, rank7, rank8].filter(Boolean);

  const renderEmojiItem = (item: EmojiResult, tier: 'high' | 'mid' | 'low') => {
    const option = getEmojiOption(item.id);
    const originalRank = sorted.findIndex((s) => s.id === item.id) + 1;
    const isFirst = originalRank === 1;
    const fontSize = calculateEmojiSize(item.count, maxCount);

    return (
      <div
        key={item.id}
        className={`emoji-podium-item emoji-tier-${tier} ${isFirst ? 'emoji-rank-first' : ''}`}
        aria-label={`${option.label} ${item.count} คน`}
        data-rank={originalRank}
        style={{
          transition: 'all 0.3s ease',
        }}
      >
        <div 
          className="emoji-podium-graphic"
          style={{
            fontSize: `${fontSize}px`,
            transition: 'font-size 0.3s ease, transform 0.3s ease',
          }}
        >
          {option.emoji}
        </div>
        <div className="emoji-podium-details">
          <span className="emoji-podium-label">{option.label}</span>
          <span className="emoji-podium-count">{item.count} คน</span>
        </div>
      </div>
    );
  };

  return (
    <div className="presenter-card emoji-results-card">
      <h2 className="presenter-card-title">
        <span className="card-badge">2</span>
        ผลความรู้สึกจาก Emoji
      </h2>
      
      <div className="emoji-podium-container">
        {/* Row 1: High Tier */}
        <div className="emoji-podium-row emoji-row-high">
          {row1.map((item) => renderEmojiItem(item, 'high'))}
        </div>
        
        {/* Row 2: Mid Tier */}
        <div className="emoji-podium-row emoji-row-mid">
          {row2.map((item) => renderEmojiItem(item, 'mid'))}
        </div>
        
        {/* Row 3: Low Tier */}
        <div className="emoji-podium-row emoji-row-low">
          {row3.map((item) => renderEmojiItem(item, 'low'))}
        </div>
      </div>
    </div>
  );
};
