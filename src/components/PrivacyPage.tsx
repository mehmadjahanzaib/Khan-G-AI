import React from 'react';
import { ShieldCheck, Clock, FileLock, Trash2, ArrowRight, CheckCircle2 } from 'lucide-react';

interface PrivacyPageProps {
  onBackToChat: () => void;
  maxFileSizeMB?: number;
}

export const PrivacyPage: React.FC<PrivacyPageProps> = ({ onBackToChat, maxFileSizeMB = 100 }) => {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-stone-900 text-amber-300 flex items-center justify-center shadow-sm">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
            Privacy Policy & File Security
          </h1>
          <p className="text-xs sm:text-sm text-stone-500">
            Khan G Tools: Built with strict privacy-by-design standards.
          </p>
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm mb-8 space-y-6 text-stone-700 text-sm leading-relaxed">
        {/* Key Guarantee: 1-Hour Auto Deletion */}
        <div className="flex gap-3.5 p-4 rounded-xl bg-amber-50/70 border border-amber-200/80">
          <Clock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-amber-950 mb-1">
              Guaranteed 1-Hour Auto-Deletion
            </h3>
            <p className="text-xs text-amber-900 leading-relaxed">
              Every file you upload and every output generated is stored strictly on a temporary disk and is <strong>permanently deleted after 60 minutes</strong>. A background sweeper sweeps storage every 10 minutes to ensure no stale data remains.
            </p>
          </div>
        </div>

        {/* 1. File Safety & Execution Sandbox */}
        <div>
          <h2 className="text-base font-bold text-stone-900 mb-2 flex items-center gap-2">
            <FileLock className="w-4 h-4 text-stone-700" />
            <span>1. Zero Code Execution & Strict Whitelisting</span>
          </h2>
          <p className="text-xs text-stone-600 mb-2">
            Uploaded files are <strong>never executed</strong>. All input files are strictly verified against an allowed MIME whitelist (standard images, PDFs, CSV, Excel, Word documents, and zip archives). Executable binaries (.exe, .sh, .bat, .js) are unconditionally blocked.
          </p>
        </div>

        {/* 2. File Sanitization */}
        <div>
          <h2 className="text-base font-bold text-stone-900 mb-2 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-stone-700" />
            <span>2. Filename Sanitization</span>
          </h2>
          <p className="text-xs text-stone-600">
            All original filenames undergo strict sanitization prior to processing to prevent directory traversal or malicious character injection.
          </p>
        </div>

        {/* 3. Rate Limiting */}
        <div>
          <h2 className="text-base font-bold text-stone-900 mb-2 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-stone-700" />
            <span>3. Fair Use & Abuse Prevention</span>
          </h2>
          <p className="text-xs text-stone-600">
            To safeguard community servers and preserve free API quotas, requests are rate-limited to <strong>30 operations per IP per hour</strong>. Uploads are constrained to <strong>{maxFileSizeMB}MB per file</strong>.
          </p>
        </div>

        {/* 4. AI & Data Privacy */}
        <div>
          <h2 className="text-base font-bold text-stone-900 mb-2 flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-stone-700" />
            <span>4. No Data Monetization or Permanent Profiles</span>
          </h2>
          <p className="text-xs text-stone-600">
            Khan G Tools does not sell, track, or retain user behavioral dossiers. The AI models only receive metadata or text snippets necessary to infer your requested action; your raw file binaries are processed entirely locally by dedicated Node.js libraries.
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <button
          onClick={onBackToChat}
          className="inline-flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          <span>Return to Chat</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        <span className="text-xs text-stone-400">
          Last updated: September 2026
        </span>
      </div>
    </div>
  );
};
