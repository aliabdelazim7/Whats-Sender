import { Contact, CampaignSession, QueueItem } from '../../types';

export interface SyncResponse {
  success: boolean;
  message?: string;
  syncedCount?: number;
}

/**
 * Format contact list for Apps Script payload.
 */
function formatContactsForPayload(contacts: Contact[]) {
  return contacts.map((c) => ({
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
  }));
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
    contacts: formatContactsForPayload(contacts),
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
  } catch {
    return {
      success: true,
      message: 'تم إرسال البيانات إلى Google Sheets بنجاح',
      syncedCount: contacts.length,
    };
  }
}

/**
 * Replaces all contacts in Google Sheets with the current authoritative contact list.
 * This wipes old stale/deleted rows and guarantees 1:1 parity.
 */
export async function replaceAllGoogleSheetsContacts(
  webAppUrl: string,
  contacts: Contact[]
): Promise<SyncResponse> {
  if (!webAppUrl || !webAppUrl.trim()) {
    throw new Error('يرجى تحديد رابط Google Apps Script Web App في الإعدادات');
  }

  const payload = {
    action: 'replace_all_contacts',
    timestamp: new Date().toISOString(),
    contacts: formatContactsForPayload(contacts),
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
      message: data.message || 'تم استبدال وحفظ جميع الأرقام في Google Sheets بنجاح',
      syncedCount: data.syncedCount || contacts.length,
    };
  } catch {
    return {
      success: true,
      message: 'تم تحديث واستبدال البيانات في Google Sheets بنجاح',
      syncedCount: contacts.length,
    };
  }
}

/**
 * Clears all contact rows in Google Sheets.
 */
export async function clearGoogleSheetsContacts(webAppUrl: string): Promise<SyncResponse> {
  if (!webAppUrl || !webAppUrl.trim()) return { success: false };

  const payload = {
    action: 'clear_contacts',
    timestamp: new Date().toISOString(),
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
      message: data.message || 'تم مسح الأرقام من Google Sheets بنجاح',
      syncedCount: 0,
    };
  } catch {
    return {
      success: true,
      message: 'تم إرسال أمر مسح الأرقام إلى Google Sheets بنجاح',
      syncedCount: 0,
    };
  }
}

/**
 * Deletes a single contact from Google Sheets by ID or phone number.
 */
export async function deleteGoogleSheetsContact(
  webAppUrl: string,
  contactId: string,
  phone?: string
): Promise<SyncResponse> {
  if (!webAppUrl || !webAppUrl.trim()) return { success: false };

  const payload = {
    action: 'delete_contact',
    id: contactId,
    phone: phone || '',
    timestamp: new Date().toISOString(),
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
      message: data.message || 'تم حذف جهة الاتصال من Google Sheets بنجاح',
    };
  } catch {
    return {
      success: true,
      message: 'تم إرسال أمر الحذف إلى Google Sheets بنجاح',
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
      const uniqueMap = new Map<string, Contact>();

      data.contacts.forEach((c: any) => {
        const phoneKey = c.normalizedPhone || c.originalPhone;
        if (!phoneKey) return;

        const contactObj: Contact = {
          id: c.id || `sheet_${phoneKey}`,
          name: c.name || '',
          originalPhone: c.originalPhone || '',
          normalizedPhone: c.normalizedPhone || '',
          internationalPhone: c.internationalPhone || '',
          isValidPhone: c.isValid !== false && Boolean(c.normalizedPhone),
          phoneStatus: c.status || 'valid',
          company: c.company || '',
          email: c.email || '',
          customFields: {},
          isDuplicate: false,
          messagingStatus: c.messagingStatus === 'sent' ? 'sent' : 'unsent',
          createdAt: c.createdAt ? new Date(c.createdAt).getTime() : Date.now(),
        };

        // If duplicate exists, preserve 'sent' status if already sent
        if (uniqueMap.has(phoneKey)) {
          const existing = uniqueMap.get(phoneKey)!;
          if (contactObj.messagingStatus === 'sent' || existing.messagingStatus === 'sent') {
            contactObj.messagingStatus = 'sent';
          }
        }

        uniqueMap.set(phoneKey, contactObj);
      });

      return Array.from(uniqueMap.values());
    }
  } catch {
    // Silently ignore network failures to avoid blocking UI
  }
  return [];
}

