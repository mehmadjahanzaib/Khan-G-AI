import React, { useRef, useEffect } from 'react';
import { Sparkles, Image as ImageIcon, FileText, FileSpreadsheet, FileArchive, Loader2 } from 'lucide-react';
import { ChatMessage } from '../types.js';
import { MessageItem } from './MessageItem.js';

interface ChatAreaProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSelectPrompt: (prompt: string) => void;
  onRetry?: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  isLoading,
  onSelectPrompt,
  onRetry,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 max-w-4xl mx-auto w-full">
      {/* Empty State / Welcome Screen */}
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center my-auto">
          <div className="w-14 h-14 rounded-2xl bg-stone-900 text-amber-300 flex items-center justify-center shadow-md mb-4 animate-in fade-in zoom-in duration-300">
            <Sparkles className="w-7 h-7" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 mb-2">
            Khan G Tools
          </h2>
          <p className="text-stone-600 font-medium text-sm sm:text-base max-w-lg mb-6">
            One Chat. Every File Tool. Chat naturally in English, Urdu, or Roman Urdu to process, convert, and optimize files.
          </p>

          {/* Quick Starter Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-6 max-w-xl">
            <button
              onClick={() => onSelectPrompt('What can you do?')}
              className="text-xs font-semibold px-3 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors border border-stone-200"
            >
              ✨ What can you do?
            </button>
            <button
              onClick={() => onSelectPrompt('Tum kya kya kar sakte ho?')}
              className="text-xs font-semibold px-3 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors border border-stone-200"
            >
              🇵🇰 Tum kya kya kar sakte ho?
            </button>
            <button
              onClick={() => onSelectPrompt('Who are you?')}
              className="text-xs font-semibold px-3 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors border border-stone-200"
            >
              🤖 Who are you?
            </button>
          </div>

          {/* Quick starter cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl text-left">
            <button
              onClick={() => onSelectPrompt('Resize this image to 800x600')}
              className="p-3.5 rounded-xl border border-stone-200 bg-white hover:border-stone-400 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 group-hover:scale-105 transition-transform">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-semibold text-stone-900">Image Processing</h3>
              </div>
              <p className="text-[12px] text-stone-500">
                "Resize to 800x600" or "Is image ko resize karo"
              </p>
            </button>

            <button
              onClick={() => onSelectPrompt('Ye PDF ko Word mein convert kar do')}
              className="p-3.5 rounded-xl border border-stone-200 bg-white hover:border-stone-400 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 group-hover:scale-105 transition-transform">
                  <FileText className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-semibold text-stone-900">PDF Suite</h3>
              </div>
              <p className="text-[12px] text-stone-500">
                "Convert PDF to Word", "Merge PDFs", or "Compress PDF"
              </p>
            </button>

            <button
              onClick={() => onSelectPrompt('Mere liye Excel sheet bana do')}
              className="p-3.5 rounded-xl border border-stone-200 bg-white hover:border-stone-400 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 group-hover:scale-105 transition-transform">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-semibold text-stone-900">Excel & CSV</h3>
              </div>
              <p className="text-[12px] text-stone-500">
                "Convert CSV to Excel" or "Mere liye Excel sheet bana do"
              </p>
            </button>

            <button
              onClick={() => onSelectPrompt('Extract text from this file')}
              className="p-3.5 rounded-xl border border-stone-200 bg-white hover:border-stone-400 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 group-hover:scale-105 transition-transform">
                  <FileArchive className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-semibold text-stone-900">OCR & Zip Archive</h3>
              </div>
              <p className="text-[12px] text-stone-500">
                "Extract text / OCR" or "Zip all attached files"
              </p>
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
            />
          ))}

          {/* Processing / Tool Execution State */}
          {isLoading && (
            <div className="flex items-center gap-3 my-4">
              <div className="w-8 h-8 rounded-full bg-stone-900 text-amber-300 flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="bg-white border border-stone-200 px-4 py-3 rounded-2xl rounded-bl-xs text-sm text-stone-600 flex items-center gap-2 shadow-sm">
                <Loader2 className="w-4 h-4 animate-spin text-stone-800" />
                <span>Khan G Tools is thinking and preparing your response...</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
};
