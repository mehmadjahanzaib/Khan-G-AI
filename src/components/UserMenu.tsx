import React, { useState, useRef, useEffect } from 'react';
import { User as UserIcon, LogOut, Trash2, Plus, ChevronDown, Settings, GraduationCap, Cloud, ShieldAlert, Gift } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { PakistanEmblem } from './PakistanEmblem.js';

interface UserMenuProps {
  onNewChat?: () => void;
  onClearChat?: () => void;
  onOpenDeveloperModal?: () => void;
  onOpenSettings?: () => void;
  onOpenStudyMode?: () => void;
  onOpenCloudExport?: () => void;
  onOpenReferral?: () => void;
  onOpenAdmin?: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({ 
  onNewChat, 
  onClearChat,
  onOpenDeveloperModal,
  onOpenSettings,
  onOpenStudyMode,
  onOpenCloudExport,
  onOpenReferral,
  onOpenAdmin,
}) => {
  const { user, openAuthModal, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) {
    return (
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          id="header-login-btn"
          onClick={() => openAuthModal('login')}
          className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-700 dark:text-stone-300 hover:text-[#006A4E] dark:hover:text-emerald-400 hover:bg-[#E8F6F1] dark:hover:bg-stone-800 transition-colors"
        >
          Log In
        </button>
        <button
          id="header-signup-btn"
          onClick={() => openAuthModal('signup')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#006A4E] hover:bg-[#004D3A] text-white text-xs font-semibold shadow-xs transition-all active:scale-95"
        >
          <UserIcon className="w-3.5 h-3.5" />
          <span>Sign Up</span>
        </button>
      </div>
    );
  }

  const displayName = user.displayName || user.email?.split('@')[0] || 'User';
  const displayEmailOrName = user.displayName || user.email || 'User';
  const initial = (displayName[0] || 'U').toUpperCase();

  return (
    <div className="flex items-center gap-1.5 sm:gap-2" ref={dropdownRef}>
      {/* User Profile Pill */}
      <div className="relative">
        <button
          id="header-user-profile-btn"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 p-1 pr-2 sm:pr-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-emerald-50 dark:hover:bg-stone-700 border border-stone-200/80 dark:border-stone-700 transition-colors text-xs font-medium text-stone-800 dark:text-stone-200 max-w-[160px] sm:max-w-[220px]"
          title={user.email || displayName}
        >
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={displayName}
              className="w-6 h-6 rounded-lg object-cover shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-6 h-6 rounded-lg bg-[#01411C] text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
              {initial}
            </div>
          )}
          <span className="truncate text-stone-900 dark:text-stone-100 font-semibold max-w-[90px] sm:max-w-[130px] hidden xs:inline">
            {displayEmailOrName}
          </span>
          <ChevronDown className="w-3 h-3 text-stone-500 shrink-0" />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-stone-900 rounded-2xl shadow-xl border border-stone-200 dark:border-stone-800 py-2 z-50 animate-fade-in">
            <div className="px-4 py-2.5 border-b border-stone-100 dark:border-stone-800">
              <p className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">{displayName}</p>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">{user.email}</p>
            </div>

            <div className="py-1">
              {onOpenStudyMode && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onOpenStudyMode();
                  }}
                  className="w-full px-4 py-2 text-left text-xs text-stone-700 dark:text-stone-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-950 dark:hover:text-emerald-300 flex items-center gap-2.5 transition-colors font-medium"
                >
                  <GraduationCap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Academic Study &amp; Exam Hub</span>
                </button>
              )}

              {onOpenCloudExport && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onOpenCloudExport();
                  }}
                  className="w-full px-4 py-2 text-left text-xs text-stone-700 dark:text-stone-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-950 dark:hover:text-emerald-300 flex items-center gap-2.5 transition-colors font-medium"
                >
                  <Cloud className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Export Chat to Cloud</span>
                </button>
              )}

              {onOpenReferral && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onOpenReferral();
                  }}
                  className="w-full px-4 py-2 text-left text-xs text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-2.5 transition-colors font-semibold"
                >
                  <Gift className="w-3.5 h-3.5 text-[#006A4E] dark:text-emerald-400" />
                  <span>Refer &amp; Earn Free Pro</span>
                </button>
              )}

              {onOpenSettings && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onOpenSettings();
                  }}
                  className="w-full px-4 py-2 text-left text-xs text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 flex items-center gap-2.5 transition-colors"
                >
                  <Settings className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
                  <span>Settings &amp; Usage Quota</span>
                </button>
              )}

              {onOpenAdmin && user.email === 'mjmallandmart@gmail.com' && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onOpenAdmin();
                  }}
                  className="w-full px-4 py-2 text-left text-xs text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center gap-2.5 transition-colors font-medium"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Admin Telemetry &amp; Logs</span>
                </button>
              )}

              {onNewChat && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onNewChat();
                  }}
                  className="w-full px-4 py-2 text-left text-xs text-stone-700 dark:text-stone-300 hover:bg-emerald-50 dark:hover:bg-stone-800 flex items-center gap-2.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
                  <span>New Chat</span>
                </button>
              )}

              {onClearChat && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onClearChat();
                  }}
                  className="w-full px-4 py-2 text-left text-xs text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 flex items-center gap-2.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
                  <span>Clear Current Chat</span>
                </button>
              )}

              {onOpenDeveloperModal && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onOpenDeveloperModal();
                  }}
                  className="w-full px-4 py-2 text-left text-xs text-emerald-900 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 flex items-center gap-2.5 transition-colors font-medium border-t border-b border-emerald-100/60 dark:border-stone-800 my-1 bg-emerald-50/40 dark:bg-stone-800/40"
                >
                  <PakistanEmblem size={14} variant="flag" />
                  <span className="truncate">Developer: Muhammad Jahanzaib (MJ)</span>
                </button>
              )}
            </div>

            <div className="pt-1 border-t border-stone-100 dark:border-stone-800">
              <button
                onClick={async () => {
                  setIsOpen(false);
                  await logout();
                }}
                className="w-full px-4 py-2 text-left text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2.5 transition-colors font-medium"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-500" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Visible Logout Button in header */}
      <button
        id="header-logout-btn"
        onClick={async () => {
          setIsOpen(false);
          await logout();
        }}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-stone-600 dark:text-stone-300 hover:text-rose-600 dark:hover:text-rose-400 border border-stone-200/80 dark:border-stone-700 transition-colors text-xs font-medium"
        title="Sign Out"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Logout</span>
      </button>
    </div>
  );
};
