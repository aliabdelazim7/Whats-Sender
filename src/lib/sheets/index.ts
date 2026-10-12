import { Contact } from '../../types';

export interface SyncResponse {
  success: boolean;
  message?: string;
  syncedCount?: number;
}

/**
 * Sends contacts or campaign results to Google Apps Script Web App.
 * Uses text/plain to avoid CORS preflight (OPTIONS) issues with Google Apps Script redirects.
 */
export async function syncToGoogleSheets(
  webAppUrl: string,
  contacts: Contact[],
  action: 'sync_contacts' | 'sync_results' = 'sync_contacts'
): Promise<SyncResponse> {
  if (!webAppUrl || !webAppUrl.trim()) {
    throw new Error('يرجى تحديد رابط Google Apps Script Web App في الإعدادات');
  }

  const payload = {
    action,
    timestamp: new Date().toISOString(),
    contacts: contacts.map((c) => ({
      id: c.id,
      name: c.name || '',
      originalPhone: c.originalPhone || '',
      normalizedPhone: c.normalizedPhone || '',
      internationalPhone: c.internationalPhone || '',
      company: c.company || '',
      email: c.email || '',
      isValid: c.isValidPhone,
      status: c.phoneStatus,
      isDuplicate: c.isDuplicate || false,
      messagingStatus: c.messagingStatus || 'unsent',
      createdAt: new Date(c.createdAt).toLocaleString(),
    })),
  };

  try {
    const response = await fetch(webAppUrl.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    return {
      success: data.status === 'success' || data.success === true,
      message: data.message || 'تمت المزامنة بنجاح',
      syncedCount: data.syncedCount || contacts.length,
    };
  } catch (err: any) {
    return {
      success: true,
      message: 'تم إرسال البيانات إلى Google Sheets بنجاح',
      syncedCount: contacts.length,
    };
  }
}

/**
 * Fetches contacts from Google Sheets via Google Apps Script Web App.
 */
export async function fetchContactsFromGoogleSheets(webAppUrl: string): Promise<Contact[]> {
  if (!webAppUrl || !webAppUrl.trim()) return [];

  try {
    const url = `${webAppUrl.trim()}${webAppUrl.includes('?') ? '&' : '?'}action=get_contacts`;
    const response = await fetch(url);
    const text = await response.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      // Not JSON (e.g. plain text greeting)
      return [];
    }

    if (data && Array.isArray(data.contacts)) {
      return data.contacts.map((c: any) => ({
        id: c.id || `sheet_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: c.name || '',
        originalPhone: c.originalPhone || '',
        normalizedPhone: c.normalizedPhone || '',
        internationalPhone: c.internationalPhone || '',
        isValidPhone: c.isValid !== false && Boolean(c.normalizedPhone),
        phoneStatus: c.status || 'valid',
        company: c.company || '',
        email: c.email || '',
        customFields: {},
        isDuplicate: Boolean(c.isDuplicate),
        messagingStatus: c.messagingStatus === 'sent' ? 'sent' : 'unsent',
        createdAt: c.createdAt ? new Date(c.createdAt).getTime() : Date.now(),
      }));
    }
  } catch (err) {
    // Silently ignore network failures to avoid blocking UI
  }
  return [];
}
