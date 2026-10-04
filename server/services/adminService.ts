import crypto from 'crypto';
import { fileStore } from './fileProcessor.js';
import {
  getAllSubscriptions,
  getAllPayments,
  getAllUsageRecords,
  getAdminAuditLogs,
  logAdminAction,
  updatePaymentStatus,
  getSubscription,
  SubscriptionRecord,
  PaymentRecord,
} from './persistenceService.js';
import { setSubscription } from './billingService.js';

interface AnalyticsEvent {
  name: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

// In-memory telemetry buffers
const eventCounts: Record<string, number> = {};
const recentEvents: AnalyticsEvent[] = [];
let totalApiRequests = 0;
const startedAt = Date.now();

// Active admin sessions: sessionToken -> { createdAt: number, expiresAt: number, ip?: string }
const activeAdminSessions = new Map<string, { createdAt: number; expiresAt: number; ip?: string }>();

/**
 * Tracks an analytics event
 */
export function trackEvent(name: string, metadata?: Record<string, any>): void {
  eventCounts[name] = (eventCounts[name] || 0) + 1;
  recentEvents.push({
    name,
    timestamp: Date.now(),
    metadata,
  });

  if (recentEvents.length > 100) {
    recentEvents.shift();
  }
}

/**
 * Increments the total API request counter
 */
export function incrementRequestCount(): void {
  totalApiRequests += 1;
}

/**
 * Validates admin key and establishes a secure authenticated session
 */
export function authenticateAdmin(providedKey?: string, ip?: string): { success: boolean; sessionToken?: string; message: string } {
  const adminKey = process.env.ADMIN_KEY;

  // If ADMIN_KEY is not configured in environment, fail safely
  if (!adminKey || !adminKey.trim()) {
    return {
      success: false,
      message: 'Admin access is not configured on this server. Set ADMIN_KEY in server environment variables.',
    };
  }

  if (!providedKey || typeof providedKey !== 'string') {
    return { success: false, message: 'Admin Key is required.' };
  }

  // Constant-time comparison to prevent timing attacks
  const providedBuffer = Buffer.from(providedKey.trim());
  const adminBuffer = Buffer.from(adminKey.trim());

  if (providedBuffer.length !== adminBuffer.length || !crypto.timingSafeEqual(providedBuffer, adminBuffer)) {
    logAdminAction('admin_login_failed', 'anonymous', undefined, { reason: 'invalid_key' }, ip);
    return { success: false, message: 'Invalid Admin Key.' };
  }

  // Generate a secure, cryptographically random session token
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const expiresAt = now + 12 * 3600 * 1000; // 12 hours

  activeAdminSessions.set(sessionToken, {
    createdAt: now,
    expiresAt,
    ip,
  });

  logAdminAction('admin_login_success', 'admin', undefined, { ip }, ip);

  return {
    success: true,
    sessionToken,
    message: 'Admin authentication successful.',
  };
}

/**
 * Verifies if an HTTP-only cookie or bearer token is a valid admin session
 */
export function verifyAdminSession(sessionToken?: string): boolean {
  if (!sessionToken || typeof sessionToken !== 'string') return false;

  const session = activeAdminSessions.get(sessionToken.trim());
  if (!session) return false;

  // Check expiration
  if (Date.now() > session.expiresAt) {
    activeAdminSessions.delete(sessionToken.trim());
    return false;
  }

  return true;
}

/**
 * Destroys an active admin session on logout
 */
export function invalidateAdminSession(sessionToken?: string, ip?: string): void {
  if (sessionToken) {
    activeAdminSessions.delete(sessionToken.trim());
    logAdminAction('admin_logout', 'admin', undefined, {}, ip);
  }
}

/**
 * Gathers comprehensive system health, business telemetry, and operational metrics
 */
export function getSystemMetrics() {
  const mem = process.memoryUsage();
  const uptimeSeconds = Math.floor((Date.now() - startedAt) / 1000);

  // File storage metrics
  let totalStoredBytes = 0;
  for (const record of fileStore.values()) {
    totalStoredBytes += record.size || 0;
  }

  // Subscriptions telemetry
  const allSubs = getAllSubscriptions();
  const totalUsers = allSubs.length;
  const proSubscribers = allSubs.filter((s) => s.status === 'active' && s.planId !== 'free');
  const trialingSubscribers = allSubs.filter((s) => s.status === 'trialing');
  const freeUsersCount = allSubs.filter((s) => s.planId === 'free' || s.status === 'expired').length;

  // Payments & Transactions
  const allPayments = getAllPayments();
  const pendingPayments = allPayments.filter((p) => p.status === 'pending');
  const verifiedPayments = allPayments.filter((p) => p.status === 'verified');
  const totalRevenue = verifiedPayments.reduce((acc, p) => acc + (p.amount || 0), 0);

  // Daily usage stats
  const allUsage = getAllUsageRecords();
  const totalMessagesProcessed = allUsage.reduce((acc, u) => acc + (u.messagesCount || 0), 0);
  const totalFileOpsProcessed = allUsage.reduce((acc, u) => acc + (u.fileOpsCount || 0), 0);

  return {
    service: 'Khan G AI Production System',
    version: '2.5.0',
    uptimeSeconds,
    totalApiRequests,
    totalUsers,
    freeUsersCount,
    proUsersCount: proSubscribers.length,
    trialingUsersCount: trialingSubscribers.length,
    activeFilesCount: fileStore.size,
    activeStorageMB: (totalStoredBytes / (1024 * 1024)).toFixed(2),
    memoryUsageMB: {
      rss: (mem.rss / (1024 * 1024)).toFixed(1),
      heapUsed: (mem.heapUsed / (1024 * 1024)).toFixed(1),
      heapTotal: (mem.heapTotal / (1024 * 1024)).toFixed(1),
    },
    providersConfigured: {
      groq: Boolean(process.env.GROQ_API_KEY),
      gemini: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
      openRouter: Boolean(process.env.OPENROUTER_API_KEY),
      deepseek: Boolean(process.env.DEEPSEEK_API_KEY),
      mistral: Boolean(process.env.MISTRAL_API_KEY),
    },
    analytics: {
      eventCounts,
      recentEvents: recentEvents.slice(-20),
      totalMessagesProcessed,
      totalFileOpsProcessed,
    },
    paymentGateway: {
      provider: process.env.PAYMENT_PROVIDER || 'none',
      isLive: Boolean(process.env.PAYMENT_SECRET_KEY && process.env.PAYMENT_SECRET_KEY.startsWith('sk_')),
      pendingVerificationCount: pendingPayments.length,
      totalRevenue,
      currency: process.env.CURRENCY || 'PKR',
    },
    recentPayments: allPayments.slice(0, 15),
    recentAuditLogs: getAdminAuditLogs(20),
  };
}

/**
 * Allows an authorized admin to approve or reject a manual payment transaction
 */
export function adminVerifyPayment(
  paymentId: string,
  approve: boolean,
  adminId = 'admin',
  notes?: string
): { success: boolean; message: string; payment?: PaymentRecord } {
  const status = approve ? 'verified' : 'rejected';
  const updated = updatePaymentStatus(paymentId, status, adminId, notes);

  if (!updated) {
    return { success: false, message: 'Payment record not found.' };
  }

  // If approved, activate 30 days of Student Pro for the user
  if (approve) {
    const days = 30;
    setSubscription(updated.userId, updated.planId || 'pro_student', days, 'manual_admin_approval', {
      paymentId: updated.id,
      transactionId: updated.transactionId,
      approvedBy: adminId,
    });
    logAdminAction('verify_payment_approved', adminId, updated.userId, { paymentId, amount: updated.amount });
  } else {
    logAdminAction('verify_payment_rejected', adminId, updated.userId, { paymentId, notes });
  }

  return {
    success: true,
    message: approve
      ? `Payment verified! User ${updated.userId} has been granted 30 days of Pro.`
      : `Payment ${paymentId} rejected.`,
    payment: updated,
  };
}
