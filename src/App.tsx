import React, { useState, useEffect } from 'react';
import { SettingsProvider } from './context/SettingsContext';
import { Navbar } from './components/Navbar';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DashboardView } from './features/dashboard/DashboardView';
import { ContactsView } from './features/contacts/ContactsView';
import { MessageComposer } from './features/templates/MessageComposer';
import { SessionsView } from './features/campaigns/SessionsView';
import { ReportsView } from './features/reports/ReportsView';
import { SettingsView } from './features/settings/SettingsView';
import { ImportModal } from './features/imports/ImportModal';

import {
  Contact,
  MessageTemplate,
  CampaignSession,
  QueueItem,
} from './types';
import {
  getAllContacts,
  saveContacts,
  deleteContact,
  clearAllContacts,
  getAllTemplates,
  saveTemplate,
  deleteTemplate,
  getLatestSession,
  saveSession,
  deleteSession,
  clearAllSessions,
  getQueueItems,
  saveQueueItems,
  updateQueueItem,
  clearAllData,
} from './lib/storage';
import { renderTemplate } from './lib/template';
import { getSettings } from './lib/storage';
import { fetchContactsFromGoogleSheets, syncToGoogleSheets } from './lib/sheets';

export function AppContent() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isImportOpen, setIsImportOpen] = useState(false);

  // App Data State
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [session, setSession] = useState<CampaignSession | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load persisted records on startup
  useEffect(() => {
    async function loadData() {
      try {
        const storedContacts = await getAllContacts();
        const storedTemplates = await getAllTemplates();
        const latestSession = await getLatestSession();

        setContacts(storedContacts);
        setTemplates(storedTemplates);

        if (latestSession) {
          setSession(latestSession);
          const queueItems = await getQueueItems(latestSession.id);
          setQueue(queueItems);
        }

        // Automatic background pull: always fetch latest remote updates from Google Sheets on start
        const settings = getSettings();
        if (settings.googleAppsScriptUrl) {
          fetchContactsFromGoogleSheets(settings.googleAppsScriptUrl)
            .then(async (remoteContacts) => {
              if (remoteContacts && remoteContacts.length > 0) {
                // Merge intelligently preserving newest statuses
                setContacts((prev) => {
                  const map = new Map<string, Contact>();
                  remoteContacts.forEach((c) => map.set(c.normalizedPhone || c.id, c));
                  // Prefer current local changes if more recent
                  prev.forEach((c) => {
                    const key = c.normalizedPhone || c.id;
                    if (c.messagingStatus === 'sent') {
                      map.set(key, c);
                    }
                  });
                  const merged = Array.from(map.values());
                  saveContacts(merged).catch(() => {});
                  return merged;
                });
              }
            })
            .catch(() => {});
        }
      } catch (err) {
        console.error('Failed to load initial data from IndexedDB:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Contact Handlers
  const handleImportComplete = async (newContacts: Contact[]) => {
    const updated = [...contacts, ...newContacts];
    setContacts(updated);
    await saveContacts(newContacts);

    // Auto-backup to Google Sheets in background
    const settings = getSettings();
    if (settings.googleAppsScriptUrl) {
      syncToGoogleSheets(settings.googleAppsScriptUrl, newContacts).catch((err) =>
        console.warn('Background auto-backup to Google Sheets failed:', err)
      );
    }
  };

  const handleSyncFromSheets = async () => {
    const settings = getSettings();
    if (!settings.googleAppsScriptUrl) {
      throw new Error('يرجى تحديد رابط Google Apps Script في الإعدادات أولاً');
    }
    const remoteContacts = await fetchContactsFromGoogleSheets(settings.googleAppsScriptUrl);
    if (!remoteContacts || remoteContacts.length === 0) {
      throw new Error('لم يتم العثور على أرقام أو بيانات في Google Sheet حتى الآن');
    }
    setContacts(remoteContacts);
    await clearAllContacts();
    await saveContacts(remoteContacts);
  };

  const handleDeleteContact = async (id: string) => {
    const updated = contacts.filter((c) => c.id !== id);
    setContacts(updated);
    await deleteContact(id);
  };

  const handleClearAllContacts = async () => {
    setContacts([]);
    await clearAllContacts();
  };

  const handleToggleExcludeContact = async (id: string) => {
    const updated = contacts.map((c) =>
      c.id === id ? { ...c, excludedFromSession: !c.excludedFromSession } : c
    );
    setContacts(updated);
    const target = updated.find((c) => c.id === id);
    if (target) await saveContacts([target]);
  };

  // Template Handlers
  const handleSaveTemplate = async (template: MessageTemplate) => {
    const exists = templates.find((t) => t.id === template.id);
    const updated = exists
      ? templates.map((t) => (t.id === template.id ? template : t))
      : [template, ...templates];
    setTemplates(updated);
    await saveTemplate(template);
  };

  const handleDeleteTemplate = async (id: string) => {
    const updated = templates.filter((t) => t.id !== id);
    setTemplates(updated);
    await deleteTemplate(id);
  };

  // Session Handlers
  const handleStartSession = async (templateContent: string) => {
    const validRecipients = contacts.filter((c) => c.isValidPhone && !c.excludedFromSession);
    if (validRecipients.length === 0) return;

    const sessionId = `session_${Date.now()}`;
    const newSession: CampaignSession = {
      id: sessionId,
      name: `Campaign ${new Date().toLocaleDateString()}`,
      templateContent,
      totalCount: validRecipients.length,
      currentIndex: 0,
      status: 'running',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const newQueue: QueueItem[] = validRecipients.map((c, idx) => {
      const render = renderTemplate(templateContent, c);
      return {
        id: `q_${sessionId}_${idx}`,
        sessionId,
        contactId: c.id,
        contactName: c.name,
        contactPhone: c.normalizedPhone,
        renderedMessage: render.renderedText,
        status: 'pending',
        attemptCount: 0,
      };
    });

    setSession(newSession);
    setQueue(newQueue);
    await saveSession(newSession);
    await saveQueueItems(newQueue);
    setCurrentTab('sessions');
  };

  const handleUpdateQueueItem = async (item: QueueItem) => {
    const updatedQueue = queue.map((q) => (q.id === item.id ? item : q));
    setQueue(updatedQueue);
    await updateQueueItem(item);

    // Synchronize contact's messagingStatus
    if (item.status === 'confirmed_sent' || item.status === 'skipped') {
      const targetContact = contacts.find((c) => c.id === item.contactId);
      if (targetContact) {
        const updatedContact: Contact = {
          ...targetContact,
          messagingStatus: item.status === 'confirmed_sent' ? 'sent' : 'skipped',
          sentAt: item.status === 'confirmed_sent' ? Date.now() : targetContact.sentAt,
        };
        const newContactsList = contacts.map((c) =>
          c.id === item.contactId ? updatedContact : c
        );
        setContacts(newContactsList);
        await saveContacts([updatedContact]);

        // Auto-push status update to Google Sheets immediately in background
        const settings = getSettings();
        if (settings.googleAppsScriptUrl) {
          syncToGoogleSheets(settings.googleAppsScriptUrl, [updatedContact]).catch(() => {});
        }
      }
    }
  };

  const handleUpdateSession = async (updatedSession: CampaignSession) => {
    setSession(updatedSession);
    await saveSession(updatedSession);
  };

  const handleResetSession = async () => {
    if (!window.confirm('هل أنت متأكد من رغبتك في إنهاء جلسة المراسلة الحالية؟')) {
      return;
    }

    try {
      if (session) {
        await deleteSession(session.id);
      } else {
        await clearAllSessions();
      }
    } catch (e) {
      console.error('Failed to delete session from IndexedDB:', e);
    }

    setSession(null);
    setQueue([]);
    setCurrentTab('composer');
  };

  const handleRestartSession = async () => {
    if (!session || queue.length === 0) return;
    if (!window.confirm('هل تريد إعادة بدء الجلسة الحالية من أول رقم؟')) {
      return;
    }

    const resetQueue: QueueItem[] = queue.map((q) => ({
      ...q,
      status: 'pending',
      attemptCount: 0,
      skipReason: undefined,
    }));
    const resetSession: CampaignSession = {
      ...session,
      currentIndex: 0,
      status: 'running',
      updatedAt: Date.now(),
    };

    setSession(resetSession);
    setQueue(resetQueue);
    await saveSession(resetSession);
    await saveQueueItems(resetQueue);
  };

  const handleClearAllLocalData = async () => {
    await clearAllData();
    setContacts([]);
    setTemplates([]);
    setSession(null);
    setQueue([]);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-500">
        <p className="text-sm font-medium animate-pulse">جاري تحميل البيانات المحلية... / Loading local data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        sessionCount={queue.filter((q) => q.status === 'pending').length}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-24 md:pb-8">
        {currentTab === 'dashboard' && (
          <DashboardView
            contacts={contacts}
            session={session}
            queue={queue}
            onOpenImport={() => setIsImportOpen(true)}
            onNavigateTab={setCurrentTab}
            onResetSession={handleResetSession}
          />
        )}

        {currentTab === 'contacts' && (
          <ContactsView
            contacts={contacts}
            onDeleteContact={handleDeleteContact}
            onClearAll={handleClearAllContacts}
            onOpenImport={() => setIsImportOpen(true)}
            onToggleExclude={handleToggleExcludeContact}
            onSyncFromSheets={handleSyncFromSheets}
          />
        )}

        {currentTab === 'composer' && (
          <MessageComposer
            contacts={contacts}
            templates={templates}
            onSaveTemplate={handleSaveTemplate}
            onDeleteTemplate={handleDeleteTemplate}
            onStartSessionWithTemplate={handleStartSession}
          />
        )}

        {currentTab === 'sessions' && (
          <SessionsView
            session={session}
            queue={queue}
            onUpdateQueueItem={handleUpdateQueueItem}
            onUpdateSession={handleUpdateSession}
            onResetSession={handleResetSession}
            onRestartSession={handleRestartSession}
            onNavigateTab={setCurrentTab}
          />
        )}

        {currentTab === 'reports' && <ReportsView queue={queue} />}

        {currentTab === 'settings' && (
          <SettingsView onClearAllLocalData={handleClearAllLocalData} />
        )}
      </main>

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportComplete={handleImportComplete}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SettingsProvider>
        <AppContent />
      </SettingsProvider>
    </ErrorBoundary>
  );
}
