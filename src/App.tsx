import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header.js';
import { ChatArea } from './components/ChatArea.js';
import { ChatInput } from './components/ChatInput.js';
import { AboutPage } from './components/AboutPage.js';
import { PrivacyPage } from './components/PrivacyPage.js';
import { ToolsOverviewModal } from './components/ToolsOverviewModal.js';
import { ProviderModal } from './components/ProviderModal.js';
import { AuthModal } from './components/AuthModal.js';
import { ChatSidebar } from './components/ChatSidebar.js';
import { useAuth } from './context/AuthContext.js';
import { 
  ConversationItem, 
  fetchUserConversations, 
  fetchConversationMessages, 
  saveMessageToConversation, 
  renameUserConversation, 
  deleteUserConversation, 
  clearConversationMessages 
} from './lib/firebase.js';
import { ChatMessage } from './types.js';

export default function App() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<'chat' | 'about' | 'privacy'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState<any>(null);
  const [isToolsModalOpen, setIsToolsModalOpen] = useState(false);
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState<string | null>(null);

  // Firestore Conversations State
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);

  // Retry tracking for last failed submission
  const lastSubmissionRef = useRef<{ text: string; files: File[] } | null>(null);

  // Fetch server status on mount
  useEffect(() => {
    fetch('/api/status')
      .then((res) => res.json())
      .then((data) => setServerStatus(data))
      .catch((err) => console.warn('Could not fetch server status:', err));
  }, []);

  // Load user's conversations when authenticated
  useEffect(() => {
    if (!user) {
      setConversations([]);
      return;
    }

    let isMounted = true;
    setIsLoadingConversations(true);

    fetchUserConversations(user.uid)
      .then((convs) => {
        if (isMounted) {
          setConversations(convs);
        }
      })
      .catch((err) => console.error('Error fetching conversations:', err))
      .finally(() => {
        if (isMounted) setIsLoadingConversations(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Handle selecting a conversation from history
  const handleSelectConversation = async (convId: string) => {
    if (!user) return;
    setActiveConversationId(convId);
    setCurrentView('chat');
    setIsLoading(true);

    try {
      const msgs = await fetchConversationMessages(user.uid, convId);
      setMessages(msgs);
    } catch (err) {
      console.error('Failed to load conversation messages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle "New Chat"
  const handleNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    setCurrentView('chat');
  };

  // Handle Renaming a conversation
  const handleRenameConversation = async (id: string, newTitle: string) => {
    if (!user) return;
    const success = await renameUserConversation(user.uid, id, newTitle);
    if (success) {
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c))
      );
    }
  };

  // Handle Deleting a conversation
  const handleDeleteConversation = async (id: string) => {
    if (!user) return;
    const success = await deleteUserConversation(user.uid, id);
    if (success) {
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        handleNewChat();
      }
    }
  };

  // Handle Clearing messages in the current conversation
  const handleClearChat = async () => {
    if (user && activeConversationId) {
      await clearConversationMessages(user.uid, activeConversationId);
    }
    setMessages([]);
  };

  // Send message implementation
  const handleSendMessage = async (text: string, files: File[]) => {
    if (isLoading) return;
    lastSubmissionRef.current = { text, files };

    // Determine target conversation ID
    let currentConvId = activeConversationId;
    let isBrandNewConversation = false;
    if (!currentConvId) {
      currentConvId = 'conv-' + Date.now();
      setActiveConversationId(currentConvId);
      isBrandNewConversation = true;
    }

    // Construct local user message
    const userMsgId = 'user-' + Date.now();
    const userMessage: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text,
      timestamp: Date.now(),
      uploadedFiles: files.map((f) => ({
        name: f.name,
        size: f.size,
        type: f.type,
      })),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // If user is authenticated, save user message to Firestore
    if (user) {
      const convTitle = text ? (text.length > 32 ? text.slice(0, 32) + '...' : text) : 'File Processing';
      saveMessageToConversation(user.uid, currentConvId, userMessage, convTitle).catch((err) =>
        console.warn('Could not save user message to Firestore:', err)
      );
    }

    try {
      const formData = new FormData();
      formData.append('message', text);
      formData.append(
        'history',
        JSON.stringify(
          messages.slice(-6).map((m) => ({
            sender: m.sender,
            text: m.text,
          }))
        )
      );

      files.forEach((file) => {
        formData.append('files', file);
      });

      let data: any = null;
      let lastErrorMessage = '';
      const maxRetries = 2;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          if (attempt > 0) {
            // Brief pause to allow the server to finish starting up/syncing
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }

          const response = await fetch('/api/chat', {
            method: 'POST',
            body: formData,
          });

          const contentType = response.headers.get('content-type') || '';
          const rawText = await response.text();

          if (contentType.includes('application/json') || rawText.trim().startsWith('{') || rawText.trim().startsWith('[')) {
            try {
              data = JSON.parse(rawText);
            } catch {
              data = null;
            }
          }

          // If the backend sent a structured response
          if (response.ok && data) {
            break;
          }

          // If backend sent a valid JSON error message (e.g. rate limit or file format)
          if (data && (data.message || data.error)) {
            lastErrorMessage = data.message || data.error;
            break; // Do not retry intentional errors
          }

          // If server returned HTML (e.g., dev server starting up or proxy 502/503 page)
          if (rawText.includes('<!DOCTYPE') || rawText.includes('<html') || contentType.includes('text/html')) {
            lastErrorMessage = 'The server is currently synchronizing. Please try sending your message again in a moment.';
            continue; // Retry!
          }

          lastErrorMessage = `Service returned status ${response.status}. Please try again.`;
        } catch (netErr: any) {
          lastErrorMessage = netErr?.message || 'Network connection issue.';
          if (attempt < maxRetries) {
            continue; // Retry on transient network disconnect
          }
        }
      }

      if (!data) {
        throw new Error(lastErrorMessage || 'Service is momentarily busy. Please try your request again.');
      }

      const botText = data.message || data.text || 'Operation completed.';
      const botMessage: ChatMessage = {
        id: 'bot-' + Date.now(),
        sender: 'bot',
        text: botText,
        timestamp: Date.now(),
        toolCall: data.toolCall,
        files: data.files || [],
        isClarification: data.isClarification,
      };

      setMessages((prev) => [...prev, botMessage]);

      // If user is authenticated, save bot response to Firestore & refresh list
      if (user && currentConvId) {
        await saveMessageToConversation(user.uid, currentConvId, botMessage);
        fetchUserConversations(user.uid).then((convs) => setConversations(convs)).catch(() => {});
      }
    } catch (err: any) {
      const displayMsg = err?.message || 'Something went wrong while processing your request. Please try again.';
      const errorMessage: ChatMessage = {
        id: 'error-' + Date.now(),
        sender: 'bot',
        text: displayMsg,
        timestamp: Date.now(),
        isClarification: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Retry previous failed request
  const handleRetry = () => {
    if (lastSubmissionRef.current) {
      const { text, files } = lastSubmissionRef.current;
      handleSendMessage(text, files);
    }
  };

  const maxFileSizeMB = serverStatus?.maxFileSizeMB ?? 100;

  const handleSelectPrompt = (prompt: string) => {
    setCurrentView('chat');
    setActiveSuggestion(prompt);
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col font-sans text-stone-900 antialiased selection:bg-amber-200 selection:text-stone-900">
      {/* Top Header */}
      <Header
        currentView={currentView}
        setCurrentView={setCurrentView}
        activeProvider={serverStatus?.activeProvider || 'gemini'}
        onOpenProviderModal={() => setIsProviderModalOpen(true)}
        onOpenToolsModal={() => setIsToolsModalOpen(true)}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        onNewChat={handleNewChat}
        onClearChat={handleClearChat}
      />

      {/* Main Workspace Layout with responsive Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat History Sidebar (shows conversations) */}
        <ChatSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
          onRenameConversation={handleRenameConversation}
          onDeleteConversation={handleDeleteConversation}
          isLoadingConversations={isLoadingConversations}
        />

        {/* Center Content Area */}
        <main className="flex-1 flex flex-col relative overflow-hidden bg-stone-50">
          {currentView === 'chat' && (
            <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)]">
              <ChatArea
                messages={messages}
                isLoading={isLoading}
                onSelectPrompt={handleSelectPrompt}
                onRetry={handleRetry}
              />

              <ChatInput
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                onSuggestionClick={handleSelectPrompt}
                maxFileSizeMB={maxFileSizeMB}
                initialPrompt={activeSuggestion}
                onClearInitialPrompt={() => setActiveSuggestion(null)}
              />
            </div>
          )}

          {currentView === 'about' && (
            <div className="flex-1 overflow-y-auto">
              <AboutPage 
                onBackToChat={() => setCurrentView('chat')} 
                maxFileSizeMB={maxFileSizeMB}
              />
            </div>
          )}

          {currentView === 'privacy' && (
            <div className="flex-1 overflow-y-auto">
              <PrivacyPage 
                onBackToChat={() => setCurrentView('chat')} 
                maxFileSizeMB={maxFileSizeMB}
              />
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      <ToolsOverviewModal
        isOpen={isToolsModalOpen}
        onClose={() => setIsToolsModalOpen(false)}
        onSelectPrompt={handleSelectPrompt}
      />

      <ProviderModal
        isOpen={isProviderModalOpen}
        onClose={() => setIsProviderModalOpen(false)}
        activeProvider={serverStatus?.activeProvider || 'gemini'}
        serverStatus={serverStatus}
        maxFileSizeMB={maxFileSizeMB}
      />

      {/* Authentication Modal */}
      <AuthModal />
    </div>
  );
}
