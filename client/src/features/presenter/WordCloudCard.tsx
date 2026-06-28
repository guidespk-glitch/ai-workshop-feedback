import React from 'react';
import type { WordResult } from '../../../../shared/results';
import {
  calculateWordSize,
  layoutWordCloud,
  WORD_CLOUD_HEIGHT,
  WORD_CLOUD_WIDTH,
} from './wordCloudLayout';

interface WordCloudCardProps {
  words: WordResult[];
}

export const WordCloudCard: React.FC<WordCloudCardProps> = ({ words }) => {
  const maxCount = words.length > 0 ? Math.max(...words.map((w) => w.count)) : 0;
  const placements = layoutWordCloud(words);

  const getWordColor = (word: string): string => {
    // 3-tone palette colors: Blues, Pinks, Yellows
    const palette = [
      'var(--blue-900)',
      'var(--blue-600)',
      'var(--pink-400)',
      '#e0a300', // darker yellow/amber for good contrast on white bg
    ];
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = word.charCodeAt(i) + ((hash << 5) - hash);
    }
    return palette[Math.abs(hash) % palette.length];
  };

  return (
    <div className="presenter-card word-cloud-card">
      <h2 className="presenter-card-title" data-testid="word-cloud-title">
        <span className="card-badge">1</span>
        ผลคำตอบข้อ 1: สิ่งที่ได้จากการอบรมครั้งนี้
      </h2>

      {words.length === 0 ? (
        <div className="empty-results-container">
          <div className="loading-spinner-circle"></div>
          <p className="empty-results-message">กำลังรอคำตอบจากผู้เข้าร่วมการอบรม...</p>
        </div>
      ) : (
        placements.length === words.length ? (
          <svg
            className="word-cloud-container"
            data-testid="word-cloud"
            viewBox={`0 0 ${WORD_CLOUD_WIDTH} ${WORD_CLOUD_HEIGHT}`}
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label="กลุ่มคำสิ่งที่ผู้เข้าร่วมได้รับจากการอบรม"
          >
            {placements.map(({ word, x, y, fontSize }) => (
              <text
                key={word.key}
                className="word-cloud-item"
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                style={{
                  fontSize: `${fontSize}px`,
                  fill: getWordColor(word.key),
                  fontWeight: fontSize > 40 ? 800 : 600,
                }}
                aria-label={`${word.label} ${word.count} คน`}
              >
                {word.label}
              </text>
            ))}
          </svg>
        ) : (
          <div className="word-cloud-fallback" data-testid="word-cloud-fallback">
            {words.map((word) => {
              const fontSize = calculateWordSize(word.count, maxCount);
              return (
                <span
                  key={word.key}
                  style={{ fontSize: `${Math.min(fontSize, 52)}px`, color: getWordColor(word.key) }}
                >
                  {word.label}
                </span>
              );
            })}
          </div>
        )
      )}
    </div>
  );
};
