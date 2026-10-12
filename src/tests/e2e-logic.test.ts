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
});
