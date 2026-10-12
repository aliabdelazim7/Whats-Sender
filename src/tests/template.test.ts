import { describe, it, expect } from 'vitest';
import { renderTemplate, extractTemplateVariables } from '../lib/template';
import { WhatsAppClickToChatAdapter } from '../adapters/messaging';
import { Contact } from '../types';

describe('Message Template & WhatsApp Link Adapter', () => {
  const sampleContact: Contact = {
    id: 'c1',
    name: 'أحمد علي',
    originalPhone: '01012345678',
    normalizedPhone: '201012345678',
    internationalPhone: '+20 101 234 5678',
    isValidPhone: true,
    phoneStatus: 'valid',
    company: 'التقنية الحديثة',
    email: 'ahmed@example.com',
    customFields: {
      orderId: 'ORD-9981',
    },
    createdAt: Date.now(),
  };

  it('extracts placeholders properly', () => {
    const template = 'مرحبا {{name}}، طلبك رقم {{orderId}} من {{company}} جاهز!';
    const vars = extractTemplateVariables(template);
    expect(vars).toEqual(['name', 'orderId', 'company']);
  });

  it('renders variables with Arabic text, emojis, and custom fields', () => {
    const template = 'أهلاً بك يا {{name}} 👋\nطلبك: {{orderId}}\nالشركة: {{company}}';
    const result = renderTemplate(template, sampleContact);

    expect(result.hasErrors).toBe(false);
    expect(result.renderedText).toContain('أهلاً بك يا أحمد علي 👋');
    expect(result.renderedText).toContain('ORD-9981');
    expect(result.renderedText).toContain('التقنية الحديثة');
  });

  it('detects missing variables and does not silently fail', () => {
    const template = 'مرحباً {{name}}، الخصم الخاص بك هو {{discountCode}}';
    const result = renderTemplate(template, sampleContact);

    expect(result.hasErrors).toBe(true);
    expect(result.missingVariables).toContain('discountCode');
  });

  it('generates valid, officially formatted WhatsApp Click to Chat URL', () => {
    const adapter = new WhatsAppClickToChatAdapter();
    const message = 'مرحباً أحمد 👋\nكيف حالك؟';
    const url = adapter.createMessageLink(sampleContact, message);

    expect(url).toBeDefined();
    expect(url).toContain('https://wa.me/201012345678?text=');
    // Ensure encoded message can be decoded back to identical text
    const encodedPart = url!.split('?text=')[1];
    expect(decodeURIComponent(encodedPart)).toBe(message);
  });

  it('rejects sending when recipient has invalid phone', () => {
    const adapter = new WhatsAppClickToChatAdapter();
    const invalidContact = { ...sampleContact, isValidPhone: false, normalizedPhone: '' };
    const url = adapter.createMessageLink(invalidContact, 'Test');

    expect(url).toBeNull();
  });
});
