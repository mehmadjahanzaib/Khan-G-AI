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
import { DeveloperModal } from './components/DeveloperModal.js';
import { FilePreviewModal } from './components/FilePreviewModal.js';
import { ProUpgradeModal } from './components/ProUpgradeModal.js';
import { StudyModeModal } from './components/StudyModeModal.js';
import { SettingsModal } from './components/SettingsModal.js';
import { AdminDashboardModal } from './components/AdminDashboardModal.js';
import { CloudExportModal } from './components/CloudExportModal.js';
import { ReferralModal } from './components/ReferralModal.js';
import { PakistanEmblem } from './components/PakistanEmblem.js';
import { KhanGLogo } from './components/BrandLogo.js';
import { Zap, ShieldCheck, Smartphone, Sparkles as SparklesIcon } from 'lucide-react';
import { useAuth } from './context/AuthContext.js';
import { usePro } from './context/ProContext.js';
import { useTheme } from './context/ThemeContext.js';
import { 
  ConversationItem, 
  fetchUserConversations, 
  fetchConversationMessages, 
  saveMessageToConversation, 
  renameUserConversation, 
  deleteUserConversation, 
  clearConversationMessages,
  fetchSharedChat,
  trackUserStreak
} from './lib/firebase.js';
import { ChatMessage, ProcessedFileInfo } from './types.js';

