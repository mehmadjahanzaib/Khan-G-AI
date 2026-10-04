import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  Share2, 
  Copy, 
  Check, 
  FileText, 
  Image as ImageIcon, 
  Music, 
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCw
} from 'lucide-react';
import { ProcessedFileInfo } from '../types.js';

interface FilePreviewModalProps {
  file: ProcessedFileInfo | null;
  isOpen: boolean;
  onClose: () => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ file, isOpen, onClose }) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    // Reset zoom & rotation when file changes
    setZoomLevel(1);
    setRotation(0);
  }, [file]);

  if (!isOpen || !file) return null;

  const handleCopyLink = () => {
    const fullUrl = `${window.location.origin}${file.downloadUrl}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const fullUrl = `${window.location.origin}${file.downloadUrl}`;
    const text = encodeURIComponent(
      `Check out this file processed with Khan G AI:\n📄 ${file.processedName}\n🔗 Download: ${fullUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const isImg = file.isImage || file.mimeType.startsWith('image/') || /\.(jpe?g|png|webp|gif|svg|bmp)$/i.test(file.processedName);
  const isAudio = file.mimeType.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac)$/i.test(file.processedName);
  const isPdf = file.mimeType === 'application/pdf' || /\.pdf$/i.test(file.processedName);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-[#121f18] text-stone-900 dark:text-stone-100 rounded-3xl max-w-4xl w-full border border-stone-200 dark:border-emerald-800/40 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-stone-200 dark:border-emerald-800/40 bg-stone-50 dark:bg-[#0e1913]">
          <div className="flex items-center gap-2 min-w-0 pr-3">
            <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 shrink-0">
              {isImg ? <ImageIcon className="w-4 h-4" /> : isAudio ? <Music className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold truncate" title={file.processedName}>
                {file.processedName}
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                {(file.size / 1024).toFixed(1)} KB • {file.mimeType || 'Processed file'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* WhatsApp Share */}
            <button
              onClick={handleWhatsAppShare}
              className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-stone-700 dark:text-stone-200 hover:text-emerald-700 transition-colors"
              title="Share to WhatsApp"
            >
              <Share2 className="w-4 h-4" />
            </button>

            {/* Copy Link */}
            <button
              onClick={handleCopyLink}
              className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-stone-700 dark:text-stone-200 hover:text-emerald-700 transition-colors"
              title="Copy download link"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>

            {/* Download */}
            <a
              href={file.downloadUrl}
              download={file.processedName}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#01411C] hover:bg-[#025625] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </a>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-500 hover:text-stone-900 dark:hover:text-white transition-colors"
              title="Close preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Preview Viewer Canvas */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 flex flex-col items-center justify-center bg-stone-100/50 dark:bg-[#0a140f] min-h-[320px]">
          {/* IMAGE PREVIEW */}
          {isImg && (
            <div className="flex flex-col items-center gap-3 w-full">
              <div className="relative max-h-[60vh] max-w-full overflow-hidden flex items-center justify-center rounded-2xl shadow-xs bg-stone-900/5 p-2">
                <img
                  src={file.downloadUrl}
                  alt={file.processedName}
                  style={{
                    transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                    transition: 'transform 0.2s ease',
                  }}
                  className="max-h-[55vh] max-w-full object-contain rounded-xl select-none"
                />
              </div>

              {/* Image Controls (Zoom, Rotate) */}
              <div className="flex items-center gap-2 bg-white dark:bg-stone-800 px-3 py-1.5 rounded-full border border-stone-200 dark:border-stone-700 shadow-sm text-xs">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                  className="p-1 hover:text-emerald-600 transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="font-mono text-[11px] px-1">{Math.round(zoomLevel * 100)}%</span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                  className="p-1 hover:text-emerald-600 transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <div className="w-px h-3.5 bg-stone-300 dark:bg-stone-600 mx-1" />
                <button
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="p-1 hover:text-emerald-600 transition-colors flex items-center gap-1"
                  title="Rotate 90°"
                >
                  <RotateCw className="w-4 h-4" />
                  <span className="text-[10px]">Rotate</span>
                </button>
              </div>
            </div>
          )}

          {/* AUDIO PREVIEW */}
          {isAudio && (
            <div className="w-full max-w-md bg-white dark:bg-stone-800 p-6 rounded-3xl border border-stone-200 dark:border-stone-700 shadow-md text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center mx-auto mb-4">
                <Music className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-base mb-1 truncate">{file.processedName}</h4>
              <p className="text-xs text-stone-500 mb-5">Audio Preview Player</p>

              <audio controls src={file.downloadUrl} className="w-full rounded-xl">
                Your browser does not support audio playback.
              </audio>
            </div>
          )}

          {/* PDF & DOCUMENT PREVIEW */}
          {!isImg && !isAudio && (
            <div className="w-full max-w-2xl bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 shadow-sm p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-stone-100 dark:border-stone-700">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">{file.processedName}</h4>
                  <span className="text-xs text-stone-500">Document preview &amp; text summary</span>
                </div>
              </div>

              {file.previewText ? (
                <div className="bg-stone-50 dark:bg-stone-900/50 p-4 rounded-xl font-mono text-xs text-stone-800 dark:text-stone-200 max-h-72 overflow-y-auto leading-relaxed whitespace-pre-wrap border border-stone-200/80 dark:border-stone-700/80">
                  {file.previewText}
                </div>
              ) : (
                <div className="text-center py-8 text-stone-500 dark:text-stone-400 text-xs">
                  <p className="mb-3">This file format is ready for local reading and viewing.</p>
                  <a
                    href={file.downloadUrl}
                    download={file.processedName}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#01411C] hover:bg-[#025625] text-white rounded-xl text-xs font-semibold shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download {file.processedName}</span>
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-2.5 bg-stone-50 dark:bg-[#0e1913] border-t border-stone-200 dark:border-emerald-800/40 text-[11px] text-stone-500 dark:text-stone-400 flex items-center justify-between">
          <span>Processed by Khan G AI • Auto-expires in 60 mins</span>
          <span className="text-emerald-700 dark:text-emerald-400 font-medium">Safe &amp; Private</span>
        </div>
      </div>
    </div>
  );
};
