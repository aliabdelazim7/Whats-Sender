import React from 'react';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Send,
  FileSpreadsheet,
  Settings as SettingsIcon,
  Sun,
  Moon,
  Globe,
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  sessionCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab, sessionCount = 0 }) => {
  const { settings, updateSettings, t } = useSettings();

  const navItems = [
    { id: 'dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
    { id: 'contacts', label: t.nav.contacts, icon: Users },
    { id: 'composer', label: t.nav.composer, icon: MessageSquare },
    {
      id: 'sessions',
      label: t.nav.sessions,
      icon: Send,
      badge: sessionCount > 0 ? sessionCount : undefined,
    },
    { id: 'reports', label: t.nav.reports, icon: FileSpreadsheet },
    { id: 'settings', label: t.nav.settings, icon: SettingsIcon },
  ];

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & App Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                {t.appTitle}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                {t.appSubtitle}
              </p>
            </div>
          </div>

          {/* Quick Header Controls (Theme, Language) */}
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                updateSettings({ language: settings.language === 'ar' ? 'en' : 'ar' })
              }
              title="Toggle Language (العربية / English)"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{settings.language === 'ar' ? 'English' : 'عربي'}</span>
            </button>

            <button
              onClick={() =>
                updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })
              }
              title="Toggle Theme"
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
            >
              {settings.theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex space-x-1 rtl:space-x-reverse overflow-x-auto py-2 border-t border-slate-100 dark:border-slate-800/80">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : ''}`} />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span className="ml-1 rtl:mr-1 px-1.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-600 text-white">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