export default function App() {
  const { user } = useAuth();
  const { maxFileSizeMB } = usePro();
  const { theme, toggleTheme } = useTheme();
  const [currentView, setCurrentView] = useState<'chat' | 'about' | 'privacy'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState<any>(null);
  const [isToolsModalOpen, setIsToolsModalOpen] = useState(false);
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  const [isDeveloperModalOpen, setIsDeveloperModalOpen] = useState(false);
  const [isProModalOpen, setIsProModalOpen] = useState(false);
  const [isStudyModeOpen, setIsStudyModeOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isReferralOpen, setIsReferralOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isCloudExportOpen, setIsCloudExportOpen] = useState(false);
  const [sharedNotice, setSharedNotice] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<ProcessedFileInfo | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState<string | null>(null);
  const [userStreak, setUserStreak] = useState<number>(1);

  // Firestore Conversations State
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);

  // Retry tracking for last failed submission
  const lastSubmissionRef = useRef<{ text: string; files: File[] } | null>(null);

  // Check for shared chat link on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shareId = params.get('share');
    if (shareId) {
      setIsLoading(true);
      fetchSharedChat(shareId)
        .then((data) => {
          if (data && data.messages) {
            setMessages(data.messages);
            setSharedNotice(data.title || 'Shared Study Session');
            setCurrentView('chat');
          }
        })
        .catch((err) => console.error('Could not load shared chat:', err))
        .finally(() => setIsLoading(false));
    }
  }, []);

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

    // Track user study streak on login
    trackUserStreak(user.uid).then((res) => {
      if (isMounted) setUserStreak(res.currentStreak);
    });

    // Check if there is an incoming referral code from URL e.g. ?ref=KG123
    const urlParams = new URLSearchParams(window.location.search);
    const incomingRef = urlParams.get('ref');
    if (incomingRef) {
      fetch('/api/referral/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-khang-pro-token': user.uid,
        },
        body: JSON.stringify({ code: incomingRef }),
      }).catch((e) => console.warn('Could not auto-claim referral:', e));
    }

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
  const handleSendMessage = async (text: string, files: File[], isRetry = false) => {
    if (isLoading) return;
    lastSubmissionRef.current = { text, files };

    // Determine target conversation ID
    let currentConvId = activeConversationId;
    if (!currentConvId) {
      currentConvId = 'conv-' + Date.now();
      setActiveConversationId(currentConvId);
    }

    // Only append user message if not retrying an already displayed message
    if (!isRetry) {
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

      // If user is authenticated, save user message to Firestore
      if (user) {
        const convTitle = text ? (text.length > 32 ? text.slice(0, 32) + '...' : text) : 'File Processing';
        saveMessageToConversation(user.uid, currentConvId, userMessage, convTitle).catch((err) =>
          console.warn('Could not save user message to Firestore:', err)
        );
      }
    }

    setIsLoading(true);

    try {
      let data: any = null;
      let lastErrorMessage = '';
      const maxRetries = 3;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          if (attempt > 0) {
            // Exponential backoff to give container time to start up / recover
            await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
          }

          // Construct fresh FormData for each attempt to avoid detached stream reuse
          const formData = new FormData();
          formData.append('message', text);

          // Clean history without any error bubbles
          const cleanHistory = messages
            .filter((m) => !m.id.startsWith('error-'))
            .slice(-6)
            .map((m) => ({
              sender: m.sender,
              text: m.text,
            }));
          formData.append('history', JSON.stringify(cleanHistory));

          files.forEach((file) => {
            formData.append('files', file);
          });

          // Attach user token if authenticated with quick timeout
          const headers: Record<string, string> = {};
          if (user) {
            try {
              const tokenPromise = user.getIdToken();
              const timeoutPromise = new Promise<string>((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500));
              const token = await Promise.race([tokenPromise, timeoutPromise]);
              if (token) {
                headers['Authorization'] = `Bearer ${token}`;
              }
            } catch {
              // Proceed without auth header
            }
          }

          // 60-second processing abort timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 60000);

          let response: Response;
          try {
            response = await fetch('/api/chat', {
              method: 'POST',
              headers,
              body: formData,
              signal: controller.signal,
            });
          } finally {
            clearTimeout(timeoutId);
          }

          const contentType = response.headers.get('content-type') || '';
          const rawText = await response.text();

          if (contentType.includes('application/json') || rawText.trim().startsWith('{') || rawText.trim().startsWith('[')) {
            try {
              data = JSON.parse(rawText);
            } catch {
              data = null;
            }
          }

          // If the backend sent a structured successful response
          if (response.ok && data) {
            break;
          }

          // If backend sent an explicit error status (e.g. rate limit 429 or quota exceeded)
          if (!response.ok && data && (data.message || data.error)) {
            lastErrorMessage = data.message || data.error;
            throw new Error(lastErrorMessage);
          }

          // If server returned HTML (e.g., dev server starting up or proxy 502/503 page)
          if (rawText.includes('<!DOCTYPE') || rawText.includes('<html') || contentType.includes('text/html')) {
            lastErrorMessage = 'The server is currently synchronizing. Please try sending your message again in a moment.';
            continue; // Retry!
          }

          lastErrorMessage = `Service returned status ${response.status}. Please try again.`;
        } catch (netErr: any) {
          const isAbort = netErr?.name === 'AbortError';
          lastErrorMessage = isAbort
            ? 'Request timed out while processing file. Please try with a smaller file or retry.'
            : (netErr?.message || 'Network connection issue.');
          if (attempt < maxRetries && !isAbort && !lastErrorMessage.includes('quota') && !lastErrorMessage.includes('Rate limit')) {
            continue; // Retry on transient network disconnect
          }
          if (lastErrorMessage.includes('quota') || lastErrorMessage.includes('Rate limit')) {
            throw netErr;
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
        workflowPlan: data.workflowPlan,
        workflowExecution: data.workflowExecution,
        nextStepSuggestions: data.nextStepSuggestions,
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
      const rawMsg = err?.message || '';
      let displayMsg = rawMsg || 'Something went wrong while processing your request. Please try again.';

      const isNetError =
        displayMsg.toLowerCase().includes('failed to fetch') ||
        displayMsg.toLowerCase().includes('networkerror') ||
        displayMsg.toLowerCase().includes('network connection');

      if (isNetError) {
        displayMsg = 'Could not establish connection with Khan G AI server. This usually happens if the server was momentarily synchronizing or starting up. All AI models & 21+ tools are ready—please click **Retry** below to resend.';
      }

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
    let textToSend = '';
    let filesToSend: File[] = [];

    if (lastSubmissionRef.current) {
      textToSend = lastSubmissionRef.current.text;
      filesToSend = lastSubmissionRef.current.files;
    } else {
      const lastUserMsg = [...messages].reverse().find((m) => m.sender === 'user');
      if (lastUserMsg && lastUserMsg.text) {
        textToSend = lastUserMsg.text;
      }
    }

    if (textToSend.trim() || filesToSend.length > 0) {
      // Remove trailing error message bubble from list
      setMessages((prev) => {
        if (prev.length > 0 && prev[prev.length - 1].id.startsWith('error-')) {
          return prev.slice(0, -1);
        }
        return prev;
      });
      handleSendMessage(textToSend, filesToSend, true);
    }
  };

  // Hybrid Autonomous Workflow Approval Runner
  const handleApproveWorkflow = async (steps: any[]) => {
    setIsLoading(true);
    try {
      const filesToSend = lastSubmissionRef.current?.files || [];
      const formData = new FormData();
      formData.append('workflowSteps', JSON.stringify(steps));
      filesToSend.forEach((f) => formData.append('files', f));

      const headers: Record<string, string> = {};
      if (user) {
        try {
          const token = await user.getIdToken();
          if (token) headers['Authorization'] = `Bearer ${token}`;
        } catch {}
      }

      const res = await fetch('/api/workflow/execute', {
        method: 'POST',
        headers,
        body: formData,
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Workflow execution failed');
      }

      const workflowMsg: ChatMessage = {
        id: 'bot-' + Date.now(),
        sender: 'bot',
        text: result.message || 'Workflow completed successfully.',
        timestamp: Date.now(),
        workflowExecution: {
          steps: result.steps || [],
          totalDurationMs: result.totalDurationMs,
        },
        files: result.files || [],
      };

      setMessages((prev) => [...prev, workflowMsg]);
      if (user && activeConversationId) {
        await saveMessageToConversation(user.uid, activeConversationId, workflowMsg);
      }
    } catch (err: any) {
      const errMsg: ChatMessage = {
        id: 'error-' + Date.now(),
        sender: 'bot',
        text: err?.message || 'Workflow execution encountered an error.',
        timestamp: Date.now(),
        isClarification: true,
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const maxAllowedSizeMB = maxFileSizeMB ?? (serverStatus?.maxFileSizeMB ?? 100);

  const handleSelectPrompt = (prompt: string) => {
    setCurrentView('chat');
    setActiveSuggestion(prompt);
  };

  return (
    <div className="min-h-screen bg-[#f8faf9] dark:bg-stone-950 flex flex-col font-sans text-stone-900 dark:text-stone-100 antialiased selection:bg-emerald-200 selection:text-emerald-950 transition-colors">
      {/* Top Header */}
      <Header
        currentView={currentView}
        setCurrentView={setCurrentView}
        activeProvider={serverStatus?.activeProvider || 'gemini'}
        onOpenProviderModal={() => setIsProviderModalOpen(true)}
        onOpenToolsModal={() => setIsToolsModalOpen(true)}
        onOpenDeveloperModal={() => setIsDeveloperModalOpen(true)}
        onOpenProModal={() => setIsProModalOpen(true)}
        onOpenStudyMode={() => setIsStudyModeOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenReferral={() => setIsReferralOpen(true)}
        onOpenCloudExport={() => setIsCloudExportOpen(true)}
        onOpenAdmin={() => setIsSettingsOpen(true)}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        onNewChat={handleNewChat}
        onClearChat={handleClearChat}
        onSearchPrompt={(query) => handleSendMessage(query, [])}
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
          onOpenDeveloperModal={() => setIsDeveloperModalOpen(true)}
          onOpenProModal={() => setIsProModalOpen(true)}
          onOpenStudyMode={() => setIsStudyModeOpen(true)}
          onOpenToolsModal={() => setIsToolsModalOpen(true)}
          onOpenReferral={() => setIsReferralOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        {/* Center Content Area */}
        <main className="flex-1 flex flex-col relative overflow-hidden bg-[#f8faf9] dark:bg-stone-950">
          {currentView === 'chat' && (
            <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)]">
              {sharedNotice && (
                <div className="bg-emerald-50 dark:bg-emerald-950/80 border-b border-emerald-200 dark:border-emerald-800 px-4 py-2 text-xs flex items-center justify-between text-emerald-900 dark:text-emerald-200">
                  <div className="flex items-center gap-2">
                    <PakistanEmblem size={14} variant="flag" />
                    <span>Viewing Shared Session: <strong>{sharedNotice}</strong></span>
                  </div>
                  <button
                    onClick={() => {
                      setSharedNotice(null);
                      handleNewChat();
                    }}
                    className="font-semibold underline hover:text-emerald-700"
                  >
                    Start My Own Chat
                  </button>
                </div>
              )}

              <ChatArea
                messages={messages}
                isLoading={isLoading}
                onSelectPrompt={handleSelectPrompt}
                onRetry={handleRetry}
                onOpenDeveloperModal={() => setIsDeveloperModalOpen(true)}
                onOpenStudyMode={() => setIsStudyModeOpen(true)}
                onPreviewFile={(f) => setPreviewFile(f)}
                onApproveWorkflow={handleApproveWorkflow}
              />

              <ChatInput
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                onSuggestionClick={handleSelectPrompt}
                maxFileSizeMB={maxAllowedSizeMB}
                initialPrompt={activeSuggestion}
                onClearInitialPrompt={() => setActiveSuggestion(null)}
              />

              {/* Official Khan G AI Brand & Trust Footer Bar (Approved Mockup) */}
              <div className="border-t border-[#DCEBE5] dark:border-[#0D2E24] bg-white/70 dark:bg-[#051711]/70 backdrop-blur-xs py-2 px-3 sm:px-6 flex flex-wrap items-center justify-between gap-3 text-xs select-none">
                {/* Brand Logo & Tagline */}
                <div className="flex items-center gap-2 min-w-0">
                  <KhanGLogo size="sm" variant="mark" />
                  <div className="flex items-center gap-1.5 leading-none">
                    <span className="font-bold text-stone-900 dark:text-white">Khan G AI</span>
                    <span className="text-[11px] text-stone-400 dark:text-stone-500 hidden sm:inline">•</span>
                    <span className="text-[11px] text-stone-500 dark:text-stone-400 hidden sm:inline truncate">
                      Your AI Assistant for Work, Study &amp; Everyday Life.
                    </span>
                  </div>
                </div>

                {/* Trust Pillars */}
                <div className="hidden lg:flex items-center gap-4 text-[11px] font-medium text-stone-500 dark:text-emerald-300/70">
                  <span className="flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-[#00A86B]" />
                    <span>Modern UI/UX</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#00A86B]" />
                    <span>Secure &amp; Trusted</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Smartphone className="w-3.5 h-3.5 text-[#00A86B]" />
                    <span>Desktop + Mobile</span>
                  </span>
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <SparklesIcon className="w-3.5 h-3.5 text-[#00A86B]" />
                    <span>Clean • Fast • Intelligent</span>
                  </span>
                </div>

                {/* Developer Signature Credit */}
                <button
                  onClick={() => setIsDeveloperModalOpen(true)}
                  className="flex items-center gap-1.5 text-[11px] font-medium text-stone-600 dark:text-stone-300 hover:text-[#00A86B] dark:hover:text-[#00A86B] transition-colors ml-auto sm:ml-0 group cursor-pointer"
                  title="View Lead Developer Profile"
                >
                  <span className="text-stone-400">Designed by</span>
                  <span className="font-bold underline decoration-emerald-500/40 group-hover:decoration-emerald-500">
                    Muhammad Jahanzaib (MJ)
                  </span>
                </button>
              </div>
            </div>
          )}

          {currentView === 'about' && (
            <div className="flex-1 overflow-y-auto">
              <AboutPage 
                onBackToChat={() => setCurrentView('chat')} 
                onOpenDeveloperModal={() => setIsDeveloperModalOpen(true)}
                maxFileSizeMB={maxAllowedSizeMB}
              />
            </div>
          )}

          {currentView === 'privacy' && (
            <div className="flex-1 overflow-y-auto">
              <PrivacyPage 
                onBackToChat={() => setCurrentView('chat')} 
                maxFileSizeMB={maxAllowedSizeMB}
              />
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      <FilePreviewModal
        file={previewFile}
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
      />

      <ProUpgradeModal
        isOpen={isProModalOpen}
        onClose={() => setIsProModalOpen(false)}
      />

      <DeveloperModal
        isOpen={isDeveloperModalOpen}
        onClose={() => setIsDeveloperModalOpen(false)}
      />

      <StudyModeModal
        isOpen={isStudyModeOpen}
        onClose={() => setIsStudyModeOpen(false)}
        onSelectPrompt={(prompt) => {
          setIsStudyModeOpen(false);
          handleSelectPrompt(prompt);
        }}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenUpgrade={() => {
          setIsSettingsOpen(false);
          setIsProModalOpen(true);
        }}
        onOpenReferral={() => {
          setIsSettingsOpen(false);
          setIsReferralOpen(true);
        }}
        onOpenAdmin={() => {
          setIsSettingsOpen(false);
          setIsAdminOpen(true);
        }}
      />

      <ReferralModal
        isOpen={isReferralOpen}
        onClose={() => setIsReferralOpen(false)}
      />

      <AdminDashboardModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
      />

      <CloudExportModal
        isOpen={isCloudExportOpen}
        onClose={() => setIsCloudExportOpen(false)}
        messages={messages}
        conversationTitle={conversations.find((c) => c.id === activeConversationId)?.title || 'Khan G AI Study & Chat Notes'}
        onOpenAuth={() => {}}
        onOpenPro={() => {
          setIsCloudExportOpen(false);
          setIsProModalOpen(true);
        }}
      />

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
        maxFileSizeMB={maxAllowedSizeMB}
      />

      {/* Authentication Modal */}
      <AuthModal />
    </div>
  );
}
