import React, { useState } from 'react';
import { FileSpreadsheet, Shield, FileText } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { QueueItem } from '../../types';
import { exportQueueReportToCsv, exportQueueReportToXlsx, downloadBlob } from '../../lib/export';

interface ReportsViewProps {
  queue: QueueItem[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({ queue }) => {
  const { settings, updateSettings, t } = useSettings();
  const [maskPhone, setMaskPhone] = useState<boolean>(settings.maskPhoneInReports);

  const handleExportCsv = () => {
    if (queue.length === 0) return;
    const csvContent = exportQueueReportToCsv(queue, maskPhone);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const filename = `messaging_report_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadBlob(blob, filename);
  };

  const handleExportXlsx = () => {
    if (queue.length === 0) return;
    const blob = exportQueueReportToXlsx(queue, maskPhone);
    const filename = `messaging_report_${new Date().toISOString().slice(0, 10)}.xlsx`;
    downloadBlob(blob, filename);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t.reports.title}</h2>
        <p className="text-xs text-slate-500 mt-0.5">{t.reports.description}</p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4 sm:space-y-6 max-w-2xl">
        {/* Privacy Mask Option */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-700/60">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={maskPhone}
              onChange={(e) => {
                setMaskPhone(e.target.checked);
                updateSettings({ maskPhoneInReports: e.target.checked });
              }}
              className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
            />
            <div className="text-xs">
              <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-600" />
                {t.reports.maskPhoneToggle}
              </span>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Replaces middle digits with asterisks to protect client privacy in exported spreadsheets.
              </p>
            </div>
          </label>
        </div>

        {/* Export Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
          <button
            disabled={queue.length === 0}
            onClick={handleExportCsv}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-white bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer text-xs shadow-sm min-h-[44px]"
          >
            <FileText className="w-4 h-4" />
            <span>{t.reports.exportCsv}</span>
          </button>

          <button
            disabled={queue.length === 0}
            onClick={handleExportXlsx}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer text-xs shadow-sm min-h-[44px]"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{t.reports.exportXlsx}</span>
          </button>
        </div>

        {queue.length === 0 && (
          <p className="text-xs text-center text-slate-400">{t.reports.noData}</p>
        )}
      </div>
    </div>
  );
};
