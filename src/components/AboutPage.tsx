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
  FileType 
} from 'lucide-react';

interface AboutPageProps {
  onBackToChat: () => void;
  maxFileSizeMB?: number;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onBackToChat }) => {
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
      {/* Hero Banner */}
      <div className="bg-stone-900 text-white rounded-3xl p-6 sm:p-10 mb-10 shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-amber-400/20 text-amber-300 px-3 py-1 rounded-full text-xs font-medium mb-4 border border-amber-400/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Architecture & Engine Specs</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight mb-3">
            One Chat. Every File Tool.
          </h1>
          <p className="text-stone-300 text-sm sm:text-base max-w-2xl leading-relaxed mb-6">
            Khan G Tools combines the conversational intelligence of state-of-the-art LLMs with the speed, precision, and security of dedicated Node.js native processing libraries.
          </p>
          <button
            onClick={onBackToChat}
            className="inline-flex items-center gap-2 bg-white text-stone-900 font-semibold px-4 py-2 rounded-xl text-sm hover:bg-stone-100 transition-colors"
          >
            <span>Open Chat Workspace</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* How It Works Flow */}
      <div className="mb-12">
        <h2 className="text-xl font-bold text-stone-900 mb-6 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-stone-700" />
          <span>The Core Architecture</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
            <div className="w-8 h-8 rounded-xl bg-stone-100 text-stone-800 font-bold flex items-center justify-center mb-3">
              1
            </div>
            <h3 className="font-semibold text-stone-900 mb-1 text-sm">Upload & Instruction</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              You upload your file and type natural language instructions. No rigid forms or complex dropdown menus.
            </p>
          </div>

          <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
            <div className="w-8 h-8 rounded-xl bg-stone-100 text-stone-800 font-bold flex items-center justify-center mb-3">
              2
            </div>
            <h3 className="font-semibold text-stone-900 mb-1 text-sm">AI Intent & Tool Call</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              The LLM parses your intent and selects the exact tool and parameters via standard function calling. The AI never handles the raw binary data.
            </p>
          </div>

          <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
            <div className="w-8 h-8 rounded-xl bg-stone-100 text-stone-800 font-bold flex items-center justify-center mb-3">
              3
            </div>
            <h3 className="font-semibold text-stone-900 mb-1 text-sm">Native Node.js Execution</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              High-speed libraries like Sharp, PDF-Lib, and ExcelJS process your file locally on the server and return a secure download link.
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
          Khan G Tools uses a unified <code className="bg-stone-200 px-1.5 py-0.5 rounded font-mono text-[11px]">lib/aiProvider.ts</code> abstraction. Switch your active provider anytime by setting <code className="bg-stone-200 px-1.5 py-0.5 rounded font-mono text-[11px]">AI_PROVIDER</code> in your environment variables:
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
    </div>
  );
};
