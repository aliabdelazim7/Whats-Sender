import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Contact, MessageTemplate, CampaignSession, QueueItem, AppSettings } from '../../types';

interface AppDB extends DBSchema {
  contacts: {
    key: string;
    value: Contact;
    indexes: {
      'by-phone': string;
      'by-created': number;
    };
  };
  templates: {
    key: string;
    value: MessageTemplate;
    indexes: {
      'by-created': number;
    };
  };
  sessions: {
    key: string;
    value: CampaignSession;
    indexes: {
      'by-created': number;
    };
  };
  queue: {
    key: string;
    value: QueueItem;
    indexes: {
      'by-session': string;
      'by-status': string;
    };
  };
}

const DB_NAME = 'excel_messaging_assistant_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<AppDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<AppDB>> {
  if (!dbPromise) {
    dbPromise = openDB<AppDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Contacts store
        if (!db.objectStoreNames.contains('contacts')) {
          const contactStore = db.createObjectStore('contacts', { keyPath: 'id' });
          contactStore.createIndex('by-phone', 'normalizedPhone');
          contactStore.createIndex('by-created', 'createdAt');
        }

        // Templates store
        if (!db.objectStoreNames.contains('templates')) {
          const templateStore = db.createObjectStore('templates', { keyPath: 'id' });
          templateStore.createIndex('by-created', 'createdAt');
        }

        // Sessions store
        if (!db.objectStoreNames.contains('sessions')) {
          const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' });
          sessionStore.createIndex('by-created', 'createdAt');
        }

        // Queue store
        if (!db.objectStoreNames.contains('queue')) {
          const queueStore = db.createObjectStore('queue', { keyPath: 'id' });
          queueStore.createIndex('by-session', 'sessionId');
          queueStore.createIndex('by-status', 'status');
        }
      },
    });
  }
  return dbPromise;
}

// Contacts Repository
export async function getAllContacts(): Promise<Contact[]> {
  const db = await getDB();
  return db.getAll('contacts');
}

export async function saveContacts(contacts: Contact[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('contacts', 'readwrite');
  for (const contact of contacts) {
    await tx.store.put(contact);
  }
  await tx.done;
}

export async function updateContact(contact: Contact): Promise<void> {
  const db = await getDB();
  await db.put('contacts', contact);
}

export async function deleteContact(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('contacts', id);
}

export async function clearAllContacts(): Promise<void> {
  const db = await getDB();
  await db.clear('contacts');
}

// Templates Repository
export async function getAllTemplates(): Promise<MessageTemplate[]> {
  const db = await getDB();
  return db.getAll('templates');
}

export async function saveTemplate(template: MessageTemplate): Promise<void> {
  const db = await getDB();
  await db.put('templates', template);
}

export async function deleteTemplate(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('templates', id);
}

// Session & Queue Repository
export async function getSession(id: string): Promise<CampaignSession | undefined> {
  const db = await getDB();
  return db.get('sessions', id);
}

export async function getLatestSession(): Promise<CampaignSession | undefined> {
  const db = await getDB();
  const all = await db.getAllFromIndex('sessions', 'by-created');
  const activeSessions = all.filter((s) => s.status !== 'completed');
  return activeSessions[activeSessions.length - 1];
}

export async function saveSession(session: CampaignSession): Promise<void> {
  const db = await getDB();
  await db.put('sessions', session);
}

export async function deleteSession(sessionId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['sessions', 'queue'], 'readwrite');
  await tx.objectStore('sessions').delete(sessionId);
  
  const queueStore = tx.objectStore('queue');
  const queueIndex = queueStore.index('by-session');
  let cursor = await queueIndex.openCursor(IDBKeyRange.only(sessionId));
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

export async function clearAllSessions(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['sessions', 'queue'], 'readwrite');
  await tx.objectStore('sessions').clear();
  await tx.objectStore('queue').clear();
  await tx.done;
}

export async function getQueueItems(sessionId: string): Promise<QueueItem[]> {
  const db = await getDB();
  return db.getAllFromIndex('queue', 'by-session', sessionId);
}

export async function saveQueueItems(items: QueueItem[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('queue', 'readwrite');
  for (const item of items) {
    await tx.store.put(item);
  }
  await tx.done;
}

export async function updateQueueItem(item: QueueItem): Promise<void> {
  const db = await getDB();
  await db.put('queue', item);
}

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['contacts', 'templates', 'sessions', 'queue'], 'readwrite');
  await tx.objectStore('contacts').clear();
  await tx.objectStore('templates').clear();
  await tx.objectStore('sessions').clear();
  await tx.objectStore('queue').clear();
  await tx.done;
}

// Settings storage via localStorage
const SETTINGS_KEY = 'excel_assistant_settings';

export const defaultSettings: AppSettings = {
  language: 'ar',
  theme: 'light',
  defaultCountry: 'EG',
  mockMode: false,
  maskPhoneInReports: true,
  googleAppsScriptUrl:
    'https://script.google.com/macros/s/AKfycbyhKMkH38eqxyapd0l08BodPcmz9yUQBV2VbAHgnRLetGFItZrFgFfh5JeBwbq7XH-O/exec',
};

export function getSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      return { ...defaultSettings, ...JSON.parse(raw) };
    }
  } catch {
    // fallback
  }
  return defaultSettings;
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}
