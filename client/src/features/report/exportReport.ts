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
