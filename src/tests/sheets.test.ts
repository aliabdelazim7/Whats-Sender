import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  syncToGoogleSheets,
  replaceAllGoogleSheetsContacts,
  clearGoogleSheetsContacts,
  deleteGoogleSheetsContact,
  fetchContactsFromGoogleSheets,
} from '../lib/sheets';
import { Contact } from '../types';

const mockContact: Contact = {
  id: 'c1',
  name: 'Ahmed',
  originalPhone: '01012345678',
  normalizedPhone: '201012345678',
  internationalPhone: '+20 10 1234 5678',
  isValidPhone: true,
  phoneStatus: 'valid',
  customFields: {},
  messagingStatus: 'unsent',
  createdAt: 1700000000000,
};

describe('Google Sheets Two-Way Sync Module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sends replace_all_contacts payload correctly', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      json: async () => ({ status: 'success', syncedCount: 1 }),
    } as any);

    const result = await replaceAllGoogleSheetsContacts('https://mock-script.com/exec', [mockContact]);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://mock-script.com/exec');
    expect(options?.method).toBe('POST');
    const body = JSON.parse(options?.body as string);
    expect(body.action).toBe('replace_all_contacts');
    expect(body.contacts.length).toBe(1);
    expect(body.contacts[0].normalizedPhone).toBe('201012345678');
    expect(result.success).toBe(true);
  });

  it('sends sync_contacts payload correctly', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      json: async () => ({ status: 'success', syncedCount: 1 }),
    } as any);

    const result = await syncToGoogleSheets('https://mock-script.com/exec', [mockContact]);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, options] = fetchSpy.mock.calls[0];
    const body = JSON.parse(options?.body as string);
    expect(body.action).toBe('sync_contacts');
    expect(result.success).toBe(true);
  });

  it('sends clear_contacts payload correctly', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      json: async () => ({ status: 'success', message: 'Contacts cleared' }),
    } as any);

    const result = await clearGoogleSheetsContacts('https://mock-script.com/exec');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, options] = fetchSpy.mock.calls[0];
    const body = JSON.parse(options?.body as string);
    expect(body.action).toBe('clear_contacts');
    expect(result.success).toBe(true);
  });

  it('sends delete_contact payload with id and phone', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      json: async () => ({ status: 'success', deletedCount: 1 }),
    } as any);

    const result = await deleteGoogleSheetsContact('https://mock-script.com/exec', 'c1', '201012345678');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, options] = fetchSpy.mock.calls[0];
    const body = JSON.parse(options?.body as string);
    expect(body.action).toBe('delete_contact');
    expect(body.id).toBe('c1');
    expect(body.phone).toBe('201012345678');
    expect(result.success).toBe(true);
  });

  it('fetches contacts and maps normalized phone properly', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      text: async () =>
        JSON.stringify({
          status: 'success',
          contacts: [
            {
              id: 'c1',
              name: 'Mohamed',
              originalPhone: '01099998888',
              normalizedPhone: '201099998888',
              internationalPhone: '+20 10 9999 8888',
              isValid: true,
              status: 'valid',
              messagingStatus: 'sent',
            },
          ],
        }),
    } as any);

    const contacts = await fetchContactsFromGoogleSheets('https://mock-script.com/exec');
    expect(contacts.length).toBe(1);
    expect(contacts[0].name).toBe('Mohamed');
    expect(contacts[0].normalizedPhone).toBe('201099998888');
    expect(contacts[0].messagingStatus).toBe('sent');
  });
});
