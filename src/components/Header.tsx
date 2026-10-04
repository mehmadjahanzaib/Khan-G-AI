import React, { useState } from 'react';
import { 
  Menu, 
  Sun, 
  Moon, 
  Search, 
  Bell, 
  Sparkles, 
  Crown, 
  GraduationCap, 
  ChevronDown 
} from 'lucide-react';
import { UserMenu } from './UserMenu.js';
import { KhanGLogo } from './BrandLogo.js';
import { useTheme } from '../context/ThemeContext.js';
import { usePro } from '../context/ProContext.js';
import { useAuth } from '../context/AuthContext.js';

interface HeaderProps {
  currentView: 'chat' | 'about' | 'privacy';
  setCurrentView: (view: 'chat' | 'about' | 'privacy') => void;
  activeProvider?: string;
  onOpenProviderModal?: () => void;
  onOpenToolsModal?: () => void;
  onOpenDeveloperModal?: () => void;
  onOpenProModal?: () => void;
  onOpenStudyMode?: () => void;
  onOpenSettings?: () => void;
  onOpenReferral?: () => void;
  onOpenCloudExport?: () => void;
  onOpenAdmin?: () => void;
  onToggleSidebar?: () => void;
  onNewChat?: () => void;
  onClearChat?: () => void;
  onSearchPrompt?: (term: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  setCurrentView,
  onOpenDeveloperModal,
  onOpenProModal,
  onOpenStudyMode,
  onOpenSettings,
  onOpenReferral,
  onOpenCloudExport,
  onOpenAdmin,
  onToggleSidebar,
  onNewChat,
  onClearChat,
  onSearchPrompt,
}) => {
  const { theme, toggleTheme } = useTheme();
  const { isPro, planName } = usePro();
  const { user } = useAuth();
  const [searchValue, setSearchValue] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim() && onSearchPrompt) {
      onSearchPrompt(searchValue.trim());
      setSearchValue('');
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#071E17]/95 backdrop-blur-md border-b border-[#DCEBE5] dark:border-[#0D2E24] shadow-xs transition-colors">
      <div className="w-full px-3 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Left: Mobile Sidebar Drawer Toggle & Brand Logo */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:text-[#00A86B] dark:hover:text-[#00A86B] hover:bg-emerald-50 dark:hover:bg-emerald-950 md:hidden transition-colors"
              title="Toggle sidebar"
              aria-label="Toggle sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div 
            onClick={() => setCurrentView('chat')}
            className="flex items-center gap-2 cursor-pointer select-none"
          >
            <KhanGLogo size="sm" variant="full" />
            {isPro && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                <Crown className="w-3 h-3 text-amber-600" />
                <span>{planName}</span>
              </span>
            )}
          </div>
        </div>

        {/* Center: Search Bar ("Q Search anything...") matching Mockup */}
        <div className="flex-1 max-w-md mx-auto hidden sm:block">
          <form onSubmit={handleSearchSubmit} className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search anything..."
              className="w-full pl-10 pr-4 py-2 rounded-full text-xs bg-stone-50 dark:bg-[#051711] border border-[#DCEBE5] dark:border-[#0D2E24] text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:border-[#00A86B] focus:ring-1 focus:ring-[#00A86B] transition-all"
            />
          </form>
        </div>

        {/* Right: Quick Action Controls, Theme Toggle, Notification Bell, User Dropdown */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Study & Exam Prep Quick Trigger */}
          {onOpenStudyMode && (
            <button
              onClick={onOpenStudyMode}
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E8F7F0] dark:bg-[#0D2E24] hover:bg-[#d8f2e7] dark:hover:bg-[#123d30] text-[#006A4E] dark:text-emerald-300 border border-[#00A86B]/30 text-xs font-semibold shadow-2xs transition-all active:scale-95"
              title="Academic Exam Hub (CSS, MDCAT, ECAT, Matric & FSc)"
            >
              <GraduationCap className="w-3.5 h-3.5 text-[#00A86B]" />
              <span>Study Mode</span>
            </button>
          )}

          {/* Upgrade Pro Badge */}
          {onOpenProModal && (
            <button
              onClick={onOpenProModal}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95 ${
                isPro
                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300'
                  : 'bg-[#00A86B] hover:bg-[#00925d] text-white shadow-[#00A86B]/20'
              }`}
              title="Khan G AI Pro"
            >
              <Sparkles className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline">{isPro ? 'Pro Active' : 'Upgrade Pro'}</span>
            </button>
          )}

          {/* Theme Toggle (Sun/Moon) */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-[#0D2E24] transition-colors"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>

          {/* Notification Bell */}
          <button
            onClick={onOpenDeveloperModal}
            className="p-2 rounded-xl text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-[#0D2E24] transition-colors relative"
            title="System updates and developer info"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#00A86B]" />
          </button>

          {/* User Account Menu with Avatar Dropdown */}
          <UserMenu
            onNewChat={onNewChat}
            onClearChat={onClearChat}
            onOpenDeveloperModal={onOpenDeveloperModal}
            onOpenSettings={onOpenSettings}
            onOpenStudyMode={onOpenStudyMode}
            onOpenCloudExport={onOpenCloudExport}
            onOpenReferral={onOpenReferral}
            onOpenAdmin={onOpenAdmin}
          />
        </div>
      </div>
    </header>
  );
};

export default Header;
