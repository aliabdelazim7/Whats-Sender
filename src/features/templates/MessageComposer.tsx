import React, { useState, useMemo } from 'react';
import {
  Save,
  Trash2,
  Copy,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { Contact, MessageTemplate } from '../../types';
import { renderTemplate, extractTemplateVariables } from '../../lib/template';
import { WhatsAppClickToChatAdapter } from '../../adapters/messaging';

interface MessageComposerProps {
  contacts: Contact[];
  templates: MessageTemplate[];
  onSaveTemplate: (template: MessageTemplate) => void;
  onDeleteTemplate: (id: string) => void;
  onStartSessionWithTemplate: (templateContent: string) => void;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  contacts,
  templates,
  onSaveTemplate,
  onDeleteTemplate,
  onStartSessionWithTemplate,
}) => {
  const { t } = useSettings();
  const whatsappAdapter = new WhatsAppClickToChatAdapter();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState(
    'مرحباً {{name}}،\n\nنود إعلامكم بتحديث مهم بخصوص طلبكم لدى {{company}}.\nهل ترغب في موافاتك بالتفاصيل؟'
  );
  const [recipientFilter, setRecipientFilter] = useState<'unsent' | 'all' | 'sent'>('unsent');
  const [selectedRecipientIndex, setSelectedRecipientIndex] = useState(0);

  // Filter contacts eligible for preview based on user selection (unsent / all / sent)
  const validContacts = useMemo(() => {
    return contacts.filter((c) => {
      if (!c.isValidPhone || c.excludedFromSession) return false;
      if (recipientFilter === 'unsent') return c.messagingStatus !== 'sent';
      if (recipientFilter === 'sent') return c.messagingStatus === 'sent';
      return true; // 'all'
    });
  }, [contacts, recipientFilter]);

  const currentRecipient = validContacts[selectedRecipientIndex] || validContacts[0];

  const renderResult = currentRecipient
    ? renderTemplate(content, currentRecipient)
    : { renderedText: content, missingVariables: [], hasErrors: false };

  const generatedLink = currentRecipient
    ? whatsappAdapter.createMessageLink(currentRecipient, renderResult.renderedText)
    : null;

  const usedVariables = extractTemplateVariables(content);

  const standardPlaceholders = ['name', 'phone', 'company', 'email'];
  // Include any custom fields present across contacts
  const customFieldKeys = Array.from(
    new Set(contacts.flatMap((c) => Object.keys(c.customFields || {})))
  );
  const allAvailablePlaceholders = Array.from(
    new Set([...standardPlaceholders, ...customFieldKeys])
  );

  const insertVariable = (varName: string) => {
    setContent((prev) => `${prev} {{${varName}}}`);
  };

  const handleSave = () => {
    const templateTitle = title.trim() || `Template ${templates.length + 1}`;
    const newTemplate: MessageTemplate = {
      id: `tmpl_${Date.now()}`,
      title: templateTitle,
      content,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    onSaveTemplate(newTemplate);
    setTitle('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t.composer.title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {t.composer.variablesHelp} {allAvailablePlaceholders.map((v) => `{{${v}}}`).join(', ')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Recipient Filter Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
            <button
              onClick={() => {
                setRecipientFilter('unsent');
                setSelectedRecipientIndex(0);
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                recipientFilter === 'unsent'
                  ? 'bg-emerald-600 text-white font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              لم يتم الإرسال ({contacts.filter((c) => c.isValidPhone && c.messagingStatus !== 'sent').length})
            </button>

            <button
              onClick={() => {
                setRecipientFilter('all');
                setSelectedRecipientIndex(0);
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                recipientFilter === 'all'
                  ? 'bg-emerald-600 text-white font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              الكل ({contacts.filter((c) => c.isValidPhone).length})
            </button>

            <button
              onClick={() => {
                setRecipientFilter('sent');
                setSelectedRecipientIndex(0);
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                recipientFilter === 'sent'
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              تم الإرسال ({contacts.filter((c) => c.isValidPhone && c.messagingStatus === 'sent').length})
            </button>
          </div>

          {validContacts.length > 0 && (
            <button
              onClick={() => onStartSessionWithTemplate(content)}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition cursor-pointer"
            >
              <span>{t.dashboard.startSession} ({validContacts.length} recipients)</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Editor & Template Management */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
            {/* Template Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t.composer.templateTitle}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={t.composer.templatePlaceholder}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs outline-hidden"
                />
                <button
                  onClick={handleSave}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer shrink-0"
                >
                  <Save className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{t.composer.saveTemplate}</span>
                </button>
              </div>
            </div>

            {/* Variable Pills to click and insert */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                {t.composer.clickToInsert}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {allAvailablePlaceholders.map((varName) => (
                  <button
                    key={varName}
                    type="button"
                    onClick={() => insertVariable(varName)}
                    className="px-2.5 py-1 text-xs font-mono font-medium rounded-md bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 transition cursor-pointer"
                  >
                    +{`{{${varName}}}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t.composer.contentLabel}
                </label>
                <span className="text-[11px] text-slate-400">
                  {t.composer.charCount} {content.length}
                </span>
              </div>
              <textarea
                rows={9}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                dir="auto"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-sm focus:ring-1 focus:ring-emerald-500 outline-hidden leading-relaxed resize-y font-sans"
              />
            </div>
          </div>

          {/* Saved Templates List */}
          {templates.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                {t.composer.savedTemplates} ({templates.length})
              </h3>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 hover:border-emerald-500 transition"
                  >
                    <div className="overflow-hidden pr-2 rtl:pr-0 rtl:pl-2">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {tpl.title}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">{tpl.content}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => {
                          setContent(tpl.content);
                          setTitle(tpl.title);
                        }}
                        className="px-2 py-1 text-[11px] font-semibold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded cursor-pointer"
                      >
                        {t.composer.loadTemplate}
                      </button>
                      <button
                        onClick={() => onDeleteTemplate(tpl.id)}
                        className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Live Preview & WhatsApp link test */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-emerald-600" />
                {t.composer.previewTitle}
              </h3>

              {validContacts.length > 1 && (
                <div className="flex items-center gap-2 text-xs">
                  <button
                    disabled={selectedRecipientIndex <= 0}
                    onClick={() => setSelectedRecipientIndex((i) => Math.max(0, i - 1))}
                    className="p-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 rtl:rotate-180" />
                  </button>
                  <span className="text-slate-500">
                    {selectedRecipientIndex + 1} / {validContacts.length}
                  </span>
                  <button
                    disabled={selectedRecipientIndex >= validContacts.length - 1}
                    onClick={() =>
                      setSelectedRecipientIndex((i) => Math.min(validContacts.length - 1, i + 1))
                    }
                    className="p-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
                  </button>
                </div>
              )}
            </div>

            {currentRecipient ? (
              <div className="mt-4 space-y-4">
                {/* Recipient Details Card */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Recipient:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {currentRecipient.name || 'Unnamed'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Phone:</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      {currentRecipient.internationalPhone || currentRecipient.normalizedPhone}
                    </span>
                  </div>
                  {currentRecipient.company && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Company:</span>
                      <span className="text-slate-700 dark:text-slate-300">
                        {currentRecipient.company}
                      </span>
                    </div>
                  )}
                </div>

                {/* Missing Variable Warnings */}
                {renderResult.hasErrors && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 rounded-lg text-xs flex items-start gap-2 border border-amber-200 dark:border-amber-900/50">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">{t.composer.missingVarsWarning}</p>
                      <p className="font-mono mt-0.5">
                        {renderResult.missingVariables.map((v) => `{{${v}}}`).join(', ')}
                      </p>
                    </div>
                  </div>
                )}

                {/* WhatsApp Chat Preview Bubble */}
                <div className="bg-[#e5ddd5] dark:bg-slate-800 p-4 rounded-xl shadow-inner min-h-48 flex flex-col justify-end">
                  <div
                    dir="auto"
                    className="bg-white dark:bg-slate-700/90 text-slate-900 dark:text-white p-3.5 rounded-lg rounded-tr-none shadow-sm max-w-[88%] self-end text-sm leading-relaxed whitespace-pre-wrap font-sans"
                  >
                    {renderResult.renderedText}
                    <div className="text-[10px] text-slate-400 text-right mt-1.5 flex items-center justify-end gap-1">
                      <span>12:00</span>
                      <CheckCircle className="w-3 h-3 text-slate-400" />
                    </div>
                  </div>
                </div>

                {/* Generated URL Display */}
                {generatedLink && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      {t.composer.previewUrl}
                    </p>
                    <p className="font-mono text-xs text-emerald-600 dark:text-emerald-400 truncate break-all select-all">
                      {generatedLink}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs">
                {t.dashboard.emptyContactsTip}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
