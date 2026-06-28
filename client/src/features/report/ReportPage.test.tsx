// client/src/features/report/ReportPage.test.tsx

import { describe, expect, it } from 'vitest';
import { buildReportSummary } from './reportMetrics';
import type { ResultsSnapshot } from '../../../../shared/results';

const snapshot: ResultsSnapshot = {
  totalSubmissions: 3,
  words: [
    { key: 'ai', label: 'AI', count: 3 },
    { key: 'teaching', label: 'การสอน', count: 2 },
    { key: 'creative', label: 'สร้างสรรค์', count: 1 },
  ],
  emojis: [
    { id: 'love', count: 1 },
    { id: 'wow', count: 3 },
    { id: 'excited', count: 0 },
    { id: 'fun', count: 2 },
    { id: 'okay', count: 0 },
    { id: 'bored', count: 0 },
    { id: 'dissatisfied', count: 0 },
    { id: 'angry', count: 0 },
  ],
  updatedAt: new Date().toISOString(),
};

describe('buildReportSummary', () => {
  it('calculates KPI, top words, top emoji and positive percent', () => {
    const report = buildReportSummary(snapshot);

    expect(report.totalSubmissions).toBe(3);
    expect(report.totalAnswers).toBe(6);
    expect(report.topWords[0].label).toBe('AI');
    expect(report.topEmoji?.id).toBe('wow');
    expect(report.positivePercent).toBe(100);
    expect(report.autoSummary).toContain('AI');
  });

  it('handles empty data gracefully', () => {
    const empty: ResultsSnapshot = {
      totalSubmissions: 0,
      words: [],
      emojis: [
        { id: 'love', count: 0 },
        { id: 'wow', count: 0 },
        { id: 'excited', count: 0 },
        { id: 'fun', count: 0 },
        { id: 'okay', count: 0 },
        { id: 'bored', count: 0 },
        { id: 'dissatisfied', count: 0 },
        { id: 'angry', count: 0 },
      ],
      updatedAt: new Date().toISOString(),
    };

    const report = buildReportSummary(empty);

    expect(report.totalSubmissions).toBe(0);
    expect(report.totalAnswers).toBe(0);
    expect(report.topWords).toHaveLength(0);
    expect(report.positivePercent).toBe(0);
    expect(report.autoSummary).toContain('ยังไม่มีข้อมูล');
  });
});
