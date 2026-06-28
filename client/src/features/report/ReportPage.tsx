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
                <span className="btn-icon" aria-hidden="true">📄</span>
                Export PDF
              </button>
              <button type="button" className="report-export-btn report-export-excel" onClick={() => exportReportExcel(report)}>
                <span className="btn-icon" aria-hidden="true">📗</span>
                Export Excel
              </button>
            </div>
            <div className="report-generated-at">
              🕒 ออกรายงาน: {formatThaiDateTime(report.generatedAt)}
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
      iconClass: 'icon-blue',
    },
    {
      icon: '💬',
      label: 'คำตอบทั้งหมด',
      value: report.totalAnswers,
      suffix: 'คำตอบ',
      iconClass: 'icon-blue',
    },
    {
      icon: report.topEmoji?.emoji || '😍',
      label: 'Emoji สูงสุด',
      value: report.topEmoji?.label || '-',
      suffix: report.topEmoji?.emoji || '',
      iconClass: 'icon-orange',
    },
    {
      icon: '😌',
      label: 'ภาพรวมความรู้สึก',
      value: `เชิงบวก ${report.positivePercent}%`,
      suffix: '',
      iconClass: 'icon-blue',
    },
  ];

  return (
    <section className="report-kpi-row">
      {items.map((item) => (
        <article className="report-kpi-card" key={item.label}>
          <div className={`report-kpi-icon ${item.iconClass}`}>{item.icon}</div>
          <div>
            <div className="report-kpi-label">{item.label}</div>
            <div className="report-kpi-value">
              {item.value}
              {item.suffix && <span className="kpi-suffix">{item.suffix}</span>}
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

  const displayedWords = useMemo(() => {
    const sorted = [...report.words].sort((a, b) => b.count - a.count);
    const left: typeof sorted = [];
    const right: typeof sorted = [];
    
    for (let i = 0; i < sorted.length; i++) {
      if (i % 2 === 0) {
        right.push(sorted[i]);
      } else {
        left.unshift(sorted[i]);
      }
    }
    return [...left, ...right];
  }, [report.words]);

  const { minFontSize, maxFontSize } = useMemo(() => {
    const count = displayedWords.length;
    if (count <= 10) {
      return { minFontSize: 18, maxFontSize: 44 };
    } else if (count <= 25) {
      return { minFontSize: 14, maxFontSize: 36 };
    } else if (count <= 50) {
      return { minFontSize: 10, maxFontSize: 24 };
    } else if (count <= 100) {
      return { minFontSize: 8, maxFontSize: 18 };
    } else {
      return { minFontSize: 7, maxFontSize: 13 };
    }
  }, [displayedWords.length]);

  return (
    <article className="report-card report-word-card">
      <CardTitle number="1" title="สรุปคำตอบข้อ 1" subtitle="สิ่งที่ได้จากการอบรม" />

      {report.words.length === 0 ? (
        <div className="report-empty-state">ยังไม่มีคำตอบข้อความ</div>
      ) : (
        <div className="report-word-cloud-wrapper">
          {/* Decorative Sparkles */}
          <span className="sparkle sparkle-1">✦</span>
          <span className="sparkle sparkle-2">✦</span>
          <span className="sparkle sparkle-3">✦</span>
          <span className="sparkle sparkle-4">✦</span>
          <span className="sparkle sparkle-5">✦</span>
          
          <div className="report-word-cloud">
            {displayedWords.map((item, index) => {
              const ratio = maxCount > 0 ? item.count / maxCount : 0;
              const fontSize = Math.round(minFontSize + Math.sqrt(ratio) * (maxFontSize - minFontSize));

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
                <td className="rank-num">{index + 1}</td>
                <td className="answer-text">{item.label || item.key}</td>
                <td className="count-num">{item.count}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </article>
  );
}

function EmojiReportCard({ report }: { report: ReturnType<typeof buildReportSummary> }) {
  return (
    <article className="report-card report-emoji-card">
      <CardTitle number="3" title="สรุปผลความรู้สึกจาก Emoji" />

      <div className="report-emoji-table-wrapper">
        <table className="report-emoji-table">
          <thead>
            <tr>
              <th className="row-label-header"></th>
              {report.emojis.map((item, index) => (
                <th key={item.id} className={`emoji-col-header ${index < 3 ? 'top-rank-col' : ''}`}>
                  <div className="rank-label">{index < 3 ? `อันดับ ${index + 1}` : <span>&nbsp;</span>}</div>
                  <div className="emoji-icon">{item.emoji}</div>
                  <div className="emoji-name">{item.label}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="row-label">จำนวน (คน)</td>
              {report.emojis.map((item, index) => (
                <td key={item.id} className={`emoji-data-cell count-cell ${index < 3 ? 'top-rank-data' : ''}`}>
                  {item.count}
                </td>
              ))}
            </tr>
            <tr>
              <td className="row-label">ร้อยละ</td>
              {report.emojis.map((item, index) => (
                <td key={item.id} className={`emoji-data-cell percent-cell ${index < 3 ? 'top-rank-data highlighted-percent' : ''}`}>
                  {item.percent}%
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </article>
  );
}

function AutoSummaryCard({ summary }: { summary: string }) {
  return (
    <article className="report-card report-summary-card">
      <CardTitle number="4" title="สรุปผลอัตโนมัติ" />

      <div className="report-summary-box">
        <div className="report-summary-icon-container">
          <svg viewBox="0 0 60 70" width="44" height="52" className="summary-clipboard-svg" aria-hidden="true">
            {/* Clipboard base */}
            <rect x="10" y="12" width="40" height="50" rx="6" fill="#eaf3ff" stroke="#3b82f6" strokeWidth="3" />
            {/* Top clip */}
            <path d="M22 6 h16 a2 2 0 0 1 2 2 v6 a2 2 0 0 1 -2 2 h-16 a2 2 0 0 1 -2 -2 v-6 a2 2 0 0 1 2 -2 z" fill="#3b82f6" />
            {/* Document lines */}
            <line x1="20" y1="28" x2="40" y2="28" stroke="#93c5fd" strokeWidth="3" strokeLinecap="round" />
            <line x1="20" y1="38" x2="40" y2="38" stroke="#93c5fd" strokeWidth="3" strokeLinecap="round" />
            <line x1="20" y1="48" x2="34" y2="48" stroke="#93c5fd" strokeWidth="3" strokeLinecap="round" />
            {/* Checkmarks / bullets (little yellow checks) */}
            <path d="M15 28 l2 2 l4 -4" stroke="#fb923c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M15 38 l2 2 l4 -4" stroke="#fb923c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M15 48 l2 2 l4 -4" stroke="#fb923c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </div>
        <p className="summary-text">{summary}</p>
      </div>
    </article>
  );
}

export default ReportPage;