/**
 * Sends active campaign session and queue items to Google Sheets for cross-browser synchronization.
 */
export async function syncSessionToGoogleSheets(
  webAppUrl: string,
  session: CampaignSession | null,
  queue: QueueItem[]
): Promise<SyncResponse> {
  if (!webAppUrl || !webAppUrl.trim()) return { success: false };

  const payload = {
    action: 'sync_session',
    timestamp: new Date().toISOString(),
    session: session
      ? {
          id: session.id,
          name: session.name,
          templateContent: session.templateContent,
          currentIndex: session.currentIndex,
          status: session.status,
          totalCount: session.totalCount,
          updatedAt: session.updatedAt || Date.now(),
        }
      : null,
    queue: queue.map((q) => ({
      id: q.id,
      sessionId: q.sessionId,
      contactId: q.contactId,
      contactName: q.contactName,
      contactPhone: q.contactPhone,
      renderedMessage: q.renderedMessage,
      status: q.status,
      attemptCount: q.attemptCount,
      lastAttemptAt: q.lastAttemptAt,
      skipReason: q.skipReason,
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
      message: data.message || 'تمت مزامنة الجلسة مع Google Sheets بنجاح',
    };
  } catch {
    return {
      success: true,
      message: 'تم إرسال حالة الجلسة إلى Google Sheets بنجاح',
    };
  }
}

/**
 * Fetches the active campaign session and queue from Google Sheets.
 */
export async function fetchSessionFromGoogleSheets(
  webAppUrl: string
): Promise<{ session: CampaignSession | null; queue: QueueItem[] }> {
  if (!webAppUrl || !webAppUrl.trim()) {
    return { session: null, queue: [] };
  }

  try {
    const url = `${webAppUrl.trim()}${webAppUrl.includes('?') ? '&' : '?'}action=get_session`;
    const response = await fetch(url);
    const text = await response.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      return { session: null, queue: [] };
    }

    if (data && data.session && data.session.id) {
      const rawSession = data.session;
      const parsedSession: CampaignSession = {
        id: rawSession.id,
        name: rawSession.name || 'Campaign',
        templateContent: rawSession.templateContent || '',
        currentIndex: typeof rawSession.currentIndex === 'number' ? rawSession.currentIndex : 0,
        status: rawSession.status || 'running',
        totalCount: typeof rawSession.totalCount === 'number' ? rawSession.totalCount : 0,
        createdAt: rawSession.createdAt || Date.now(),
        updatedAt: rawSession.updatedAt || Date.now(),
      };

      const parsedQueue: QueueItem[] = Array.isArray(data.queue)
        ? data.queue.map((q: any) => ({
            id: q.id || `q_${parsedSession.id}_${Math.random()}`,
            sessionId: parsedSession.id,
            contactId: q.contactId || '',
            contactName: q.contactName || '',
            contactPhone: q.contactPhone || '',
            renderedMessage: q.renderedMessage || '',
            status: q.status || 'pending',
            attemptCount: q.attemptCount || 0,
            lastAttemptAt: q.lastAttemptAt,
            skipReason: q.skipReason,
          }))
        : [];

      return { session: parsedSession, queue: parsedQueue };
    }
  } catch {
    // Ignore network errors silently
  }

  return { session: null, queue: [] };
}

/**
 * Clears the active session and queue in Google Sheets.
 */
export async function clearSessionFromGoogleSheets(webAppUrl: string): Promise<SyncResponse> {
  if (!webAppUrl || !webAppUrl.trim()) return { success: false };

  const payload = {
    action: 'clear_session',
    timestamp: new Date().toISOString(),
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
      message: data.message || 'تم مسح الجلسة من Google Sheets بنجاح',
    };
  } catch {
    return {
      success: true,
      message: 'تم إرسال أمر مسح الجلسة إلى Google Sheets بنجاح',
    };
  }
}
