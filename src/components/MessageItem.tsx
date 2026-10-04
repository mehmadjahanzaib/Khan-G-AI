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
  User, 
  AlertCircle,
  RotateCcw,
  Eye,
  Share2,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  CheckCheck
} from 'lucide-react';
import { ChatMessage, ProcessedFileInfo, WorkflowStepItem } from '../types.js';
import { PakistanEmblem } from './PakistanEmblem.js';
import { KhanGLogo, KhanGMark } from './BrandLogo.js';
import { ToolExecutionCard } from './ToolExecutionCard.js';

interface MessageItemProps {
  message: ChatMessage;
  onRetry?: () => void;
  onPreviewFile?: (file: ProcessedFileInfo) => void;
  onApproveWorkflow?: (steps: WorkflowStepItem[]) => void;
  onSelectPrompt?: (prompt: string) => void;
}

/**
 * Custom lightweight Markdown & Academic Response Formatter
 * Formats headings, exam tips callouts, code blocks, lists, and bold text cleanly without heavy runtime dependencies.
 */
const FormattedContent: React.FC<{ content: string; isUser: boolean }> = ({ content, isUser }) => {
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<number | null>(null);

  if (isUser) {
    return <div className="whitespace-pre-wrap break-words">{content}</div>;
  }

  const handleCopyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeIdx(idx);
    setTimeout(() => setCopiedCodeIdx(null), 2000);
  };

  // Split by code blocks first
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2.5 text-[14px] leading-relaxed font-sans">
      {parts.map((part, pIdx) => {
        // If code block
        if (part.startsWith('```') && part.endsWith('```')) {
          const lines = part.slice(3, -3).trim().split('\n');
          const firstLine = lines[0]?.trim() || '';
          const isNamedLang = /^[a-zA-Z0-9_\-#+]+$/.test(firstLine);
          const lang = isNamedLang ? firstLine : '';
          const codeBody = isNamedLang ? lines.slice(1).join('\n') : lines.join('\n');

          return (
            <div key={pIdx} className="rounded-xl overflow-hidden my-3 border border-stone-800 bg-[#0c1017] text-stone-200 text-xs shadow-md">
              <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#161b22] border-b border-stone-800 text-[11px] font-mono text-stone-400">
                <span className="font-semibold uppercase tracking-wider text-emerald-400">{lang || 'Code'}</span>
                <button
                  onClick={() => handleCopyCode(codeBody, pIdx)}
                  className="flex items-center gap-1 hover:text-white transition-colors active:scale-95"
                >
                  {copiedCodeIdx === pIdx ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3.5 overflow-x-auto font-mono text-[12px] leading-5 text-emerald-300">
                <code>{codeBody}</code>
              </pre>
            </div>
          );
        }

        // Process standard markdown blocks (tables, headings, callouts, lists, paragraphs)
        const rawLines = part.split('\n');
        const elements: React.ReactNode[] = [];
        let i = 0;

        while (i < rawLines.length) {
          const line = rawLines[i];
          const trimmed = line.trim();

          // Check if this is the start of a Markdown Table (| col1 | col2 |)
          if (trimmed.startsWith('|') && trimmed.endsWith('|') && i + 1 < rawLines.length && rawLines[i + 1].includes('---')) {
            const tableLines: string[] = [];
            while (i < rawLines.length && rawLines[i].trim().startsWith('|') && rawLines[i].trim().endsWith('|')) {
              tableLines.push(rawLines[i].trim());
              i++;
            }

            if (tableLines.length >= 2) {
              const headerCells = tableLines[0].split('|').slice(1, -1).map(c => c.trim());
              const bodyRows = tableLines.slice(2).map(r => r.split('|').slice(1, -1).map(c => c.trim()));

              elements.push(
                <div key={`tbl-${i}`} className="overflow-x-auto my-3 rounded-xl border border-stone-200 dark:border-stone-800 shadow-2xs">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-semibold border-b border-stone-200 dark:border-stone-700">
                      <tr>
                        {headerCells.map((h, hIdx) => (
                          <th key={hIdx} className="px-3 py-2 border-r border-stone-200 dark:border-stone-700 last:border-r-0" dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(h) }} />
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                      {bodyRows.map((row, rIdx) => (
                        <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white dark:bg-stone-900' : 'bg-stone-50/70 dark:bg-stone-950/40'}>
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="px-3 py-2 border-r border-stone-200 dark:border-stone-800 last:border-r-0" dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(cell) }} />
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
              continue;
            }
          }

          if (!trimmed) {
            elements.push(<div key={`blank-${i}`} className="h-1" />);
            i++;
            continue;
          }

          // Headings: ###
          if (trimmed.startsWith('### ')) {
            elements.push(
              <h3 key={`h3-${i}`} className="font-bold text-[15px] text-emerald-800 dark:text-emerald-400 mt-2.5 mb-1 pb-1 border-b border-emerald-100 dark:border-stone-800">
                {trimmed.replace(/^###\s+/, '')}
              </h3>
            );
            i++;
            continue;
          }

          // Headings: ##
          if (trimmed.startsWith('## ')) {
            elements.push(
              <h2 key={`h2-${i}`} className="font-bold text-[16px] text-stone-900 dark:text-white mt-3 mb-1">
                {trimmed.replace(/^##\s+/, '')}
              </h2>
            );
            i++;
            continue;
          }

          // Callout blocks (> 💡 Exam Tip: or > ⚠️ Common Mistake:)
          if (trimmed.startsWith('>')) {
            const calloutText = trimmed.replace(/^>\s*/, '');
            const isTip = calloutText.includes('💡') || calloutText.toLowerCase().includes('tip');
            const isWarn = calloutText.includes('⚠️') || calloutText.toLowerCase().includes('mistake') || calloutText.toLowerCase().includes('pitfall');

            elements.push(
              <div
                key={`callout-${i}`}
                className={`my-2 p-2.5 rounded-lg border text-xs font-medium leading-relaxed ${
                  isTip
                    ? 'bg-emerald-50/80 border-emerald-200/80 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800/60 dark:text-emerald-200'
                    : isWarn
                    ? 'bg-amber-50/80 border-amber-200/80 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800/60 dark:text-amber-200'
                    : 'bg-stone-50 border-stone-200 text-stone-800 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-200'
                }`}
              >
                <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(calloutText) }} />
              </div>
            );
            i++;
            continue;
          }

          // Bullet points
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            elements.push(
              <div key={`bullet-${i}`} className="flex items-start gap-2 pl-2 text-stone-800 dark:text-stone-200">
                <span className="text-emerald-600 dark:text-emerald-400 mt-1 shrink-0">•</span>
                <span className="leading-snug" dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(trimmed.replace(/^[-*]\s+/, '')) }} />
              </div>
            );
            i++;
            continue;
          }

          // Numbered lists (1. , 2. )
          const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
          if (numMatch) {
            elements.push(
              <div key={`num-${i}`} className="flex items-start gap-2 pl-2 text-stone-800 dark:text-stone-200">
                <span className="font-bold text-xs text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5">{numMatch[1]}.</span>
                <span className="leading-snug" dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(numMatch[2]) }} />
              </div>
            );
            i++;
            continue;
          }

          // Normal text line
          elements.push(
            <p key={`p-${i}`} className="text-stone-800 dark:text-stone-200 break-words leading-relaxed" dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(trimmed) }} />
          );
          i++;
        }

        return (
          <div key={pIdx} className="space-y-1.5">
            {elements}
          </div>
        );
      })}
    </div>
  );
};

