# Implement Plan: ปรับปรุง UI Report Dashboard + Export PDF/Excel

โปรเจกต์: `guidespk-glitch/ai-workshop-feedback`  
เป้าหมาย: เพิ่มหน้า **รายงานสรุปความรู้สึกหลังการอบรม** ให้มีหน้าตาตามแบบ Report Dashboard ที่ออกแบบไว้ พร้อม Export ได้ 2 รูปแบบ คือ **PDF** และ **Excel** โดยใช้ทรัพยากรและ dependency ที่มีอยู่ในโปรเจกต์เดิมเป็นหลัก

---

## 0. สรุปผลการตรวจสอบโปรเจกต์ปัจจุบัน

จากโครงสร้าง repo ปัจจุบัน โปรเจกต์นี้เหมาะกับการเพิ่มหน้า Report แบบแยก feature ได้ทันที เพราะมีโครงสร้างชัดเจนอยู่แล้ว

```txt
ai-workshop-feedback/
├── client/
│   ├── index.html
│   └── src/
│       ├── app/
│       │   ├── App.tsx
│       │   └── router.tsx
│       ├── components/
│       │   ├── BrandHeader.tsx
│       │   ├── SecretPresenterAccess.tsx
│       │   └── StatusBanner.tsx
│       ├── features/
│       │   ├── participant/
│       │   └── presenter/
│       │       ├── PresenterPage.tsx
│       │       ├── WordCloudCard.tsx
│       │       ├── EmojiResultsCard.tsx
│       │       ├── api.ts
│       │       └── socket.ts
│       ├── styles/
│       │   └── global.css
│       └── main.tsx
├── public/
│   └── brand/
│       └── ipst-logo.png
├── server/
│   └── src/
│       ├── app.ts
│       ├── db/
│       ├── middleware/
│       ├── realtime/
│       └── services/
├── shared/
│   ├── emoji.ts
│   ├── results.ts
│   ├── schemas.ts
│   ├── wordAliases.ts
│   └── wordNormalizer.ts
├── package.json
├── vite.config.ts
└── tsconfig.json
```

### จุดสำคัญที่ใช้ต่อยอด

1. Frontend ใช้ `React + TypeScript + Vite`
2. Routing ใช้ `react-router-dom` อยู่แล้ว
3. Backend ใช้ `Express + Socket.IO`
4. ฐานข้อมูลใช้ `MariaDB/MySQL`
5. หน้า Presenter มี route เดิมคือ `/presenter`
6. API สำหรับดึงผลรวมมีอยู่แล้วคือ `/api/presenter/results`
7. รูปแบบผลลัพธ์รวมมี type อยู่ที่ `shared/results.ts`
8. รายชื่อ Emoji มี type อยู่ที่ `shared/emoji.ts`
9. โลโก้ สสวท. อยู่ใน path `/brand/ipst-logo.png`

ดังนั้นแนวทางที่เหมาะที่สุดคือ **เพิ่ม feature ใหม่ชื่อ `report` ในฝั่ง client** และ reuse ข้อมูลจาก `ResultsSnapshot` เดิม โดยไม่ต้องแก้ database schema ในรอบแรก

---

## 1. เป้าหมาย UI ที่ต้องได้

เพิ่มหน้าใหม่ที่ URL:

```txt
/report
```

หน้า Report ควรมีองค์ประกอบดังนี้

1. Header
   - โลโก้ สสวท.
   - ชื่อรายงาน: `รายงานสรุปความรู้สึกหลังการอบรม`
   - ชื่อกิจกรรมอบรม
   - ปุ่ม `Export PDF`
   - ปุ่ม `Export Excel`
   - วันที่/เวลาที่ออกรายงาน

2. KPI Cards 4 ใบ
   - ผู้ตอบทั้งหมด
   - คำตอบทั้งหมด
   - Emoji สูงสุด
   - ภาพรวมความรู้สึกเชิงบวก

3. Main Dashboard 4 กล่อง
   - กล่อง 1: Word Cloud
   - กล่อง 2: ตารางคำตอบที่พบบ่อยที่สุด
   - กล่อง 3: Emoji Ranking พร้อมจำนวนและร้อยละ
   - กล่อง 4: สรุปผลอัตโนมัติ

4. Export
   - PDF: ใช้ `window.print()` + CSS `@media print`
   - Excel: ใช้ `Blob` สร้างไฟล์ `.xls` จาก HTML Table โดยไม่เพิ่ม dependency

---

## 2. ไฟล์ที่จะเพิ่มใหม่

เพิ่มไฟล์ดังนี้

```txt
client/src/features/report/
├── ReportPage.tsx
├── ReportPage.test.tsx
├── exportReport.ts
├── reportMetrics.ts
└── report.css
```

และแก้ไฟล์เดิมดังนี้

```txt
client/src/app/router.tsx
client/src/features/presenter/PresenterPage.tsx
```

ทางเลือก: ถ้าต้องการให้ CSS รวมอยู่ไฟล์เดียวตามแนวเดิมของโปรเจกต์ สามารถ import `report.css` จาก `ReportPage.tsx` ได้โดยตรง ไม่จำเป็นต้องแก้ `global.css`

---

## 3. เพิ่มไฟล์ `client/src/features/report/reportMetrics.ts`

