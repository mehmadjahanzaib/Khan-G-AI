import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type ProTier = 'free' | 'student' | 'business';

export interface UsageQuota {
  messagesUsedToday: number;
  messagesLimit: number;
  messagesRemaining: number;
  fileOpsUsedToday: number;
  fileOpsLimit: number;
  fileOpsRemaining: number;
  maxFileSizeMB: number;
  maxOutputTokens: number;
  isPro: boolean;
  plan: string;
  resetAt: number;
}

interface ProContextType {
  isPro: boolean;
  proTier: ProTier;
  planName: string;
  proExpiryDate: string | null;
  proToken: string | null;
  usage: UsageQuota | null;
  refreshUsage: () => Promise<void>;
  activateWithCode: (code: string) => Promise<{ success: boolean; message: string; tier?: ProTier }>;
  startTrial: () => Promise<{ success: boolean; message: string; tier?: ProTier }>;
  deactivatePro: () => void;
  isUpgradeModalOpen: boolean;
  setIsUpgradeModalOpen: (open: boolean) => void;
}

const defaultUsage: UsageQuota = {
  messagesUsedToday: 0,
  messagesLimit: 30,
  messagesRemaining: 30,
  fileOpsUsedToday: 0,
  fileOpsLimit: 5,
  fileOpsRemaining: 5,
  maxFileSizeMB: 25,
  maxOutputTokens: 2048,
  isPro: false,
  plan: 'free',
  resetAt: Date.now() + 24 * 3600 * 1000,
};

const ProContext = createContext<ProContextType>({
  isPro: false,
  proTier: 'free',
  planName: 'Free',
  proExpiryDate: null,
  proToken: null,
  usage: defaultUsage,
  refreshUsage: async () => {},
  activateWithCode: async () => ({ success: false, message: '' }),
  startTrial: async () => ({ success: false, message: '' }),
  deactivatePro: () => {},
  isUpgradeModalOpen: false,
  setIsUpgradeModalOpen: () => {},
});

export const ProProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [proTier, setProTier] = useState<ProTier>('free');
  const [proExpiryDate, setProExpiryDate] = useState<string | null>(null);
  const [proToken, setProToken] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageQuota | null>(defaultUsage);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  // Refresh usage and subscription verification from backend
  const refreshUsage = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      const savedToken = localStorage.getItem('khang_pro_token');
      if (savedToken) {
        headers['x-khang-pro-token'] = savedToken;
      }

      const res = await fetch('/api/usage', { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setUsage(data);
          if (data.isPro) {
            setProTier(data.plan.includes('business') ? 'business' : 'student');
          } else {
            setProTier('free');
          }
        }
      }
    } catch (err) {
      console.warn('Failed to fetch usage quota:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    try {
      const savedToken = localStorage.getItem('khang_pro_token');
      if (savedToken) {
        setProToken(savedToken);
      }

      const saved = localStorage.getItem('khang_pro_status');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.tier && parsed.expiry) {
          if (new Date(parsed.expiry).getTime() > Date.now()) {
            setProTier(parsed.tier);
            setProExpiryDate(parsed.expiry);
          } else {
            localStorage.removeItem('khang_pro_status');
            localStorage.removeItem('khang_pro_token');
          }
        }
      }
    } catch (e) {
      console.warn('Error reading Pro status:', e);
    }

    refreshUsage();
  }, [refreshUsage]);

  const activateWithCode = async (rawCode: string) => {
    const code = rawCode.trim().toUpperCase();
    if (!code) {
      return { success: false, message: 'Please enter a valid activation code or Transaction ID.' };
    }

    try {
      const token = proToken || localStorage.getItem('khang_pro_token') || `user_${Date.now()}`;
      const res = await fetch('/api/billing/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-khang-pro-token': token,
        },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return {
          success: false,
          message: data.message || 'Invalid activation code or transaction reference.',
        };
      }

      const tier: ProTier = data.planId === 'pro_business' ? 'business' : 'student';
      const expiry = data.expiresAt ? new Date(data.expiresAt).toISOString() : new Date(Date.now() + 30 * 86400000).toISOString();

      setProTier(tier);
      setProExpiryDate(expiry);
      setProToken(token);

      localStorage.setItem('khang_pro_token', token);
      localStorage.setItem('khang_pro_status', JSON.stringify({ tier, expiry, code, token }));

      await refreshUsage();

      return {
        success: true,
        message: data.message || `🎉 Khan G ${tier === 'business' ? 'Business Pro' : 'Student Pro'} activated!`,
        tier,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Network error while validating activation code.',
      };
    }
  };

  const startTrial = async () => {
    try {
      const token = proToken || localStorage.getItem('khang_pro_token') || `user_${Date.now()}`;
      const res = await fetch('/api/billing/free-trial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-khang-pro-token': token,
        },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return {
          success: false,
          message: data.message || 'Could not start free trial.',
        };
      }

      const tier: ProTier = 'student';
      const expiry = data.expiresAt ? new Date(data.expiresAt).toISOString() : new Date(Date.now() + 3 * 86400000).toISOString();

      setProTier(tier);
      setProExpiryDate(expiry);
      setProToken(token);

      localStorage.setItem('khang_pro_token', token);
      localStorage.setItem('khang_pro_status', JSON.stringify({ tier, expiry, isTrial: true, token }));

      await refreshUsage();

      return {
        success: true,
        message: data.message || '🎉 3-Day Khan G Student Pro Free Trial activated!',
        tier,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Network error starting free trial.',
      };
    }
  };

  const deactivatePro = () => {
    setProTier('free');
    setProExpiryDate(null);
    setProToken(null);
    try {
      localStorage.removeItem('khang_pro_status');
      localStorage.removeItem('khang_pro_token');
    } catch {}
    refreshUsage();
  };

  const planName = proTier === 'business' ? 'Business Pro' : proTier === 'student' ? 'Student Pro' : 'Free';

  return (
    <ProContext.Provider
      value={{
        isPro: proTier !== 'free',
        proTier,
        planName,
        proExpiryDate,
        proToken,
        usage,
        refreshUsage,
        activateWithCode,
        startTrial,
        deactivatePro,
        isUpgradeModalOpen,
        setIsUpgradeModalOpen,
      }}
    >
      {children}
    </ProContext.Provider>
  );
};

export const usePro = () => useContext(ProContext);

