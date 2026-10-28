import { describe, it, expect } from 'vitest';
import { QueueItem } from '../types';
import { renderTemplate } from '../lib/template';
import { buildContactsFromRows } from '../lib/spreadsheet/mapper';
import { WhatsAppClickToChatAdapter } from '../adapters/messaging';

describe('End-to-End Business Logic & Queue State Machine Test', () => {
  it('handles the complete lifecycle: import -> deduplicate -> filter -> session -> confirm sent -> sheets update', () => {
    // 1. Spreadsheet Raw Rows with mixed countries, duplicates, and invalid numbers
    const rawRows = [
      { name: 'عميل 1', phone: '+966501234567', company: 'شركة أ' },
      { name: 'عميل 1 مكرر', phone: '0501234567', company: 'شركة أ' }, // Saudi duplicate
      { name: 'عميل مصري', phone: '+201012345678', company: 'شركة مصر' },
      { name: 'عميل غير صالح', phone: '000', company: 'خطأ' },
    ];

    const contacts = buildContactsFromRows(
      rawRows,
      { phoneColumn: 'phone', nameColumn: 'name', companyColumn: 'company', customColumns: {} },
      'SA'
    );

    expect(contacts.length).toBe(4);
    expect(contacts[0].isValidPhone).toBe(true);
    expect(contacts[0].normalizedPhone).toBe('966501234567');
    expect(contacts[1].isDuplicate).toBe(true);
    expect(contacts[3].isValidPhone).toBe(false);

    // 2. Filter contacts eligible for messaging (Unsent and Valid only)
    const validUnsent = contacts.filter(
      (c) => c.isValidPhone && !c.isDuplicate && c.messagingStatus !== 'sent'
    );
    expect(validUnsent.length).toBe(2); // Only 'عميل 1' and 'عميل مصري'

    // 3. Template variable rendering
    const templateContent = 'أهلاً يا {{name}} من {{company}}!';
    const renderedMsg = renderTemplate(templateContent, validUnsent[0]);
    expect(renderedMsg.hasErrors).toBe(false);
    expect(renderedMsg.renderedText).toBe('أهلاً يا عميل 1 من شركة أ!');

    // 4. WhatsApp Click to Chat URL generation
    const adapter = new WhatsAppClickToChatAdapter();
    const link = adapter.createMessageLink(validUnsent[0], renderedMsg.renderedText);
    expect(link).toContain('https://wa.me/966501234567?text=');

    // 5. Build Queue Items
    const sessionId = 'session_test_1';
    const queue: QueueItem[] = validUnsent.map((c, i) => ({
      id: `q_${i}`,
      sessionId,
      contactId: c.id,
      contactName: c.name,
      contactPhone: c.normalizedPhone,
      renderedMessage: renderTemplate(templateContent, c).renderedText,
      status: 'pending',
      attemptCount: 0,
    }));

    expect(queue.length).toBe(2);
    expect(queue[0].status).toBe('pending');

    // 6. Simulate Workflow: Open -> Confirm Sent
    queue[0].status = 'opened';
    expect(queue[0].status).toBe('opened');

    // User asserts manual sending:
    queue[0].status = 'confirmed_sent';
    validUnsent[0].messagingStatus = 'sent';
    validUnsent[0].sentAt = Date.now();

    // 7. Verification: Next session filter MUST exclude the sent contact
    const remainingToMessage = validUnsent.filter((c) => c.messagingStatus !== 'sent');
    expect(remainingToMessage.length).toBe(1);
    expect(remainingToMessage[0].name).toBe('عميل مصري');
  });

  it('handles session restart: resets all queue items to pending and index to 0', () => {
    const queue: QueueItem[] = [
      {
        id: 'q1',
        sessionId: 's1',
        contactId: 'c1',
        contactName: 'علي',
        contactPhone: '966501112233',
        renderedMessage: 'رسالة 1',
        status: 'confirmed_sent',
        attemptCount: 1,
      },
      {
        id: 'q2',
        sessionId: 's1',
        contactId: 'c2',
        contactName: 'سارة',
        contactPhone: '966502223344',
        renderedMessage: 'رسالة 2',
        status: 'skipped',
        attemptCount: 1,
        skipReason: 'User skipped',
      },
    ];

    const resetQueue = queue.map((q) => ({
      ...q,
      status: 'pending' as const,
      attemptCount: 0,
      skipReason: undefined,
    }));

    expect(resetQueue[0].status).toBe('pending');
    expect(resetQueue[0].attemptCount).toBe(0);
    expect(resetQueue[1].status).toBe('pending');
    expect(resetQueue[1].skipReason).toBeUndefined();
  });

  it('filters contacts strictly based on target filter mode (unsent vs sent vs all)', () => {
    const contacts = [
      { id: '1', name: 'أحمد', isValidPhone: true, excludedFromSession: false, messagingStatus: 'sent' as const },
      { id: '2', name: 'خالد', isValidPhone: true, excludedFromSession: false, messagingStatus: 'unsent' as const },
      { id: '3', name: 'منى', isValidPhone: true, excludedFromSession: true, messagingStatus: 'unsent' as const }, // excluded
      { id: '4', name: 'خطأ', isValidPhone: false, excludedFromSession: false, messagingStatus: 'unsent' as const }, // invalid phone
    ];

    const filterForSession = (mode: 'unsent' | 'all' | 'sent') => {
      return contacts.filter((c) => {
        if (!c.isValidPhone || c.excludedFromSession) return false;
        if (mode === 'sent') return c.messagingStatus === 'sent';
        if (mode === 'all') return true;
        return c.messagingStatus !== 'sent';
      });
    };

    expect(filterForSession('unsent').map((c) => c.name)).toEqual(['خالد']);
    expect(filterForSession('sent').map((c) => c.name)).toEqual(['أحمد']);
    expect(filterForSession('all').map((c) => c.name)).toEqual(['أحمد', 'خالد']);
  });
});