ไฟล์นี้ทำหน้าที่คำนวณข้อมูล Report จาก `ResultsSnapshot` ที่ได้จาก `/api/presenter/results`

```ts
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

const FALLBACK_EMOJI_ICON: Record<EmojiId, string> = {
  love: '🥰',
  wow: '😍',
  excited: '😄',
  fun: '😂',
  okay: '🙂',
  bored: '😒',
  dissatisfied: '🙁',
  angry: '😡',
};

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
      const emoji = option.emoji || FALLBACK_EMOJI_ICON[item.id] || '🙂';
      const percent = totalEmojiSelections > 0
        ? Number(((item.count / totalEmojiSelections) * 100).toFixed(1))
        : 0;

      return {
        ...item,
        label: option.label,
        emoji,
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
```

---

## 4. เพิ่มไฟล์ `client/src/features/report/exportReport.ts`

ไฟล์นี้ดูแล Export PDF และ Excel

```ts
// client/src/features/report/exportReport.ts

import type { ReportSummary } from './reportMetrics';
import { formatThaiDateTime } from './reportMetrics';

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function safeFileName(value: string): string {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '_');
}

export function exportReportPdf(): void {
  window.print();
}

export function exportReportExcel(report: ReportSummary): void {
  const datePart = new Date().toISOString().slice(0, 10);
  const fileName = safeFileName(`รายงานสรุปความรู้สึกหลังอบรม_${datePart}.xls`);

  const html = buildExcelHtml(report);
  const blob = new Blob(['\ufeff', html], {
    type: 'application/vnd.ms-excel;charset=utf-8',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function buildExcelHtml(report: ReportSummary): string {
  const wordRows = report.topWords
    .map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(item.label || item.key)}</td>
        <td>${item.count}</td>
      </tr>
    `)
    .join('');

  const emojiRows = report.emojis
    .map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(item.emoji)} ${escapeHtml(item.label)}</td>
        <td>${item.count}</td>
        <td>${item.percent}%</td>
      </tr>
    `)
    .join('');

  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="UTF-8" />
      <style>
        body {
          font-family: Tahoma, Arial, sans-serif;
          color: #17324d;
        }
        h1 {
          color: #0b2f63;
          font-size: 22px;
        }
        h2 {
          color: #2563eb;
          font-size: 18px;
          margin-top: 24px;
        }
        table {
          border-collapse: collapse;
          width: 100%;
          margin-bottom: 20px;
        }
        th {
          background: #dbeafe;
          color: #0b2f63;
          font-weight: bold;
        }
        th, td {
          border: 1px solid #93c5fd;
          padding: 8px;
          text-align: left;
          vertical-align: top;
        }
        .number {
          font-weight: bold;
          color: #2563eb;
        }
      </style>
    </head>
    <body>
      <h1>รายงานสรุปความรู้สึกหลังการอบรม</h1>
      <p>การอบรมเชิงปฏิบัติการ บูรณาการ AI อย่างสร้างสรรค์สู่การเรียนรู้ในห้องเรียน (สสวท. x ศธจ.มหาสารคาม)</p>
      <p>ออกรายงาน: ${escapeHtml(formatThaiDateTime(report.generatedAt))} น.</p>

      <h2>1. สรุปภาพรวม</h2>
      <table>
        <tr><th>รายการ</th><th>ผลลัพธ์</th></tr>
        <tr><td>ผู้ตอบทั้งหมด</td><td class="number">${report.totalSubmissions} คน</td></tr>
        <tr><td>คำตอบทั้งหมด</td><td class="number">${report.totalAnswers} คำตอบ</td></tr>
        <tr><td>Emoji สูงสุด</td><td class="number">${escapeHtml(report.topEmoji?.label || '-')} ${escapeHtml(report.topEmoji?.emoji || '')}</td></tr>
        <tr><td>ภาพรวมความรู้สึกเชิงบวก</td><td class="number">${report.positivePercent}%</td></tr>
      </table>

      <h2>2. คำตอบที่พบบ่อยที่สุด</h2>
      <table>
        <tr><th>อันดับ</th><th>คำตอบ</th><th>จำนวน</th></tr>
        ${wordRows || '<tr><td colspan="3">ยังไม่มีข้อมูล</td></tr>'}
      </table>

      <h2>3. สรุปผลความรู้สึกจาก Emoji</h2>
      <table>
        <tr><th>อันดับ</th><th>ความรู้สึก</th><th>จำนวน</th><th>ร้อยละ</th></tr>
        ${emojiRows || '<tr><td colspan="4">ยังไม่มีข้อมูล</td></tr>'}
      </table>

      <h2>4. สรุปผลอัตโนมัติ</h2>
      <p>${escapeHtml(report.autoSummary)}</p>
    </body>
    </html>
  `;
}
```

---

## 5. เพิ่มไฟล์ `client/src/features/report/ReportPage.tsx`

หน้า Report นี้ใช้ `/api/presenter/results` เดิม จึงยังคงต้อง login เป็นผู้นำเสนอก่อน เหมือนหน้า `/presenter`

```tsx
// client/src/features/report/ReportPage.tsx

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { ResultsSnapshot } from '../../../../shared/results';
import { getPresenterResults, getPresenterSession } from '../presenter/api';
import { buildReportSummary, formatThaiDateTime } from './reportMetrics';
import { exportReportExcel, exportReportPdf } from './exportReport';
import './report.css';