// Helper for inline markdown: bold, italic, inline code
function formatInlineMarkdown(text: string): string {
  return text
    // Inline code `code`
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-emerald-700 dark:text-emerald-400 font-mono text-[12px] border border-stone-200 dark:border-stone-700">$1</code>')
    // Bold **text**
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-stone-900 dark:text-white">$1</strong>')
    // Italic *text*
    .replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>');
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  onRetry,
  onPreviewFile,
  onApproveWorkflow,
  onSelectPrompt,
}) => {
  const isUser = message.sender === 'user';
  const isError = message.id.startsWith('error-');
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [reaction, setReaction] = useState<'like' | 'dislike' | null>(null);

  const formatMessageTime = (ts?: number) => {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

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

  const handleCopyLink = (file: ProcessedFileInfo) => {
    const fullUrl = window.location.origin + file.downloadUrl;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(file.id);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleWhatsAppShare = (file: ProcessedFileInfo) => {
    const fullUrl = window.location.origin + file.downloadUrl;
    const shareText = `Check out this file processed by Khan G AI: ${file.processedName}\nDownload link: ${fullUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div className={`flex gap-3 my-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* Bot Avatar with Official Khan G AI Mark (Circular badge matching mockup) */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-[#071F17] border border-emerald-500/40 flex items-center justify-center shrink-0 shadow-xs mt-0.5 overflow-hidden">
          <KhanGMark size={22} isSquircle={false} />
        </div>
      )}

      {/* Message Content Container */}
      <div className={`max-w-[88%] sm:max-w-[80%] flex flex-col gap-1.5 ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Uploaded files attached to user message */}
        {isUser && message.uploadedFiles && message.uploadedFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 justify-end mb-1">
            {message.uploadedFiles.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 bg-[#DCEBE5] dark:bg-stone-800 border border-emerald-300 dark:border-stone-700 text-stone-800 dark:text-stone-200 text-xs px-2.5 py-1.5 rounded-lg"
              >
                {getFileIcon(file.type, file.name)}
                <span className="font-medium truncate max-w-[160px]">{file.name}</span>
                <span className="text-[10px] text-stone-500 dark:text-stone-400">({formatFileSize(file.size)})</span>
              </div>
            ))}
          </div>
        )}

        {/* Text bubble */}
        <div
          className={`px-4 py-3 rounded-2xl shadow-xs transition-colors ${
            isUser
              ? 'bg-[#E8F7F0] text-[#0A241C] border border-[#C7EADB] dark:bg-[#0D2E24] dark:border-emerald-800/60 dark:text-emerald-50 rounded-tr-xs font-normal'
              : isError
              ? 'bg-rose-50 text-rose-900 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-200 rounded-bl-xs'
              : message.isClarification
              ? 'bg-amber-50 text-amber-950 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-200 rounded-bl-xs'
              : 'bg-white text-stone-900 border border-[#DCEBE5] dark:bg-stone-900 dark:border-stone-800 dark:text-stone-100 rounded-bl-xs shadow-xs'
          }`}
        >
          {isError && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-400 mb-1.5">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span>Request Error</span>
            </div>
          )}

          {message.text && (
            <FormattedContent content={message.text} isUser={isUser} />
          )}

          {/* User message timestamp & double check mark */}
          {isUser && (
            <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-emerald-800/70 dark:text-emerald-300/70 select-none">
              <span>{formatMessageTime(message.timestamp) || 'Just now'}</span>
              <CheckCheck className="w-3.5 h-3.5 text-[#00A86B]" />
            </div>
          )}

          {/* Retry Button if error */}
          {isError && onRetry && (
            <div className="mt-2.5 pt-2 border-t border-rose-200/60 dark:border-rose-900 flex items-center justify-end">
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-colors active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          )}

          {/* Workflow Plan approval card */}
          {message.workflowPlan && !isUser && (
            <ToolExecutionCard
              workflowPlan={message.workflowPlan}
              onApproveWorkflow={onApproveWorkflow}
            />
          )}

          {/* Chained Workflow Execution card */}
          {message.workflowExecution && !isUser && (
            <ToolExecutionCard
              workflowSteps={message.workflowExecution.steps}
              files={message.files}
              onPreviewFile={onPreviewFile}
              onSelectPrompt={onSelectPrompt}
            />
          )}

          {/* Single Tool execution card */}
          {message.toolCall && !message.workflowExecution && !isUser && (
            <ToolExecutionCard
              toolId={message.toolCall.name}
              toolName={message.toolCall.name}
              status="done"
              files={message.files}
              onPreviewFile={onPreviewFile}
              onSelectPrompt={onSelectPrompt}
              nextStepSuggestions={message.nextStepSuggestions}
            />
          )}
        </div>

        {/* Assistant Message Quick Action Toolbar matching Mockup */}
        {!isUser && !isError && message.text && (
          <div className="flex items-center gap-2 px-1 text-[11px] text-stone-400 dark:text-stone-500 select-none">
            {/* Copy Button */}
            <button
              onClick={() => handleCopyText(message.text)}
              className="inline-flex items-center gap-1 hover:text-stone-700 dark:hover:text-stone-300 transition-colors"
              title="Copy answer"
            >
              {copiedText ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#00A86B]" />
                  <span className="text-[#00A86B] font-medium">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>

            {/* Regenerate Button */}
            {onRetry && (
              <>
                <span>•</span>
                <button
                  onClick={onRetry}
                  className="inline-flex items-center gap-1 hover:text-stone-700 dark:hover:text-stone-300 transition-colors"
                  title="Regenerate response"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Regenerate</span>
                </button>
              </>
            )}

            {/* Thumbs Up Button */}
            <span>•</span>
            <button
              onClick={() => setReaction((prev) => (prev === 'like' ? null : 'like'))}
              className={`inline-flex items-center gap-1 transition-colors ${
                reaction === 'like' ? 'text-[#00A86B] font-semibold' : 'hover:text-stone-700 dark:hover:text-stone-300'
              }`}
              title="Helpful response"
            >
              <ThumbsUp className={`w-3.5 h-3.5 ${reaction === 'like' ? 'fill-current' : ''}`} />
            </button>

            {/* Thumbs Down Button */}
            <button
              onClick={() => setReaction((prev) => (prev === 'dislike' ? null : 'dislike'))}
              className={`inline-flex items-center gap-1 transition-colors ${
                reaction === 'dislike' ? 'text-rose-500 font-semibold' : 'hover:text-stone-700 dark:hover:text-stone-300'
              }`}
              title="Not helpful"
            >
              <ThumbsDown className={`w-3.5 h-3.5 ${reaction === 'dislike' ? 'fill-current' : ''}`} />
            </button>

            {/* WhatsApp Share */}
            <span>•</span>
            <button
              onClick={() => {
                const text = `Khan G AI says:\n\n${message.text.slice(0, 500)}...`;
                window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
              }}
              className="inline-flex items-center gap-1 hover:text-[#00A86B] transition-colors"
              title="Share via WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>

            {/* Timestamp */}
            {message.timestamp && (
              <>
                <span>•</span>
                <span className="font-mono text-[10px] text-stone-400">
                  {formatMessageTime(message.timestamp)}
                </span>
              </>
            )}
          </div>
        )}

        {/* Processed Files Output Cards */}
        {message.files && message.files.length > 0 && (
          <div className="w-full flex flex-col gap-2.5 mt-1">
            {message.files.map((file: ProcessedFileInfo) => (
              <div
                key={file.id}
                className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-3.5 shadow-xs hover:shadow transition-shadow flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="p-2 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shrink-0">
                      {getFileIcon(file.mimeType, file.processedName)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100 truncate" title={file.processedName}>
                        {file.processedName}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400 mt-0.5 flex-wrap">
                        {file.originalSize && file.originalSize !== file.size ? (
                          <span className="text-stone-600 dark:text-stone-300 font-medium">
                            <span className="line-through text-stone-400 mr-1">{formatFileSize(file.originalSize)}</span>
                            <span>{formatFileSize(file.size)}</span>
                          </span>
                        ) : (
                          <span>{formatFileSize(file.size)}</span>
                        )}
                        {file.savingsPercent !== undefined && file.savingsPercent > 0 && (
                          <span className="text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 px-1.5 py-0.5 rounded text-[11px] font-semibold border border-emerald-200/60 dark:border-emerald-800">
                            Saved {file.savingsPercent}%
                          </span>
                        )}
                        {file.operation && (
                          <span className="text-indigo-700 bg-indigo-50 dark:bg-indigo-950/60 dark:text-indigo-300 px-1.5 py-0.5 rounded text-[11px] font-medium border border-indigo-200/50 dark:border-indigo-800">
                            {file.operation}
                          </span>
                        )}
                        <span>•</span>
                        <span className="flex items-center gap-1 text-amber-700 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300 px-1.5 py-0.5 rounded text-[11px] font-medium border border-amber-200/50 dark:border-amber-800">
                          <Clock className="w-3 h-3" />
                          Auto-deletes in 60 min
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Preview & Download */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {onPreviewFile && (
                      <button
                        onClick={() => onPreviewFile(file)}
                        className="inline-flex items-center gap-1 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold px-2.5 py-2 rounded-lg border border-stone-200 dark:border-stone-700 transition-colors shadow-2xs"
                        title="In-Browser Quick View Preview"
                      >
                        <Eye className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span className="hidden sm:inline">Preview</span>
                      </button>
                    )}

                    <a
                      id={`download-file-${file.id}`}
                      href={file.downloadUrl}
                      download={file.processedName}
                      className="inline-flex items-center gap-1.5 bg-[#01411C] hover:bg-[#025625] text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-2xs transition-colors shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>
                  </div>
                </div>

                {/* Optional Image Thumbnail Preview */}
                {file.isImage && (
                  <div 
                    onClick={() => onPreviewFile && onPreviewFile(file)}
                    className="relative rounded-lg overflow-hidden border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 flex items-center justify-center max-h-52 cursor-pointer group"
                    title="Click to preview in high resolution"
                  >
                    <img
                      src={file.downloadUrl}
                      alt={file.processedName}
                      className="max-h-52 object-contain rounded-md group-hover:scale-[1.02] transition-transform duration-200"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/75 text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1 font-medium shadow-md">
                        <Eye className="w-3 h-3" /> Quick View
                      </span>
                    </div>
                  </div>
                )}

                {/* Optional Preview Text / OCR summary */}
                {file.previewText && (
                  <div className="bg-stone-50 dark:bg-stone-800/80 rounded-lg p-2.5 border border-stone-200/70 dark:border-stone-700 text-xs text-stone-700 dark:text-stone-300">
                    <div className="flex items-center justify-between mb-1 text-[11px] font-medium text-stone-500 dark:text-stone-400">
                      <span>Preview / Summary</span>
                      <button
                        onClick={() => handleCopyText(file.previewText || '')}
                        className="flex items-center gap-1 hover:text-stone-900 dark:hover:text-white transition-colors"
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
                    <p className="line-clamp-3 font-mono text-[11px] text-stone-600 dark:text-stone-300 break-words">
                      {file.previewText}
                    </p>
                  </div>
                )}

                {/* Share bar: WhatsApp & Copy Link */}
                <div className="flex items-center justify-between pt-1.5 border-t border-stone-100 dark:border-stone-800 text-[11px] text-stone-500">
                  <span className="text-[10px] text-stone-400">Share with classmates:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleWhatsAppShare(file)}
                      className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-medium hover:underline"
                    >
                      <Share2 className="w-3 h-3" />
                      <span>WhatsApp</span>
                    </button>
                    <span>•</span>
                    <button
                      onClick={() => handleCopyLink(file)}
                      className="inline-flex items-center gap-1 text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-white font-medium"
                    >
                      {copiedLink === file.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600">Link Copied!</span>
                        </>
                      ) : (
                        <>
                          <ExternalLink className="w-3 h-3" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <span className="text-[10px] text-stone-400 dark:text-stone-500 px-1">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-200 flex items-center justify-center shrink-0 shadow-xs mt-0.5">
          <User className="w-4 h-4" />
        </div>
      )}
    </div>
  );
};

