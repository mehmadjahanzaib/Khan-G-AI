import React, { useRef, useState, useEffect } from 'react';
import { 
  Paperclip, 
  ArrowUpRight, 
  X, 
  Image as ImageIcon, 
  FileText, 
  AlertCircle, 
  Loader2, 
  Mic, 
  MicOff,
  GraduationCap,
  Calculator,
  PenTool,
  Languages,
  Lightbulb,
  Code
} from 'lucide-react';

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
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize Web Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        if (currentTranscript.trim()) {
          setText((prev) => (prev ? `${prev} ${currentTranscript.trim()}` : currentTranscript.trim()));
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      setSpeechSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Set initial prompt if triggered externally
  useEffect(() => {
    if (initialPrompt) {
      setText(initialPrompt);
      if (onClearInitialPrompt) onClearInitialPrompt();
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  }, [initialPrompt, onClearInitialPrompt]);

  const toggleVoiceRecording = () => {
    if (!speechSupported) {
      alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
      }
    }
  };

  const handleFiles = (files: FileList | File[]) => {
    setFileError(null);
    const newFiles: File[] = [];
    const maxBytes = maxFileSizeMB * 1024 * 1024;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > maxBytes) {
        setFileError(`File "${file.name}" exceeds the ${maxFileSizeMB}MB limit.`);
        continue;
      }
      newFiles.push(file);
    }

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

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    onSendMessage(text, attachedFiles);
    setText('');
    setAttachedFiles([]);
    setFileError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const presetActionChips = [
    { label: 'Study & Learn', icon: <GraduationCap className="w-3.5 h-3.5 text-[#00A86B]" />, prompt: 'Can you create a 7 days study plan for CSS exam with focused daily tasks and subjects?' },
    { label: 'Solve Math', icon: <Calculator className="w-3.5 h-3.5 text-[#00A86B]" />, prompt: 'Solve this math problem step by step with formulas: ' },
    { label: 'Analyze File', icon: <FileText className="w-3.5 h-3.5 text-[#00A86B]" />, prompt: 'I want to analyze and extract insights from a file. What formats can you process?' },
    { label: 'Write Something', icon: <PenTool className="w-3.5 h-3.5 text-[#00A86B]" />, prompt: 'Write a professional email/letter regarding: ' },
    { label: 'Translate', icon: <Languages className="w-3.5 h-3.5 text-[#00A86B]" />, prompt: 'Translate this text into professional English/Urdu with natural phrasing: ' },
    { label: 'Create & Brainstorm', icon: <Lightbulb className="w-3.5 h-3.5 text-[#00A86B]" />, prompt: 'Brainstorm innovative concepts for: ' },
    { label: 'Code Help', icon: <Code className="w-3.5 h-3.5 text-[#00A86B]" />, prompt: 'Help me debug or write code for: ' },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 pb-4">
      {/* File Upload Error Alert */}
      {fileError && (
        <div className="flex items-center gap-2 p-2.5 mb-2 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 text-xs animate-shake">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{fileError}</span>
          <button onClick={() => setFileError(null)} className="p-0.5 hover:text-rose-900">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Composer Box */}
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
        className={`relative bg-white dark:bg-stone-900 border rounded-2xl p-2.5 sm:p-3 shadow-md transition-all ${
          isDragging
            ? 'border-[#00A86B] ring-2 ring-[#00A86B]/20 bg-[#E8F7F0]/30 dark:bg-emerald-950/20'
            : isListening
            ? 'border-rose-500 ring-2 ring-rose-500/30'
            : 'border-[#DCEBE5] dark:border-stone-800 focus-within:border-[#00A86B] dark:focus-within:border-[#00A86B] focus-within:ring-2 focus-within:ring-[#00A86B]/15'
        }`}
      >
        {/* Voice Active Indicator */}
        {isListening && (
          <div className="flex items-center justify-between bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs px-3 py-1.5 rounded-xl mb-2 animate-pulse">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
              <span className="font-semibold">Listening to speech... Speak clearly</span>
            </div>
            <button
              onClick={toggleVoiceRecording}
              className="text-xs font-bold underline hover:text-rose-900"
            >
              Stop
            </button>
          </div>
        )}

        {/* Attached Files Preview Bar */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2 p-1.5 bg-stone-50 dark:bg-stone-800/80 rounded-xl border border-stone-200/80 dark:border-stone-700 max-h-32 overflow-y-auto">
            {attachedFiles.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 text-xs px-2.5 py-1 rounded-lg shadow-2xs"
              >
                {file.type.startsWith('image/') ? (
                  <ImageIcon className="w-3.5 h-3.5 text-[#00A86B]" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-stone-500" />
                )}
                <span className="truncate max-w-[140px] font-medium">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="p-0.5 hover:text-rose-600 transition-colors"
                  title="Remove file"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Bar Controls */}
        <div className="flex items-center gap-2">
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files);
              e.target.value = '';
            }}
            multiple
            className="hidden"
            accept="image/*,.pdf,.docx,.doc,.xlsx,.xls,.pptx,.txt,.csv,.json,.md,.zip"
          />

          {/* Paperclip Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-stone-400 hover:text-stone-700 dark:text-stone-400 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors shrink-0"
            title="Attach file(s) (Images, PDFs, Word, Excel, CSV, Zip)"
          >
            <Paperclip className="w-5 h-5 -rotate-45" />
          </button>

          {/* Textarea */}
          <textarea
            id="chat-input-textarea"
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={
              isListening
                ? 'Listening to speech...'
                : attachedFiles.length > 0
                ? "Describe what to do (e.g. 'Extract text', 'Convert to Word', 'Compress')..."
                : "Type your message here..."
            }
            className="w-full resize-none max-h-32 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 bg-transparent focus:outline-none py-1.5 leading-relaxed"
          />

          {/* Microphone Voice Button */}
          <button
            id="chat-voice-input-btn"
            type="button"
            onClick={toggleVoiceRecording}
            className={`p-2 rounded-xl transition-colors shrink-0 ${
              isListening
                ? 'bg-rose-600 text-white animate-pulse'
                : 'text-stone-400 hover:text-stone-700 dark:text-stone-400 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
            title={isListening ? 'Stop listening' : 'Voice Input (Speak clearly)'}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Emerald Send Button with ArrowUpRight */}
          <button
            id="chat-send-message-btn"
            type="button"
            disabled={isLoading || (!text.trim() && attachedFiles.length === 0)}
            onClick={() => handleSubmit()}
            className={`p-2.5 rounded-xl transition-all shrink-0 flex items-center justify-center ${
              isLoading || (!text.trim() && attachedFiles.length === 0)
                ? 'bg-stone-200 dark:bg-stone-800 text-stone-400 dark:text-stone-600 cursor-not-allowed'
                : 'bg-[#00A86B] hover:bg-[#00925d] text-white shadow-sm shadow-[#00A86B]/25 hover:scale-105 active:scale-95'
            }`}
            title="Send message"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
            )}
          </button>
        </div>
      </div>

      {/* Preset Action Chips Underneath Input matching user's reference */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-2.5 scrollbar-none text-xs text-stone-600 dark:text-stone-300">
        {presetActionChips.map((chip, i) => (
          <button
            key={i}
            id={`preset-chip-${i}`}
            type="button"
            onClick={() => {
              setText(chip.prompt);
              if (onSuggestionClick) {
                onSuggestionClick(chip.prompt);
              }
              setTimeout(() => {
                textareaRef.current?.focus();
              }, 20);
            }}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-stone-900 hover:bg-[#E8F7F0] dark:hover:bg-emerald-950/40 text-stone-700 dark:text-stone-300 hover:text-[#00A86B] border border-[#DCEBE5] dark:border-stone-800 hover:border-[#00A86B] transition-colors whitespace-nowrap active:scale-95 shadow-2xs font-medium cursor-pointer"
          >
            {chip.icon}
            <span>{chip.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ChatInput;
