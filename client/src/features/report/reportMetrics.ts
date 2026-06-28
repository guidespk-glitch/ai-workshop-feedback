// client/src/features/report/reportMetrics.ts

import { getEmojiOption, type EmojiId } from '../../../../shared/emoji';
import type { EmojiResult, ResultsSnapshot, WordResult } from '../../../../shared/results';

export interface EmojiReportItem extends EmojiResult {
  label: string;
  emoji: string;
  percent: number;
  positive: boolean;
}

export interface ReportSummary {
  totalSubmissions: number;
  totalAnswers: number;
  words: WordResult[];
  topWords: WordResult[];
  emojis: EmojiReportItem[];
  topEmoji: EmojiReportItem | null;
  positivePercent: number;
  autoSummary: string;
  generatedAt: Date;
}

const POSITIVE_EMOJI_IDS = new Set<EmojiId>([
  'love',
  'wow',
  'excited',
  'fun',
  'okay',
]);

const DEFAULT_EMOJI_ORDER: EmojiId[] = [
  'love',
  'wow',
  'excited',
  'fun',
  'okay',
  'bored',
  'dissatisfied',
  'angry',
];

function getEmojiSortIndex(id: EmojiId): number {
  const index = DEFAULT_EMOJI_ORDER.indexOf(id);
  return index === -1 ? 999 : index;
}

export function buildReportSummary(snapshot: ResultsSnapshot): ReportSummary {
  const words = [...snapshot.words].sort((a, b) => b.count - a.count);
  const topWords = words.slice(0, 5);

  const totalAnswers = words.reduce((sum, item) => sum + item.count, 0);

  const totalEmojiSelections = snapshot.emojis.reduce((sum, item) => sum + item.count, 0);

  const emojis: EmojiReportItem[] = snapshot.emojis
    .map((item) => {
      const option = getEmojiOption(item.id);
      const percent = totalEmojiSelections > 0
        ? Number(((item.count / totalEmojiSelections) * 100).toFixed(1))
        : 0;

      return {
        ...item,
        label: option.label,
        emoji: option.emoji,
        percent,
        positive: POSITIVE_EMOJI_IDS.has(item.id),
      };
    })
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return getEmojiSortIndex(a.id) - getEmojiSortIndex(b.id);
    });

  const positiveCount = emojis
    .filter((item) => item.positive)
    .reduce((sum, item) => sum + item.count, 0);

  const positivePercent = totalEmojiSelections > 0
    ? Math.round((positiveCount / totalEmojiSelections) * 100)
    : 0;

  const topEmoji = emojis[0] || null;

  const baseSummary: ReportSummary = {
    totalSubmissions: snapshot.totalSubmissions,
    totalAnswers,
    words,
    topWords,
    emojis,
    topEmoji,
    positivePercent,
    autoSummary: '',
    generatedAt: new Date(),
  };

  return {
    ...baseSummary,
    autoSummary: buildAutoSummary(baseSummary),
  };
}

export function buildAutoSummary(report: Omit<ReportSummary, 'autoSummary'>): string {
  const topWordLabels = report.topWords
    .slice(0, 4)
    .map((item) => item.label || item.key)
    .filter(Boolean);

  const topEmojiLabels = report.emojis
    .slice(0, 2)
    .filter((item) => item.count > 0)
    .map((item) => item.label);

  if (report.totalSubmissions === 0) {
    return 'ยังไม่มีข้อมูลคำตอบจากผู้เข้าร่วมอบรม ระบบจะแสดงผลสรุปอัตโนมัติเมื่อมีการส่งแบบสอบถามเข้ามา';
  }

  const wordText = topWordLabels.length > 0
    ? topWordLabels.join(', ')
    : 'ยังไม่มีคำตอบข้อความ';

  const emojiText = topEmojiLabels.length > 0
    ? topEmojiLabels.join(' และ ')
    : 'ยังไม่มีการเลือก Emoji';

  return `จากผลการตอบแบบสอบถามหลังการอบรม พบว่าผู้เข้าร่วมอบรมส่วนใหญ่สะท้อนว่าได้รับความรู้เกี่ยวกับการนำ AI ไปประยุกต์ใช้ในการจัดการเรียนรู้ โดยคำตอบที่พบบ่อย ได้แก่ ${wordText} ขณะที่ผลด้านความรู้สึกพบว่า Emoji ที่ถูกเลือกมากที่สุดคือ ${emojiText} สะท้อนให้เห็นว่าผู้เข้าร่วมอบรมมีความรู้สึกเชิงบวกต่อกิจกรรมในครั้งนี้`;
}

export function formatThaiDateTime(date: Date | string): string {
  const value = typeof date === 'string' ? new Date(date) : date;

  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  }).format(value);
}
