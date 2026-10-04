import React, { useRef, useEffect } from 'react';
import { 
  Sparkles, 
  GraduationCap, 
  Calculator, 
  FileText, 
  PenTool, 
  Languages, 
  Lightbulb, 
  Code, 
  Loader2,
  ArrowRight
} from 'lucide-react';
import { ChatMessage, ProcessedFileInfo } from '../types.js';
import { MessageItem } from './MessageItem.js';
import { KhanGMark } from './BrandLogo.js';
import { useAuth } from '../context/AuthContext.js';

interface ChatAreaProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSelectPrompt: (prompt: string) => void;
  onRetry?: () => void;
  onOpenDeveloperModal?: () => void;
  onOpenStudyMode?: () => void;
  onPreviewFile?: (file: ProcessedFileInfo) => void;
  onApproveWorkflow?: (steps: any[]) => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  isLoading,
  onSelectPrompt,
  onRetry,
  onOpenDeveloperModal,
  onOpenStudyMode,
  onPreviewFile,
  onApproveWorkflow,
}) => {
  const { user } = useAuth();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const userName = user?.displayName ? user.displayName.split(' ')[0] : 'Jahanzaib';

  const quickPillPresets = [
    {
      label: 'Study & Learn',
      icon: <GraduationCap className="w-3.5 h-3.5 text-[#00A86B]" />,
      prompt: 'Can you create a 7 days study plan for CSS exam with focused daily tasks and subjects?',
      isStudy: true,
    },
    {
      label: 'Solve Math',
      icon: <Calculator className="w-3.5 h-3.5 text-[#00A86B]" />,
      prompt: 'Solve this step by step with formulas: ',
    },
    {
      label: 'Analyze File',
      icon: <FileText className="w-3.5 h-3.5 text-[#00A86B]" />,
      prompt: 'I want to analyze and extract insights from a file. What formats can you process?',
    },
    {
      label: 'Write Something',
      icon: <PenTool className="w-3.5 h-3.5 text-[#00A86B]" />,
      prompt: 'Write a professional email / cover letter regarding: ',
    },
    {
      label: 'Translate',
      icon: <Languages className="w-3.5 h-3.5 text-[#00A86B]" />,
      prompt: 'Translate this text into natural, formal Urdu and English: ',
    },
    {
      label: 'Create & Brainstorm',
      icon: <Lightbulb className="w-3.5 h-3.5 text-[#00A86B]" />,
      prompt: 'Give me 5 innovative ideas and execution strategies for: ',
    },
    {
      label: 'Code Help',
      icon: <Code className="w-3.5 h-3.5 text-[#00A86B]" />,
      prompt: 'Help me debug and optimize this code snippet: ',
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 max-w-4xl mx-auto w-full relative">
      {/* Empty State / Approved UI Welcome Canvas */}
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[68vh] text-center my-auto max-w-2xl mx-auto relative z-10">
          
          {/* Subtle Artistic Architectural Heritage Background Graphic */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none -z-10 opacity-20 dark:opacity-10 overflow-hidden">
            <svg
              width="680"
              height="340"
              viewBox="0 0 680 340"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-[#00A86B]"
            >
              {/* Crescent Moon */}
              <path
                d="M 540 60 C 525 60 512 70 512 85 C 512 100 525 110 540 110 C 532 106 526 96 526 85 C 526 74 532 64 540 60 Z"
                fill="currentColor"
                opacity="0.6"
              />
              {/* Minaret / Architectural silhouette arches */}
              <path
                d="M 120 320 L 120 180 L 128 160 L 136 180 L 136 320"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M 240 320 L 240 140 L 250 110 L 260 140 L 260 320"
                stroke="currentColor"
                strokeWidth="2"
              />
              {/* Monument Spire (Minar-e-Pakistan silhouette) */}
              <path
                d="M 340 320 L 336 210 L 330 140 L 338 60 L 340 40 L 342 60 L 350 140 L 344 210 L 340 320 Z"
                stroke="currentColor"
                strokeWidth="2"
                fill="currentColor"
                fillOpacity="0.08"
              />
              {/* Dome silhouette (Faisal Mosque / Badshahi inspired arches) */}
              <path
                d="M 400 320 L 400 230 C 400 200 440 190 450 160 C 460 190 500 200 500 230 L 500 320"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M 80 320 L 600 320"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          </div>

          {/* Official Brand Emblem Badge with Ambient Emerald Glow */}
          <div className="relative mb-3 group cursor-pointer" onClick={() => onSelectPrompt('Tell me about Khan G AI and what you can do!')}>
            <div className="absolute -inset-1.5 bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-emerald-500/20 rounded-3xl blur-md opacity-75 group-hover:opacity-100 transition duration-300" />
            <div className="relative flex items-center justify-center p-2 rounded-2xl bg-white dark:bg-[#071E17] border border-[#DCEBE5] dark:border-[#0D2E24] shadow-sm group-hover:scale-105 transition-transform duration-200">
              <KhanGMark size={56} isSquircle={true} />
            </div>
          </div>

          {/* Sparkle & User Greeting */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-[#006A4E] dark:text-emerald-300 mb-3 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-[#00A86B]" />
            <span>Hello, {userName} 👋</span>
          </div>

          {/* Headline exactly matching Approved Mockup */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-[#0F172A] dark:text-white mb-2 font-sans">
            Ask <span className="text-[#00A86B]">Khan G AI</span> anything.
          </h1>

          <p className="text-sm sm:text-base text-[#64748B] dark:text-stone-300 font-medium max-w-lg mb-8 leading-relaxed">
            Your AI Assistant for Work, Study &amp; Everyday Life.
          </p>

          {/* Feature Quick Suggestions */}
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl mb-6">
            {quickPillPresets.map((pill, i) => (
              <button
                key={i}
                onClick={() => {
                  if (pill.isStudy && onOpenStudyMode) {
                    onOpenStudyMode();
                  } else {
                    onSelectPrompt(pill.prompt);
                  }
                }}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-stone-900 hover:bg-[#E8F7F0] dark:hover:bg-emerald-950/40 text-stone-800 dark:text-stone-200 border border-[#DCEBE5] dark:border-stone-800 hover:border-[#00A86B] text-xs font-medium shadow-2xs transition-all hover:scale-[1.02] active:scale-98 group cursor-pointer"
              >
                {pill.icon}
                <span>{pill.label}</span>
              </button>
            ))}
          </div>

          {/* Featured Starter Card: 7-Day CSS Exam Study Plan */}
          <div className="w-full max-w-lg mt-2">
            <button
              onClick={() => onSelectPrompt('Can you create a 7 days study plan for CSS exam with focused daily tasks and subjects?')}
              className="w-full p-4 rounded-2xl bg-gradient-to-r from-emerald-50/90 to-teal-50/70 dark:from-stone-900 dark:to-stone-900 border border-[#00A86B]/30 hover:border-[#00A86B] shadow-xs text-left flex items-center justify-between group transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#00A86B] text-white flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                    <span>Popular: 7 Days CSS Study Plan</span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-200/60 dark:bg-emerald-950 text-[#006A4E] dark:text-emerald-300">
                      Exam Prep
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                    Daily tasks, syllabus breakdown, MCQs &amp; past paper strategy.
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#00A86B] group-hover:translate-x-1 transition-transform shrink-0" />
            </button>
          </div>
        </div>
      ) : (
        /* Messages Thread */
        <div className="space-y-4">
          {messages.map((msg, idx) => (
            <MessageItem 
              key={msg.id} 
              message={msg} 
              onRetry={idx === messages.length - 1 ? onRetry : undefined}
              onPreviewFile={onPreviewFile}
              onApproveWorkflow={onApproveWorkflow}
              onSelectPrompt={onSelectPrompt}
            />
          ))}

          {/* Processing / Tool Execution State */}
          {isLoading && (
            <div className="flex items-center gap-3 my-4">
              <div className="w-8 h-8 rounded-full bg-[#00A86B] text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                <KhanGMark size={20} isSquircle={false} />
              </div>
              <div className="bg-white dark:bg-stone-900 border border-[#DCEBE5] dark:border-stone-800 px-4 py-3 rounded-2xl rounded-bl-xs text-sm text-stone-700 dark:text-stone-200 flex items-center gap-2 shadow-xs">
                <Loader2 className="w-4 h-4 animate-spin text-[#00A86B]" />
                <span>Khan G AI is preparing your response...</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
};

export default ChatArea;
