import React, { useState } from 'react';
import { ShieldCheck, Database, Trash2, Check, Globe, Moon, Sun } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';

interface SettingsViewProps {
  onClearAllLocalData: () => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onClearAllLocalData }) => {
  const { settings, updateSettings, t } = useSettings();
  const [clearedNotice, setClearedNotice] = useState(false);

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

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
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
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                  settings.language === 'ar'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                العربية (RTL)
              </button>
              <button
                onClick={() => updateSettings({ language: 'en' })}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
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
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                  settings.theme === 'light'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                Light
              </button>
              <button
                onClick={() => updateSettings({ theme: 'dark' })}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
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
