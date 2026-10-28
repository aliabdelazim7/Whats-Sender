import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  syncToGoogleSheets,
  replaceAllGoogleSheetsContacts,
  clearGoogleSheetsContacts,
  deleteGoogleSheetsContact,
  fetchContactsFromGoogleSheets,
  syncSessionToGoogleSheets,
  fetchSessionFromGoogleSheets,
  clearSessionFromGoogleSheets,
} from '../lib/sheets';
import { Contact, CampaignSession, QueueItem } from '../types';

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

  it('syncs active campaign session and queue to Google Sheets', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      json: async () => ({ status: 'success' }),
    } as any);

    const mockSession: CampaignSession = {
      id: 's1',
      name: 'Campaign 1',
      templateContent: 'Hello',
      totalCount: 1,
      currentIndex: 0,
      status: 'running',
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };

    const mockQueue: QueueItem[] = [
      {
        id: 'q1',
        sessionId: 's1',
        contactId: 'c1',
        contactName: 'Ahmed',
        contactPhone: '201012345678',
        renderedMessage: 'Hello',
        status: 'pending',
        attemptCount: 0,
      },
    ];

    const result = await syncSessionToGoogleSheets('https://mock-script.com/exec', mockSession, mockQueue);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, options] = fetchSpy.mock.calls[0];
    const body = JSON.parse(options?.body as string);
    expect(body.action).toBe('sync_session');
    expect(body.session.id).toBe('s1');
    expect(body.queue.length).toBe(1);
    expect(result.success).toBe(true);
  });

  it('fetches remote active session and queue successfully', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      text: async () =>
        JSON.stringify({
          status: 'success',
          session: {
            id: 's1',
            name: 'Remote Campaign',
            templateContent: 'Hi',
            currentIndex: 1,
            status: 'running',
            totalCount: 2,
            updatedAt: 1700000000000,
          },
          queue: [
            {
              id: 'q1',
              contactId: 'c1',
              contactName: 'Sami',
              contactPhone: '966501112233',
              renderedMessage: 'Hi Sami',
              status: 'confirmed_sent',
              attemptCount: 1,
            },
          ],
        }),
    } as any);

    const data = await fetchSessionFromGoogleSheets('https://mock-script.com/exec');
    expect(data.session).not.toBeNull();
    expect(data.session?.name).toBe('Remote Campaign');
    expect(data.session?.currentIndex).toBe(1);
    expect(data.queue.length).toBe(1);
    expect(data.queue[0].status).toBe('confirmed_sent');
  });

  it('clears active session in Google Sheets', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      json: async () => ({ status: 'success', message: 'Session cleared' }),
    } as any);

    const result = await clearSessionFromGoogleSheets('https://mock-script.com/exec');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, options] = fetchSpy.mock.calls[0];
    const body = JSON.parse(options?.body as string);
    expect(body.action).toBe('clear_session');
    expect(result.success).toBe(true);
  });
});
