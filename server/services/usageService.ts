import {
  getUsageRecord,
  saveUsageRecord,
  UserUsageRecord,
} from './persistenceService.js';

export interface UsageQuota {
  messagesUsedToday: number;
  messagesLimit: number;
  messagesRemaining: number;
  fileOpsUsedToday: number;
  fileOpsLimit: number;
  fileOpsRemaining: number;
  voiceMinutesUsedToday: number;
  voiceMinutesLimit: number;
  voiceMinutesRemaining: number;
  maxFileSizeMB: number;
  maxOutputTokens: number;
  isPro: boolean;
  plan: 'free' | 'pro_student' | 'pro_business';
  resetAt: number;
}

// Helper to get today's date string in UTC (YYYY-MM-DD)
function getTodayDateString(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

// Helper to calculate milliseconds until midnight UTC
function getMidnightUtcTimestamp(): number {
  const now = new Date();
  const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
  return midnight.getTime();
}

/**
 * Returns centralized configuration for Free vs Pro limits from environment variables
 */
export function getLimitsConfig(isPro: boolean, tier: 'free' | 'pro_student' | 'pro_business' = 'free') {
  if (isPro) {
    const isBusiness = tier === 'pro_business';
    return {
      messagesLimit: parseInt(process.env.PRO_MESSAGES_PER_DAY || (isBusiness ? '2000' : '500'), 10),
      fileOpsLimit: parseInt(process.env.PRO_FILE_OPERATIONS_PER_DAY || (isBusiness ? '500' : '100'), 10),
      voiceMinutesLimit: parseInt(process.env.PRO_VOICE_MINUTES || '60', 10),
      maxFileSizeMB: parseInt(process.env.PRO_MAX_FILE_SIZE_MB || (isBusiness ? '200' : '100'), 10),
      maxOutputTokens: parseInt(process.env.PRO_MAX_OUTPUT_TOKENS || '4096', 10),
    };
  }

  return {
    messagesLimit: parseInt(process.env.FREE_MESSAGES_PER_DAY || '30', 10),
    fileOpsLimit: parseInt(process.env.FREE_FILE_OPERATIONS_PER_DAY || '5', 10),
    voiceMinutesLimit: parseInt(process.env.FREE_VOICE_MINUTES || '5', 10),
    maxFileSizeMB: parseInt(process.env.FREE_MAX_FILE_SIZE_MB || '25', 10),
    maxOutputTokens: parseInt(process.env.FREE_MAX_OUTPUT_TOKENS || '2048', 10),
  };
}

/**
 * Retrieves the persistent usage record for an identifier (userId or IP)
 */
function getRecord(identifier: string): UserUsageRecord {
  const today = getTodayDateString();
  return getUsageRecord(identifier, today);
}

/**
 * Checks if a user has remaining quota for a specific operation
 */
export function checkLimit(
  identifier: string,
  type: 'message' | 'file_operation' | 'voice',
  isPro: boolean,
  tier: 'free' | 'pro_student' | 'pro_business' = 'free'
): { allowed: boolean; remaining: number; limit: number; resetAt: number } {
  const record = getRecord(identifier);
  const limits = getLimitsConfig(isPro, tier);
  const resetAt = getMidnightUtcTimestamp();

  if (type === 'message') {
    const remaining = Math.max(0, limits.messagesLimit - record.messagesCount);
    return {
      allowed: record.messagesCount < limits.messagesLimit,
      remaining,
      limit: limits.messagesLimit,
      resetAt,
    };
  }

  if (type === 'file_operation') {
    const remaining = Math.max(0, limits.fileOpsLimit - record.fileOpsCount);
    return {
      allowed: record.fileOpsCount < limits.fileOpsLimit,
      remaining,
      limit: limits.fileOpsLimit,
      resetAt,
    };
  }

  // Voice check
  const remaining = Math.max(0, limits.voiceMinutesLimit - Math.floor(record.messagesCount / 5));
  return {
    allowed: remaining > 0,
    remaining,
    limit: limits.voiceMinutesLimit,
    resetAt,
  };
}

/**
 * Increments the persistent usage counter for a given operation type
 */
export function recordUsage(
  identifier: string,
  type: 'message' | 'file_operation'
): UserUsageRecord {
  const record = getRecord(identifier);
  if (type === 'message') {
    record.messagesCount += 1;
  } else if (type === 'file_operation') {
    record.fileOpsCount += 1;
  }
  record.lastUpdated = Date.now();
  saveUsageRecord(record);
  return record;
}

/**
 * Returns a complete quota summary object for a user
 */
export function getUsageSummary(
  identifier: string,
  isPro: boolean,
  tier: 'free' | 'pro_student' | 'pro_business' = 'free'
): UsageQuota {
  const record = getRecord(identifier);
  const limits = getLimitsConfig(isPro, tier);
  const resetAt = getMidnightUtcTimestamp();

  return {
    messagesUsedToday: record.messagesCount,
    messagesLimit: limits.messagesLimit,
    messagesRemaining: Math.max(0, limits.messagesLimit - record.messagesCount),
    fileOpsUsedToday: record.fileOpsCount,
    fileOpsLimit: limits.fileOpsLimit,
    fileOpsRemaining: Math.max(0, limits.fileOpsLimit - record.fileOpsCount),
    voiceMinutesUsedToday: Math.min(limits.voiceMinutesLimit, Math.floor(record.messagesCount / 6)),
    voiceMinutesLimit: limits.voiceMinutesLimit,
    voiceMinutesRemaining: Math.max(0, limits.voiceMinutesLimit - Math.floor(record.messagesCount / 6)),
    maxFileSizeMB: limits.maxFileSizeMB,
    maxOutputTokens: limits.maxOutputTokens,
    isPro,
    plan: isPro ? tier : 'free',
    resetAt,
  };
}
