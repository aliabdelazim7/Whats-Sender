import * as XLSX from 'xlsx';
import { QueueItem } from '../../types';
import { maskPhoneNumber } from '../phone';

/**
 * Escapes CSV values to avoid injection, broken commas, and spreadsheet formula injection (=, +, -, @).
 */
export function escapeCsvCell(val: any): string {
  if (val === null || val === undefined) return '""';
  let str = String(val);

  // Formula injection defense: if starts with =, +, -, @, prepend single quote
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // Escape double quotes
  str = str.replace(/"/g, '""');
  return `"${str}"`;
}

export function exportQueueReportToCsv(
  items: QueueItem[],
  maskPhone: boolean = true
): string {
  const headers = [
    'Session ID',
    'Contact ID',
    'Contact Name',
    'Contact Phone',
    'Status',
    'Attempt Count',
    'Last Attempted At',
    'Error / Skip Reason',
    'Message Snippet',
  ];

  const lines = [headers.map(escapeCsvCell).join(',')];

  for (const item of items) {
    const phone = maskPhone ? maskPhoneNumber(item.contactPhone) : item.contactPhone;
    const dateStr = item.lastAttemptAt ? new Date(item.lastAttemptAt).toISOString() : '';
    const messageSnippet = item.renderedMessage.replace(/\r?\n|\r/g, ' ').slice(0, 80);

    const row = [
      item.sessionId,
      item.contactId,
      item.contactName,
      phone,
      item.status,
      item.attemptCount,
      dateStr,
      item.errorMessage || item.skipReason || '',
      messageSnippet,
    ];

    lines.push(row.map(escapeCsvCell).join(','));
  }

  // Prepend UTF-8 BOM so Excel opens Arabic and foreign characters cleanly
  return '\uFEFF' + lines.join('\r\n');
}

export function exportQueueReportToXlsx(
  items: QueueItem[],
  maskPhone: boolean = true
): Blob {
  const data = items.map((item) => ({
    'Session ID': item.sessionId,
    'Contact ID': item.contactId,
    'Contact Name': item.contactName,
    'Contact Phone': maskPhone ? maskPhoneNumber(item.contactPhone) : item.contactPhone,
    'Status': item.status,
    'Attempt Count': item.attemptCount,
    'Last Attempt At': item.lastAttemptAt ? new Date(item.lastAttemptAt).toLocaleString() : '',
    'Error / Reason': item.errorMessage || item.skipReason || '',
    'Rendered Message': item.renderedMessage,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Session Report');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
