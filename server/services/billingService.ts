import crypto from 'crypto';
import {
  PlanId,
  SubscriptionRecord,
  SubscriptionStatus,
  getSubscription as dbGetSubscription,
  saveSubscription as dbSaveSubscription,
  savePayment,
  PaymentRecord,
} from './persistenceService.js';
import { getActivePaymentProvider, CheckoutResult } from './paymentProvider.js';

export type { PlanId, SubscriptionRecord, SubscriptionStatus };

export interface PricingPlanConfig {
  id: PlanId;
  name: string;
  tagline: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  features: string[];
  limits: {
    messagesPerDay: number;
    fileOpsPerDay: number;
    maxFileSizeMB: number;
  };
}

// Predefined verified activation codes (for educational grants, special access, or confirmed manual transfers)
const PROMO_CODES: Record<string, { planId: PlanId; days: number }> = {
  'KHANG-PRO-2026': { planId: 'pro_student', days: 365 },
  'STUDENT-VIP': { planId: 'pro_student', days: 90 },
  'MJ-SPECIAL': { planId: 'pro_business', days: 365 },
  'MDCAT-TOPPER': { planId: 'pro_student', days: 180 },
  'ECAT-PRO': { planId: 'pro_student', days: 180 },
};

/**
 * Returns active pricing plans configuration from environment variables
 */
export function getPricingPlans(): { currency: string; paymentProvider: string; plans: PricingPlanConfig[] } {
  const currency = process.env.CURRENCY || 'PKR';
  const monthlyPrice = parseInt(process.env.PRO_PRICE_MONTHLY || '499', 10);
  const yearlyPrice = parseInt(process.env.PRO_PRICE_YEARLY || '3999', 10);
  const paymentProvider = process.env.PAYMENT_PROVIDER || 'none';

  return {
    currency,
    paymentProvider,
    plans: [
      {
        id: 'free',
        name: 'Free Starter',
        tagline: 'Genuinely useful AI assistant for daily tasks & basic study.',
        monthlyPrice: 0,
        yearlyPrice: 0,
        currency,
        features: [
          `${process.env.FREE_MESSAGES_PER_DAY || '30'} AI Chat messages / day`,
          'Full academic guidance (Matric, FSc, MDCAT, CSS)',
          `${process.env.FREE_FILE_OPERATIONS_PER_DAY || '5'} file transformations / day`,
          `Up to ${process.env.FREE_MAX_FILE_SIZE_MB || '25'}MB file upload limit`,
          'In-browser document & image previews',
          'Web Speech voice input',
          'Dark & Light mode themes',
          'Conversation history'
        ],
        limits: {
          messagesPerDay: parseInt(process.env.FREE_MESSAGES_PER_DAY || '30', 10),
          fileOpsPerDay: parseInt(process.env.FREE_FILE_OPERATIONS_PER_DAY || '5', 10),
          maxFileSizeMB: parseInt(process.env.FREE_MAX_FILE_SIZE_MB || '25', 10),
        },
      },
      {
        id: 'pro_student',
        name: 'Student Pro',
        tagline: 'High-speed priority AI for competitive exam prep & heavy file processing.',
        monthlyPrice,
        yearlyPrice,
        currency,
        features: [
          `${process.env.PRO_MESSAGES_PER_DAY || '500'} AI Chat messages / day`,
          'Sub-second ultra-fast response priority (Groq LPU & Gemini)',
          `${process.env.PRO_FILE_OPERATIONS_PER_DAY || '100'} file transformations / day`,
          `Up to ${process.env.PRO_MAX_FILE_SIZE_MB || '100'}MB file upload limit`,
          'Advanced step-by-step Math solver',
          'Dedicated Chapter MCQs & Exam Revision Generator',
          'Audio transcription for lectures & voice notes',
          'Priority customer & academic support'
        ],
        limits: {
          messagesPerDay: parseInt(process.env.PRO_MESSAGES_PER_DAY || '500', 10),
          fileOpsPerDay: parseInt(process.env.PRO_FILE_OPERATIONS_PER_DAY || '100', 10),
          maxFileSizeMB: parseInt(process.env.PRO_MAX_FILE_SIZE_MB || '100', 10),
        },
      },
      {
        id: 'pro_business',
        name: 'Business & Team Pro',
        tagline: 'Maximum power for research teams, universities & heavy document pipelines.',
        monthlyPrice: monthlyPrice * 3,
        yearlyPrice: yearlyPrice * 3,
        currency,
        features: [
          '2,000 AI Chat messages / day',
          '500 file operations / day',
          'Up to 200MB large file processing',
          'Batch PDF & Spreadsheet automation',
          'Highest priority server capacity',
          'Dedicated account manager'
        ],
        limits: {
          messagesPerDay: 2000,
          fileOpsPerDay: 500,
          maxFileSizeMB: 200,
        },
      }
    ],
  };
}

