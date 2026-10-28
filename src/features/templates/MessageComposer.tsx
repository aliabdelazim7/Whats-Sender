import React, { useState, useMemo } from 'react';
import {
  Save,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  Tag,
  Globe,
  Filter,
} from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { Contact, MessageTemplate } from '../../types';
import { renderTemplate, STANDARD_VARS } from '../../lib/template';
import { WhatsAppClickToChatAdapter } from '../../adapters/messaging';
import { getCountryInfo } from '../../lib/phone';

interface MessageComposerProps {
  contacts: Contact[];
  templates: MessageTemplate[];
  onSaveTemplate: (template: MessageTemplate) => void;
  onDeleteTemplate: (id: string) => void;
  onStartSessionWithTemplate: (templateContent: string, targetContacts?: Contact[]) => void;
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

  // Advanced Segment Filters
  const [statusFilter, setStatusFilter] = useState<'unsent' | 'all' | 'sent'>('unsent');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');

  const [selectedRecipientIndex, setSelectedRecipientIndex] = useState(0);
  const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('editor');

  // Template Form Category State
  const [templateCategory, setTemplateCategory] = useState<string>('عام');
  const [isCustomCategory, setIsCustomCategory] = useState<boolean>(false);
  const [customCategoryInput, setCustomCategoryInput] = useState<string>('');
  const [savedTemplateFilter, setSavedTemplateFilter] = useState<string>('all');

