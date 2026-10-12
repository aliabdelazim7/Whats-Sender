import React, { useState, useMemo } from 'react';
import { Search, Trash2, CheckCircle2, XCircle, Copy, UserCheck, CloudUpload, RefreshCw } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { Contact } from '../../types';
import { syncToGoogleSheets } from '../../lib/sheets';

interface ContactsViewProps {
  contacts: Contact[];
  onDeleteContact: (id: string) => void;
  onClearAll: () => void;
  onOpenImport: () => void;
  onToggleExclude: (id: string) => void;
  onSyncFromSheets?: () => Promise<void>;
}

export const ContactsView: React.FC<ContactsViewProps> = ({
  contacts,
  onDeleteContact,
  onClearAll,
  onOpenImport,
  onToggleExclude,
  onSyncFromSheets,
}) => {
  const { settings, t } = useSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'valid' | 'invalid' | 'duplicates' | 'unsent' | 'sent'>('all');
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      // Filter tab
      if (filterType === 'valid' && !c.isValidPhone) return false;
      if (filterType === 'invalid' && c.isValidPhone) return false;
      if (filterType === 'duplicates' && !c.isDuplicate) return false;
      if (filterType === 'unsent' && c.messagingStatus === 'sent') return false;
      if (filterType === 'sent' && c.messagingStatus !== 'sent') return false;

      // Search query
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.originalPhone.toLowerCase().includes(q) ||
        c.normalizedPhone.toLowerCase().includes(q) ||
        (c.company && c.company.toLowerCase().includes(q))
      );
    });
  }, [contacts, filterType, searchTerm]);

  const totalPages = Math.ceil(filteredContacts.length / pageSize) || 1;
  const paginatedContacts = filteredContacts.slice((page - 1) * pageSize, page * pageSize);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const handleSyncToSheets = async () => {
    if (!settings.googleAppsScriptUrl) {
      alert('يرجى أولاً إدخال رابط Google Apps Script Web App من تبويب الإعدادات (Settings).');
      return;
    }
    if (contacts.length === 0) {
      alert('لا توجد جهات اتصال لمزامنتها.');
      return;
    }

    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const res = await syncToGoogleSheets(settings.googleAppsScriptUrl, contacts);
      setSyncStatus(`تم حفظ ${res.syncedCount || contacts.length} جهة اتصال في Google Sheets بنجاح!`);
      setTimeout(() => setSyncStatus(null), 5000);
    } catch (e: any) {
      alert(e.message || 'فشلت المزامنة مع Google Sheets');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t.contacts.title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {contacts.length} total contact records stored locally
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
          {onSyncFromSheets && (
            <button
              disabled={isSyncing}
              onClick={async () => {
                setIsSyncing(true);
                setSyncStatus(null);
                try {
                  await onSyncFromSheets();
                  setSyncStatus('تم جلب الأرقام والبيانات من Google Sheets بنجاح!');
                  setTimeout(() => setSyncStatus(null), 5000);
                } catch (e: any) {
                  alert(e.message || 'فشل جلب البيانات من Google Sheets');
                } finally {
                  setIsSyncing(false);
                }
              }}
              title="جلب وتحديث الأرقام المحفوظة في Google Sheets"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/80 rounded-xl transition cursor-pointer border border-blue-200 dark:border-blue-800 disabled:opacity-50 min-h-[44px]"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>جلب من Sheets</span>
            </button>
          )}

          {contacts.length > 0 && (
            <button
              disabled={isSyncing}
              onClick={handleSyncToSheets}
              title="مزامنة وحفظ الأرقام في Google Sheets عبر Apps Script"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 rounded-xl transition cursor-pointer border border-emerald-200 dark:border-emerald-800 disabled:opacity-50 min-h-[44px]"
            >
              <CloudUpload className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isSyncing ? 'جاري الحفظ...' : 'حفظ في Sheets'}</span>
            </button>
          )}

          {contacts.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm(t.contacts.confirmClear)) {
                  onClearAll();
                }
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 rounded-xl transition cursor-pointer min-h-[44px]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t.contacts.clearAll}</span>
            </button>
          )}

          <button
            onClick={onOpenImport}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition cursor-pointer min-h-[44px]"
          >
            <span>+ {t.dashboard.importNew}</span>
          </button>
        </div>
      </div>

      {syncStatus && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{syncStatus}</span>
        </div>
      )}

      {/* Search & Filters Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-xs">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute top-3 left-3 rtl:left-auto rtl:right-3 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            placeholder={t.contacts.searchPlaceholder}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-3 rtl:pl-3 rtl:pr-9 py-2 text-xs focus:ring-1 focus:ring-emerald-500 outline-hidden"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => {
              setFilterType('all');
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition ${
              filterType === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            {t.contacts.filterAll} ({contacts.length})
          </button>

          <button
            onClick={() => {
              setFilterType('valid');
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition ${
              filterType === 'valid'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            {t.contacts.filterValid} ({contacts.filter((c) => c.isValidPhone).length})
          </button>

          <button
            onClick={() => {
              setFilterType('invalid');
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition ${
              filterType === 'invalid'
                ? 'bg-red-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            {t.contacts.filterInvalid} ({contacts.filter((c) => !c.isValidPhone).length})
          </button>

          <button
            onClick={() => {
              setFilterType('duplicates');
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition ${
              filterType === 'duplicates'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            {t.contacts.filterDuplicates} ({contacts.filter((c) => c.isDuplicate).length})
          </button>

          <button
            onClick={() => {
              setFilterType('unsent');
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition ${
              filterType === 'unsent'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            لم يُرسل ({contacts.filter((c) => c.messagingStatus !== 'sent').length})
          </button>

          <button
            onClick={() => {
              setFilterType('sent');
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition ${
              filterType === 'sent'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            تم الإرسال ({contacts.filter((c) => c.messagingStatus === 'sent').length})
          </button>
        </div>
      </div>

      {/* Contacts Table & Mobile Card List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        {/* Desktop Table View (Hidden on mobile < sm) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-xs text-left rtl:text-right text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">{t.contacts.name}</th>
                <th className="p-3">{t.contacts.phone}</th>
                <th className="p-3">{t.contacts.original}</th>
                <th className="p-3">{t.contacts.company}</th>
                <th className="p-3">{t.contacts.status}</th>
                <th className="p-3 text-center">{t.contacts.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedContacts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    {t.contacts.noContacts}
                  </td>
                </tr>
              ) : (
                paginatedContacts.map((contact, index) => {
                  const itemNumber = (page - 1) * pageSize + index + 1;
                  return (
                    <tr
                      key={contact.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition ${
                        contact.excludedFromSession ? 'opacity-50' : ''
                      }`}
                    >
                      <td className="p-3 text-slate-400">{itemNumber}</td>
                      <td className="p-3 font-medium text-slate-900 dark:text-white">
                        {contact.name || '—'}
                      </td>
                      <td className="p-3 font-mono">
                        {contact.isValidPhone ? (
                          <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                            {contact.internationalPhone || contact.normalizedPhone}
                          </span>
                        ) : (
                          <span className="text-red-500 line-through">
                            {contact.originalPhone}
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-slate-400">{contact.originalPhone}</td>
                      <td className="p-3 text-slate-500">{contact.company || '—'}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          {contact.isValidPhone ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                              <CheckCircle2 className="w-3 h-3" />
                              Valid
                            </span>
                          ) : (
                            <span
                              title={contact.phoneError}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400"
                            >
                              <XCircle className="w-3 h-3" />
                              {contact.phoneStatus}
                            </span>
                          )}

                          {contact.messagingStatus === 'sent' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                              تم الإرسال
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500">
                              لم يُرسل
                            </span>
                          )}

                          {contact.isDuplicate && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                              <Copy className="w-3 h-3" />
                              Duplicate
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => onToggleExclude(contact.id)}
                            title={contact.excludedFromSession ? 'Include in session' : 'Exclude from session'}
                            className={`p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center ${
                              contact.excludedFromSession ? 'text-amber-500' : 'text-slate-400'
                            }`}
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDeleteContact(contact.id)}
                            title={t.contacts.delete}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List View (Visible on mobile < sm) */}
        <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {paginatedContacts.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              {t.contacts.noContacts}
            </div>
          ) : (
            paginatedContacts.map((contact, index) => {
              const itemNumber = (page - 1) * pageSize + index + 1;
              return (
                <div
                  key={contact.id}
                  className={`p-3.5 space-y-2.5 transition ${
                    contact.excludedFromSession ? 'opacity-50 bg-slate-50/50 dark:bg-slate-900/50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[11px] font-mono text-slate-400 shrink-0">
                        #{itemNumber}
                      </span>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {contact.name || 'بدون اسم / Unnamed'}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {contact.messagingStatus === 'sent' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                          تم الإرسال
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500">
                          لم يُرسل
                        </span>
                      )}

                      {contact.isValidPhone ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                          صالح
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400">
                          غير صالح
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Phone & Company */}
                  <div className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl">
                    <div className="min-w-0">
                      <p className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                        {contact.isValidPhone
                          ? (contact.internationalPhone || contact.normalizedPhone)
                          : contact.originalPhone}
                      </p>
                      {contact.company && (
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {contact.company}
                        </p>
                      )}
                    </div>

                    {contact.isValidPhone && (
                      <a
                        href={`https://wa.me/${(contact.normalizedPhone || '').replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition flex items-center gap-1 shrink-0 min-h-[36px]"
                      >
                        واتساب
                      </a>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => onToggleExclude(contact.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer min-h-[40px] ${
                        contact.excludedFromSession
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>{contact.excludedFromSession ? 'تضمين' : 'استبعاد'}</span>
                    </button>

                    <button
                      onClick={() => onDeleteContact(contact.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 transition cursor-pointer min-h-[40px]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t.contacts.delete}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Page {page} of {totalPages} ({filteredContacts.length} total)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
