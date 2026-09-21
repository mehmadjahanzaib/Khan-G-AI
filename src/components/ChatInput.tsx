import React, { useRef, useState, useEffect } from 'react';
import { Paperclip, Send, X, File, Image as ImageIcon, FileText, AlertCircle, Loader2 } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (text: string, files: File[]) => void;
  isLoading: boolean;
  onSuggestionClick?: (prompt: string) => void;
  maxFileSizeMB?: number;
  initialPrompt?: string | null;
  onClearInitialPrompt?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading,
  onSuggestionClick,
  maxFileSizeMB = 100,
  initialPrompt,
  onClearInitialPrompt,
}) => {
  const [text, setText] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync external prompt selection (e.g. from Tools modal, starter pills, or suggestions)
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      setText(initialPrompt.trim());
      if (onClearInitialPrompt) {
        onClearInitialPrompt();
      }
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.selectionStart = textareaRef.current.value.length;
          textareaRef.current.selectionEnd = textareaRef.current.value.length;
        }
      }, 50);
    }
  }, [initialPrompt, onClearInitialPrompt]);

  const MAX_FILE_SIZE_BYTES = maxFileSizeMB * 1024 * 1024;

  const handleFiles = (incomingFiles: FileList | File[]) => {
    setFileError(null);
    const newFiles: File[] = [];

    Array.from(incomingFiles).forEach((file) => {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setFileError(`File "${file.name}" exceeds the ${maxFileSizeMB}MB limit.`);
        return;
      }
      newFiles.push(file);
    });

    if (newFiles.length > 0) {
      setAttachedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLoading) return;
    if (!text.trim() && attachedFiles.length === 0) return;

    onSendMessage(text.trim(), attachedFiles);
    setText('');
    setAttachedFiles([]);
    setFileError(null);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Adjust textarea height dynamically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  const quickSuggestions = [
    'Is PDF ko summarize karo',
    'Is image ka size 500 KB se kam karo',
    'Is Excel file mein total calculate karo',
    'Is document ki spelling mistakes correct karo',
    'Resize image to 800x600',
    'Convert to editable Word (.docx)',
    'Convert to PDF',
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-4">
      {/* Quick Suggestion Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none text-xs text-stone-600">
        <span className="text-[11px] font-medium text-stone-400 shrink-0">Try:</span>
        {quickSuggestions.map((prompt, i) => (
          <button
            key={i}
            id={`suggestion-chip-${i}`}
            type="button"
            onClick={() => {
              setText(prompt);
              if (onSuggestionClick) {
                onSuggestionClick(prompt);
              }
              setTimeout(() => {
                textareaRef.current?.focus();
              }, 20);
            }}
            className="shrink-0 bg-stone-100 hover:bg-stone-200 text-stone-700 px-2.5 py-1 rounded-full border border-stone-200/80 transition-colors whitespace-nowrap active:scale-95"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Main Input Container with Drag & Drop */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
          }
        }}
        className={`relative bg-white border rounded-2xl p-2.5 sm:p-3 shadow-md transition-all ${
          isDragging
            ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20'
            : 'border-stone-300 focus-within:border-stone-500 focus-within:ring-1 focus-within:ring-stone-400'
        }`}
      >
        {/* Attached Files Preview Bar */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2 p-1.5 bg-stone-50 rounded-xl border border-stone-200/70 max-h-32 overflow-y-auto">
            {attachedFiles.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1.5 bg-white border border-stone-200 text-stone-800 text-xs px-2 py-1 rounded-lg shadow-2xs"
              >
                {file.type.startsWith('image/') ? (
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                ) : file.type === 'application/pdf' ? (
                  <FileText className="w-3.5 h-3.5 text-rose-600" />
                ) : (
                  <File className="w-3.5 h-3.5 text-stone-500" />
                )}
                <span className="font-medium truncate max-w-[120px] sm:max-w-[180px]">{file.name}</span>
                <span className="text-[10px] text-stone-400">
                  ({(file.size / 1024).toFixed(0)}KB)
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="p-1 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 min-w-[20px] min-h-[20px] flex items-center justify-center transition-colors"
                  title="Remove file"
                  aria-label="Remove file"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* File Error Notification */}
        {fileError && (
          <div className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 px-2.5 py-1.5 rounded-lg mb-2 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{fileError}</span>
          </div>
        )}

        {/* Input Controls Row */}
        <div className="flex items-end gap-2">
          {/* Paperclip Button */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <button
            id="chat-attach-file-btn"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-colors shrink-0"
            title="Attach file(s) (Images, PDFs, Word, Excel, CSV, Zip, etc.)"
          >
            <Paperclip className="w-5 h-5 -rotate-45" />
          </button>

          {/* Chat Textarea */}
          <textarea
            id="chat-input-textarea"
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={
              attachedFiles.length > 0
                ? "Describe what to do (e.g. 'Resize to 800x600', 'Convert to PDF', 'Extract text')..."
                : "Attach a file or type a prompt (e.g. 'Convert this to PDF', 'Make an Excel sheet')..."
            }
            className="w-full resize-none max-h-32 text-sm text-stone-900 placeholder:text-stone-400 bg-transparent focus:outline-none py-1.5 leading-relaxed"
          />

          {/* Send Button */}
          <button
            id="chat-send-message-btn"
            type="button"
            disabled={isLoading || (!text.trim() && attachedFiles.length === 0)}
            onClick={() => handleSubmit()}
            className={`p-2 rounded-xl transition-all shrink-0 flex items-center justify-center ${
              isLoading || (!text.trim() && attachedFiles.length === 0)
                ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                : 'bg-stone-900 hover:bg-stone-800 text-white shadow-sm hover:scale-105 active:scale-95'
            }`}
            title="Send message"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Small footer caption */}
        <div className="flex flex-col xs:flex-row xs:items-center justify-between text-[11px] text-stone-400 mt-1.5 px-1 gap-1 select-none">
          <span>Drop files anywhere • Max {maxFileSizeMB}MB</span>
          <span>Files auto-delete after 1 hour</span>
        </div>
      </div>
    </div>
  );
};
