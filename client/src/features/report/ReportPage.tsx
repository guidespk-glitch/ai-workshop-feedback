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
  const totalSelections = report.emojis.reduce((sum, item) => sum + item.count, 0);

  return (
    <article className="report-card report-emoji-card">
      <CardTitle number="3" title="สรุปผลความรู้สึกจาก Emoji" />

      <div className="report-emoji-ranking">
        {report.emojis.map((item, index) => (
          <div className={`report-emoji-item ${index === 0 ? 'report-emoji-top' : ''}`} key={item.id}>
            {index < 3 && <div className="report-rank-label">อันดับ {index + 1}</div>}
            {index >= 3 && <div className="report-rank-label">&nbsp;</div>}
            <div className="report-emoji-icon">
              {item.emoji}
            </div>
            <div className="report-emoji-label">{item.label}</div>
            <div className="report-emoji-stats">
              <span className="report-emoji-count">จำนวน (คน)</span>
              <span className="report-emoji-count-value">{item.count}</span>
            </div>
            <div className="report-emoji-stats">
              <span className="report-emoji-percent-label">ร้อยละ</span>
              <span className="report-emoji-percent-value">{totalSelections > 0 ? item.percent : 0}%</span>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function AutoSummaryCard({ summary }: { summary: string }) {
  return (
    <article className="report-card report-summary-card">
      <CardTitle number="4" title="สรุปผลอัตโนมัติ" />

      <div className="report-summary-box">
        <p>{summary}</p>
      </div>
    </article>
  );
}

export default ReportPage;
