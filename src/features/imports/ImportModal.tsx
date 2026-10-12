import React, { useState, useRef } from 'react';
import { Upload, FileType, CheckCircle2, AlertTriangle, Table, Globe } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { parseSpreadsheetFile, ParsedSpreadsheet } from '../../lib/spreadsheet';
import { buildContactsFromRows } from '../../lib/spreadsheet/mapper';
import { ColumnMapping, Contact } from '../../types';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (newContacts: Contact[]) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImportComplete }) => {
  const { settings, t } = useSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedSpreadsheet | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Mapping state
  const [phoneColumn, setPhoneColumn] = useState<string>('');
  const [nameColumn, setNameColumn] = useState<string>('');
  const [companyColumn, setCompanyColumn] = useState<string>('');
  const [emailColumn, setEmailColumn] = useState<string>('');
  const [customFields, setCustomFields] = useState<{ varName: string; colName: string }[]>([]);
  const [defaultCountry, setDefaultCountry] = useState<string>(settings.defaultCountry || 'EG');

  // Options
  const [importValidOnly, setImportValidOnly] = useState<boolean>(true);
  const [excludeDuplicates, setExcludeDuplicates] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleFileChange = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsParsing(true);
    setParseError(null);

    try {
      const parsed = await parseSpreadsheetFile(selectedFile);
      setParsedData(parsed);
      setSelectedSheet(parsed.selectedSheet);

      // Auto-detect columns intelligently
      const headersLower = parsed.headers.map((h) => ({ original: h, lower: h.toLowerCase() }));

      const detectedPhone = headersLower.find(
        (h) =>
          h.lower.includes('phone') ||
          h.lower.includes('mobile') ||
          h.lower.includes('هاتف') ||
          h.lower.includes('موبايل') ||
          h.lower.includes('جوال') ||
          h.lower.includes('tel')
      );
      if (detectedPhone) setPhoneColumn(detectedPhone.original);

      const detectedName = headersLower.find(
        (h) =>
          h.lower.includes('name') ||
          h.lower.includes('اسم') ||
          h.lower.includes('عميل') ||
          h.lower.includes('contact')
      );
      if (detectedName) setNameColumn(detectedName.original);

      const detectedCompany = headersLower.find(
        (h) =>
          h.lower.includes('company') ||
          h.lower.includes('شركة') ||
          h.lower.includes('مؤسسة') ||
          h.lower.includes('org')
      );
      if (detectedCompany) setCompanyColumn(detectedCompany.original);

      const detectedEmail = headersLower.find(
        (h) =>
          h.lower.includes('email') ||
          h.lower.includes('mail') ||
          h.lower.includes('بريد')
      );
      if (detectedEmail) setEmailColumn(detectedEmail.original);
    } catch (err: any) {
      setParseError(err?.message || t.import.parseError);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleAddCustomField = () => {
    setCustomFields([...customFields, { varName: '', colName: '' }]);
  };

  const handleCustomFieldChange = (index: number, key: 'varName' | 'colName', val: string) => {
    const updated = [...customFields];
    updated[index][key] = val;
    setCustomFields(updated);
  };

  const handleRemoveCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const handleFinalImport = () => {
    if (!parsedData || !phoneColumn) return;

    const customMapping: Record<string, string> = {};
    for (const f of customFields) {
      if (f.varName && f.colName) {
        customMapping[f.varName.trim()] = f.colName;
      }
    }

    const mapping: ColumnMapping = {
      phoneColumn,
      nameColumn: nameColumn || undefined,
      companyColumn: companyColumn || undefined,
      emailColumn: emailColumn || undefined,
      customColumns: customMapping,
    };

    let contacts = buildContactsFromRows(parsedData.rows, mapping, defaultCountry);

    if (importValidOnly) {
      contacts = contacts.filter((c) => c.isValidPhone);
    }

    if (excludeDuplicates) {
      contacts = contacts.filter((c) => !c.isDuplicate);
    }

    onImportComplete(contacts);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-3xl w-full p-4 sm:p-6 my-2 sm:my-8 max-h-[94vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileType className="w-5 h-5 text-emerald-600" />
              {t.import.title}
            </h2>
            <p className="text-xs text-slate-500 mt-1">{t.import.maxSizeNotice}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* Step 1: Upload Dropzone */}
        {!parsedData && (
          <div className="mt-4 sm:mt-6">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition bg-slate-50 dark:bg-slate-800/40"
            >
              <Upload className="w-10 h-10 sm:w-12 sm:h-12 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
              <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1">
                {t.import.dropzoneText}
              </p>
              <p className="text-xs text-slate-500">.XLSX, .XLS, .CSV</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
              />
            </div>
            {isParsing && (
              <p className="text-sm text-center text-emerald-600 font-medium mt-4">
                جاري قراءة الملف وتحليله محلياً... / Parsing file locally...
              </p>
            )}
            {parseError && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-lg text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{parseError}</span>
              </div>
            )}
          </div>
        )}

        {/* Step 2 & 3: Sheet selection & Column Mapping */}
        {parsedData && (
          <div className="mt-6 space-y-6">
            {/* Sheet Selector */}
            {parsedData.sheets.length > 1 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t.import.selectSheet}
                </label>
                <select
                  value={selectedSheet}
                  onChange={async (e) => {
                    const sheet = e.target.value;
                    setSelectedSheet(sheet);
                    if (file) {
                      const rep = await parseSpreadsheetFile(file, sheet);
                      setParsedData(rep);
                    }
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm"
                >
                  {parsedData.sheets.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Column Mapping Section */}
            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3 text-sm flex items-center gap-2">
                <Table className="w-4 h-4 text-emerald-600" />
                {t.import.columnMappingTitle}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Phone Column (Required) */}
                <div>
                  <label className="block text-xs font-semibold text-red-600 dark:text-red-400 mb-1">
                    {t.import.phoneColumn} *
                  </label>
                  <select
                    value={phoneColumn}
                    onChange={(e) => setPhoneColumn(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-sm"
                  >
                    <option value="">{t.import.selectColumn}</option>
                    {parsedData.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Name Column */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t.import.nameColumn}
                  </label>
                  <select
                    value={nameColumn}
                    onChange={(e) => setNameColumn(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-sm"
                  >
                    <option value="">{t.import.selectColumn}</option>
                    {parsedData.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Company Column */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t.import.companyColumn}
                  </label>
                  <select
                    value={companyColumn}
                    onChange={(e) => setCompanyColumn(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-sm"
                  >
                    <option value="">{t.import.selectColumn}</option>
                    {parsedData.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Email Column */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {t.import.emailColumn}
                  </label>
                  <select
                    value={emailColumn}
                    onChange={(e) => setEmailColumn(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-sm"
                  >
                    <option value="">{t.import.selectColumn}</option>
                    {parsedData.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Country Selection */}
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700/60">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-slate-500" />
                  {t.import.defaultCountry}
                </label>
                <select
                  value={defaultCountry}
                  onChange={(e) => setDefaultCountry(e.target.value)}
                  className="w-full sm:w-1/2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-sm"
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

              {/* Custom Variable Fields */}
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700/60">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {t.import.customFields}
                  </span>
                  <button
                    onClick={handleAddCustomField}
                    type="button"
                    className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    + {t.import.addCustomField}
                  </button>
                </div>
                {customFields.map((field, idx) => (
                  <div key={idx} className="flex gap-2 items-center mb-2">
                    <input
                      type="text"
                      placeholder={t.import.varName}
                      value={field.varName}
                      onChange={(e) => handleCustomFieldChange(idx, 'varName', e.target.value)}
                      className="w-1/2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs"
                    />
                    <select
                      value={field.colName}
                      onChange={(e) => handleCustomFieldChange(idx, 'colName', e.target.value)}
                      className="w-1/2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs"
                    >
                      <option value="">{t.import.selectColumn}</option>
                      {parsedData.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleRemoveCustomField(idx)}
                      className="text-red-500 hover:text-red-700 text-xs px-1 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Import Filters Checkboxes */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={importValidOnly}
                  onChange={(e) => setImportValidOnly(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>{t.import.importValidOnly}</span>
              </label>

              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={excludeDuplicates}
                  onChange={(e) => setExcludeDuplicates(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>{t.import.excludeDuplicates}</span>
              </label>
            </div>

            {/* Quick Preview Table */}
            {phoneColumn && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  {t.import.previewTitle} ({parsedData.rows.length} rows loaded)
                </h4>
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg max-h-40">
                  <table className="w-full text-xs text-left rtl:text-right text-slate-600 dark:text-slate-300">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 uppercase font-semibold">
                      <tr>
                        <th className="p-2">#</th>
                        <th className="p-2">{phoneColumn}</th>
                        {nameColumn && <th className="p-2">{nameColumn}</th>}
                        {companyColumn && <th className="p-2">{companyColumn}</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.rows.slice(0, 5).map((r, i) => (
                        <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                          <td className="p-2">{i + 1}</td>
                          <td className="p-2 font-mono font-medium">{String(r[phoneColumn] ?? '')}</td>
                          {nameColumn && <td className="p-2">{String(r[nameColumn] ?? '')}</td>}
                          {companyColumn && <td className="p-2">{String(r[companyColumn] ?? '')}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={onClose}
                className="inline-flex items-center justify-center px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer min-h-[44px]"
              >
                {t.import.cancel}
              </button>
              <button
                disabled={!phoneColumn}
                onClick={handleFinalImport}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition cursor-pointer min-h-[44px]"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{t.import.confirmImport}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
