import { describe, it, expect } from 'vitest';
import { escapeCsvCell, exportQueueReportToCsv } from '../lib/export';
import { QueueItem } from '../types';

describe('Report Exporting & CSV Security', () => {
  it('escapes cells and neutralizes formula injection characters (=, +, -, @)', () => {
    expect(escapeCsvCell('=SUM(A1:A10)')).toBe(`"'=SUM(A1:A10)"`);
    expect(escapeCsvCell('+cmd|/c calc')).toBe(`"'+cmd|/c calc"`);
    expect(escapeCsvCell('@evil')).toBe(`"'@evil"`);
    expect(escapeCsvCell('Ali, Ahmed')).toBe(`"Ali, Ahmed"`);
    expect(escapeCsvCell('He said "Hello"')).toBe(`"He said ""Hello"""`);
  });

  it('exports queue report with UTF-8 BOM for Arabic compatibility', () => {
    const items: QueueItem[] = [
      {
        id: 'q1',
        sessionId: 's1',
        contactId: 'c1',
        contactName: 'محمود',
        contactPhone: '201012345678',
        renderedMessage: 'مرحباً محمود',
        status: 'confirmed_sent',
        attemptCount: 1,
        lastAttemptAt: 1700000000000,
      },
    ];

    const csv = exportQueueReportToCsv(items, true);
    // Starts with BOM \uFEFF
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('محمود');
    expect(csv).toContain('confirmed_sent');
    // Masked phone should be present instead of full
    expect(csv).toContain('+2010******78');
  });
});
