import React from 'react';
import { Sparkles, Wrench, Key, Menu, Plus } from 'lucide-react';
import { UserMenu } from './UserMenu.js';

interface HeaderProps {
  currentView: 'chat' | 'about' | 'privacy';
  setCurrentView: (view: 'chat' | 'about' | 'privacy') => void;
  activeProvider: string;
  onOpenProviderModal: () => void;
  onOpenToolsModal: () => void;
  onToggleSidebar?: () => void;
  onNewChat?: () => void;
  onClearChat?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  setCurrentView,
  activeProvider,
  onOpenProviderModal,
  onOpenToolsModal,
  onToggleSidebar,
  onNewChat,
  onClearChat,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-stone-200">
      <div className="w-full px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
        {/* Left: Mobile Sidebar Toggle + Brand & Logo */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-100 md:hidden transition-colors"
              title="Toggle chat history"
              aria-label="Toggle chat history"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div 
            onClick={() => setCurrentView('chat')}
            className="flex items-center gap-2.5 cursor-pointer group select-none"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-stone-900 to-stone-700 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform shrink-0">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-stone-900 leading-none">
                  Khan G Tools
                </h1>
                <span className="hidden lg:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-stone-100 text-stone-700 border border-stone-200">
                  AI File Suite
                </span>
              </div>
              <p className="text-[11px] text-stone-500 font-medium hidden sm:block">
                One Chat. Every File Tool.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Navigation, Controls & User Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* New Chat quick action on tablet/desktop */}
          {onNewChat && currentView === 'chat' && (
            <button
              onClick={onNewChat}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold transition-colors"
              title="Start a fresh conversation"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Chat</span>
            </button>
          )}

          <nav className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200 text-xs font-medium">
            <button
              id="nav-chat-btn"
              onClick={() => setCurrentView('chat')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-all ${
                currentView === 'chat'
                  ? 'bg-white text-stone-900 shadow-sm font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Chat
            </button>
            <button
              id="nav-about-btn"
              onClick={() => setCurrentView('about')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-all hidden sm:block ${
                currentView === 'about'
                  ? 'bg-white text-stone-900 shadow-sm font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Tools & Specs
            </button>
            <button
              id="nav-privacy-btn"
              onClick={() => setCurrentView('privacy')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-all hidden sm:block ${
                currentView === 'privacy'
                  ? 'bg-white text-stone-900 shadow-sm font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Privacy
            </button>
          </nav>

          {/* Quick Tools Sheet button */}
          <button
            id="open-tools-modal-btn"
            onClick={onOpenToolsModal}
            className="flex items-center gap-1.5 text-xs font-medium text-stone-700 bg-stone-50 hover:bg-stone-100 border border-stone-200 px-2 sm:px-2.5 py-1.5 rounded-xl transition-colors"
            title="Browse all 21 supported tools"
          >
            <Wrench className="w-3.5 h-3.5 text-stone-500" />
            <span className="hidden md:inline">Tools (21)</span>
            <span className="md:hidden font-mono text-[11px]">21</span>
          </button>

          {/* Provider status badge */}
          <button
            id="open-provider-modal-btn"
            onClick={onOpenProviderModal}
            className="flex items-center gap-1.5 text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2 sm:px-2.5 py-1.5 rounded-xl hover:bg-emerald-100 transition-colors"
            title="Active AI Provider settings"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="capitalize hidden xs:inline">{activeProvider || 'Gemini'}</span>
            <Key className="w-3 h-3 text-emerald-600" />
          </button>

          {/* User Profile & Auth Menu */}
          <UserMenu onNewChat={onNewChat} onClearChat={onClearChat} />
        </div>
      </div>
    </header>
  );
};
