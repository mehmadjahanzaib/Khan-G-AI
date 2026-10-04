import React, { useState } from 'react';
import { 
  Plus, 
  MessageSquare, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Loader2,
  Crown,
  GraduationCap,
  FileText,
  Calculator,
  Grid,
  Settings,
  Home,
  User as UserIcon,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { usePro } from '../context/ProContext.js';
import { ConversationItem } from '../lib/firebase.js';
import { KhanGLogo, KhanGMark } from './BrandLogo.js';

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: ConversationItem[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onRenameConversation: (id: string, newTitle: string) => Promise<void>;
  onDeleteConversation: (id: string) => Promise<void>;
  isLoadingConversations: boolean;
  onOpenDeveloperModal?: () => void;
  onOpenProModal?: () => void;
  onOpenStudyMode?: () => void;
  onOpenToolsModal?: () => void;
  onOpenReferral?: () => void;
  onOpenSettings?: () => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  isOpen,
  onClose,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onRenameConversation,
  onDeleteConversation,
  isLoadingConversations,
  onOpenDeveloperModal,
  onOpenProModal,
  onOpenStudyMode,
  onOpenToolsModal,
  onOpenReferral,
  onOpenSettings,
}) => {
  const { user, openAuthModal } = useAuth();
  const { isPro, planName } = usePro();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isRecentExpanded, setIsRecentExpanded] = useState(true);

  const startRename = (conv: ConversationItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditingTitle(conv.title);
  };

  const handleSaveRename = async (id: string, e: React.MouseEvent | React.FormEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (editingTitle.trim()) {
      await onRenameConversation(id, editingTitle.trim());
    }
    setEditingId(null);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await onDeleteConversation(id);
    } finally {
      setDeletingId(null);
    }
  };

  const formatTimestamp = (ts: number) => {
    if (!ts) return '';
    const now = Date.now();
    const diffMin = Math.floor((now - ts) / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Muhammad Jahanzaib';
  const displayPlan = isPro ? (planName || 'Pro Plan') : 'Free Plan';

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs z-40 md:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container with Approved Dark Forest Theme (#081D17) */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-72 bg-[#071E17] text-stone-100 flex flex-col border-r border-[#0D2E24] shadow-2xl md:shadow-none transition-transform duration-200 ease-in-out select-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-64 lg:w-72'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-[#0D2E24] bg-[#051711]">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => {
                onNewChat();
                if (window.innerWidth < 768) onClose();
              }}
            >
              {/* Official Squircle Brand Mark */}
              <KhanGMark size={36} isSquircle={true} className="group-hover:scale-105 transition-transform" />
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="text-base font-bold text-white tracking-tight">Khan G</span>
                  <span className="text-base font-bold text-[#00A86B] tracking-tight">AI</span>
                </div>
                <span className="text-[11px] text-emerald-200/60 font-medium truncate mt-1 leading-tight">
                  Your AI Assistant for Work, Study &amp; Everyday Life.
                </span>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-emerald-950 md:hidden"
              title="Close sidebar"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>

          {/* "+ New Chat" Button with Ctrl + N Tag */}
          <button
            onClick={() => {
              onNewChat();
              if (window.innerWidth < 768) onClose();
            }}
            className="w-full flex items-center justify-between py-2.5 px-3.5 rounded-xl bg-[#00A86B] hover:bg-[#00925d] active:scale-[0.98] text-white font-semibold text-xs shadow-md shadow-[#00A86B]/20 transition-all group"
          >
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
              <span>New Chat</span>
            </div>
            <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-black/20 text-emerald-100">
              Ctrl + N
            </span>
          </button>
        </div>

        {/* Primary Navigation Menu */}
        <div className="px-3 py-2.5 space-y-1 border-b border-[#0D2E24] text-xs">
          <button
            onClick={() => {
              onNewChat();
              if (window.innerWidth < 768) onClose();
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-stone-300 hover:text-white hover:bg-[#0D2E24]/60 transition-colors font-medium text-left"
          >
            <Home className="w-4 h-4 text-emerald-400" />
            <span>Home</span>
          </button>

          <button
            onClick={() => {
              if (window.innerWidth < 768) onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-[#0D2E24] text-white font-semibold text-left border border-emerald-500/20"
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="w-4 h-4 text-[#00A86B]" />
              <span>Chats</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-[#00A86B]" />
          </button>

          {onOpenStudyMode && (
            <button
              onClick={() => {
                onOpenStudyMode();
                if (window.innerWidth < 768) onClose();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-stone-300 hover:text-white hover:bg-[#0D2E24]/60 transition-colors font-medium text-left"
            >
              <GraduationCap className="w-4 h-4 text-emerald-400" />
              <span>Study Mode</span>
            </button>
          )}

          {onOpenToolsModal && (
            <>
              <button
                onClick={() => {
                  onOpenToolsModal();
                  if (window.innerWidth < 768) onClose();
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-stone-300 hover:text-white hover:bg-[#0D2E24]/60 transition-colors font-medium text-left"
              >
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Files</span>
              </button>

              <button
                onClick={() => {
                  onOpenStudyMode ? onOpenStudyMode() : onOpenToolsModal();
                  if (window.innerWidth < 768) onClose();
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-stone-300 hover:text-white hover:bg-[#0D2E24]/60 transition-colors font-medium text-left"
              >
                <Calculator className="w-4 h-4 text-emerald-400" />
                <span>Math</span>
              </button>

              <button
                onClick={() => {
                  onOpenToolsModal();
                  if (window.innerWidth < 768) onClose();
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-stone-300 hover:text-white hover:bg-[#0D2E24]/60 transition-colors font-medium text-left"
              >
                <Grid className="w-4 h-4 text-emerald-400" />
                <span>AI Tools</span>
              </button>
            </>
          )}
        </div>

        {/* Collapsible Recent Chats Section */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          <div 
            onClick={() => setIsRecentExpanded(!isRecentExpanded)}
            className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-emerald-300/70 hover:text-emerald-200 uppercase tracking-wider cursor-pointer select-none"
          >
            <span>Recent Chats</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isRecentExpanded ? 'rotate-0' : '-rotate-90'}`} />
          </div>

          {isRecentExpanded && (
            <div className="space-y-1 pt-1">
              {isLoadingConversations && conversations.length === 0 ? (
                <div className="flex items-center justify-center py-6 text-stone-400 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-500 mr-2" />
                  <span>Loading conversations...</span>
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-6 px-3 text-stone-400 text-xs">
                  <p className="font-medium text-stone-300">No chat history yet</p>
                  <p className="text-[11px] text-stone-500 mt-1">Start a conversation or ask for an exam study plan.</p>
                </div>
              ) : (
                conversations.map((conv) => {
                  const isActive = conv.id === activeConversationId;
                  const isEditing = editingId === conv.id;
                  const isDeleting = deletingId === conv.id;

                  return (
                    <div
                      key={conv.id}
                      onClick={() => {
                        onSelectConversation(conv.id);
                        if (window.innerWidth < 768) onClose();
                      }}
                      className={`group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-all ${
                        isActive
                          ? 'bg-[#00A86B]/20 text-white font-medium border border-[#00A86B]/40'
                          : 'text-stone-300 hover:text-white hover:bg-[#0D2E24]/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-1 flex-1">
                        <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#00A86B]' : 'text-stone-400'}`} />
                        {isEditing ? (
                          <form onSubmit={(e) => handleSaveRename(conv.id, e)} className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              autoFocus
                              className="bg-[#051711] text-white text-xs px-2 py-0.5 rounded border border-emerald-500 focus:outline-none w-full"
                            />
                            <button type="submit" className="p-0.5 text-emerald-400 hover:text-emerald-300">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button type="button" onClick={() => setEditingId(null)} className="p-0.5 text-stone-400 hover:text-stone-300">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </form>
                        ) : (
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="truncate">{conv.title || 'Untitled Conversation'}</span>
                            <span className="text-[10px] text-stone-400 dark:text-emerald-300/60 font-mono mt-0.5">
                              {formatTimestamp(conv.updatedAt)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Action buttons on hover */}
                      {!isEditing && (
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity shrink-0">
                          <button
                            type="button"
                            onClick={(e) => startRename(conv, e)}
                            className="p-1 text-stone-400 hover:text-stone-200 rounded"
                            title="Rename"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={(e) => handleDelete(conv.id, e)}
                            className="p-1 text-stone-400 hover:text-rose-400 rounded"
                            title="Delete"
                          >
                            {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Pinned Bottom Controls (Settings + User Profile Card) */}
        <div className="p-3 border-t border-[#0D2E24] bg-[#051711] space-y-2">
          {/* Settings Trigger */}
          {onOpenSettings && (
            <button
              onClick={() => {
                onOpenSettings();
                if (window.innerWidth < 768) onClose();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-stone-300 hover:text-white hover:bg-[#0D2E24]/60 transition-colors text-xs font-medium text-left"
            >
              <Settings className="w-4 h-4 text-stone-400" />
              <span>Settings</span>
            </button>
          )}

          {/* User Profile Card */}
          <div
            onClick={() => {
              if (!user) {
                openAuthModal('login');
              } else if (onOpenDeveloperModal) {
                onOpenDeveloperModal();
              }
            }}
            className="flex items-center justify-between p-2 rounded-xl bg-[#08221A] hover:bg-[#0C2D23] border border-emerald-900/60 cursor-pointer transition-colors group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Profile Avatar / Initials */}
              <div className="w-8 h-8 rounded-full bg-[#00A86B] text-white font-bold text-xs flex items-center justify-center shrink-0 ring-1 ring-emerald-400/30">
                {displayName.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white group-hover:text-emerald-200 truncate">
                  {displayName}
                </div>
                <div className="text-[10px] text-emerald-400 font-medium">
                  {displayPlan}
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-emerald-400/70 group-hover:text-white shrink-0 group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>
      </aside>
    </>
  );
};

export default ChatSidebar;
