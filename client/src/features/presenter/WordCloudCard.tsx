import React from 'react';
import type { WordResult } from '../../../../shared/results';

interface WordCloudCardProps {
  words: WordResult[];
}

export const WordCloudCard: React.FC<WordCloudCardProps> = ({ words }) => {
  const maxCount = words.length > 0 ? Math.max(...words.map((w) => w.count)) : 0;

  const calculateWordSize = (count: number, max: number): number => {
    const minSize = 28; // base size when a word is submitted 1 time
    const maxSize = 96; // maximum size for the highest count word
    
    if (max <= 1) {
      return minSize;
    }
    
    // Scale count between 1 and max:
    // When count is 1, it should return minSize.
    // When count is max, it should return maxSize.
    const ratio = (count - 1) / (max - 1);
    return Math.round(minSize + (maxSize - minSize) * Math.sqrt(ratio));
  };

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
      <h2 className="presenter-card-title">ผลคำตอบข้อ 1: สิ่งที่ได้จากการอบรมครั้งนี้</h2>

      {words.length === 0 ? (
        <div className="empty-results-container">
          <div className="loading-spinner-circle"></div>
          <p className="empty-results-message">กำลังรอคำตอบจากผู้เข้าร่วมการอบรม...</p>
        </div>
      ) : (
        <div className="word-cloud-container" data-testid="word-cloud">
          {/* Stable horizontal wrap-around word layout */}
          {words.map((word) => {
            const fontSize = calculateWordSize(word.count, maxCount);
            return (
              <span
                key={word.key}
                className="word-cloud-item"
                style={{
                  fontSize: `${fontSize}px`,
                  color: getWordColor(word.key),
                  fontWeight: fontSize > 40 ? 800 : 600,
                  transition: 'font-size 0.3s ease, color 0.3s ease',
                }}
                title={`คำ: ${word.label} (${word.count} คน)`}
              >
                {word.label}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};
