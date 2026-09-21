import React, { useState, useRef, useEffect } from 'react';
import { User as UserIcon, LogOut, Trash2, Plus, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

interface UserMenuProps {
  onNewChat?: () => void;
  onClearChat?: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({ onNewChat, onClearChat }) => {
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
          className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-700 hover:text-stone-900 hover:bg-stone-100 transition-colors"
        >
          Log In
        </button>
        <button
          id="header-signup-btn"
          onClick={() => openAuthModal('signup')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-sm transition-all active:scale-95"
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
          className="flex items-center gap-2 p-1 pr-2 sm:pr-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 border border-stone-200/80 transition-colors text-xs font-medium text-stone-800 max-w-[160px] sm:max-w-[220px]"
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
            <div className="w-6 h-6 rounded-lg bg-amber-500 text-stone-950 font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
              {initial}
            </div>
          )}
          <span className="truncate text-stone-900 font-semibold max-w-[90px] sm:max-w-[130px] hidden xs:inline">
            {displayEmailOrName}
          </span>
          <ChevronDown className="w-3 h-3 text-stone-500 shrink-0" />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-lg border border-stone-200 py-2 z-50 animate-fade-in">
            <div className="px-4 py-2 border-b border-stone-100">
              <p className="text-xs font-bold text-stone-900 truncate">{displayName}</p>
              <p className="text-[11px] text-stone-500 truncate">{user.email}</p>
            </div>

            <div className="py-1">
              {onNewChat && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onNewChat();
                  }}
                  className="w-full px-4 py-2 text-left text-xs text-stone-700 hover:bg-stone-50 flex items-center gap-2.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-stone-500" />
                  <span>New Chat</span>
                </button>
              )}

              {onClearChat && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onClearChat();
                  }}
                  className="w-full px-4 py-2 text-left text-xs text-stone-700 hover:bg-stone-50 flex items-center gap-2.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 text-stone-500" />
                  <span>Clear Current Chat</span>
                </button>
              )}
            </div>

            <div className="pt-1 border-t border-stone-100">
              <button
                onClick={async () => {
                  setIsOpen(false);
                  await logout();
                }}
                className="w-full px-4 py-2 text-left text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors font-medium"
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
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-rose-50 text-stone-600 hover:text-rose-600 border border-stone-200/80 transition-colors text-xs font-medium"
        title="Sign Out"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Logout</span>
      </button>
    </div>
  );
};
