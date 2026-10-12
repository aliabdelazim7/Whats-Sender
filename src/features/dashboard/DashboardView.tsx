import React from 'react';
import {
  Users,
  CheckCircle,
  AlertCircle,
  Copy,
  Clock,
  Send,
  SkipForward,
  XOctagon,
  ArrowUpRight,
} from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { Contact, CampaignSession, QueueItem } from '../../types';

interface DashboardViewProps {
  contacts: Contact[];
  session: CampaignSession | null;
  queue: QueueItem[];
  onOpenImport: () => void;
  onNavigateTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  contacts,
  session,
  queue,
  onOpenImport,
  onNavigateTab,
}) => {
  const { t } = useSettings();

  const totalContacts = contacts.length;
  const validContacts = contacts.filter((c) => c.isValidPhone).length;
  const invalidContacts = contacts.filter((c) => !c.isValidPhone).length;
  const duplicateContacts = contacts.filter((c) => c.isDuplicate).length;

  const sessionRemaining = session
    ? queue.length - (session.currentIndex + 1)
    : 0;
  const confirmedSent = queue.filter((q) => q.status === 'confirmed_sent').length;
  const skippedContacts = queue.filter((q) => q.status === 'skipped').length;
  const failedActions = queue.filter((q) => q.status === 'failed' || q.status === 'invalid').length;

  const statCards = [
    {
      title: t.dashboard.totalContacts,
      value: totalContacts,
      icon: Users,
      color: 'text-slate-700 dark:text-slate-200',
      bg: 'bg-slate-100 dark:bg-slate-800',
    },
    {
      title: t.dashboard.validContacts,
      value: validContacts,
      icon: CheckCircle,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/50',
    },
    {
      title: t.dashboard.invalidContacts,
      value: invalidContacts,
      icon: AlertCircle,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-950/50',
    },
    {
      title: t.dashboard.duplicateContacts,
      value: duplicateContacts,
      icon: Copy,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/50',
    },
    {
      title: t.dashboard.sessionRemaining,
      value: Math.max(0, sessionRemaining),
      icon: Clock,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/50',
    },
    {
      title: t.dashboard.confirmedSent,
      value: confirmedSent,
      icon: Send,
      color: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-50 dark:bg-indigo-950/50',
    },
    {
      title: t.dashboard.skippedContacts,
      value: skippedContacts,
      icon: SkipForward,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-950/50',
    },
    {
      title: t.dashboard.failedActions,
      value: failedActions,
      icon: XOctagon,
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-950/50',
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
            {t.dashboard.title}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time contact audit and manual sending session tracking
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={onOpenImport}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition cursor-pointer min-h-[44px]"
          >
            <span>+ {t.dashboard.importNew}</span>
          </button>
          <button
            onClick={() => onNavigateTab('composer')}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 rounded-xl transition cursor-pointer min-h-[44px]"
          >
            <span>{t.dashboard.composeMessage}</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {statCards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div
              key={i}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xs flex items-center justify-between"
            >
              <div className="min-w-0 pr-1 rtl:pr-0 rtl:pl-1">
                <p className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">{c.title}</p>
                <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {c.value}
                </p>
              </div>
              <div className={`p-2.5 sm:p-3 rounded-xl shrink-0 ${c.bg}`}>
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${c.color}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Session Status Banner or Empty State */}
      {session && session.status !== 'completed' ? (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl p-4 sm:p-6 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 uppercase tracking-wider">
              Active Session
            </span>
            <h3 className="text-base sm:text-lg font-bold">{session.name}</h3>
            <p className="text-xs text-white/80">
              Progress: {session.currentIndex + 1} of {session.totalCount} recipients processed
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('sessions')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-bold bg-white text-emerald-800 hover:bg-emerald-50 transition cursor-pointer shadow-sm min-h-[44px]"
          >
            <span>Resume Session</span>
            <ArrowUpRight className="w-4 h-4 rtl:rotate-90" />
          </button>
        </div>
      ) : totalContacts === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 text-center max-w-lg mx-auto shadow-xs">
          <p className="text-xs text-slate-500 mb-4">{t.dashboard.emptyContactsTip}</p>
          <button
            onClick={onOpenImport}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition cursor-pointer min-h-[44px]"
          >
            <span>{t.dashboard.importNew}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
};
