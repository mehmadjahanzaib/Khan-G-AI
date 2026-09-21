import React, { useState } from 'react';
import { 
  Plus, 
  MessageSquare, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  LogIn, 
  Clock, 
  ChevronLeft,
  Sparkles,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { ConversationItem } from '../lib/firebase.js';

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
}) => {
  const { user, openAuthModal } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
    const date = new Date(ts);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs z-40 md:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-72 bg-stone-900 text-stone-100 flex flex-col border-r border-stone-800 transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-64 lg:w-72'
        }`}
      >
        {/* Sidebar Header & New Chat Button */}
        <div className="p-3.5 border-b border-stone-800 flex items-center justify-between gap-2">
          <button
            onClick={() => {
              onNewChat();
              if (window.innerWidth < 768) onClose();
            }}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-bold shadow-sm transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>

          {/* Close drawer on mobile */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 md:hidden transition-colors"
            title="Close sidebar"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {!user ? (
            <div className="p-4 my-4 bg-stone-800/60 rounded-2xl border border-stone-700/60 text-center text-xs space-y-2.5">
              <div className="w-8 h-8 mx-auto rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <p className="font-semibold text-stone-200">Chat History</p>
              <p className="text-[11px] text-stone-400 leading-relaxed">
                Sign in to automatically save your conversations, prompts, and processed file records.
              </p>
              <button
                onClick={() => openAuthModal('login')}
                className="w-full py-1.5 px-3 bg-stone-100 hover:bg-white text-stone-900 font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            </div>
          ) : isLoadingConversations ? (
            <div className="flex items-center justify-center py-12 text-stone-400 gap-2 text-xs">
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              <span>Loading chats...</span>
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center text-stone-400 text-xs space-y-2">
              <MessageSquare className="w-6 h-6 mx-auto text-stone-500 opacity-60" />
              <p className="font-medium text-stone-300">No chats yet</p>
              <p className="text-[11px] text-stone-500">
                Your conversations with Khan G Tools will appear here automatically.
              </p>
            </div>
          ) : (
            conversations.map((conv) => {
              const isActive = conv.id === activeConversationId;
              const isEditing = editingId === conv.id;

              return (
                <div
                  key={conv.id}
                  onClick={() => {
                    if (!isEditing) {
                      onSelectConversation(conv.id);
                      if (window.innerWidth < 768) onClose();
                    }
                  }}
                  className={`group relative flex items-center gap-2.5 p-2 rounded-xl text-xs cursor-pointer transition-all ${
                    isActive
                      ? 'bg-stone-800 text-amber-300 font-medium shadow-xs'
                      : 'text-stone-300 hover:bg-stone-800/60 hover:text-white'
                  }`}
                >
                  <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-amber-400' : 'text-stone-500'}`} />

                  {isEditing ? (
                    <form
                      onSubmit={(e) => handleSaveRename(conv.id, e)}
                      className="flex-1 flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        autoFocus
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        className="w-full bg-stone-950 text-white px-2 py-1 rounded text-xs border border-amber-500/50 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={(e) => handleSaveRename(conv.id, e)}
                        className="p-1 hover:text-emerald-400"
                        title="Save"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(null);
                        }}
                        className="p-1 hover:text-rose-400"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  ) : (
                    <>
                      <span className="flex-1 truncate select-none text-[12px]">{conv.title}</span>
                      
                      {/* Timestamp badge */}
                      <span className="text-[10px] text-stone-500 font-mono group-hover:hidden">
                        {formatTimestamp(conv.updatedAt)}
                      </span>

                      {/* Action buttons on hover */}
                      <div className="hidden group-hover:flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => startRename(conv, e)}
                          className="p-1 text-stone-400 hover:text-amber-300 transition-colors"
                          title="Rename"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === conv.id}
                          onClick={(e) => handleDelete(conv.id, e)}
                          className="p-1 text-stone-400 hover:text-rose-400 transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          {deletingId === conv.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Footer info */}
        <div className="p-3 border-t border-stone-800 text-[11px] text-stone-400 flex items-center justify-between">
          <span className="font-mono text-stone-500">Khan G Tools v2.0</span>
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>AI Ready</span>
          </span>
        </div>
      </aside>
    </>
  );
};