  // Available unique categories
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    contacts.forEach((c) => {
      if (c.category && c.category.trim()) {
        set.add(c.category.trim());
      }
    });
    return Array.from(set);
  }, [contacts]);

  // All known categories combining contacts and templates
  const allKnownCategories = useMemo(() => {
    const set = new Set<string>(['عام']);
    availableCategories.forEach((c) => set.add(c));
    templates.forEach((t) => {
      if (t.category && t.category.trim()) set.add(t.category.trim());
    });
    return Array.from(set);
  }, [availableCategories, templates]);

  // Sync template category when user selects a specific segment category
  const handleCategoryFilterChange = (newCat: string) => {
    setCategoryFilter(newCat);
    if (newCat !== 'all') {
      setTemplateCategory(newCat);
      setIsCustomCategory(false);
    }
  };

  // Available unique countries
  const availableCountries = useMemo(() => {
    const countryMap = new Map<string, number>();
    contacts.forEach((c) => {
      if (c.countryCode) {
        const code = c.countryCode.toUpperCase();
        countryMap.set(code, (countryMap.get(code) || 0) + 1);
      }
    });
    return Array.from(countryMap.entries()).map(([code, count]) => ({
      code,
      count,
      ...getCountryInfo(code),
    }));
  }, [contacts]);

  // Filter contacts eligible for session based on (status + category + country)
  const validContacts = useMemo(() => {
    return contacts.filter((c) => {
      if (!c.isValidPhone || c.excludedFromSession) return false;
      // Status filter
      if (statusFilter === 'unsent' && c.messagingStatus === 'sent') return false;
      if (statusFilter === 'sent' && c.messagingStatus !== 'sent') return false;
      // Category filter
      if (categoryFilter !== 'all' && (c.category || 'عام') !== categoryFilter) return false;
      // Country filter
      if (countryFilter !== 'all' && (c.countryCode || '').toUpperCase() !== countryFilter.toUpperCase()) return false;
      return true;
    });
  }, [contacts, statusFilter, categoryFilter, countryFilter]);

  const currentRecipient = validContacts[selectedRecipientIndex] || validContacts[0];

  const renderResult = currentRecipient
    ? renderTemplate(content, currentRecipient)
    : { renderedText: content, missingVariables: [], hasErrors: false };

  const generatedLink = currentRecipient
    ? whatsappAdapter.createMessageLink(currentRecipient, renderResult.renderedText)
    : null;

  const standardPlaceholders = STANDARD_VARS;
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
    const effectiveCategory = isCustomCategory
      ? (customCategoryInput.trim() || 'عام')
      : (templateCategory || 'عام');

    const newTemplate: MessageTemplate = {
      id: `tmpl_${Date.now()}`,
      title: templateTitle,
      content,
      category: effectiveCategory,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    onSaveTemplate(newTemplate);
    setTitle('');
    if (isCustomCategory) {
      setIsCustomCategory(false);
      setTemplateCategory(effectiveCategory);
      setCustomCategoryInput('');
    }
  };

  const filteredSavedTemplates = useMemo(() => {
    if (savedTemplateFilter === 'all') return templates;
    return templates.filter((tpl) => (tpl.category || 'عام') === savedTemplateFilter);
  }, [templates, savedTemplateFilter]);

  const matchingSegmentTemplates = useMemo(() => {
    if (categoryFilter === 'all') return [];
    return templates.filter((tpl) => (tpl.category || 'عام') === categoryFilter);
  }, [templates, categoryFilter]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">{t.composer.title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {t.composer.variablesHelp} {allAvailablePlaceholders.map((v) => `{{${v}}}`).join(', ')}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          {validContacts.length > 0 && (
            <button
              onClick={() => onStartSessionWithTemplate(content, validContacts)}
              className={`inline-flex items-center justify-center gap-2 px-5 py-3 sm:py-2.5 text-xs font-bold text-white rounded-xl shadow-xs transition cursor-pointer min-h-[44px] ${
                statusFilter === 'sent'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <span>
                {statusFilter === 'sent'
                  ? `بدء جلسة متابعة (${validContacts.length})`
                  : `${t.dashboard.startSession} (${validContacts.length})`}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Segment Targeting Card (Category, Country, Status) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              تحديد واستهداف المستلمين للجلسة (Target Audience)
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            {validContacts.length} جهة اتصال مطابقة
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* 1. Category Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-emerald-600" />
              <span>التصنيف / المجال</span>
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => {
                handleCategoryFilterChange(e.target.value);
                setSelectedRecipientIndex(0);
              }}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs font-medium"
            >
              <option value="all">جميع التصنيفات ({contacts.filter((c) => c.isValidPhone).length})</option>
              {availableCategories.map((cat) => {
                const count = contacts.filter((c) => c.isValidPhone && (c.category || 'عام') === cat).length;
                return (
                  <option key={cat} value={cat}>
                    🏷️ {cat} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* 2. Country Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-blue-600" />
              <span>الدولة</span>
            </label>
            <select
              value={countryFilter}
              onChange={(e) => {
                setCountryFilter(e.target.value);
                setSelectedRecipientIndex(0);
              }}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs font-medium"
            >
              <option value="all">جميع الدول ({contacts.filter((c) => c.isValidPhone).length})</option>
              {availableCountries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.nameAr} ({c.count})
                </option>
              ))}
            </select>
          </div>

          {/* 3. Messaging Status Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 text-indigo-600" />
              <span>حالة الإرسال</span>
            </label>
            <div className="grid grid-cols-3 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('unsent');
                  setSelectedRecipientIndex(0);
                }}
                className={`py-1.5 rounded-md font-medium transition cursor-pointer text-center truncate ${
                  statusFilter === 'unsent'
                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                لم يُرسل
              </button>

              <button
                type="button"
                onClick={() => {
                  setStatusFilter('all');
                  setSelectedRecipientIndex(0);
                }}
                className={`py-1.5 rounded-md font-medium transition cursor-pointer text-center truncate ${
                  statusFilter === 'all'
                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                الكل
              </button>

              <button
                type="button"
                onClick={() => {
                  setStatusFilter('sent');
                  setSelectedRecipientIndex(0);
                }}
                className={`py-1.5 rounded-md font-medium transition cursor-pointer text-center truncate ${
                  statusFilter === 'sent'
                    ? 'bg-blue-600 text-white font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                متابعة (أُرسل)
              </button>
            </div>
          </div>
        </div>

        {matchingSegmentTemplates.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
              💡 قوالب مخصصة لهذا التصنيف ({categoryFilter}):
            </span>
            {matchingSegmentTemplates.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => {
                  setContent(tpl.content);
                  setTitle(tpl.title);
                  setTemplateCategory(tpl.category || 'عام');
                }}
                className="px-2.5 py-1 text-xs rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 font-medium transition cursor-pointer"
              >
                استخدام: {tpl.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mobile Tab Switcher (Visible on < lg) */}
      <div className="lg:hidden flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
        <button
          type="button"
          onClick={() => setMobileTab('editor')}
          className={`flex-1 py-2.5 rounded-lg transition cursor-pointer text-center min-h-[40px] ${
            mobileTab === 'editor'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          ✏️ {t.composer.contentLabel}
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('preview')}
          className={`flex-1 py-2.5 rounded-lg transition cursor-pointer text-center min-h-[40px] ${
            mobileTab === 'preview'
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          👁️ {t.composer.previewTitle}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Left: Editor & Template Management */}
        <div className={`space-y-4 ${mobileTab === 'editor' ? 'block' : 'hidden lg:block'}`}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
            {/* Template Title & Category Row */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t.composer.templateTitle}
                  </label>
                  <input
                    type="text"
                    placeholder={t.composer.templatePlaceholder}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    تصنيف القالب (Category)
                  </label>
                  {!isCustomCategory ? (
                    <div className="flex gap-1.5">
                      <select
                        value={templateCategory}
                        onChange={(e) => {
                          if (e.target.value === '__new__') {
                            setIsCustomCategory(true);
                          } else {
                            setTemplateCategory(e.target.value);
                          }
                        }}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 text-xs font-medium"
                      >
                        {allKnownCategories.map((cat) => (
                          <option key={cat} value={cat}>
                            🏷️ {cat}
                          </option>
                        ))}
                        <option value="__new__">+ إنشاء تصنيف جديد...</option>
                      </select>
                    </div>
                  ) : (
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        autoFocus
                        placeholder="اسم التصنيف الجديد (مثلاً: عيادات)..."
                        value={customCategoryInput}
                        onChange={(e) => setCustomCategoryInput(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => setIsCustomCategory(false)}
                        className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                      >
                        إلغاء
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSave}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition cursor-pointer shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{t.composer.saveTemplate} (وحفظه بالتصنيف)</span>
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

          {/* Saved Templates List with Category Filter */}
          {templates.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t.composer.savedTemplates} ({templates.length})
                </h3>

                {/* Filter templates by category */}
                <div className="flex items-center gap-1.5 text-xs overflow-x-auto pb-1 sm:pb-0">
                  <span className="text-[11px] text-slate-400 shrink-0">تصفية:</span>
                  <button
                    type="button"
                    onClick={() => setSavedTemplateFilter('all')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                      savedTemplateFilter === 'all'
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    الكل
                  </button>
                  {allKnownCategories.map((cat) => {
                    const count = templates.filter((t) => (t.category || 'عام') === cat).length;
                    if (count === 0) return null;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSavedTemplateFilter(cat)}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer shrink-0 ${
                          savedTemplateFilter === cat
                            ? 'bg-emerald-600 text-white font-bold'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        🏷️ {cat} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto">
                {filteredSavedTemplates.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">
                    لا توجد قوالب محفوظة في هذا التصنيف
                  </p>
                ) : (
                  filteredSavedTemplates.map((tpl) => (
                    <div
                      key={tpl.id}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 hover:border-emerald-500 transition"
                    >
                      <div className="overflow-hidden pr-2 rtl:pr-0 rtl:pl-2">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {tpl.title}
                          </p>
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium shrink-0">
                            🏷️ {tpl.category || 'عام'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{tpl.content}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            setContent(tpl.content);
                            setTitle(tpl.title);
                            if (tpl.category) {
                              setTemplateCategory(tpl.category);
                            }
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded cursor-pointer"
                        >
                          {t.composer.loadTemplate}
                        </button>
                        <button
                          onClick={() => onDeleteTemplate(tpl.id)}
                          className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 rounded cursor-pointer"
                          title="حذف القالب"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Live Preview & WhatsApp link test */}
        <div className={`space-y-4 ${mobileTab === 'preview' ? 'block' : 'hidden lg:block'}`}>
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
                  <div className="flex justify-between items-center pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-400">التصنيف:</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                      🏷️ {currentRecipient.category || 'عام'}
                    </span>
                  </div>
                  {currentRecipient.countryCode && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">الدولة:</span>
                      <span className="text-slate-700 dark:text-slate-300 font-medium">
                        {getCountryInfo(currentRecipient.countryCode).flag} {getCountryInfo(currentRecipient.countryCode).nameAr}
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
