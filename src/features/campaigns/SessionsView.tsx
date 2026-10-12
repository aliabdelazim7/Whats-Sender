import React, { useState } from 'react';
import {
  SkipForward,
  CheckCircle2,
  ExternalLink,
  AlertTriangle,
  RotateCcw,
  Clock,
  ShieldCheck,
  XOctagon,
} from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { CampaignSession, QueueItem } from '../../types';

interface SessionsViewProps {
  session: CampaignSession | null;
  queue: QueueItem[];
  onUpdateQueueItem: (item: QueueItem) => void;
  onUpdateSession: (session: CampaignSession) => void;
  onResetSession: () => void;
  onRestartSession?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const SessionsView: React.FC<SessionsViewProps> = ({
  session,
  queue,
  onUpdateQueueItem,
  onUpdateSession,
  onResetSession,
  onRestartSession,
  onNavigateTab,
}) => {
  const { settings, t } = useSettings();
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [lastOpenedUrl, setLastOpenedUrl] = useState<string | null>(null);
  const [showQueueOnMobile, setShowQueueOnMobile] = useState(false);

  if (!session || queue.length === 0 || session.status === 'completed') {
    const isCompleted = session?.status === 'completed';
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-12 text-center max-w-lg mx-auto shadow-xs space-y-4">
        {isCompleted ? (
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
        ) : (
          <Clock className="w-10 h-10 sm:w-12 sm:h-12 text-slate-300 dark:text-slate-600 mx-auto" />
        )}
        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
          {isCompleted ? '🎉 اكتملت جلسة المراسلة بنجاح!' : t.sessions.noActiveSession}
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          {isCompleted
            ? 'تم الانتهاء من جميع جهات الاتصال في هذه الجلسة. يمكنك استعراض التقارير أو بدء جلسة جديدة.'
            : t.sessions.subtitle}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('composer')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition cursor-pointer shadow-xs min-h-[44px]"
            >
              <span>+ {t.sessions.startNewSession}</span>
            </button>
          )}
          {onNavigateTab && isCompleted && (
            <button
              onClick={() => onNavigateTab('reports')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer min-h-[44px]"
            >
              <span>عرض التقارير</span>
            </button>
          )}
          {isCompleted && (
            <button
              onClick={onResetSession}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 rounded-xl transition cursor-pointer min-h-[44px]"
            >
              <span>إغلاق الجلسة</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const currentIndex = session.currentIndex;
  const currentItem = queue[currentIndex] || queue[0];

  const totalCount = queue.length;
  const confirmedCount = queue.filter((q) => q.status === 'confirmed_sent').length;
  const skippedCount = queue.filter((q) => q.status === 'skipped').length;
  const pendingCount = queue.filter((q) => q.status === 'pending' || q.status === 'ready').length;

  const currentContactDigits = currentItem?.contactPhone.replace(/\D/g, '');
  const rawUrl = currentItem
    ? `https://wa.me/${currentContactDigits}?text=${encodeURIComponent(currentItem.renderedMessage)}`
    : null;

  const handleOpenChat = () => {
    if (!currentItem || !rawUrl) return;

    setPopupBlocked(false);
    setLastOpenedUrl(rawUrl);

    if (settings.mockMode) {
      // In Mock Mode, don't trigger actual browser windows
      onUpdateQueueItem({
        ...currentItem,
        status: 'opened',
        lastAttemptAt: Date.now(),
        attemptCount: currentItem.attemptCount + 1,
      });
      return;
    }

    try {
      const newWin = window.open(rawUrl, '_blank', 'noopener,noreferrer');
      if (!newWin || newWin.closed || typeof newWin.closed === 'undefined') {
        setPopupBlocked(true);
      } else {
        onUpdateQueueItem({
          ...currentItem,
          status: 'opened',
          lastAttemptAt: Date.now(),
          attemptCount: currentItem.attemptCount + 1,
        });
      }
    } catch {
      setPopupBlocked(true);
    }
  };

  const handleConfirmSent = () => {
    if (!currentItem) return;

    onUpdateQueueItem({
      ...currentItem,
      status: 'confirmed_sent',
      lastAttemptAt: Date.now(),
    });

    // Advance to next index
    if (currentIndex < queue.length - 1) {
      onUpdateSession({
        ...session,
        currentIndex: currentIndex + 1,
        updatedAt: Date.now(),
      });
    } else {
      onUpdateSession({
        ...session,
        status: 'completed',
        updatedAt: Date.now(),
      });
    }
  };

  const handleSkip = (reason: string = 'User skipped') => {
    if (!currentItem) return;

    onUpdateQueueItem({
      ...currentItem,
      status: 'skipped',
      skipReason: reason,
      lastAttemptAt: Date.now(),
    });

    if (currentIndex < queue.length - 1) {
      onUpdateSession({
        ...session,
        currentIndex: currentIndex + 1,
        updatedAt: Date.now(),
      });
    }
  };



  return (
    <div className="space-y-6">
      {/* Session Header & Status */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {t.sessions.title}: {session.name}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">{t.sessions.subtitle}</p>
          </div>

          <div className="flex items-center gap-2">
            {onRestartSession && (
              <button
                type="button"
                onClick={onRestartSession}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer min-h-[36px]"
                title="إعادة بدء الجلسة الحالية من أول جهة اتصال"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>إعادة من الأول</span>
              </button>
            )}

            <button
              type="button"
              onClick={onResetSession}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 rounded-lg transition cursor-pointer min-h-[36px] border border-red-200 dark:border-red-900/60"
              title="إنهاء الجلسة بالكامل وإلغائها"
            >
              <XOctagon className="w-3.5 h-3.5" />
              <span>إنهاء الجلسة</span>
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {t.sessions.progress} {currentIndex + 1} / {totalCount}
            </span>
            <span className="text-slate-500">
              {Math.round(((currentIndex + 1) / totalCount) * 100)}%
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / totalCount) * 100}%` }}
            />
          </div>
        </div>

        {/* Counter Summary Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg text-center">
            <p className="text-[11px] text-slate-400">Total</p>
            <p className="text-base font-bold text-slate-800 dark:text-slate-200">{totalCount}</p>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-lg text-center">
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400">Confirmed Sent</p>
            <p className="text-base font-bold text-emerald-700 dark:text-emerald-300">
              {confirmedCount}
            </p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-lg text-center">
            <p className="text-[11px] text-amber-600 dark:text-amber-400">Skipped</p>
            <p className="text-base font-bold text-amber-700 dark:text-amber-300">{skippedCount}</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/40 p-2.5 rounded-lg text-center">
            <p className="text-[11px] text-blue-600 dark:text-blue-400">Pending</p>
            <p className="text-base font-bold text-blue-700 dark:text-blue-300">{pendingCount}</p>
          </div>
        </div>
      </div>

      {/* Main Execution Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recipient & Message Review (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[11px] font-semibold uppercase text-emerald-600 dark:text-emerald-400">
                  Recipient #{currentIndex + 1}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {currentItem?.contactName || 'Unnamed Recipient'}
                </h3>
              </div>

              <span
                className={`px-2.5 py-1 text-xs font-semibold rounded-full uppercase tracking-wider ${
                  currentItem?.status === 'confirmed_sent'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : currentItem?.status === 'opened'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                    : currentItem?.status === 'skipped'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {currentItem?.status}
              </span>
            </div>

            {/* Recipient Phone info */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl flex items-center justify-between text-xs">
              <span className="text-slate-500">Phone Number:</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                +{currentItem?.contactPhone}
              </span>
            </div>

            {/* Message Box */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                Personalized Message to be Sent:
              </label>
              <div
                dir="auto"
                className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-sm font-sans whitespace-pre-wrap leading-relaxed text-slate-800 dark:text-slate-100"
              >
                {currentItem?.renderedMessage}
              </div>
            </div>

            {/* Popup Blocked Warning & Manual Fallback */}
            {popupBlocked && lastOpenedUrl && (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 rounded-xl space-y-2 text-xs text-amber-800 dark:text-amber-200">
                <div className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{t.sessions.popupBlockedAlert}</span>
                </div>
                <p>
                  <a
                    href={lastOpenedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {t.sessions.manualLink}
                  </a>
                </p>
              </div>
            )}

            {/* Disclaimer reminder */}
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl text-[11px] text-blue-700 dark:text-blue-300 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
              <span>{t.sessions.disclaimer}</span>
            </div>

            {/* Step-by-Step Action Controls */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2.5 sm:gap-3">
              <button
                onClick={handleOpenChat}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3.5 sm:py-3 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition cursor-pointer text-sm min-h-[48px]"
              >
                <ExternalLink className="w-4 h-4" />
                <span>{t.sessions.openNext}</span>
              </button>

              <button
                onClick={handleConfirmSent}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3.5 sm:py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md transition cursor-pointer text-sm min-h-[48px]"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{t.sessions.confirmSent}</span>
              </button>

              <button
                onClick={() => handleSkip()}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition cursor-pointer text-xs min-h-[44px]"
              >
                <SkipForward className="w-4 h-4" />
                <span>{t.sessions.skipContact}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Queue Navigation List (1 Col) */}
        <div className="space-y-3">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <button
              type="button"
              onClick={() => setShowQueueOnMobile((prev) => !prev)}
              className="w-full flex items-center justify-between text-left rtl:text-right lg:cursor-default"
            >
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Session Queue ({queue.length})
              </h4>
              <span className="lg:hidden text-xs font-semibold text-emerald-600">
                {showQueueOnMobile ? 'إخفاء القائمة ▲' : 'عرض القائمة ▼'}
              </span>
            </button>

            <div className={`mt-3 space-y-2 max-h-[460px] overflow-y-auto pr-1 ${showQueueOnMobile ? 'block' : 'hidden lg:block'}`}>
              {queue.map((item, idx) => {
                const isSelected = idx === currentIndex;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (idx >= 0 && idx < queue.length) {
                        onUpdateSession({
                          ...session,
                          currentIndex: idx,
                          updatedAt: Date.now(),
                        });
                      }
                    }}
                    className={`w-full text-left rtl:text-right p-2.5 rounded-lg border text-xs transition cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 font-bold'
                        : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="truncate">{item.contactName || 'Unnamed'}</p>
                      <p className="font-mono text-[10px] text-slate-400">+{item.contactPhone}</p>
                    </div>

                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold uppercase ${
                        item.status === 'confirmed_sent'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                          : item.status === 'opened'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
                          : item.status === 'skipped'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                      }`}
                    >
                      {item.status}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
