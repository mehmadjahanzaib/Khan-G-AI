import React, { useState } from 'react';
import { 
  Download, 
  FileText, 
  Image as ImageIcon, 
  FileSpreadsheet, 
  FileArchive, 
  Clock, 
  Terminal, 
  Copy, 
  Check, 
  Sparkles, 
  User, 
  AlertCircle,
  RotateCcw
} from 'lucide-react';
import { ChatMessage, ProcessedFileInfo } from '../types.js';

interface MessageItemProps {
  message: ChatMessage;
  onRetry?: () => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, onRetry }) => {
  const isUser = message.sender === 'user';
  const isError = message.id.startsWith('error-');
  const [copiedText, setCopiedText] = useState(false);

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType: string, filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'avif'].includes(ext)) {
      return <ImageIcon className="w-5 h-5 text-indigo-600" />;
    }
    if (mimeType === 'application/pdf' || ext === 'pdf') {
      return <FileText className="w-5 h-5 text-rose-600" />;
    }
    if (['xlsx', 'xls', 'csv'].includes(ext) || mimeType.includes('spreadsheet') || mimeType.includes('csv')) {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
    }
    if (['docx', 'doc'].includes(ext) || mimeType.includes('word')) {
      return <FileText className="w-5 h-5 text-blue-600" />;
    }
    if (['zip', 'rar', 'tar', 'gz'].includes(ext) || mimeType.includes('zip')) {
      return <FileArchive className="w-5 h-5 text-amber-600" />;
    }
    return <FileText className="w-5 h-5 text-stone-600" />;
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div className={`flex gap-3 my-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* Bot Avatar */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-stone-900 text-amber-300 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
          <Sparkles className="w-4 h-4" />
        </div>
      )}

      {/* Message Content Container */}
      <div className={`max-w-[85%] sm:max-w-[75%] flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Uploaded files attached to user message */}
        {isUser && message.uploadedFiles && message.uploadedFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 justify-end mb-1">
            {message.uploadedFiles.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 bg-stone-200/80 border border-stone-300/80 text-stone-800 text-xs px-2.5 py-1.5 rounded-lg"
              >
                {getFileIcon(file.type, file.name)}
                <span className="font-medium truncate max-w-[160px]">{file.name}</span>
                <span className="text-[10px] text-stone-500">({formatFileSize(file.size)})</span>
              </div>
            ))}
          </div>
        )}

        {/* Text bubble */}
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
            isUser
              ? 'bg-stone-900 text-stone-100 rounded-br-xs'
              : isError
              ? 'bg-rose-50 text-rose-900 border border-rose-200 rounded-bl-xs'
              : message.isClarification
              ? 'bg-amber-50 text-amber-950 border border-amber-200 rounded-bl-xs'
              : 'bg-white text-stone-800 border border-stone-200 rounded-bl-xs'
          }`}
        >
          {isError && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 mb-1.5">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>Request Error</span>
            </div>
          )}

          {message.text && (
            <div className="whitespace-pre-wrap break-words">{message.text}</div>
          )}

          {/* Retry Button if error */}
          {isError && onRetry && (
            <div className="mt-2.5 pt-2 border-t border-rose-200/60 flex items-center justify-end">
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-colors active:scale-95"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            </div>
          )}

          {/* Tool call inspection tag */}
          {message.toolCall && (
            <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center gap-1.5 text-xs text-stone-500 font-mono">
              <Terminal className="w-3.5 h-3.5 text-stone-400" />
              <span>
                Function: <span className="text-indigo-600 font-semibold">{message.toolCall.name}</span>
                {Object.keys(message.toolCall.args || {}).length > 0 && (
                  <span className="text-stone-400 ml-1">
                    ({JSON.stringify(message.toolCall.args).slice(0, 80)})
                  </span>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Processed Files Output Cards */}
        {message.files && message.files.length > 0 && (
          <div className="w-full flex flex-col gap-2.5 mt-1">
            {message.files.map((file: ProcessedFileInfo) => (
              <div
                key={file.id}
                className="bg-white border border-stone-200 rounded-xl p-3.5 shadow-sm hover:shadow transition-shadow flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="p-2 rounded-lg bg-stone-100 border border-stone-200 shrink-0">
                      {getFileIcon(file.mimeType, file.processedName)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-stone-900 truncate" title={file.processedName}>
                        {file.processedName}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-stone-500 mt-0.5">
                        <span>{formatFileSize(file.size)}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[11px] font-medium border border-amber-200/50">
                          <Clock className="w-3 h-3" />
                          Auto-deletes in 1 hour
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Primary Download Button */}
                  <a
                    id={`download-file-${file.id}`}
                    href={file.downloadUrl}
                    download={file.processedName}
                    className="inline-flex items-center gap-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-sm transition-colors shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>
                </div>

                {/* Optional Image Thumbnail Preview */}
                {file.isImage && (
                  <div className="relative rounded-lg overflow-hidden border border-stone-100 bg-stone-50 flex items-center justify-center max-h-48">
                    <img
                      src={file.downloadUrl}
                      alt={file.processedName}
                      className="max-h-48 object-contain rounded-md"
                      loading="lazy"
                    />
                  </div>
                )}

                {/* Optional Preview Text / OCR summary */}
                {file.previewText && (
                  <div className="bg-stone-50 rounded-lg p-2.5 border border-stone-200/70 text-xs text-stone-700">
                    <div className="flex items-center justify-between mb-1 text-[11px] font-medium text-stone-500">
                      <span>Preview / Summary</span>
                      <button
                        onClick={() => handleCopy(file.previewText || '')}
                        className="flex items-center gap-1 hover:text-stone-900 transition-colors"
                        title="Copy preview text"
                      >
                        {copiedText ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-600">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="line-clamp-3 font-mono text-[11px] text-stone-600 break-words">
                      {file.previewText}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <span className="text-[10px] text-stone-400 px-1">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-stone-200 text-stone-700 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
          <User className="w-4 h-4" />
        </div>
      )}
    </div>
  );
};
