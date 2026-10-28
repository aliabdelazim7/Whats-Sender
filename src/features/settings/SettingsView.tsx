import React, { useState } from 'react';
import { ShieldCheck, Trash2, Check, Globe, Sun, Code2, Copy } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';

interface SettingsViewProps {
  onClearAllLocalData: () => Promise<void>;
}

const APPS_SCRIPT_SNIPPET = `function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'get_contacts';
  if (action === 'clear_contacts') return handleClearContacts();
  if (action === 'get_session') return handleGetSession();
  if (action === 'clear_session') return handleClearSession();
  return handleGetContacts();
}

function doPost(e) {
  try {
    var contents = e && e.postData ? e.postData.contents : '';
    var payload = contents ? JSON.parse(contents) : {};
    var action = payload.action || 'sync_contacts';
    if (action === 'clear_contacts') return handleClearContacts();
    if (action === 'replace_all_contacts') return handleReplaceAllContacts(payload.contacts || []);
    if (action === 'delete_contact') return handleDeleteContact(payload.id, payload.phone);
    if (action === 'sync_contacts' || action === 'sync_results') return handleSyncContacts(payload.contacts || []);
    if (action === 'sync_session') return handleSyncSession(payload.session, payload.queue || []);
    if (action === 'get_session') return handleGetSession();
    if (action === 'clear_session') return handleClearSession();
    return createJsonResponse({ status: 'success' });
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

var HEADERS = ['ID', 'Name', 'Original Phone', 'Normalized Phone', 'International Phone', 'Company', 'Email', 'Is Valid', 'Status', 'Is Duplicate', 'Messaging Status', 'Created At', 'Last Updated'];

function getOrCreateSheet(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var name = sheetName || 'Contacts';
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (name === 'Contacts' && sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#E2F0D9');
  }
  return sheet;
}

function handleClearContacts() {
  var sheet = getOrCreateSheet('Contacts');
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
  return createJsonResponse({ status: 'success', message: 'Contacts cleared', count: 0 });
}

function handleReplaceAllContacts(contacts) {
  var sheet = getOrCreateSheet('Contacts');
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
  if (contacts && contacts.length > 0) {
    var nowStr = new Date().toLocaleString();
    var rows = contacts.map(function(c) {
      return [c.id || '', c.name || '', "'" + String(c.originalPhone || ''), "'" + String(c.normalizedPhone || ''), "'" + String(c.internationalPhone || ''), c.company || '', c.email || '', c.isValid === true ? 'TRUE' : 'FALSE', c.status || 'valid', c.isDuplicate === true ? 'TRUE' : 'FALSE', c.messagingStatus || 'unsent', c.createdAt || nowStr, nowStr];
    });
    sheet.getRange(2, 1, rows.length, HEADERS.length).setValues(rows);
  }
  return createJsonResponse({ status: 'success', count: contacts ? contacts.length : 0 });
}

function handleDeleteContact(id, phone) {
  var sheet = getOrCreateSheet('Contacts');
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return createJsonResponse({ status: 'success' });
  var data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  for (var i = data.length - 1; i >= 0; i--) {
    var rowId = String(data[i][0] || '').trim();
    var rowOrig = String(data[i][2] || '').replace(/['\\s]/g, '').trim();
    var rowNorm = String(data[i][3] || '').replace(/['\\s]/g, '').trim();
    var search = phone ? String(phone).replace(/['\\s]/g, '').trim() : '';
    if ((id && rowId === String(id).trim()) || (search && (rowNorm === search || rowOrig === search))) {
      sheet.deleteRow(i + 2);
    }
  }
  return createJsonResponse({ status: 'success' });
}

function handleSyncContacts(contacts) {
  var sheet = getOrCreateSheet('Contacts');
  var lastRow = sheet.getLastRow();
  var phoneToRowMap = {};
  if (lastRow > 1) {
    var vals = sheet.getRange(2, 4, lastRow - 1, 1).getValues();
    for (var i = 0; i < vals.length; i++) {
      var p = String(vals[i][0] || '').replace(/['\\s]/g, '').trim();
      if (p) phoneToRowMap[p] = i + 2;
    }
  }
  var nowStr = new Date().toLocaleString();
  var toAppend = [];
  for (var j = 0; j < contacts.length; j++) {
    var c = contacts[j];
    var norm = String(c.normalizedPhone || c.originalPhone || '').replace(/['\\s]/g, '').trim();
    var targetRow = phoneToRowMap[norm];
    var rowData = [c.id || '', c.name || '', "'" + String(c.originalPhone || ''), "'" + String(c.normalizedPhone || ''), "'" + String(c.internationalPhone || ''), c.company || '', c.email || '', c.isValid === true ? 'TRUE' : 'FALSE', c.status || 'valid', c.isDuplicate === true ? 'TRUE' : 'FALSE', c.messagingStatus || 'unsent', c.createdAt || nowStr, nowStr];
    if (targetRow) sheet.getRange(targetRow, 1, 1, HEADERS.length).setValues([rowData]);
    else toAppend.push(rowData);
  }
  if (toAppend.length > 0) sheet.getRange(sheet.getLastRow() + 1, 1, toAppend.length, HEADERS.length).setValues(toAppend);
  return createJsonResponse({ status: 'success', syncedCount: contacts.length });
}

function handleGetContacts() {
  var sheet = getOrCreateSheet('Contacts');
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return createJsonResponse({ status: 'success', contacts: [] });
  var data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  var contacts = [];
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var norm = String(row[3] || '').replace(/['\\s]/g, '').trim();
    var orig = String(row[2] || '').replace(/['\\s]/g, '').trim();
    if (!norm && !orig) continue;
    contacts.push({
      id: String(row[0] || ''),
      name: String(row[1] || ''),
      originalPhone: orig,
      normalizedPhone: norm,
      internationalPhone: String(row[4] || '').replace(/^'/, ''),
      company: String(row[5] || ''),
      email: String(row[6] || ''),
      isValid: row[7] === 'TRUE' || row[7] === true,
      status: String(row[8] || 'valid'),
      isDuplicate: row[9] === 'TRUE' || row[9] === true,
      messagingStatus: String(row[10] || 'unsent'),
      createdAt: String(row[11] || '')
    });
  }
  return createJsonResponse({ status: 'success', contacts: contacts });
}

function handleSyncSession(session, queue) {
  var sheet = getOrCreateSheet('ActiveSession');
  sheet.clear();
  if (!session || !session.id) return createJsonResponse({ status: 'success' });
  sheet.appendRow(['ID', 'Name', 'TemplateContent', 'CurrentIndex', 'Status', 'TotalCount', 'UpdatedAt']);
  sheet.appendRow([session.id || '', session.name || '', session.templateContent || '', session.currentIndex || 0, session.status || 'running', session.totalCount || (queue ? queue.length : 0), session.updatedAt || Date.now()]);
  sheet.appendRow(['QueueID', 'ContactID', 'ContactName', 'ContactPhone', 'Status', 'AttemptCount', 'LastAttemptAt', 'SkipReason', 'RenderedMessage']);
  if (queue && queue.length > 0) {
    var queueRows = queue.map(function(q) {
      return [q.id || '', q.contactId || '', q.contactName || '', "'" + String(q.contactPhone || ''), q.status || 'pending', q.attemptCount || 0, q.lastAttemptAt || '', q.skipReason || '', q.renderedMessage || ''];
    });
    sheet.getRange(4, 1, queueRows.length, 9).setValues(queueRows);
  }
  return createJsonResponse({ status: 'success' });
}

function handleGetSession() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('ActiveSession');
  if (!sheet || sheet.getLastRow() < 2) return createJsonResponse({ status: 'success', session: null, queue: [] });
  var meta = sheet.getRange(2, 1, 1, 7).getValues()[0];
  if (!meta[0]) return createJsonResponse({ status: 'success', session: null, queue: [] });
  var session = {
    id: String(meta[0]),
    name: String(meta[1] || 'Campaign'),
    templateContent: String(meta[2] || ''),
    currentIndex: Number(meta[3] || 0),
    status: String(meta[4] || 'running'),
    totalCount: Number(meta[5] || 0),
    createdAt: Date.now(),
    updatedAt: Number(meta[6] || Date.now())
  };
  var queue = [];
  var lastRow = sheet.getLastRow();
  if (lastRow >= 4) {
    var queueData = sheet.getRange(4, 1, lastRow - 3, 9).getValues();
    for (var i = 0; i < queueData.length; i++) {
      var r = queueData[i];
      if (!r[0]) continue;
      queue.push({
        id: String(r[0]),
        sessionId: session.id,
        contactId: String(r[1]),
        contactName: String(r[2]),
        contactPhone: String(r[3]).replace(/['\\s]/g, ''),
        status: String(r[4] || 'pending'),
        attemptCount: Number(r[5] || 0),
        lastAttemptAt: r[6] ? Number(r[6]) : undefined,
        skipReason: r[7] ? String(r[7]) : undefined,
        renderedMessage: String(r[8] || '')
      });
    }
  }
  return createJsonResponse({ status: 'success', session: session, queue: queue });
}

function handleClearSession() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('ActiveSession');
  if (sheet) sheet.clear();
  return createJsonResponse({ status: 'success' });
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}`;