const TRAINING_TITLE = 'การอบรมเชิงปฏิบัติการ บูรณาการ AI อย่างสร้างสรรค์สู่การเรียนรู้ในห้องเรียน (สสวท. x ศธจ.มหาสารคาม)';

const EMPTY_RESULTS: ResultsSnapshot = {
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

export const ReportPage: React.FC = () => {
  const navigate = useNavigate();
  const [results, setResults] = useState<ResultsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'รายงานสรุปผลหลังอบรม | สสวท.';
  }, []);

  useEffect(() => {
    let active = true;

    async function loadReport() {
      try {
        const session = await getPresenterSession();

        if (!session.authenticated) {
          navigate('/');
          return;
        }

        const data = await getPresenterResults();
        if (active) {
          setResults(data);
          setError(null);
        }
      } catch {
        if (active) {
          setError('ไม่สามารถโหลดข้อมูลรายงานได้');
          setResults(EMPTY_RESULTS);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadReport();

    return () => {
      active = false;
    };
  }, [navigate]);

  const report = useMemo(() => buildReportSummary(results || EMPTY_RESULTS), [results]);

  if (loading) {
    return (
      <div className="report-loading-screen">
        <div className="loading-spinner-circle" />
        <p>กำลังโหลดรายงาน...</p>
      </div>
    );
  }

  return (
    <main className="report-page" id="report-page">
      <section className="report-shell">
        <header className="report-header">
          <div className="report-brand-block">
            <img src="/brand/ipst-logo.png" alt="โลโก้ สสวท." className="report-logo" />
            <div>
              <h1>รายงานสรุปความรู้สึกหลังการอบรม</h1>
              <p>{TRAINING_TITLE}</p>
            </div>
          </div>

          <div className="report-actions no-print">
            <div className="report-button-row">
              <button type="button" className="report-export-btn report-export-pdf" onClick={exportReportPdf}>
                <span aria-hidden="true">📄</span>
                Export PDF
              </button>
              <button type="button" className="report-export-btn report-export-excel" onClick={() => exportReportExcel(report)}>
                <span aria-hidden="true">📗</span>
                Export Excel
              </button>
            </div>
            <div className="report-generated-at">
              🕒 ออกรายงาน: {formatThaiDateTime(report.generatedAt)} น.
            </div>
          </div>
        </header>

        {error && <div className="report-error no-print">{error}</div>}

        <KpiRow report={report} />

        <section className="report-grid">
          <WordCloudReportCard report={report} />
          <TopWordsReportCard report={report} />
          <EmojiReportCard report={report} />
          <AutoSummaryCard summary={report.autoSummary} />
        </section>

        <footer className="report-footer">
          <span className="report-footer-line" />
          <span className="report-footer-brand">⚛ ระบบสรุปผลแบบสอบถามหลังอบรม</span>
          <span className="report-footer-line" />
        </footer>
      </section>
    </main>
  );
};

function KpiRow({ report }: { report: ReturnType<typeof buildReportSummary> }) {
  const items = [
    {
      icon: '👥',
      label: 'ผู้ตอบทั้งหมด',
      value: report.totalSubmissions,
      suffix: 'คน',
    },
    {
      icon: '💬',
      label: 'คำตอบทั้งหมด',
      value: report.totalAnswers,
      suffix: 'คำตอบ',
    },
    {
      icon: report.topEmoji?.emoji || '🙂',
      label: 'Emoji สูงสุด',
      value: report.topEmoji?.label || '-',
      suffix: report.topEmoji?.emoji || '',
    },
    {
      icon: '🙂',
      label: 'ภาพรวมความรู้สึก',
      value: `เชิงบวก ${report.positivePercent}%`,
      suffix: '',
    },
  ];

  return (
    <section className="report-kpi-row">
      {items.map((item) => (
        <article className="report-kpi-card" key={item.label}>
          <div className="report-kpi-icon">{item.icon}</div>
          <div>
            <div className="report-kpi-label">{item.label}</div>
            <div className="report-kpi-value">
              {item.value}
              {item.suffix && <span>{item.suffix}</span>}
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

function CardTitle({ number, title, subtitle }: { number: string; title: string; subtitle?: string }) {
  return (
    <div className="report-card-title">
      <span className="report-card-number">{number}</span>
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
    </div>
  );
}

function WordCloudReportCard({ report }: { report: ReturnType<typeof buildReportSummary> }) {
  const maxCount = report.words.length > 0 ? Math.max(...report.words.map((item) => item.count)) : 0;

  return (
    <article className="report-card report-word-card">
      <CardTitle number="1" title="สรุปคำตอบข้อ 1" subtitle="สิ่งที่ได้จากการอบรม" />

      {report.words.length === 0 ? (
        <div className="report-empty-state">ยังไม่มีคำตอบข้อความ</div>
      ) : (
        <div className="report-word-cloud">
          {report.words.slice(0, 28).map((item, index) => {
            const ratio = maxCount > 0 ? item.count / maxCount : 0;
            const fontSize = Math.round(18 + Math.sqrt(ratio) * 54);

            return (
              <span
                key={`${item.key}-${index}`}
                className={`report-cloud-word report-word-color-${(index % 5) + 1}`}
                style={{ fontSize: `${fontSize}px` }}
              >
                {item.label || item.key}
              </span>
            );
          })}
        </div>
      )}
    </article>
  );
}

function TopWordsReportCard({ report }: { report: ReturnType<typeof buildReportSummary> }) {
  return (
    <article className="report-card report-topword-card">
      <CardTitle number="2" title="คำตอบที่พบบ่อยที่สุด" />

      <table className="report-table">
        <thead>
          <tr>
            <th>อันดับ</th>
            <th>คำตอบ</th>
            <th>จำนวน</th>
          </tr>
        </thead>
        <tbody>
          {report.topWords.length === 0 ? (
            <tr>
              <td colSpan={3}>ยังไม่มีข้อมูล</td>
            </tr>
          ) : (
            report.topWords.map((item, index) => (
              <tr key={item.key}>
                <td>{index + 1}</td>
                <td>{item.label || item.key}</td>
                <td>{item.count}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </article>
  );
}

function EmojiReportCard({ report }: { report: ReturnType<typeof buildReportSummary> }) {
  const maxCount = report.emojis.length > 0 ? Math.max(...report.emojis.map((item) => item.count)) : 0;

  return (
    <article className="report-card report-emoji-card">
      <CardTitle number="3" title="สรุปผลความรู้สึกจาก Emoji" />

      <div className="report-emoji-ranking">
        {report.emojis.map((item, index) => {
          const ratio = maxCount > 0 ? item.count / maxCount : 0;
          const scale = 0.8 + Math.sqrt(ratio) * 0.46;

          return (
            <div className={`report-emoji-item ${index === 0 ? 'report-emoji-top' : ''}`} key={item.id}>
              {index < 3 && <div className="report-rank-label">อันดับ {index + 1}</div>}
              <div className="report-emoji-icon" style={{ transform: `scale(${scale})` }}>
                {item.emoji}
              </div>
              <div className="report-emoji-label">{item.label}</div>
              <div className="report-emoji-count">{item.count} คน</div>
              <div className="report-emoji-percent">{item.percent}%</div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function AutoSummaryCard({ summary }: { summary: string }) {
  return (
    <article className="report-card report-summary-card">
      <CardTitle number="4" title="สรุปผลอัตโนมัติ" />

      <div className="report-summary-box">
        <div className="report-summary-icon">📋</div>
        <p>{summary}</p>
      </div>
    </article>
  );
}

export default ReportPage;
```

---

## 6. เพิ่มไฟล์ `client/src/features/report/report.css`

```css
/* client/src/features/report/report.css */

:root {
  --report-blue-950: #0b2f63;
  --report-blue-800: #17427a;
  --report-blue-700: #2563eb;
  --report-blue-500: #3b82f6;
  --report-blue-100: #dbeafe;
  --report-blue-50: #eff6ff;
  --report-peach-500: #fb923c;
  --report-peach-100: #ffedd5;
  --report-yellow-400: #facc15;
  --report-green-600: #16a34a;
  --report-text: #17324d;
  --report-muted: #64748b;
  --report-border: rgba(37, 99, 235, 0.16);
  --report-card: rgba(255, 255, 255, 0.93);
  --report-shadow: 0 14px 35px rgba(37, 99, 235, 0.12);
}

.report-page {
  min-height: 100vh;
  padding: 28px;
  color: var(--report-text);
  background:
    radial-gradient(circle at 4% 14%, rgba(191, 219, 254, 0.96) 0 86px, transparent 88px),
    radial-gradient(circle at 96% 91%, rgba(255, 237, 213, 0.95) 0 122px, transparent 124px),
    linear-gradient(135deg, #ffffff 0%, #eff6ff 100%);
  font-family: 'Noto Sans Thai', 'Sarabun', Tahoma, sans-serif;
  box-sizing: border-box;
}

.report-shell {
  max-width: 1440px;
  margin: 0 auto;
  position: relative;
}

.report-shell::before,
.report-shell::after {
  content: '✦';
  position: absolute;
  color: var(--report-yellow-400);
  font-size: 28px;
  opacity: 0.8;
  pointer-events: none;
}

.report-shell::before {
  top: 15px;
  right: 330px;
}

.report-shell::after {
  bottom: 42px;
  right: 22px;
}

.report-header {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 24px;
}

.report-brand-block {
  display: flex;
  align-items: flex-start;
  gap: 18px;
}

.report-logo {
  width: 104px;
  height: 104px;
  object-fit: contain;
  flex: 0 0 auto;
}

.report-header h1 {
  margin: 0;
  color: var(--report-blue-950);
  font-size: clamp(32px, 4vw, 52px);
  line-height: 1.12;
  font-weight: 900;
}

.report-header p {
  margin: 10px 0 0;
  color: #29486e;
  font-size: 19px;
  line-height: 1.5;
}

.report-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
  padding-top: 10px;
}

.report-button-row {
  display: flex;
  gap: 14px;
}

.report-export-btn {
  border: 2px solid transparent;
  border-radius: 14px;
  padding: 13px 22px;
  background: #ffffff;
  font-size: 17px;
  font-weight: 900;
  cursor: pointer;
  transition: 0.18s ease;
  box-shadow: 0 10px 24px rgba(37, 99, 235, 0.08);
}

.report-export-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 30px rgba(37, 99, 235, 0.15);
}

.report-export-pdf {
  color: var(--report-blue-700);
  border-color: rgba(37, 99, 235, 0.55);
}

.report-export-excel {
  color: var(--report-green-600);
  border-color: rgba(22, 163, 74, 0.55);
}

.report-generated-at {
  color: #38577b;
  font-size: 15px;
  font-weight: 700;
}

.report-error {
  margin-bottom: 14px;
  padding: 12px 16px;
  border-radius: 16px;
  background: #fff7ed;
  color: #c2410c;
  border: 1px solid #fed7aa;
  font-weight: 800;
}

.report-kpi-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
  margin-bottom: 18px;
}

.report-kpi-card {
  display: flex;
  align-items: center;
  gap: 18px;
  min-height: 96px;
  padding: 20px 24px;
  border: 1px solid var(--report-border);
  border-radius: 22px;
  background: var(--report-card);
  box-shadow: var(--report-shadow);
}

.report-kpi-icon {
  width: 64px;
  height: 64px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--report-blue-100), #ffffff);
  font-size: 33px;
}

.report-kpi-label {
  color: var(--report-blue-950);
  font-size: 17px;
  font-weight: 900;
}

.report-kpi-value {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-top: 2px;
  color: var(--report-blue-700);
  font-size: 42px;
  line-height: 1;
  font-weight: 950;
}

.report-kpi-value span {
  font-size: 18px;
  font-weight: 800;
}

.report-grid {
  display: grid;
  grid-template-columns: 1.05fr 1fr;
  gap: 18px;
}

.report-card {
  border: 1px solid var(--report-border);
  border-radius: 24px;
  background: var(--report-card);
  box-shadow: var(--report-shadow);
  padding: 22px;
  overflow: hidden;
}

.report-card-title {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 14px;
}

.report-card-number {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--report-blue-700), var(--report-blue-500));
  color: #ffffff;
  font-weight: 950;
}

.report-card-title h2 {
  margin: 0;
  color: var(--report-blue-950);
  font-size: 22px;
  font-weight: 950;
}

.report-card-title p {
  margin: 2px 0 0;
  color: var(--report-blue-950);
  font-size: 16px;
  font-weight: 700;
}

.report-word-card {
  min-height: 330px;
}

.report-word-cloud {
  min-height: 245px;
  display: flex;
  align-items: center;
  justify-content: center;
  align-content: center;
  flex-wrap: wrap;
  gap: 8px 18px;
  padding: 10px 6px 4px;
  text-align: center;
}

.report-cloud-word {
  line-height: 1;
  letter-spacing: -0.02em;
  white-space: nowrap;
  font-weight: 900;
}

.report-word-color-1 { color: var(--report-blue-700); }
.report-word-color-2 { color: #8b5cf6; }
.report-word-color-3 { color: #ec4899; }
.report-word-color-4 { color: #0f9f8f; }
.report-word-color-5 { color: var(--report-peach-500); }

.report-empty-state {
  min-height: 220px;
  display: grid;
  place-items: center;
  color: var(--report-muted);
  font-weight: 800;
}

.report-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  overflow: hidden;
  border: 1px solid rgba(37, 99, 235, 0.25);
  border-radius: 16px;
  font-size: 17px;
}

.report-table th,
.report-table td {
  padding: 13px 16px;
  border-bottom: 1px solid rgba(37, 99, 235, 0.14);
  text-align: center;
}

.report-table th {
  color: var(--report-blue-950);
  background: var(--report-blue-50);
  font-weight: 950;
}

.report-table td:nth-child(2) {
  text-align: left;
}

.report-table tr:nth-child(even) td {
  background: rgba(239, 246, 255, 0.72);
}

.report-table tr:last-child td {
  border-bottom: none;
}

.report-emoji-card {
  min-height: 258px;
}

.report-emoji-ranking {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  border: 1px solid rgba(37, 99, 235, 0.18);
  border-radius: 18px;
  overflow: hidden;
}

.report-emoji-item {
  min-height: 166px;
  padding: 10px 6px 12px;
  text-align: center;
  border-right: 1px solid rgba(37, 99, 235, 0.12);
  background: rgba(255, 255, 255, 0.74);
}

.report-emoji-item:last-child {
  border-right: none;
}

.report-emoji-top {
  background: linear-gradient(180deg, var(--report-peach-100), rgba(255, 255, 255, 0.86));
}

.report-rank-label {
  min-height: 18px;
  color: var(--report-blue-700);
  font-size: 13px;
  font-weight: 950;
}

.report-emoji-icon {
  margin: 10px auto 2px;
  font-size: 43px;
  line-height: 1;
  transform-origin: center;
}

.report-emoji-label {
  margin-top: 6px;
  color: var(--report-blue-950);
  font-size: 14px;
  font-weight: 900;
  white-space: nowrap;
}

.report-emoji-count {
  margin-top: 6px;
  color: var(--report-blue-700);
  font-size: 18px;
  font-weight: 950;
}

.report-emoji-percent {
  margin-top: 3px;
  color: var(--report-peach-500);
  font-size: 15px;
  font-weight: 900;
}

.report-summary-card {
  min-height: 258px;
}

.report-summary-box {
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 18px;
  align-items: center;
  min-height: 170px;
  padding: 20px 24px;
  border-radius: 24px;
  background: linear-gradient(135deg, #eaf3ff, #ffffff);
}

.report-summary-icon {
  font-size: 58px;
}

.report-summary-box p {
  margin: 0;
  color: #213b5b;
  font-size: 18px;
  line-height: 1.72;
  font-weight: 700;
}

.report-footer {
  display: flex;
  align-items: center;
  gap: 18px;
  margin: 18px 0 0;
  color: var(--report-blue-700);
  font-size: 16px;
  font-weight: 900;
  text-align: center;
}

.report-footer-line {
  height: 1px;
  flex: 1;
  border-top: 2px dashed rgba(37, 99, 235, 0.28);
}

.report-footer-brand {
  white-space: nowrap;
}

.report-loading-screen {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #ffffff, #eff6ff);
  color: var(--report-blue-950);
  font-weight: 900;
}

@media (max-width: 1100px) {
  .report-header {
    flex-direction: column;
  }

  .report-actions {
    align-items: flex-start;
  }

  .report-kpi-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .report-grid {
    grid-template-columns: 1fr;
  }

  .report-emoji-ranking {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .report-page {
    padding: 16px;
  }

  .report-brand-block {
    flex-direction: column;
  }

  .report-kpi-row {
    grid-template-columns: 1fr;
  }

  .report-button-row {
    width: 100%;
    flex-direction: column;
  }

  .report-export-btn {
    width: 100%;
  }

  .report-emoji-ranking {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .report-summary-box {
    grid-template-columns: 1fr;
  }
}

@page {
  size: A4 landscape;
  margin: 8mm;
}

@media print {
  body {
    margin: 0;
    background: #ffffff !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .no-print {
    display: none !important;
  }

  .report-page {
    min-height: auto;
    padding: 0;
    background: #ffffff !important;
  }

  .report-shell {
    max-width: none;
    width: 100%;
  }

  .report-header {
    margin-bottom: 10px;
  }

  .report-header h1 {
    font-size: 34px;
  }

  .report-header p {
    font-size: 14px;
  }

  .report-logo {
    width: 72px;
    height: 72px;
  }

  .report-kpi-row {
    gap: 10px;
    margin-bottom: 10px;
  }

  .report-kpi-card {
    min-height: 70px;
    padding: 12px;
    box-shadow: none;
  }

  .report-kpi-icon {
    width: 44px;
    height: 44px;
    font-size: 24px;
  }

  .report-kpi-label {
    font-size: 13px;
  }

  .report-kpi-value {
    font-size: 28px;
  }

  .report-grid {
    gap: 10px;
  }

  .report-card {
    padding: 14px;
    box-shadow: none;
    break-inside: avoid;
  }

  .report-word-card,
  .report-emoji-card,
  .report-summary-card {
    min-height: auto;
  }

  .report-word-cloud {
    min-height: 185px;
  }

  .report-cloud-word {
    max-font-size: 54px;
  }

  .report-summary-box p {
    font-size: 14px;
    line-height: 1.55;
  }

  .report-footer {
    margin-top: 10px;
    font-size: 12px;
  }
}
```

หมายเหตุ: property `max-font-size` ใน CSS ไม่มีผลจริง ถ้าต้องการจำกัดขนาดตอนพิมพ์ ให้คุมใน React เพิ่มได้ แต่ในรอบแรกสามารถปล่อยไว้ได้เพราะ word cloud ขนาด A4 landscape ยังรองรับได้

ถ้าต้องการแก้ให้สมบูรณ์กว่า ให้เปลี่ยนใน `WordCloudReportCard` เป็น

```tsx
const printSafeFontSize = Math.min(fontSize, 72);
```

แล้วใช้ `printSafeFontSize` แทน `fontSize`

---

## 7. แก้ไข `client/src/app/router.tsx`

ไฟล์เดิมมี route `/` และ `/presenter` ให้เพิ่ม route `/report`

### เดิม

```tsx
import React from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { ParticipantPage } from '../features/participant/ParticipantPage';
import { PresenterPage } from '../features/presenter/PresenterPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <ParticipantPage />,
  },
  {
    path: '/presenter',
    element: <PresenterPage />,
  },
]);

export default router;
```

### ใหม่

```tsx
// client/src/app/router.tsx

import React from 'react';
import { createBrowserRouter } from 'react-router-dom';

import { ParticipantPage } from '../features/participant/ParticipantPage';
import { PresenterPage } from '../features/presenter/PresenterPage';
import { ReportPage } from '../features/report/ReportPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <ParticipantPage />,
  },
  {
    path: '/presenter',
    element: <PresenterPage />,
  },
  {
    path: '/report',
    element: <ReportPage />,
  },
]);

export default router;
```

---

## 8. แก้ไข `PresenterPage.tsx` เพื่อเพิ่มปุ่มเข้า Report

ในไฟล์ `client/src/features/presenter/PresenterPage.tsx` มี `useNavigate()` อยู่แล้ว และส่วน header มีปุ่ม `ล้างผลข้อมูล` กับ `ออกจากระบบ` อยู่แล้ว ให้เพิ่มปุ่ม Report ก่อนปุ่มล้างข้อมูล

ค้นหาส่วนนี้

```tsx
<button onClick={handleReset} className="presenter-reset-btn btn-capsule" style={{ marginRight: '8px' }}>
  ล้างผลข้อมูล
</button>
<button onClick={handleLogout} className="presenter-logout-btn btn-capsule">
  ออกจากระบบ
</button>
```

แก้เป็น

```tsx
<button
  onClick={() => navigate('/report')}
  className="presenter-report-btn btn-capsule"
  style={{ marginRight: '8px' }}
>
  📊 Report
</button>

<button onClick={handleReset} className="presenter-reset-btn btn-capsule" style={{ marginRight: '8px' }}>
  ล้างผลข้อมูล
</button>

<button onClick={handleLogout} className="presenter-logout-btn btn-capsule">
  ออกจากระบบ
</button>
```

เพิ่ม CSS ลงใน `global.css` หรือไฟล์ CSS ที่ใช้กับ presenter

```css
.presenter-report-btn {
  color: #0b2f63;
  background: #ffffff;
  border: 1px solid rgba(37, 99, 235, 0.25);
  box-shadow: 0 8px 22px rgba(37, 99, 235, 0.12);
}

.presenter-report-btn:hover {
  transform: translateY(-1px);
  background: #eff6ff;
}
```

---

## 9. ทางเลือก: เพิ่มวิธีลับเข้าหน้า Report

ถ้าไม่ต้องการให้มีปุ่ม Report ชัดเจนบนจอผู้นำเสนอ ให้ใช้วิธีลับแทน เช่น

```txt
แตะโลโก้ สสวท. บนหน้าผู้นำเสนอ 7 ครั้ง เพื่อเปิด /report
```

เพิ่ม state ใน `PresenterPage.tsx`

```tsx
const [logoTapCount, setLogoTapCount] = useState(0);
```

เพิ่ม function

```tsx
const handleLogoTapForReport = () => {
  const next = logoTapCount + 1;
  setLogoTapCount(next);

  if (next >= 7) {
    setLogoTapCount(0);
    navigate('/report');
    return;
  }

  window.setTimeout(() => {
    setLogoTapCount(0);
  }, 1800);
};
```

แก้รูปโลโก้ใน Header

```tsx
<img
  src="/brand/ipst-logo.png"
  alt="โลโก้ สสวท."
  className="presenter-logo"
  onClick={handleLogoTapForReport}
/>
```

แนะนำ: ใช้ทั้งปุ่ม Report และวิธีลับในช่วงพัฒนา แต่ถ้าใช้งานจริงบนเวที ให้ซ่อนปุ่มและใช้วิธีลับ

---

## 10. เพิ่ม Unit Test เบื้องต้น `ReportPage.test.tsx`

```tsx
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
});
```

---

## 11. จุดที่ควรระวังเรื่อง `shared/emoji.ts`

ตอนนี้ `shared/emoji.ts` มี field `emoji` เป็นค่าว่างในหลายรายการ เช่น

```ts
{ id: 'love', emoji: '', label: 'รัก' }
```

ในแผนนี้จึงใช้ `FALLBACK_EMOJI_ICON` ใน `reportMetrics.ts` เพื่อให้หน้า Report แสดง emoji ได้แน่นอน โดยยังไม่ต้องแก้ shared file

แต่ถ้าต้องการแก้ให้สมบูรณ์ทั้งระบบ แนะนำแก้ `shared/emoji.ts` เป็น

```ts
export const EMOJI_OPTIONS = [
  { id: 'love', emoji: '🥰', label: 'รัก' },
  { id: 'wow', emoji: '😍', label: 'ว้าว' },
  { id: 'excited', emoji: '😄', label: 'ตื่นเต้น' },
  { id: 'fun', emoji: '😂', label: 'สนุกสนาน' },
  { id: 'okay', emoji: '🙂', label: 'โอเค' },
  { id: 'bored', emoji: '😒', label: 'เบื่อ' },
  { id: 'dissatisfied', emoji: '🙁', label: 'ไม่ค่อยพอใจ' },
  { id: 'angry', emoji: '😡', label: 'โกรธ' },
] as const;
```

ข้อดีคือ `EmojiResultsCard.tsx` เดิมและหน้า Report จะใช้ emoji ชุดเดียวกันได้

---

## 12. Export PDF: พฤติกรรมที่คาดหวัง

เมื่อกด `Export PDF`

```ts
window.print();
```

Browser จะเปิด Print Dialog ให้เลือก

```txt
Destination: Save as PDF
Layout: Landscape
Paper: A4
Background graphics: เปิด
```

CSS `@media print` จะซ่อนปุ่ม Export ด้วย class `.no-print` และปรับ Layout ให้เหมาะกับ A4 landscape

---

## 13. Export Excel: พฤติกรรมที่คาดหวัง

เมื่อกด `Export Excel` ระบบจะดาวน์โหลดไฟล์

```txt
รายงานสรุปความรู้สึกหลังอบรม_YYYY-MM-DD.xls
```

เนื้อหาในไฟล์ประกอบด้วย

1. สรุปภาพรวม
2. คำตอบที่พบบ่อยที่สุด
3. สรุปผลความรู้สึกจาก Emoji
4. สรุปผลอัตโนมัติ

วิธีนี้ใช้ `Blob` + HTML table เป็น `.xls` ซึ่งเหมาะสำหรับระบบที่ไม่ต้องการเพิ่ม package ใหม่

ถ้าต้องการ `.xlsx` แท้ในอนาคต ให้เพิ่ม dependency เช่น `xlsx` และสร้าง workbook หลาย sheet แยกเป็น

```txt
Summary
Top Words
Emoji Results
Auto Summary
```

แต่ในรอบนี้ยังไม่แนะนำ เพราะเพิ่มภาระ dependency และ build size

---

## 14. ขั้นตอนการ Implement จริง

### Step 1: สร้างโฟลเดอร์ feature

```bash
mkdir -p client/src/features/report
```

### Step 2: เพิ่มไฟล์ใหม่

```txt
client/src/features/report/reportMetrics.ts
client/src/features/report/exportReport.ts
client/src/features/report/ReportPage.tsx
client/src/features/report/report.css
client/src/features/report/ReportPage.test.tsx
```

### Step 3: แก้ router

เพิ่ม import และ route `/report` ใน

```txt
client/src/app/router.tsx
```

### Step 4: เพิ่มปุ่ม Report ใน Presenter

แก้ไฟล์

```txt
client/src/features/presenter/PresenterPage.tsx
```

### Step 5: ทดสอบ typecheck

```bash
npm run typecheck
```

### Step 6: ทดสอบ unit test

```bash
npm test
```

### Step 7: build

```bash
npm run build
```

### Step 8: ทดสอบ flow จริง

1. เปิดหน้า `/`
2. ส่งคำตอบจากฝั่งผู้เข้าร่วมอบรม
3. เข้า `/presenter`
4. ตรวจว่าผลรวมแสดงปกติ
5. กดปุ่ม `Report`
6. เข้า `/report`
7. ตรวจ KPI / Word Cloud / Table / Emoji / Summary
8. กด Export PDF
9. กด Export Excel

---

## 15. Acceptance Criteria

ถือว่างานเสร็จเมื่อผ่านเงื่อนไขทั้งหมดนี้

```txt
[ ] route /report ใช้งานได้หลัง login presenter
[ ] ถ้ายังไม่ login แล้วเข้า /report จะถูกพากลับหน้า /
[ ] โลโก้ สสวท. แสดงจาก /brand/ipst-logo.png
[ ] KPI แสดงจำนวนผู้ตอบทั้งหมดถูกต้อง
[ ] KPI แสดงจำนวนคำตอบทั้งหมดจากผลรวม words ถูกต้อง
[ ] KPI แสดง Emoji สูงสุดถูกต้อง
[ ] KPI แสดงเปอร์เซ็นต์ความรู้สึกเชิงบวกถูกต้อง
[ ] Word Cloud ใช้ข้อมูลจาก ResultsSnapshot.words
[ ] ตาราง Top Words แสดง 5 อันดับแรก
[ ] Emoji Ranking แสดงครบ 8 อารมณ์
[ ] Summary อัตโนมัติสร้างข้อความได้แม้ข้อมูลว่าง
[ ] Export PDF เปิด print dialog และซ่อนปุ่ม export
[ ] Export Excel ดาวน์โหลดไฟล์ .xls ได้
[ ] npm run typecheck ผ่าน
[ ] npm test ผ่าน
[ ] npm run build ผ่าน
```

---

## 16. Commit Plan ที่แนะนำ

```txt
commit 1: add report metrics and export helpers
commit 2: add report dashboard page and styles
commit 3: register /report route
commit 4: add report entry button to presenter page
commit 5: add report unit tests
```

---

## 17. ข้อเสนอเพิ่มเติมหลัง Implement รอบแรก

หลังระบบ Report ใช้งานได้แล้ว ควรพัฒนาต่อดังนี้

1. เพิ่ม endpoint `/api/presenter/report` แยกจาก `/api/presenter/results` ถ้าต้องการข้อมูลละเอียดกว่า เช่น รายการคำตอบดิบทีละคน
2. เพิ่มการเลือกช่วงเวลาออกรายงาน เช่น เฉพาะช่วงเช้า / ช่วงบ่าย
3. เพิ่ม Export `.xlsx` แท้ด้วย package `xlsx`
4. เพิ่ม Export PDF แบบดาวน์โหลดอัตโนมัติด้วย `html2canvas` + `jspdf`
5. เพิ่มหน้า Report แบบ A4 portrait สำหรับเอกสารราชการ
6. เพิ่มลายเซ็นผู้รับผิดชอบ / ผู้จัดอบรม / วันที่ออกรายงาน
7. เพิ่มระบบเก็บ report snapshot หลังจบกิจกรรม เพื่อป้องกันข้อมูลเปลี่ยนหลัง reset

---

## 18. สรุปแนวทางที่เหมาะที่สุดสำหรับ repo นี้

เนื่องจากระบบมี `ResultsSnapshot`, `WordResult`, `EmojiResult`, route `/presenter`, API `/api/presenter/results`, และโลโก้ `/brand/ipst-logo.png` อยู่แล้ว แนวทางที่เหมาะที่สุดคือ

```txt
เพิ่ม feature report ฝั่ง client เท่านั้นในรอบแรก
ใช้ข้อมูลจาก /api/presenter/results
ใช้ React + TypeScript เดิม
ใช้ CSS แยก report.css
ใช้ window.print() สำหรับ PDF
ใช้ Blob สร้าง .xls สำหรับ Excel
ไม่เพิ่ม dependency ใหม่
ไม่แตะ database schema
```

แนวทางนี้เสี่ยงต่ำ ใช้ทรัพยากรเดิมของโปรเจกต์ และสามารถ build/deploy บน Plesk Node.js flow เดิมได้ทันที
