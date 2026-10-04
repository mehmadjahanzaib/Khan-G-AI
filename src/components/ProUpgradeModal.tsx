import React, { useState } from 'react';
import { 
  X, 
  Crown, 
  Check, 
  Sparkles, 
  Zap, 
  ShieldCheck, 
  Copy, 
  MessageCircle, 
  FileText, 
  Clock, 
  ArrowRight,
  GraduationCap,
  Landmark,
  Smartphone
} from 'lucide-react';
import { usePro } from '../context/ProContext.js';
import { PakistanEmblem } from './PakistanEmblem.js';

interface ProUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProUpgradeModal: React.FC<ProUpgradeModalProps> = ({ isOpen, onClose }) => {
  const { isPro, proTier, activateWithCode, startTrial, deactivatePro } = usePro();
  const [activationCode, setActivationCode] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);
  const [isTrialLoading, setIsTrialLoading] = useState(false);

  if (!isOpen) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAccount(label);
    setTimeout(() => setCopiedAccount(null), 2000);
  };

  const handleStartTrial = async () => {
    setIsTrialLoading(true);
    setStatusMessage(null);
    const res = await startTrial();
    setIsTrialLoading(false);
    if (res.success) {
      setStatusMessage({ type: 'success', text: res.message });
    } else {
      setStatusMessage({ type: 'error', text: res.message });
    }
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activationCode.trim()) return;

    setStatusMessage(null);
    const res = await activateWithCode(activationCode);
    if (res.success) {
      setStatusMessage({ type: 'success', text: res.message });
      setActivationCode('');
    } else {
      setStatusMessage({ type: 'error', text: res.message });
    }
  };

  const whatsappMessage = encodeURIComponent(
    'Assalam-o-Alaikum! I want to activate Khan G AI Pro (Student/Business Tier). Please verify my payment or send payment details.'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-[#111e17] dark:text-stone-100 rounded-3xl max-w-2xl w-full border border-emerald-900/20 dark:border-emerald-700/40 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Emerald Luxury Gradient Banner */}
        <div className="relative bg-gradient-to-r from-[#01411C] via-[#025625] to-[#043317] p-5 sm:p-6 text-white shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/90 hover:text-white transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-amber-400 text-stone-900 flex items-center justify-center shadow-lg ring-2 ring-amber-300/60 font-bold shrink-0">
              <Crown className="w-6 h-6 text-stone-950 fill-stone-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  <span>Khan G Pro</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-300/40 font-semibold">
                    VIP Pass
                  </span>
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-emerald-100/90 font-medium">
                Supercharge your studies, exam preparation, and file processing power.
              </p>
            </div>
          </div>

          {/* Active status indicator if already Pro */}
          {isPro && (
            <div className="mt-3 bg-emerald-800/80 border border-emerald-400/30 rounded-xl px-3.5 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-200">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>You currently have <strong>{proTier === 'business' ? 'Business Pro' : 'Student Pro'}</strong> active!</span>
              </div>
              <button
                onClick={deactivatePro}
                className="text-[11px] underline text-emerald-300 hover:text-white"
              >
                Reset
              </button>
            </div>
          )}
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Tiers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Student Exam Tier */}
            <div className="relative border-2 border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
              <div className="absolute -top-3 left-4 bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                <GraduationCap className="w-3 h-3" />
                <span>Most Popular for Students</span>
              </div>

              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">Student &amp; Scholar</h3>
                  <div className="text-right">
                    <span className="text-xl font-extrabold text-[#01411C] dark:text-emerald-400">Rs. 499</span>
                    <span className="text-xs text-stone-500"> / month</span>
                  </div>
                </div>
                <p className="text-xs text-stone-600 dark:text-stone-300 mb-3">
                  Tailored for Matric, FSc, MDCAT, ECAT, CSS, and university students.
                </p>

                <ul className="space-y-2 text-xs text-stone-700 dark:text-stone-300 mb-4">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>Full Exam Preparation</strong> (Past papers &amp; notes)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>Ultra-Fast Groq Speeds</strong> (&lt;1s response latency)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>100MB File Size Limit</strong> for big books &amp; slides</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>Unlimited Chat &amp; Voice Input</strong></span>
                  </li>
                </ul>
              </div>

              <div className="pt-3 border-t border-emerald-200/60 dark:border-emerald-800/60 flex flex-col gap-2">
                {!isPro && (
                  <button
                    onClick={handleStartTrial}
                    disabled={isTrialLoading}
                    className="w-full py-2 px-3 rounded-xl bg-[#006A4E] hover:bg-[#004D3A] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 active:scale-98 disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>{isTrialLoading ? 'Starting Trial...' : 'Start 3-Day Free Trial (No Card Required)'}</span>
                  </button>
                )}
                <span className="text-[11px] font-semibold text-center text-emerald-800 dark:text-emerald-300">
                  Affordable student pricing in Pakistan 🇵🇰
                </span>
              </div>
            </div>

            {/* Business / Power Tier */}
            <div className="border border-stone-200 dark:border-stone-700 bg-white dark:bg-[#15231c] rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">Power &amp; Business</h3>
                  <div className="text-right">
                    <span className="text-xl font-extrabold text-stone-900 dark:text-stone-100">Rs. 1,499</span>
                    <span className="text-xs text-stone-500"> / month</span>
                  </div>
                </div>
                <p className="text-xs text-stone-600 dark:text-stone-300 mb-3">
                  For researchers, offices, agencies, and power users.
                </p>

                <ul className="space-y-2 text-xs text-stone-700 dark:text-stone-300 mb-4">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>Up to 500MB</strong> File Upload &amp; Batch Conversion</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>VIP Dedicated WhatsApp Support</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>Custom OCR &amp; Document Sanitization</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>Commercial Usage License</strong></span>
                  </li>
                </ul>
              </div>

              <div className="pt-2 border-t border-stone-100 dark:border-stone-800 text-center">
                <span className="text-[11px] text-stone-500">
                  International: $9.99 / mo
                </span>
              </div>
            </div>
          </div>

          {/* Payment Methods Section (Pakistani Local Gateways) */}
          <div className="bg-stone-50 dark:bg-[#16271e] rounded-2xl p-4 border border-stone-200 dark:border-emerald-800/40">
            <h4 className="font-bold text-xs uppercase tracking-wider text-stone-700 dark:text-stone-200 mb-2 flex items-center gap-2">
              <PakistanEmblem size={14} variant="flag" />
              <span>Instant Payment Methods (Pakistan)</span>
            </h4>

            <p className="text-xs text-stone-600 dark:text-stone-300 mb-3">
              Send subscription fee via EasyPaisa, JazzCash, or MCB Bank transfer to Developer Muhammad Jahanzaib (MJ), then enter your Transaction ID or message on WhatsApp:
            </p>

            <div className="space-y-2.5 text-xs mb-3">
              {/* EasyPaisa & JazzCash Box */}
              <div className="bg-white dark:bg-[#111e17] p-3 rounded-xl border border-stone-200 dark:border-stone-700 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-[#01411C] dark:text-emerald-400 shrink-0">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">EasyPaisa / JazzCash</span>
                      <span className="text-[9px] px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 rounded font-semibold">Instant</span>
                    </div>
                    <div className="font-mono font-bold text-sm text-stone-900 dark:text-white tracking-wide">0333-5016770</div>
                    <span className="text-[10px] text-stone-500">Account Title: Muhammad Jahanzaib</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy('03335016770', 'easypaisa')}
                  className="px-2.5 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-emerald-50 text-stone-600 dark:text-stone-300 hover:text-emerald-700 transition-colors flex items-center gap-1.5 shrink-0"
                  title="Copy number"
                >
                  {copiedAccount === 'easypaisa' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-[11px] font-medium text-emerald-600">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span className="text-[11px]">Copy</span>
                    </>
                  )}
                </button>
              </div>

              {/* MCB Bank Limited Box */}
              <div className="bg-white dark:bg-[#111e17] p-3 rounded-xl border border-stone-200 dark:border-stone-700 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 shrink-0">
                    <Landmark className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-400">MCB Bank Limited (IBAN)</span>
                      <span className="text-[9px] px-1.5 py-0.2 bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 rounded font-semibold">Raast / 1Link</span>
                    </div>
                    <div className="font-mono font-bold text-xs text-stone-900 dark:text-white truncate select-all">
                      PK43MUCB0782701671003245
                    </div>
                    <span className="text-[10px] text-stone-500">Account Title: Muhammad Jahanzaib</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy('PK43MUCB0782701671003245', 'mcb')}
                  className="px-2.5 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-emerald-50 text-stone-600 dark:text-stone-300 hover:text-emerald-700 transition-colors flex items-center gap-1.5 shrink-0"
                  title="Copy IBAN"
                >
                  {copiedAccount === 'mcb' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-[11px] font-medium text-emerald-600">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span className="text-[11px]">Copy IBAN</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* WhatsApp direct activation link */}
            <a
              href={`https://wa.me/923335016770?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-semibold text-xs transition-colors shadow-xs"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Instant Activation via WhatsApp: 0333-5016770 (Send Screenshot)</span>
            </a>
          </div>

          {/* Activation Code / Promo Key Form */}
          <div className="border border-stone-200 dark:border-stone-700 rounded-2xl p-4">
            <h4 className="font-bold text-xs uppercase tracking-wider text-stone-700 dark:text-stone-200 mb-1.5">
              Have an Activation Key or Transaction ID?
            </h4>
            <p className="text-xs text-stone-500 mb-3">
              Enter your key or promo coupon (Tip: try code <code className="bg-stone-100 dark:bg-stone-800 px-1 py-0.5 rounded font-mono text-emerald-700 dark:text-emerald-400">KHANG-PRO-2026</code>)
            </p>

            <form onSubmit={handleActivate} className="flex gap-2">
              <input
                type="text"
                value={activationCode}
                onChange={(e) => setActivationCode(e.target.value)}
                placeholder="Enter Code (e.g. KHANG-PRO-2026)"
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-[#111e17] text-stone-900 dark:text-white uppercase tracking-wider font-mono focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-[#01411C] hover:bg-[#025625] text-white text-xs font-semibold rounded-xl transition-colors shrink-0 shadow-xs flex items-center gap-1.5"
              >
                <span>Activate</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            {statusMessage && (
              <div
                className={`mt-2.5 p-2 rounded-lg text-xs font-medium ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {statusMessage.text}
              </div>
            )}
          </div>

          {/* Disclaimer */}
          <p className="text-[11px] text-center text-stone-400 dark:text-stone-500 pt-1 select-none">
            Khan G AI can make mistakes. Please double-check sensitive information.
          </p>
        </div>
      </div>
    </div>
  );
};
