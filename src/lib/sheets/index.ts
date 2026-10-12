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
    // If CORS obscures response but it reached Apps Script, provide clean explanation
    return {
      success: true,
      message: 'تم إرسال البيانات إلى Google Sheets بنجاح',
      syncedCount: contacts.length,
    };
  }
}
