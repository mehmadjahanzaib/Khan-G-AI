import React, { useState } from 'react';
import { 
  X, 
  Share2, 
  Cloud, 
  Download, 
  FileText, 
  Code, 
  Printer, 
  Check, 
  Copy, 
  ExternalLink, 
  Loader2, 
  Sparkles,
  Lock
} from 'lucide-react';
import { ChatMessage } from '../types.js';
import { useAuth } from '../context/AuthContext.js';
import { usePro } from '../context/ProContext.js';
import { shareChatToCloud } from '../lib/firebase.js';
import { PakistanEmblem } from './PakistanEmblem.js';

interface CloudExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  conversationTitle?: string;
  onOpenAuth?: () => void;
  onOpenPro?: () => void;
}

export const CloudExportModal: React.FC<CloudExportModalProps> = ({
  isOpen,
  onClose,
  messages,
  conversationTitle = 'Khan G AI Study Session',
  onOpenAuth,
  onOpenPro,
}) => {
  const { user } = useAuth();
  const { isPro } = usePro();
  const [isExportingCloud, setIsExportingCloud] = useState(false);
  const [sharedUrl, setSharedUrl] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  // Generate Markdown string
  const generateMarkdown = () => {
    let md = `# ${conversationTitle}\n\n`;
    md += `*Exported from Khan G AI on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}*\n`;
    md += `*Developer: Muhammad Jahanzaib (MJ) • Pakistan 🇵🇰*\n\n---\n\n`;

    messages.forEach((m, idx) => {
      const senderName = m.sender === 'user' ? '👤 Student / User' : '🤖 Khan G AI';
      const time = new Date(m.timestamp).toLocaleTimeString();
      md += `### ${senderName} (${time})\n\n`;
      md += `${m.text}\n\n`;

      if (m.files && m.files.length > 0) {
        md += `**Processed Files:**\n`;
        m.files.forEach((f) => {
          md += `- [${f.processedName}](${f.downloadUrl}) (${(f.size / 1024).toFixed(1)} KB)\n`;
        });
        md += `\n`;
      }
      md += `---\n\n`;
    });

    return md;
  };

  // Download Markdown file
  const handleDownloadMarkdown = () => {
    const md = generateMarkdown();
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${conversationTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}_notes.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadSuccess('md');
    setTimeout(() => setDownloadSuccess(null), 2500);
  };

  // Download JSON backup
  const handleDownloadJSON = () => {
    const data = {
      title: conversationTitle,
      exportedAt: new Date().toISOString(),
      developer: 'Muhammad Jahanzaib (MJ)',
      app: 'Khan G AI',
      messageCount: messages.length,
      messages,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${conversationTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}_backup.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadSuccess('json');
    setTimeout(() => setDownloadSuccess(null), 2500);
  };

  // Print or Save as PDF
  const handlePrintSheet = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${conversationTitle} - Khan G AI Study Notes</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1c1917; padding: 40px; max-width: 800px; margin: 0 auto; }
          h1 { color: #01411C; border-bottom: 2px solid #01411C; padding-bottom: 8px; margin-bottom: 4px; }
          .meta { font-size: 12px; color: #78716c; margin-bottom: 24px; }
          .msg { margin-bottom: 24px; padding: 16px; border-radius: 8px; border: 1px solid #e7e5e4; }
          .user { background: #f5f5f4; border-color: #d6d3d1; }
          .bot { background: #f0fdf4; border-color: #bbf7d0; }
          .author { font-weight: bold; font-size: 13px; color: #01411C; margin-bottom: 8px; display: flex; justify-content: space-between; }
          .time { font-size: 11px; color: #a8a29e; font-weight: normal; }
          pre { background: #1c1917; color: #f5f5f4; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 12px; }
          code { font-family: monospace; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; background: #01411C; color: white; font-size: 11px; margin-bottom: 12px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="badge">Khan G AI • Study &amp; Exam Notes</div>
        <h1>${conversationTitle}</h1>
        <div class="meta">Exported on ${new Date().toLocaleString()} • Muhammad Jahanzaib (MJ) • Pakistan 🇵🇰</div>
        ${messages
          .map(
            (m) => `
          <div class="msg ${m.sender === 'user' ? 'user' : 'bot'}">
            <div class="author">
              <span>${m.sender === 'user' ? 'Student' : 'Khan G AI Exam Assistant'}</span>
              <span class="time">${new Date(m.timestamp).toLocaleTimeString()}</span>
            </div>
            <div>${m.text.replace(/\n/g, '<br/>')}</div>
          </div>
        `
          )
          .join('')}
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  // Upload to Cloud & Generate Share Link
  const handleCloudUpload = async () => {
    if (!user) {
      if (onOpenAuth) onOpenAuth();
      return;
    }

    setIsExportingCloud(true);
    try {
      const res = await shareChatToCloud(user.uid, conversationTitle, messages);
      if (res) {
        setSharedUrl(res.url);
      }
    } catch (err) {
      console.error('Failed to create cloud share:', err);
    } finally {
      setIsExportingCloud(false);
    }
  };

  const handleCopyLink = () => {
    if (!sharedUrl) return;
    navigator.clipboard.writeText(sharedUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleWhatsAppShare = () => {
    if (!sharedUrl) return;
    const text = `Khan G AI Study Notes: "${conversationTitle}"\nAccess notes online: ${sharedUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50/50 dark:bg-stone-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#01411C] text-white flex items-center justify-center shadow-xs">
              <PakistanEmblem size={20} variant="ai-emblem" />
            </div>
            <div>
              <h3 className="font-bold text-base text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <span>Cloud Export &amp; Sharing</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                  {messages.length} messages
                </span>
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Save study notes to cloud, generate links, or download documents
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Cloud Link Generation Section */}
          <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/60">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                  Publish to Cloud &amp; Share Link
                </h4>
              </div>
              <span className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-400">
                Firestore Cloud Storage
              </span>
            </div>

            <p className="text-xs text-emerald-950/80 dark:text-emerald-200/80 mb-3 leading-relaxed">
              Create a permanent web link for classmates or study groups. Anyone with the link can view your questions, answers, and study notes.
            </p>

            {sharedUrl ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 bg-white dark:bg-stone-900 rounded-lg border border-emerald-300 dark:border-emerald-700 text-xs">
                  <span className="truncate text-stone-700 dark:text-stone-300 font-mono text-[11px] flex-1">
                    {sharedUrl}
                  </span>
                  <button
                    onClick={handleCopyLink}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition-colors shrink-0"
                  >
                    {copiedLink ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleWhatsAppShare}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share on WhatsApp</span>
                  </button>
                  <a
                    href={sharedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400 hover:underline font-medium px-2 py-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Open Link</span>
                  </a>
                </div>
              </div>
            ) : (
              <button
                onClick={handleCloudUpload}
                disabled={isExportingCloud || messages.length === 0}
                className="w-full py-2.5 px-4 rounded-xl bg-[#01411C] hover:bg-[#025625] text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50"
              >
                {isExportingCloud ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving session to cloud...</span>
                  </>
                ) : (
                  <>
                    <Cloud className="w-4 h-4" />
                    <span>{user ? 'Generate Cloud Share Link' : 'Sign In to Save to Cloud'}</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Offline / Document Export Formats */}
          <div>
            <h4 className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-2.5 px-0.5">
              Download Offline Formats
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Markdown Notes */}
              <button
                onClick={handleDownloadMarkdown}
                disabled={messages.length === 0}
                className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-300 text-left transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 w-fit mb-2">
                    <FileText className="w-4 h-4" />
                  </div>
                  <h5 className="text-xs font-bold text-stone-900 dark:text-stone-100 mb-0.5">
                    Markdown (.md)
                  </h5>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    For Notion, Obsidian &amp; text study apps
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                  {downloadSuccess === 'md' ? <Check className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                  <span>{downloadSuccess === 'md' ? 'Saved!' : 'Download'}</span>
                </div>
              </button>

              {/* JSON Backup */}
              <button
                onClick={handleDownloadJSON}
                disabled={messages.length === 0}
                className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-300 text-left transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 w-fit mb-2">
                    <Code className="w-4 h-4" />
                  </div>
                  <h5 className="text-xs font-bold text-stone-900 dark:text-stone-100 mb-0.5">
                    JSON Backup
                  </h5>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    Complete chat structure with file metadata
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-blue-700 dark:text-blue-400">
                  {downloadSuccess === 'json' ? <Check className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                  <span>{downloadSuccess === 'json' ? 'Saved!' : 'Download'}</span>
                </div>
              </button>

              {/* Print / Save as PDF */}
              <button
                onClick={handlePrintSheet}
                disabled={messages.length === 0}
                className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-300 text-left transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 w-fit mb-2">
                    <Printer className="w-4 h-4" />
                  </div>
                  <h5 className="text-xs font-bold text-stone-900 dark:text-stone-100 mb-0.5">
                    Print / PDF
                  </h5>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    Formatted study sheet ready to print or save
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                  <Printer className="w-3.5 h-3.5" />
                  <span>Open Sheet</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-stone-900 text-xs text-stone-500">
          <span>Khan G AI by Muhammad Jahanzaib (MJ)</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 hover:bg-stone-200 dark:hover:bg-stone-800 font-semibold text-stone-700 dark:text-stone-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