export const SettingsView: React.FC<SettingsViewProps> = ({ onClearAllLocalData }) => {
  const { settings, updateSettings, t } = useSettings();
  const [clearedNotice, setClearedNotice] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleClear = async () => {
    if (window.confirm(t.settings.confirmClearAll)) {
      await onClearAllLocalData();
      setClearedNotice(true);
      setTimeout(() => setClearedNotice(false), 4000);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t.settings.title}</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Local configuration, preferences, and privacy verification.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xs space-y-6">
        {/* Language & Theme Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-emerald-600" />
              {t.settings.language}
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => updateSettings({ language: 'ar' })}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer min-h-[44px] ${
                  settings.language === 'ar'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                العربية (RTL)
              </button>
              <button
                onClick={() => updateSettings({ language: 'en' })}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer min-h-[44px] ${
                  settings.language === 'en'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                English (LTR)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
              <Sun className="w-4 h-4 text-amber-500" />
              {t.settings.theme}
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => updateSettings({ theme: 'light' })}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer min-h-[44px] ${
                  settings.theme === 'light'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                Light
              </button>
              <button
                onClick={() => updateSettings({ theme: 'dark' })}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer min-h-[44px] ${
                  settings.theme === 'dark'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                Dark
              </button>
            </div>
          </div>
        </div>

        {/* Default Country */}
        <div className="pb-6 border-b border-slate-100 dark:border-slate-800">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
            {t.settings.defaultCountry}
          </label>
          <select
            value={settings.defaultCountry}
            onChange={(e) => updateSettings({ defaultCountry: e.target.value })}
            className="w-full sm:w-1/2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs outline-hidden"
          >
            <option value="EG">Egypt / مصر (+20)</option>
            <option value="SA">Saudi Arabia / السعودية (+966)</option>
            <option value="AE">UAE / الإمارات (+971)</option>
            <option value="KW">Kuwait / الكويت (+965)</option>
            <option value="US">USA / Canada (+1)</option>
            <option value="GB">United Kingdom (+44)</option>
            <option value="DE">Germany (+49)</option>
          </select>
        </div>

        {/* Mock Mode (Testing & Safety) */}
        <div className="pb-6 border-b border-slate-100 dark:border-slate-800">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.mockMode}
              onChange={(e) => updateSettings({ mockMode: e.target.checked })}
              className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
            />
            <div className="text-xs">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {t.settings.mockMode}
              </span>
              <p className="text-slate-500 text-[11px] mt-0.5">
                When active, clicking "Open in WhatsApp" simulates success without opening external browser tabs.
              </p>
            </div>
          </label>
        </div>

        {/* Google Apps Script Integration */}
        <div className="pb-6 border-b border-slate-100 dark:border-slate-800 space-y-3">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Google Apps Script Web App URL (لحفظ ومزامنة الأرقام مع Google Sheets):
          </label>
          <input
            type="url"
            placeholder="https://script.google.com/macros/s/AKfycb.../exec"
            value={settings.googleAppsScriptUrl || ''}
            onChange={(e) => updateSettings({ googleAppsScriptUrl: e.target.value })}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs outline-hidden font-mono"
          />
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(APPS_SCRIPT_SNIPPET);
                setCopiedCode(true);
                setTimeout(() => setCopiedCode(false), 3000);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 cursor-pointer transition min-h-[36px]"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-emerald-600" />}
              <span>{copiedCode ? 'تم نسخ كود Apps Script!' : 'نسخ كود Google Apps Script'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowCode(!showCode)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer transition min-h-[36px]"
            >
              <Code2 className="w-3.5 h-3.5 text-slate-500" />
              <span>{showCode ? 'إخفاء الكود' : 'معاينة كود Apps Script'}</span>
            </button>
          </div>

          {showCode && (
            <div className="mt-3 p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto max-h-64 space-y-1">
              <pre>{APPS_SCRIPT_SNIPPET}</pre>
            </div>
          )}

          <p className="text-[11px] text-slate-500 leading-relaxed">
            💡 <strong>هام لمزامنة الحذف والاستبدال:</strong> يتيح هذا الكود المحدث في Apps Script حذف السجلات ومسحها واستبدالها بنقرة واحدة لضمان تطابق Google Sheets مع السيستيم بنسبة 100% بين جميع الأجهزة والمتصفحات.
          </p>
        </div>

        {/* Privacy Notice Card */}
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 p-4 rounded-xl space-y-1.5">
          <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            {t.settings.privacyNoticeTitle}
          </h4>
          <p className="text-xs text-emerald-900/80 dark:text-emerald-200/80 leading-relaxed">
            {t.settings.privacyNoticeContent}
          </p>
        </div>

        {/* Clear Data Section */}
        <div className="pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-red-600 dark:text-red-400">
                {t.settings.clearAllData}
              </p>
              <p className="text-[11px] text-slate-500">
                Wipes IndexedDB tables for contacts, drafts, templates, and sessions.
              </p>
            </div>

            <button
              onClick={handleClear}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t.settings.clearAllData}</span>
            </button>
          </div>

          {clearedNotice && (
            <div className="mt-3 p-3 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 rounded-lg text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{t.settings.dataCleared}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
