import React, { useState } from 'react';
import { 
  X, 
  Mail, 
  MapPin, 
  Code, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles, 
  Copy, 
  Check, 
  ExternalLink,
  Cpu,
  Layers,
  Heart,
  Phone,
  MessageCircle,
  Smartphone,
  Landmark
} from 'lucide-react';
import { PakistanEmblem } from './PakistanEmblem.js';
import { KhanGLogo, KhanGMark } from './BrandLogo.js';

interface DeveloperModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeveloperModal: React.FC<DeveloperModalProps> = ({ isOpen, onClose }) => {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedIban, setCopiedIban] = useState(false);
  const developerEmail = 'mehmadjahanzaib@gmail.com';
  const developerPhone = '03335016770';
  const developerIban = 'PK43MUCB0782701671003245';

  if (!isOpen) return null;

  const handleCopy = (text: string, type: 'email' | 'phone' | 'iban') => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      if (type === 'email') {
        setCopiedEmail(true);
        setTimeout(() => setCopiedEmail(false), 2000);
      } else if (type === 'phone') {
        setCopiedPhone(true);
        setTimeout(() => setCopiedPhone(false), 2000);
      } else if (type === 'iban') {
        setCopiedIban(true);
        setTimeout(() => setCopiedIban(false), 2000);
      }
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-emerald-800/20 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header with Pakistani Green Gradient */}
        <div className="relative bg-gradient-to-r from-[#01411C] via-[#085a29] to-[#01411C] text-white p-6 pb-7">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-4">
            {/* Avatar / Monogram */}
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-white text-[#01411C] font-black text-2xl flex items-center justify-center shadow-lg border-2 border-emerald-400">
                MJ
              </div>
              <div className="absolute -bottom-1 -right-1">
                <PakistanEmblem size={22} variant="circle" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Muhammad Jahanzaib
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/30 text-emerald-100 border border-emerald-400/40 text-[11px] font-semibold">
                  MJ
                </span>
              </div>
              <p className="text-emerald-100/90 text-xs font-medium mt-0.5">
                Founder &amp; Lead AI Software Engineer
              </p>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-emerald-200">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Pakistan 🇵🇰</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-300" />
                  <span>Khan G AI Suite</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Brand Presentation Card */}
          <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-between gap-3">
            <KhanGLogo size="sm" showTagline={true} />
            <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100/70 border border-emerald-300/60 px-2 py-0.5 rounded-full shrink-0">
              Official Identity
            </span>
          </div>

          {/* Bio statement */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-emerald-900 font-semibold text-xs uppercase tracking-wider">
              <PakistanEmblem size={16} variant="flag" />
              <span>Message from Muhammad Jahanzaib (MJ)</span>
            </div>
            <p className="text-xs text-stone-700 leading-relaxed">
              "Welcome to <strong>Khan G AI</strong>! As an engineer from Pakistan, my mission is to provide an elite, all-in-one AI assistant for work, study, academic exam preparation, and everyday productivity. Whether you speak English, Urdu, or Roman Urdu, Khan G AI is engineered to empower students and professionals with precision and complete data privacy."
            </p>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl">
              <div className="text-base font-bold text-[#01411C]">21+</div>
              <div className="text-[10px] text-stone-500 font-medium">Native Engines</div>
            </div>
            <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl">
              <div className="text-base font-bold text-[#01411C]">100%</div>
              <div className="text-[10px] text-stone-500 font-medium">Privacy Guaranteed</div>
            </div>
            <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl">
              <div className="text-base font-bold text-[#01411C]">3</div>
              <div className="text-[10px] text-stone-500 font-medium">Languages (EN/UR)</div>
            </div>
          </div>

          {/* Technical Architecture */}
          <div>
            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5 text-[#01411C]" />
              <span>Full-Stack Engineering Stack</span>
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-stone-50 border border-stone-200/80 rounded-lg">
                <span className="font-semibold text-stone-900 block text-[11px]">AI &amp; Natural Language</span>
                <span className="text-[11px] text-stone-600">Gemini 3.8 Flash • Function Calling</span>
              </div>
              <div className="p-2.5 bg-stone-50 border border-stone-200/80 rounded-lg">
                <span className="font-semibold text-stone-900 block text-[11px]">Image &amp; Vector Core</span>
                <span className="text-[11px] text-stone-600">Sharp (C++ Libvips) • Pixel Engine</span>
              </div>
              <div className="p-2.5 bg-stone-50 border border-stone-200/80 rounded-lg">
                <span className="font-semibold text-stone-900 block text-[11px]">PDF &amp; Office Engine</span>
                <span className="text-[11px] text-stone-600">PDF-Lib • docx • ExcelJS</span>
              </div>
              <div className="p-2.5 bg-stone-50 border border-stone-200/80 rounded-lg">
                <span className="font-semibold text-stone-900 block text-[11px]">Cloud &amp; Security</span>
                <span className="text-[11px] text-stone-600">Firebase Firestore • Strict Whitelist</span>
              </div>
            </div>
          </div>

          {/* Connect & Contact Row */}
          <div className="pt-3 border-t border-stone-100 flex flex-col gap-2.5">
            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-[#01411C]" />
              <span>Developer Contact &amp; Accounts</span>
            </h4>

            {/* Email Box */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-stone-50 border border-stone-200/80">
              <div className="flex items-center gap-2 overflow-hidden">
                <Mail className="w-4 h-4 text-[#01411C] shrink-0" />
                <span className="text-xs font-mono font-semibold text-stone-800 truncate select-all">
                  {developerEmail}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={`mailto:${developerEmail}`}
                  className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg bg-[#01411C] hover:bg-[#025625] text-white text-[11px] font-semibold shadow-xs transition-colors"
                >
                  <Mail className="w-3 h-3" />
                  <span>Email</span>
                </a>
                <button
                  onClick={() => handleCopy(developerEmail, 'email')}
                  className="p-1 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 text-stone-600 transition-colors"
                  title="Copy email"
                >
                  {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Phone & EasyPaisa / JazzCash Box */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-stone-50 border border-stone-200/80">
              <div className="flex items-center gap-2 overflow-hidden">
                <Smartphone className="w-4 h-4 text-[#01411C] shrink-0" />
                <div>
                  <span className="text-[10px] text-emerald-800 font-bold uppercase block">EasyPaisa / JazzCash / WhatsApp</span>
                  <span className="text-xs font-mono font-bold text-stone-900 select-all">0333-5016770</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href="https://wa.me/923335016770"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg bg-[#25D366] hover:bg-[#20ba59] text-white text-[11px] font-semibold shadow-xs transition-colors"
                >
                  <MessageCircle className="w-3 h-3" />
                  <span>WhatsApp</span>
                </a>
                <button
                  onClick={() => handleCopy(developerPhone, 'phone')}
                  className="p-1 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 text-stone-600 transition-colors"
                  title="Copy phone number"
                >
                  {copiedPhone ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* MCB Bank IBAN Box */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-stone-50 border border-stone-200/80">
              <div className="flex items-center gap-2 overflow-hidden min-w-0 pr-1">
                <Landmark className="w-4 h-4 text-blue-700 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] text-blue-800 font-bold uppercase block">MCB Bank Limited (IBAN)</span>
                  <span className="text-[11px] font-mono font-bold text-stone-900 truncate block select-all">PK43MUCB0782701671003245</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => handleCopy(developerIban, 'iban')}
                  className="px-2 py-1 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 text-[11px] font-semibold transition-colors flex items-center gap-1"
                  title="Copy IBAN"
                >
                  {copiedIban ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedIban ? 'Copied' : 'Copy IBAN'}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-stone-500 px-1 pt-1">
              <span>Developer: Muhammad Jahanzaib (MJ)</span>
              <div className="flex items-center gap-1">
                <span>Made with</span>
                <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
                <span>in Pakistan 🇵🇰</span>
              </div>
            </div>

            {/* Disclaimer */}
            <p className="text-[10px] text-center text-stone-400 pt-1 select-none">
              Khan G AI can make mistakes. Please double-check sensitive information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeveloperModal;
