import React from 'react';
import { 
  Sparkles, 
  Cpu, 
  Layers, 
  CheckCircle, 
  ArrowRight, 
  Key, 
  Zap, 
  ShieldCheck, 
  Code2, 
  Image as ImageIcon, 
  FileText, 
  FileSpreadsheet, 
  FileArchive, 
  FileType,
  Mail,
  MapPin,
  Heart
} from 'lucide-react';
import { PakistanEmblem } from './PakistanEmblem.js';
import { KhanGLogo, KhanGMark } from './BrandLogo.js';

interface AboutPageProps {
  onBackToChat: () => void;
  onOpenDeveloperModal?: () => void;
  maxFileSizeMB?: number;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onBackToChat, onOpenDeveloperModal }) => {
  const tools = [

    {
      icon: <ImageIcon className="w-5 h-5 text-indigo-600" />,
      title: 'Image Resize & Scaling',
      lib: 'sharp',
      desc: 'High-performance pixel-perfect resizing, custom width/height or percentages, with aspect-ratio preservation.',
      example: '"Resize this logo to 800x600" or "Make this image 50%"'
    },
    {
      icon: <ImageIcon className="w-5 h-5 text-indigo-600" />,
      title: 'Image Compression',
      lib: 'sharp',
      desc: 'Lossy and lossless smart image compression to shrink file sizes by up to 80% without visible degradation.',
      example: '"Compress this picture to quality 75%"'
    },
    {
      icon: <FileType className="w-5 h-5 text-indigo-600" />,
      title: 'Image Format Converter',
      lib: 'sharp',
      desc: 'Instant conversion between modern formats including JPG, PNG, WEBP, and AVIF.',
      example: '"Convert this image to WebP"'
    },
    {
      icon: <FileText className="w-5 h-5 text-rose-600" />,
      title: 'Images to PDF',
      lib: 'pdf-lib',
      desc: 'Converts single or multiple image files into clean, vector-compliant PDF documents.',
      example: '"Convert these 3 screenshots into a single PDF"'
    },
    {
      icon: <FileText className="w-5 h-5 text-rose-600" />,
      title: 'PDF Merger',
      lib: 'pdf-lib',
      desc: 'Combines multiple separate PDF documents into one continuous publication.',
      example: '"Merge these 2 invoices into one PDF"'
    },
    {
      icon: <FileText className="w-5 h-5 text-rose-600" />,
      title: 'PDF Page Splitter',
      lib: 'pdf-lib',
      desc: 'Extract specific pages or page ranges from any multi-page PDF.',
      example: '"Split this PDF and extract pages 1 to 3"'
    },
    {
      icon: <FileText className="w-5 h-5 text-blue-600" />,
      title: 'PDF to Word (.docx)',
      lib: 'pdf-parse + docx',
      desc: 'Extracts paragraphs and structure from PDF into an editable Microsoft Word document.',
      example: '"Convert this PDF contract to an editable Word docx"'
    },
    {
      icon: <FileText className="w-5 h-5 text-rose-600" />,
      title: 'Word / Text to PDF',
      lib: 'docx + pdf-lib',
      desc: 'Translates Word documents or plain text into a styled, printable PDF.',
      example: '"Turn this document into a PDF"'
    },
    {
      icon: <FileSpreadsheet className="w-5 h-5 text-emerald-600" />,
      title: 'Text / Table to Excel',
      lib: 'exceljs',
      desc: 'Converts unstructured pasted text or tabular data into formatted spreadsheets.',
      example: '"Create an Excel sheet from this table data"'
    },
    {
      icon: <FileSpreadsheet className="w-5 h-5 text-emerald-600" />,
      title: 'CSV ↔ Excel Converter',
      lib: 'exceljs',
      desc: 'Bi-directional conversions with automatic column width fitting and styled dark headers.',
      example: '"Convert sales.csv to Excel" or "Export sheet to CSV"'
    },
    {
      icon: <Code2 className="w-5 h-5 text-purple-600" />,
      title: 'Document OCR & Text Extraction',
      lib: 'pdf-parse + sharp',
      desc: 'Reads text streams and optical metadata from documents and images.',
      example: '"Extract all text from this scanned document"'
    },
    {
      icon: <FileArchive className="w-5 h-5 text-amber-600" />,
      title: 'Zip & Archive Engine',
      lib: 'adm-zip',
      desc: 'Packages multiple files into compressed archives or unpacks uploaded .zip bundles.',
      example: '"Zip these 4 files" or "Unpack this archive"'
    },
    {
      icon: <Sparkles className="w-5 h-5 text-amber-600" />,
      title: 'Document Summarization',
      lib: 'pdf-parse + text-engine',
      desc: 'Condenses lengthy PDFs, Word documents, or text files into executive takeaways, bulleted insights, and action items.',
      example: '"Is PDF ko summarize karo" or "Summarize meeting notes"'
    },
    {
      icon: <FileSpreadsheet className="w-5 h-5 text-emerald-600" />,
      title: 'Excel & CSV Calculations',
      lib: 'exceljs',
      desc: 'Calculates totals, averages, min/max metrics across columns and appends a styled summary row to spreadsheets.',
      example: '"Is Excel file mein total calculate karo"'
    },
    {
      icon: <FileText className="w-5 h-5 text-blue-600" />,
      title: 'Text & Grammar Improvement',
      lib: 'docx + grammar-core',
      desc: 'Detects typos, spelling errors, and improves sentence readability, outputting a cleaned Microsoft Word document.',
      example: '"Is document ki spelling mistakes correct karo"'
    },
    {
      icon: <FileText className="w-5 h-5 text-indigo-600" />,
      title: 'Professional Corporate Report',
      lib: 'docx',
      desc: 'Transforms rough notes into a boardroom-ready Word (.docx) report with title page, executive summary, and action matrix.',
      example: '"Generate a professional report from these notes"'
    },
    {
      icon: <FileType className="w-5 h-5 text-rose-600" />,
      title: 'Urdu & Roman Urdu Translation',
      lib: 'multilingual-core + docx',
      desc: 'Translates documents between Urdu (اردو), Roman Urdu, and English while maintaining clear formatting.',
      example: '"Translate this document to Urdu"'
    },
    {
      icon: <FileType className="w-5 h-5 text-stone-600" />,
      title: 'Smart File Renaming',
      lib: 'safe-naming-engine',
      desc: 'Renames files to clean, consistent naming conventions while protecting file extensions and sanitizing characters.',
      example: '"Rename this file to Q3_Financial_Audit"'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      {/* Hero Banner with Pakistani Flag Green and Official Brand Logo */}
      <div className="bg-[#01411C] text-white rounded-3xl p-6 sm:p-10 mb-8 shadow-xl relative overflow-hidden ring-1 ring-emerald-600/30">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/15 text-emerald-100 px-3 py-1 rounded-full text-xs font-semibold mb-4 border border-white/20">
              <PakistanEmblem size={14} variant="flag" />
              <span>Khan G AI • Architecture &amp; Engine Specs</span>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
                One Chat. Every File Tool.
              </h1>
              <div className="hidden sm:inline-flex p-2 rounded-2xl bg-white/10 text-white">
                <PakistanEmblem size={28} variant="crescent-star" />
              </div>
            </div>
            <p className="text-emerald-100/90 text-sm sm:text-base leading-relaxed mb-6">
              Khan G AI combines conversational multi-provider intelligence with the raw speed and cryptographic privacy of 21+ dedicated Node.js native processing libraries.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={onBackToChat}
                className="inline-flex items-center gap-2 bg-white text-[#01411C] font-bold px-4 py-2.5 rounded-xl text-sm hover:bg-emerald-50 transition-colors shadow-xs"
              >
                <span>Open Chat Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              {onOpenDeveloperModal && (
                <button
                  onClick={onOpenDeveloperModal}
                  className="inline-flex items-center gap-2 bg-emerald-900/80 hover:bg-emerald-900 text-white font-semibold px-4 py-2.5 rounded-xl text-sm border border-emerald-500/40 transition-colors"
                >
                  <PakistanEmblem size={15} variant="circle" />
                  <span>Meet Developer (MJ)</span>
                </button>
              )}
            </div>
          </div>

          {/* Official Brand Identity Emblem Banner Badge */}
          <div className="hidden md:flex flex-col items-center justify-center p-5 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 shrink-0 shadow-lg text-center">
            <KhanGMark size={80} isSquircle={true} className="drop-shadow-md mb-2.5 hover:scale-105 transition-transform" />
            <div className="text-sm font-black tracking-tight text-white">Khan G <span className="text-[#34D399]">AI</span></div>
            <span className="text-[10px] text-emerald-200 uppercase tracking-widest font-mono font-medium mt-0.5">Official Brand Mark</span>
          </div>
        </div>
      </div>

      {/* Developer Profile Card: Muhammad Jahanzaib (MJ) */}
      <div className="bg-white dark:bg-stone-900 border-2 border-emerald-800/30 dark:border-emerald-800/50 rounded-3xl p-6 sm:p-8 mb-10 shadow-sm transition-colors">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="relative shrink-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#01411C] text-white font-black text-2xl sm:text-3xl flex items-center justify-center shadow-md">
                MJ
              </div>
              <div className="absolute -bottom-1 -right-1">
                <PakistanEmblem size={24} variant="circle" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100">
                  Muhammad Jahanzaib
                </h2>
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-[#01411C] dark:text-emerald-300 font-bold text-xs border border-emerald-300 dark:border-emerald-700">
                  MJ
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-semibold">
                  <MapPin className="w-3 h-3 text-[#01411C]" />
                  <span>Pakistan 🇵🇰</span>
                </span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-emerald-800 dark:text-emerald-400 mt-1">
                Founder, Creator &amp; Lead AI Software Engineer
              </p>
              <p className="text-xs text-stone-600 dark:text-stone-400 mt-1.5 max-w-xl leading-relaxed">
                Conceived and engineered by Muhammad Jahanzaib (MJ) in Pakistan. Built to empower students (MDCAT, CSS, ECAT, Matric/FSc) and professionals with elite AI tutoring, speech voice input, and private zero-configuration file processing across 21+ tools.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col items-stretch sm:items-center md:items-end gap-2 w-full md:w-auto">
            <a
              href="mailto:mehmadjahanzaib@gmail.com"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#01411C] hover:bg-[#025625] text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>mehmadjahanzaib@gmail.com</span>
            </a>
            {onOpenDeveloperModal && (
              <button
                onClick={onOpenDeveloperModal}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-200 text-xs font-medium transition-colors"
              >
                <span>View Full Profile</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Official Brand Identity Showcase */}
      <div className="bg-white dark:bg-stone-900 border border-[#DCEBE5] dark:border-stone-800 rounded-3xl p-6 sm:p-8 mb-10 shadow-sm transition-colors">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-[#00A86B]" />
          <h2 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-stone-100">
            Official Brand Identity &amp; Logo System
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mb-6 leading-relaxed">
          The <strong>Khan G AI</strong> visual identity was crafted with intentional symbolism, harmonizing Pakistani cultural heritage, academic excellence, and modern computational intelligence.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Tile 1: Standalone Vector Emblem */}
          <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700/80 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 flex items-center justify-center shadow-xs mb-3">
              <KhanGMark size={56} isSquircle={false} />
            </div>
            <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100">The Emblem</h3>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 leading-normal">
              Fluid volumetric emerald ribbon forming the letter <strong>K</strong>, symbolizing continuous progress, vitality, and forward momentum.
            </p>
          </div>

          {/* Tile 2: Origami Fountain Pen Nib */}
          <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700/80 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-2xl bg-[#082A20] border border-emerald-500/30 flex items-center justify-center shadow-xs mb-3">
              <KhanGMark size={56} isSquircle={false} />
            </div>
            <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100">Origami Pen Nib</h3>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 leading-normal">
              A sculpted white calligraphy fountain pen nib nestled at the center, signifying scholarship, literacy, and rigorous exam preparation.
            </p>
          </div>

          {/* Tile 3: Full Lockup & Typography */}
          <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700/80 flex flex-col items-center text-center justify-between">
            <div className="w-full flex-1 flex items-center justify-center py-2">
              <KhanGLogo size="md" showTagline={true} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100">Official Signature Lockup</h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 leading-normal">
                High-contrast typography paired with national emerald accents (#004D3A, #00A86B, and #10B981).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Flow */}
      <div className="mb-12">
        <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-6 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-stone-700 dark:text-stone-300" />
          <span>The Core Architecture</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm">
            <div className="w-8 h-8 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-bold flex items-center justify-center mb-3">
              1
            </div>
            <h3 className="font-semibold text-stone-900 dark:text-stone-100 mb-1 text-sm">Exam Prep &amp; Voice Input</h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
              Ask any academic questions via voice or text, or drop study PDFs, Excel sheets, and images directly into chat.
            </p>
          </div>

          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm">
            <div className="w-8 h-8 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-bold flex items-center justify-center mb-3">
              2
            </div>
            <h3 className="font-semibold text-stone-900 dark:text-stone-100 mb-1 text-sm">Ultra-Fast AI Engine</h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
              High-speed Groq LPU and Gemini models deliver instant explanations, derivations, and tool calls in sub-seconds.
            </p>
          </div>

          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm">
            <div className="w-8 h-8 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-bold flex items-center justify-center mb-3">
              3
            </div>
            <h3 className="font-semibold text-stone-900 dark:text-stone-100 mb-1 text-sm">In-Browser Preview &amp; Export</h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
              Preview documents and images directly in the browser, share with classmates via WhatsApp, or export seamlessly.
            </p>
          </div>
        </div>
      </div>

      {/* 21 Supported Tools */}
      <div className="mb-12">
        <h2 className="text-xl font-bold text-stone-900 mb-6 flex items-center gap-2">
          <Layers className="w-5 h-5 text-stone-700" />
          <span>Supported File Tools (21 Native Engines)</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tools.map((t, idx) => (
            <div key={idx} className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-stone-50 border border-stone-100">
                      {t.icon}
                    </div>
                    <h3 className="text-sm font-semibold text-stone-900">{t.title}</h3>
                  </div>
                  <span className="text-[10px] font-mono bg-stone-100 text-stone-600 px-2 py-0.5 rounded border border-stone-200">
                    {t.lib}
                  </span>
                </div>
                <p className="text-xs text-stone-600 mb-2 leading-relaxed">{t.desc}</p>
              </div>
              <div className="bg-stone-50 p-2 rounded-lg border border-stone-100 text-[11px] text-stone-500 font-mono">
                {t.example}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* API Key Configuration Guide */}
      <div className="bg-stone-50 border border-stone-200 rounded-2xl p-6 mb-12">
        <div className="flex items-center gap-2 mb-4">
          <Key className="w-5 h-5 text-amber-600" />
          <h2 className="text-lg font-bold text-stone-900">Multi-Provider AI Swapping</h2>
        </div>
        <p className="text-xs text-stone-600 mb-4 leading-relaxed">
          Khan G AI uses a unified <code className="bg-stone-200 px-1.5 py-0.5 rounded font-mono text-[11px]">lib/aiProvider.ts</code> abstraction. Switch your active provider anytime by setting <code className="bg-stone-200 px-1.5 py-0.5 rounded font-mono text-[11px]">AI_PROVIDER</code> in your environment variables:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-white p-3 rounded-xl border border-stone-200">
            <span className="font-semibold text-stone-900 block mb-1">Google AI Studio (Gemini)</span>
            <p className="text-stone-500 mb-2">Set <code className="font-mono text-stone-700">GEMINI_API_KEY</code>. Huge context window & free tier.</p>
            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium border border-emerald-200">Pre-configured in AI Studio</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-stone-200">
            <span className="font-semibold text-stone-900 block mb-1">Groq Cloud</span>
            <p className="text-stone-500 mb-2">Set <code className="font-mono text-stone-700">GROQ_API_KEY</code>. Free ultra-fast Llama-3 inference at console.groq.com.</p>
            <span className="text-[10px] text-stone-600 font-mono">AI_PROVIDER=groq</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-stone-200">
            <span className="font-semibold text-stone-900 block mb-1">OpenRouter</span>
            <p className="text-stone-500 mb-2">Set <code className="font-mono text-stone-700">OPENROUTER_API_KEY</code>. Access multiple free models with a single key.</p>
            <span className="text-[10px] text-stone-600 font-mono">AI_PROVIDER=openrouter</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-stone-200">
            <span className="font-semibold text-stone-900 block mb-1">Mistral & DeepSeek</span>
            <p className="text-stone-500 mb-2">Set <code className="font-mono text-stone-700">MISTRAL_API_KEY</code> or <code className="font-mono text-stone-700">DEEPSEEK_API_KEY</code>.</p>
            <span className="text-[10px] text-stone-600 font-mono">AI_PROVIDER=mistral | deepseek</span>
          </div>
        </div>
      </div>

      {/* Safety Disclaimer */}
      <div className="text-center text-xs text-stone-500 pb-6 select-none">
        <p>Khan G AI can make mistakes. Please double-check sensitive information.</p>
        <p className="text-[11px] text-stone-400 mt-1">
          Developed by Muhammad Jahanzaib (MJ) • Contact / Support: 0333-5016770
        </p>
      </div>
    </div>
  );
};
