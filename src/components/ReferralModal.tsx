import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Gift, 
  Copy, 
  Check, 
  Share2, 
  Sparkles, 
  ExternalLink,
  Loader2,
  Calendar
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { usePro } from '../context/ProContext.js';

interface ReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReferralModal: React.FC<ReferralModalProps> = ({ isOpen, onClose }) => {
  const { user, openAuthModal } = useAuth();
  const { refreshUsage } = usePro();
  const [stats, setStats] = useState<{
    referralCode: string;
    referralCount: number;
    bonusDaysEarned: number;
    shareUrl: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [claimInput, setClaimInput] = useState('');
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimMessage, setClaimMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (!user) {
      setStats(null);
      return;
    }

    setIsLoading(true);
    fetch('/api/referral/info', {
      headers: {
        'x-khang-pro-token': user.uid,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStats(data);
        }
      })
      .catch((err) => console.warn('Could not load referral info:', err))
      .finally(() => setIsLoading(false));
  }, [isOpen, user]);

  if (!isOpen) return null;

  const fullShareUrl = stats
    ? `${window.location.origin}${stats.shareUrl}`
    : window.location.origin;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullShareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    if (stats?.referralCode) {
      navigator.clipboard.writeText(stats.referralCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `Hey! I'm using Khan G AI — the elite AI assistant for study, exams & file tools. Sign up using my invite code ${stats?.referralCode} and we'll both get 3 days of Khan G Pro for free!\n\n${fullShareUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleClaimCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimInput.trim()) return;

    if (!user) {
      openAuthModal('signup');
      return;
    }

    setClaimLoading(true);
    setClaimMessage(null);

    try {
      const res = await fetch('/api/referral/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-khang-pro-token': user.uid,
        },
        body: JSON.stringify({ code: claimInput.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setClaimMessage({ type: 'success', text: data.message });
        setClaimInput('');
        await refreshUsage();
      } else {
        setClaimMessage({ type: 'error', text: data.message || 'Could not claim referral code.' });
      }
    } catch (err: any) {
      setClaimMessage({ type: 'error', text: err?.message || 'Network error claiming referral.' });
    } finally {
      setClaimLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div 
        className="w-full max-w-lg bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-br from-[#006A4E] to-[#004D3A] text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-800/60 border border-emerald-400/30 text-xs font-semibold text-emerald-200">
              <Gift className="w-3.5 h-3.5 text-emerald-300" />
              <span>Refer &amp; Earn Program</span>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
          <h2 className="text-xl font-bold tracking-tight mb-1">
            Invite Friends, Get Free Pro
          </h2>
          <p className="text-xs text-emerald-100/90 leading-relaxed">
            Share Khan G AI with your classmates, peers, or colleagues. When they sign up, <strong>both of you receive 3 bonus days of Khan G Pro</strong> — totally free!
          </p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {!user ? (
            <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center space-y-3">
              <Sparkles className="w-6 h-6 text-amber-600 dark:text-amber-400 mx-auto" />
              <div>
                <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100 mb-1">
                  Sign In to Get Your Referral Link
                </h4>
                <p className="text-xs text-stone-600 dark:text-stone-300">
                  Create a free Khan G AI account to unlock your personal invite link and track your earned Pro days.
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  openAuthModal('signup');
                }}
                className="px-4 py-2 rounded-xl bg-[#006A4E] hover:bg-[#004D3A] text-white text-xs font-semibold shadow-xs"
              >
                Sign In / Create Account
              </button>
            </div>
          ) : isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-stone-500">
              <Loader2 className="w-6 h-6 animate-spin text-[#006A4E]" />
              <span className="text-xs">Loading your referral rewards...</span>
            </div>
          ) : (
            <>
              {/* Stats Card */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#E8F6F1] dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                  <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 block mb-0.5">
                    Friends Referred
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-[#006A4E] dark:text-emerald-400 font-mono">
                      {stats?.referralCount || 0}
                    </span>
                    <span className="text-xs text-stone-500">users</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#E8F6F1] dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                  <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 block mb-0.5">
                    Free Pro Days Earned
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-[#006A4E] dark:text-emerald-400 font-mono">
                      {stats?.bonusDaysEarned || 0}
                    </span>
                    <span className="text-xs text-stone-500">days</span>
                  </div>
                </div>
              </div>

              {/* Share Box */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center justify-between">
                  <span>Your Referral Code</span>
                  <span className="text-[11px] text-stone-400 font-normal">Give this code or link to friends</span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 font-mono font-bold text-sm text-[#004D3A] dark:text-emerald-300 select-all">
                    {stats?.referralCode || 'Loading...'}
                  </div>
                  <button
                    onClick={handleCopyCode}
                    className="px-3 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 text-xs font-semibold border border-stone-200 dark:border-stone-700 transition-colors flex items-center gap-1.5"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Quick Share Buttons */}
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={handleWhatsAppShare}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share on WhatsApp</span>
                </button>
                <button
                  onClick={handleCopyLink}
                  className="py-2.5 px-4 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-emerald-50 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold border border-stone-200 dark:border-stone-700 transition-colors flex items-center justify-center gap-1.5"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <ExternalLink className="w-4 h-4" />}
                  <span>{copiedLink ? 'Link Copied!' : 'Copy Share Link'}</span>
                </button>
              </div>

              {/* Claim a Friend's Code */}
              <div className="pt-4 border-t border-stone-200 dark:border-stone-800 space-y-2">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Have a friend's referral code?
                </label>
                <form onSubmit={handleClaimCode} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. KG1A2B"
                    value={claimInput}
                    onChange={(e) => setClaimInput(e.target.value.toUpperCase())}
                    className="flex-1 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 p-2 font-mono text-stone-900 dark:text-stone-100 uppercase focus:outline-none focus:ring-2 focus:ring-[#006A4E]"
                  />
                  <button
                    type="submit"
                    disabled={claimLoading || !claimInput.trim()}
                    className="px-3.5 py-2 rounded-xl bg-[#006A4E] hover:bg-[#004D3A] disabled:opacity-50 text-white text-xs font-semibold shadow-xs"
                  >
                    {claimLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Claim'}
                  </button>
                </form>
                {claimMessage && (
                  <p className={`text-xs ${claimMessage.type === 'success' ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {claimMessage.text}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