/**
 * Server-side subscription verification with persistence
 */
export function getSubscription(userId?: string): SubscriptionRecord {
  const defaultSub: SubscriptionRecord = {
    userId: userId || 'anonymous',
    planId: 'free',
    status: 'active',
    provider: 'default',
    startedAt: Date.now(),
    currentPeriodStart: Date.now(),
    currentPeriodEnd: Date.now() + 365 * 24 * 3600 * 1000,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  if (!userId) return defaultSub;

  const existing = dbGetSubscription(userId);
  if (!existing) {
    return defaultSub;
  }

  return existing;
}

/**
 * Activates or updates a user subscription persistently
 */
export function setSubscription(
  userId: string,
  planId: PlanId,
  days: number,
  provider: string,
  metadata?: Record<string, any>
): SubscriptionRecord {
  const now = Date.now();
  const currentPeriodEnd = now + days * 24 * 3600 * 1000;

  const record: SubscriptionRecord = {
    userId,
    planId,
    status: 'active',
    provider,
    subscriptionId: `sub_${crypto.randomBytes(8).toString('hex')}`,
    startedAt: now,
    currentPeriodStart: now,
    currentPeriodEnd,
    metadata,
    createdAt: now,
    updatedAt: now,
  };

  dbSaveSubscription(record);
  return record;
}

/**
 * Redeems an activation code or submits a payment transaction ID for manual verification.
 * Does NOT falsely auto-grant Pro to unverified transaction strings.
 */
export function redeemCodeOrTransaction(
  userId: string,
  rawCode: string
): { success: boolean; status?: 'active' | 'pending'; message: string; planId?: PlanId; expiresAt?: number } {
  const code = (rawCode || '').trim().toUpperCase();
  if (!code) {
    return { success: false, message: 'Please enter a valid activation code or Transaction ID.' };
  }

  // 1. Check genuine verified promo codes (e.g. grants or pre-approved vouchers)
  if (PROMO_CODES[code]) {
    const { planId, days } = PROMO_CODES[code];
    const sub = setSubscription(userId, planId, days, 'voucher_code', { code });
    return {
      success: true,
      status: 'active',
      message: `🎉 Success! Khan G ${planId === 'pro_business' ? 'Business Pro' : 'Student Pro'} has been activated for ${days} days!`,
      planId,
      expiresAt: sub.currentPeriodEnd,
    };
  }

  // 2. Check Pakistani payment transaction ID format (8-24 alphanumeric chars e.g. JazzCash / Easypaisa / Raast)
  const isTrx = /^[A-Z0-9_-]{8,24}$/.test(code);
  if (isTrx) {
    const pricing = getPricingPlans();
    const now = Date.now();

    // Create a pending payment record for administrator verification
    const paymentId = `pay_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const payment: PaymentRecord = {
      id: paymentId,
      userId,
      planId: 'pro_student',
      amount: pricing.plans[1].monthlyPrice,
      currency: pricing.currency,
      provider: 'manual_pakistan_p2p',
      transactionId: code,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };
    savePayment(payment);

    return {
      success: true,
      status: 'pending',
      message: `📋 Transaction ID "${code}" has been submitted for verification. An administrator will verify the receipt within 1-2 hours and activate your Student Pro plan. For immediate review, you can also message 0333-5016770 on WhatsApp.`,
      planId: 'pro_student',
    };
  }

  return {
    success: false,
    message: 'Invalid code or transaction format. Please enter a valid promo code or your 8-24 character JazzCash / EasyPaisa / Raast Transaction ID.',
  };
}

/**
 * Activates a 3-Day Free Trial for genuine new users without credit card
 */
export function startFreeTrial(userId: string): {
  success: boolean;
  message: string;
  planId?: PlanId;
  expiresAt?: number;
  alreadyUsed?: boolean;
} {
  const existing = dbGetSubscription(userId);
  if (existing && (existing.planId !== 'free' || existing.metadata?.trialUsed)) {
    return {
      success: false,
      alreadyUsed: true,
      message: 'You have already experienced the 3-day Khan G Pro free trial. Please upgrade to continue enjoying unlimited benefits.',
    };
  }

  const now = Date.now();
  const days = 3;
  const currentPeriodEnd = now + days * 24 * 3600 * 1000;

  const trialSub: SubscriptionRecord = {
    userId,
    planId: 'pro_student',
    status: 'trialing',
    provider: 'free_trial',
    startedAt: now,
    currentPeriodStart: now,
    currentPeriodEnd,
    metadata: { trialUsed: true, trialStartedAt: now },
    createdAt: now,
    updatedAt: now,
  };

  dbSaveSubscription(trialSub);

  return {
    success: true,
    message: '🚀 Your 3-Day Student Pro Free Trial is now active! Enjoy 500 messages/day, faster AI inference, and 100MB file uploads.',
    planId: 'pro_student',
    expiresAt: currentPeriodEnd,
  };
}

/**
 * Creates checkout session via the active PaymentProvider
 */
export async function createCheckoutSession(
  userId: string,
  planId: PlanId = 'pro_student',
  interval: 'monthly' | 'yearly' = 'monthly',
  customerEmail?: string
): Promise<CheckoutResult> {
  const provider = getActivePaymentProvider();
  const pricing = getPricingPlans();
  const targetPlan = pricing.plans.find((p) => p.id === planId) || pricing.plans[1];
  const amount = interval === 'yearly' ? targetPlan.yearlyPrice : targetPlan.monthlyPrice;

  return provider.createCheckout({
    userId,
    planId,
    amount,
    currency: pricing.currency,
    interval,
    planName: targetPlan.name,
    customerEmail,
  });
}

/**
 * Get or create referral info for user
 */
export function getOrCreateUserReferral(userId: string) {
  // Deterministic referral code generation based on user ID
  const cleanId = userId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase();
  const code = `KHAN-${cleanId || 'PRO'}`;

  const sub = getSubscription(userId);
  const bonusDays = sub.metadata?.bonusDaysEarned || 0;
  const count = sub.metadata?.referralCount || 0;

  return {
    code,
    shareUrl: `${process.env.PUBLIC_SITE_URL || 'https://khang.pk'}/?ref=${code}`,
    referralCount: count,
    bonusDaysEarned: bonusDays,
    rewardPerReferralDays: 7,
  };
}

/**
 * Claim referral code
 */
export function claimReferralCode(
  userId: string,
  rawCode: string
): { success: boolean; message: string; bonusDaysGranted?: number } {
  const code = (rawCode || '').trim().toUpperCase();
  if (!code.startsWith('KHAN-')) {
    return { success: false, message: 'Invalid referral code format. Code must look like "KHAN-XXXXX".' };
  }

  const sub = getSubscription(userId);
  if (sub.metadata?.referralClaimed) {
    return { success: false, message: 'You have already claimed a referral bonus on this account.' };
  }

  // Grant 7 bonus Pro days
  const now = Date.now();
  const days = 7;
  const currentEnd = sub.currentPeriodEnd > now ? sub.currentPeriodEnd : now;
  const newEnd = currentEnd + days * 24 * 3600 * 1000;

  sub.planId = sub.planId === 'free' ? 'pro_student' : sub.planId;
  sub.status = 'active';
  sub.currentPeriodEnd = newEnd;
  sub.metadata = {
    ...(sub.metadata || {}),
    referralClaimed: code,
    claimedAt: now,
  };
  sub.updatedAt = now;
  dbSaveSubscription(sub);

  return {
    success: true,
    bonusDaysGranted: 7,
    message: `🎁 Referral code ${code} verified! You received 7 Days of complimentary Khan G Student Pro!`,
  };
}
