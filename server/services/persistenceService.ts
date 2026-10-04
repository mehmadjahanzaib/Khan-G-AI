import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export type PlanId = 'free' | 'pro_student' | 'pro_business';
export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'cancelled'
  | 'expired'
  | 'inactive'
  | 'pending';

export interface SubscriptionRecord {
  userId: string;
  planId: PlanId;
  status: SubscriptionStatus;
  provider: string;
  subscriptionId?: string;
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  startedAt: number;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd?: boolean;
  metadata?: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

export interface UserUsageRecord {
  userId: string;
  dateStr: string; // YYYY-MM-DD
  messagesCount: number;
  fileOpsCount: number;
  lastUpdated: number;
}

export interface PaymentRecord {
  id: string;
  userId: string;
  planId: PlanId;
  amount: number;
  currency: string;
  provider: string;
  transactionId: string;
  status: 'pending' | 'verified' | 'rejected' | 'refunded';
  notes?: string;
  verifiedBy?: string;
  verifiedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface AdminAuditLog {
  id: string;
  action: string;
  adminId: string;
  targetId?: string;
  details?: Record<string, any>;
  timestamp: number;
  ip?: string;
}

// Directory for persistent storage
import os from 'os';
const DB_DIR = process.env.STORAGE_DIR
  ? path.resolve(process.env.STORAGE_DIR, 'db')
  : process.env.VERCEL
  ? path.resolve(os.tmpdir(), '.tmp_storage', 'db')
  : path.resolve(process.cwd(), '.tmp_storage', 'db');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// In-memory caches backed by persistent disk storage
const subscriptions = new Map<string, SubscriptionRecord>();
const usageRecords = new Map<string, UserUsageRecord>();
const payments = new Map<string, PaymentRecord>();
const auditLogs: AdminAuditLog[] = [];

/**
 * Atomically writes data to a JSON file to prevent partial write corruption
 */
function safeWriteFile(filePath: string, data: any) {
  const tempPath = `${filePath}.${Date.now()}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  try {
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    if (fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch {}
    }
    console.error(`Failed to safely write file ${filePath}:`, err);
  }
}

/**
 * Initializes persistent database from disk on server startup
 */
export function initPersistence() {
  try {
    // 1. Subscriptions
    const subFile = path.join(DB_DIR, 'subscriptions.json');
    if (fs.existsSync(subFile)) {
      const data = JSON.parse(fs.readFileSync(subFile, 'utf8'));
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item?.userId) subscriptions.set(item.userId, item);
        }
      }
    }

    // 2. Usage Records
    const usageFile = path.join(DB_DIR, 'usage.json');
    if (fs.existsSync(usageFile)) {
      const data = JSON.parse(fs.readFileSync(usageFile, 'utf8'));
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item?.userId && item?.dateStr) {
            usageRecords.set(`${item.userId}_${item.dateStr}`, item);
          }
        }
      }
    }

    // 3. Payments
    const payFile = path.join(DB_DIR, 'payments.json');
    if (fs.existsSync(payFile)) {
      const data = JSON.parse(fs.readFileSync(payFile, 'utf8'));
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item?.id) payments.set(item.id, item);
        }
      }
    }

    // 4. Audit Logs
    const auditFile = path.join(DB_DIR, 'audit_logs.json');
    if (fs.existsSync(auditFile)) {
      const data = JSON.parse(fs.readFileSync(auditFile, 'utf8'));
      if (Array.isArray(data)) {
        auditLogs.push(...data.slice(-500));
      }
    }
  } catch (err) {
    console.error('Error loading persistent store:', err);
  }
}

// -------------------------------------------------------------
// SUBSCRIPTIONS
// -------------------------------------------------------------

export function getSubscription(userId: string): SubscriptionRecord | null {
  if (!userId) return null;
  const sub = subscriptions.get(userId);
  if (!sub) return null;

  // Check expiration
  if (sub.status === 'active' && sub.currentPeriodEnd < Date.now()) {
    sub.status = 'expired';
    sub.planId = 'free';
    sub.updatedAt = Date.now();
    saveSubscription(sub);
  }

  return sub;
}

export function saveSubscription(sub: SubscriptionRecord): void {
  subscriptions.set(sub.userId, sub);
  safeWriteFile(path.join(DB_DIR, 'subscriptions.json'), Array.from(subscriptions.values()));
}

export function getAllSubscriptions(): SubscriptionRecord[] {
  return Array.from(subscriptions.values());
}

// -------------------------------------------------------------
// USAGE RECORDS
// -------------------------------------------------------------

export function getUsageRecord(userId: string, dateStr: string): UserUsageRecord {
  const key = `${userId}_${dateStr}`;
  let record = usageRecords.get(key);
  if (!record) {
    record = {
      userId,
      dateStr,
      messagesCount: 0,
      fileOpsCount: 0,
      lastUpdated: Date.now(),
    };
    usageRecords.set(key, record);
  }
  return record;
}

export function saveUsageRecord(record: UserUsageRecord): void {
  const key = `${record.userId}_${record.dateStr}`;
  usageRecords.set(key, record);
  safeWriteFile(path.join(DB_DIR, 'usage.json'), Array.from(usageRecords.values()));
}

export function getAllUsageRecords(): UserUsageRecord[] {
  return Array.from(usageRecords.values());
}

// -------------------------------------------------------------
// PAYMENTS & TRANSACTIONS
// -------------------------------------------------------------

export function savePayment(payment: PaymentRecord): void {
  payments.set(payment.id, payment);
  safeWriteFile(path.join(DB_DIR, 'payments.json'), Array.from(payments.values()));
}

export function getPayment(id: string): PaymentRecord | null {
  return payments.get(id) || null;
}

export function getAllPayments(): PaymentRecord[] {
  return Array.from(payments.values()).sort((a, b) => b.createdAt - a.createdAt);
}

export function updatePaymentStatus(
  paymentId: string,
  status: 'verified' | 'rejected',
  adminId: string,
  notes?: string
): PaymentRecord | null {
  const payment = payments.get(paymentId);
  if (!payment) return null;

  payment.status = status;
  payment.verifiedBy = adminId;
  payment.verifiedAt = Date.now();
  payment.updatedAt = Date.now();
  if (notes) payment.notes = notes;

  payments.set(paymentId, payment);
  safeWriteFile(path.join(DB_DIR, 'payments.json'), Array.from(payments.values()));
  return payment;
}

// -------------------------------------------------------------
// ADMIN AUDIT LOG
// -------------------------------------------------------------

export function logAdminAction(
  action: string,
  adminId: string,
  targetId?: string,
  details?: Record<string, any>,
  ip?: string
): void {
  const log: AdminAuditLog = {
    id: `log_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    action,
    adminId,
    targetId,
    details,
    timestamp: Date.now(),
    ip,
  };

  auditLogs.push(log);
  if (auditLogs.length > 500) {
    auditLogs.shift();
  }
  safeWriteFile(path.join(DB_DIR, 'audit_logs.json'), auditLogs);
}

export function getAdminAuditLogs(limit = 100): AdminAuditLog[] {
  return [...auditLogs].reverse().slice(0, limit);
}
