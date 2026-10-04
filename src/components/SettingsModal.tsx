import React, { useState } from 'react';
import {
  X,
  Settings,
  Moon,
  Sun,
  Shield,
  Zap,
  Crown,
  Database,
  RefreshCw,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Key,
} from 'lucide-react';
import { usePro } from '../context/ProContext.js';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenUpgrade: () => void;
  onOpenReferral?: () => void;
  onOpenAdmin: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  theme,
  onToggleTheme,
  onOpenUpgrade,
  onOpenReferral,
  onOpenAdmin,
}) => {
  const { isPro, proTier, proExpiryDate, usage, refreshUsage } = usePro();
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!isOpen) return null;

  const handleRefreshUsage = async () => {
    setIsRefreshing(true);
    await refreshUsage();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const msgPercent = usage
    ? Math.min(100, Math.round((usage.messagesUsedToday / usage.messagesLimit) * 100))
    : 0;
  const filePercent = usage
    ? Math.min(100, Math.round((usage.fileOpsUsedToday / usage.fileOpsLimit) * 100))
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-[#111e17] text-stone-900 dark:text-stone-100 rounded-3xl max-w-xl w-full border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-700 dark:text-stone-300">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Preferences & Quotas</h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Manage your theme, usage limits, and account status
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* Theme Section */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-700/60">
            <div>
              <div className="text-sm font-semibold flex items-center gap-2">
                {theme === 'dark' ? <Moon className="w-4 h-4 text-emerald-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                <span>Interface Theme</span>
              </div>
              <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Current: {theme === 'dark' ? 'Emerald Dark Mode' : 'Warm Clean Light'}
              </div>
            </div>
            <button
              onClick={onToggleTheme}
              className="py-1.5 px-3 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 text-xs font-semibold hover:bg-stone-100 dark:hover:bg-stone-600 transition-colors shadow-2xs"
            >
              Toggle to {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
          </div>

          {/* Daily Quota & Usage Dashboard */}
          <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-700/60 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Daily Usage Quotas</span>
              </div>
              <button
                onClick={handleRefreshUsage}
                disabled={isRefreshing}
                className="text-[11px] flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {/* Messages Meter */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-stone-700 dark:text-stone-300">Daily AI Messages</span>
                <span className="font-semibold text-stone-900 dark:text-stone-100">
                  {usage ? usage.messagesUsedToday : 0} / {usage ? usage.messagesLimit : 30}{' '}
                  <span className="text-stone-400 font-normal">({usage ? usage.messagesRemaining : 30} left)</span>
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    msgPercent > 80 ? 'bg-amber-500' : 'bg-emerald-600'
                  }`}
                  style={{ width: `${msgPercent}%` }}
                />
              </div>
            </div>

            {/* File Operations Meter */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-stone-700 dark:text-stone-300">File Transformations</span>
                <span className="font-semibold text-stone-900 dark:text-stone-100">
                  {usage ? usage.fileOpsUsedToday : 0} / {usage ? usage.fileOpsLimit : 5}{' '}
                  <span className="text-stone-400 font-normal">({usage ? usage.fileOpsRemaining : 5} left)</span>
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    filePercent > 80 ? 'bg-amber-500' : 'bg-emerald-600'
                  }`}
                  style={{ width: `${filePercent}%` }}
                />
              </div>
            </div>

            <div className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-1.5 pt-1 border-t border-stone-200/60 dark:border-stone-700/60">
              <Database className="w-3 h-3 text-stone-400" />
              <span>
                Max file size: <strong>{usage ? usage.maxFileSizeMB : 25} MB</strong>. Quotas reset daily at midnight UTC.
              </span>
            </div>
          </div>

          {/* Membership Tier Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-emerald-600/10 to-transparent border border-emerald-500/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                {isPro ? <Crown className="w-5 h-5 text-amber-300" /> : <Zap className="w-5 h-5 text-emerald-100" />}
              </div>
              <div>
                <div className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <span>{isPro ? (proTier === 'business' ? 'Business VIP' : 'Student Pro') : 'Free Tier'}</span>
                  {isPro && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-600 dark:text-amber-400 border border-amber-400/30 font-semibold">
                      Active
                    </span>
                  )}
                </div>
                <div className="text-xs text-stone-500 dark:text-stone-400">
                  {isPro
                    ? `Expires: ${proExpiryDate ? new Date(proExpiryDate).toLocaleDateString() : 'Active'}`
                    : '30 messages/day, 5 file operations/day'}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                onClose();
                onOpenUpgrade();
              }}
              className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
            >
              {isPro ? 'Manage Pro' : 'Upgrade to Pro'}
            </button>
          </div>

          {/* Refer & Earn Free Pro Banner */}
          {onOpenReferral && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/20 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-[#006A4E] dark:text-emerald-300 block mb-0.5">
                  🎁 Refer Friends, Get 3 Days Free Pro
                </span>
                <span className="text-[11px] text-stone-600 dark:text-stone-300">
                  Share your link — both you and your friend earn 3 days of Pro!
                </span>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenReferral();
                }}
                className="px-3 py-1.5 rounded-xl bg-[#006A4E] hover:bg-[#004D3A] text-white text-xs font-semibold shrink-0 shadow-xs"
              >
                Invite
              </button>
            </div>
          )}

          {/* Developer / Admin Section */}
          <div className="pt-2 border-t border-stone-200 dark:border-stone-800">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAdmin();
              }}
              className="text-xs text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 flex items-center gap-1.5 cursor-pointer"
            >
              <Key className="w-3.5 h-3.5 text-stone-400" />
              <span>Developer &amp; Admin Telemetry Portal</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
