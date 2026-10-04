import dotenv from 'dotenv';
dotenv.config({ override: true });
import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { callAI, streamAI, ChatMessageParam } from './server/lib/aiProvider.js';
import { TOOL_DEFINITIONS } from './server/tools/definitions.js';
import {
  executeFileOperation,
  saveProcessedFile,
  fileStore,
  cleanupExpiredFiles,
  FILE_TTL_MS,
  FILE_TTL_MINUTES,
} from './server/services/fileProcessor.js';
import { ToolRegistry } from './server/tools/registry.js';
import { executeWorkflow } from './server/services/workflowRunner.js';
import {
  rateLimiter,
  validateUploadedFiles,
  adminLoginRateLimiter,
  applySecurityHeaders,
} from './server/middleware/security.js';
import { processWhatsAppMessage, verifyWhatsAppAuth } from './server/services/whatsappService.js';
import { validateAndSanitizeToolCall } from './server/services/toolValidator.js';
import { checkLimit, recordUsage, getUsageSummary } from './server/services/usageService.js';
import {
  getPricingPlans,
  getSubscription,
  createCheckoutSession,
  redeemCodeOrTransaction,
  startFreeTrial,
  getOrCreateUserReferral,
  claimReferralCode,
  PlanId,
} from './server/services/billingService.js';
import { transcribeAudio } from './server/services/audioService.js';
import {
  getSystemMetrics,
  trackEvent,
  incrementRequestCount,
  authenticateAdmin,
  verifyAdminSession,
  invalidateAdminSession,
  adminVerifyPayment,
} from './server/services/adminService.js';
import {
  initPersistence,
  getAdminAuditLogs,
} from './server/services/persistenceService.js';
import { getActivePaymentProvider } from './server/services/paymentProvider.js';

// Section 3: Safe Session Secret Validation
if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  console.error('FATAL CONFIGURATION ERROR: SESSION_SECRET environment variable is required in production.');
  process.exit(1);
}

const PORT = parseInt(process.env.PORT || '3000', 10);
const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '100', 10);
const MAX_TOTAL_UPLOAD_MB = parseInt(process.env.MAX_TOTAL_UPLOAD_MB || '100', 10);

// Multer memory storage for direct processing in buffer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024,
  },
});

/**
 * Safely decodes Firebase ID Token payload without throwing errors or exposing secrets
 */
function parseFirebaseToken(authHeader?: string): { uid: string; email?: string } | undefined {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return undefined;
  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token) return undefined;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return undefined;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (payload && (payload.user_id || payload.sub)) {
      return {
        uid: payload.user_id || payload.sub,
        email: payload.email,
      };
    }
  } catch {
    return undefined;
  }
  return undefined;
}

/**
 * Helper to extract admin session token from Cookie or Authorization header
 */
function getAdminToken(req: express.Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split('Bearer ')[1].trim();
  }
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const match = cookieHeader.match(/khang_admin_session=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  const customHeader = req.headers['x-admin-token'] as string;
  if (customHeader) return customHeader.trim();
  return undefined;
}

/**
 * Resolves user identity, server-verified Pro status, and active plan tier
 */
function resolveUserContext(req: express.Request): {
  id: string;
  isPro: boolean;
  tier: 'free' | 'pro_student' | 'pro_business';
  email?: string;
} {
  const user = (req as any).user;
  if (user?.uid) {
    const sub = getSubscription(user.uid);
    const isPro = (sub.status === 'active' || sub.status === 'trialing') && sub.planId !== 'free';
    return {
      id: user.uid,
      isPro,
      tier: sub.planId,
      email: user.email,
    };
  }

  // Fallback to client IP
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'guest_user';
  const sub = getSubscription(ip);
  return {
    id: ip,
    isPro: (sub.status === 'active' || sub.status === 'trialing') && sub.planId !== 'free',
    tier: sub.planId,
  };
}

async function startServer() {
  // Initialize persistent disk store
  initPersistence();

  const app = express();

  // Apply secure HTTP response headers
  app.use(applySecurityHeaders);

  // Keep JSON body parser strict
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // Ensure all /api responses default to JSON
  app.use('/api', (req, res, next) => {
    incrementRequestCount();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
  });

  // Dynamic robots.txt using canonical configured production domain
  app.get('/robots.txt', (req, res) => {
    const siteUrl = process.env.PUBLIC_SITE_URL || 'https://khang.pk';
    res.type('text/plain');
    res.send(`User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${siteUrl}/sitemap.xml\n`);
  });

  // Dynamic sitemap.xml using canonical configured production domain
  app.get('/sitemap.xml', (req, res) => {
    const siteUrl = process.env.PUBLIC_SITE_URL || 'https://khang.pk';
    const now = new Date().toISOString().split('T')[0];
    res.type('application/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}/</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`);
  });

  // Safe health check endpoint (no secrets, DB and service health)
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'Khan G AI Production System',
      version: '2.5.0',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      database: {
        status: 'connected',
        type: 'firestore_persistent',
      },
      storage: {
        status: 'healthy',
        activeFilesCount: fileStore.size,
      },
    });
  });

  // Server Status & Metadata
  app.get('/api/status', (req, res) => {
    const activeProvider = process.env.AI_PROVIDER || 'gemini';
    const pricing = getPricingPlans();
    res.json({
      status: 'ok',
      siteName: 'Khan G AI',
      tagline: 'Your AI assistant for work, study and everyday life.',
      activeProvider,
      geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
      groqKeyConfigured: Boolean(process.env.GROQ_API_KEY),
      openRouterKeyConfigured: Boolean(process.env.OPENROUTER_API_KEY),
      mistralKeyConfigured: Boolean(process.env.MISTRAL_API_KEY),
      deepseekKeyConfigured: Boolean(process.env.DEEPSEEK_API_KEY),
      maxFileSizeMB: MAX_FILE_SIZE_MB,
      maxTotalUploadMB: MAX_TOTAL_UPLOAD_MB,
      fileTtlMinutes: FILE_TTL_MINUTES,
      rateLimitPerHour: parseInt(process.env.RATE_LIMIT_PER_HOUR || '30', 10),
      activeFilesCount: fileStore.size,
      supportedToolsCount: TOOL_DEFINITIONS.length,
      pricing: {
        currency: pricing.currency,
        paymentProvider: pricing.paymentProvider,
      },
    });
  });

  // Available Tools Metadata Endpoint
  app.get('/api/tools', (req, res) => {
    res.json({
      tools: TOOL_DEFINITIONS.map((t) => ({
        name: t.function.name,
        description: t.function.description,
        parameters: t.function.parameters,
      })),
    });
  });

  // Central Tool Registry Catalog Endpoint (All 100 Tools)
  app.get('/api/registry/tools', (req, res) => {
    const allTools = ToolRegistry.getAllTools().map((t) => ({
      id: t.id,
      name: t.name,
      category: t.category,
      description: t.description,
      status: t.status,
      isAiCallable: t.isAiCallable,
      unavailableReason: t.unavailableReason,
      outputType: t.outputType,
      chainable: t.chainable,
      requiresUpload: t.requiresUpload,
    }));
    res.json({ tools: allTools, count: allTools.length });
  });

  // Middleware to attach authenticated Firebase user token
  const attachUser = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    (req as any).user = parseFirebaseToken(req.headers.authorization);
    next();
  };

  // User Quota & Usage Endpoint
  app.get('/api/usage', attachUser, (req, res) => {
    const user = resolveUserContext(req);
    const summary = getUsageSummary(user.id, user.isPro, user.tier);
    res.json({ success: true, ...summary });
  });

  // Billing Plans Endpoint
  app.get('/api/billing/plans', (req, res) => {
    res.json({ success: true, ...getPricingPlans() });
  });

  // User Subscription Verification Endpoint (Server-enforced)
  app.get('/api/billing/subscription', attachUser, (req, res) => {
    const user = resolveUserContext(req);
    const subscription = getSubscription(user.id);
    res.json({ success: true, subscription });
  });

  // Create Checkout Session
  app.post('/api/billing/create-checkout', attachUser, async (req, res) => {
    try {
      const user = resolveUserContext(req);
      const planId = (req.body.planId || 'pro_student') as PlanId;
      const interval = req.body.interval === 'yearly' ? 'yearly' : 'monthly';
      const checkout = await createCheckoutSession(user.id, planId, interval, user.email);
      res.json({ success: true, ...checkout });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Checkout initialization failed.' });
    }
  });

  // Redeem Activation Code or Submit Transaction ID for verification
  app.post('/api/billing/redeem', attachUser, (req, res) => {
    const user = resolveUserContext(req);
    const code = req.body.code || '';
    const result = redeemCodeOrTransaction(user.id, code);
    if (!result.success) {
      return res.status(400).json(result);
    }
    trackEvent('pro_code_redeemed', { userId: user.id, status: result.status });
    res.json(result);
  });

  // Start 3-Day Free Trial
  app.post('/api/billing/free-trial', attachUser, (req, res) => {
    const user = resolveUserContext(req);
    const result = startFreeTrial(user.id);
    if (!result.success) {
      return res.status(400).json(result);
    }
    trackEvent('free_trial_started', { userId: user.id });
    res.json(result);
  });

  // Get User Referral Code and Stats
  app.get('/api/referral/info', attachUser, (req, res) => {
    const user = resolveUserContext(req);
    const info = getOrCreateUserReferral(user.id);
    res.json({ success: true, ...info });
  });

  // Claim Referral Code
  app.post('/api/referral/claim', attachUser, (req, res) => {
    const user = resolveUserContext(req);
    const code = req.body.code || '';
    const result = claimReferralCode(user.id, code);
    if (!result.success) {
      return res.status(400).json(result);
    }
    trackEvent('referral_claimed', { userId: user.id, code });
    res.json(result);
  });

  // Payment Webhook (Stripe or custom provider)
  app.post('/api/billing/webhook', async (req, res) => {
    try {
      const provider = getActivePaymentProvider();
      const signature = req.headers['stripe-signature'] as string;
      const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      const result = await provider.verifyWebhook(rawBody, signature);
      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }
      res.json({ received: true, ...result });
    } catch (err: any) {
      res.status(500).json({ error: 'Webhook processing error' });
    }
  });

  // -----------------------------------------------------------
  // ADMIN AUTHENTICATION & MANAGEMENT (Protected by Server-Side Session)
  // -----------------------------------------------------------

  // Admin Login (Rate limited)
  app.post('/api/admin/login', adminLoginRateLimiter, (req, res) => {
    const key = req.body.key || req.body.password;
    const authResult = authenticateAdmin(key, req.ip);

    if (!authResult.success) {
      return res.status(401).json(authResult);
    }

    // Set secure HTTP-only cookie
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('khang_admin_session', authResult.sessionToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 12 * 3600 * 1000,
    });

    res.json({
      success: true,
      token: authResult.sessionToken,
      message: 'Admin session established.',
    });
  });

  // Check Admin Session
  app.get('/api/admin/session', (req, res) => {
    const token = getAdminToken(req);
    const isAuthenticated = verifyAdminSession(token);
    res.json({ authenticated: isAuthenticated });
  });

  // Admin Logout
  app.post('/api/admin/logout', (req, res) => {
    const token = getAdminToken(req);
    invalidateAdminSession(token, req.ip);
    res.clearCookie('khang_admin_session');
    res.json({ success: true, message: 'Admin logged out.' });
  });

  // Middleware to require verified admin session
  const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const token = getAdminToken(req);
    if (!verifyAdminSession(token)) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'A valid authenticated Admin session is required.',
      });
    }
    next();
  };

  // Protected Admin Metrics & Telemetry
  app.get('/api/admin/metrics', requireAdmin, (req, res) => {
    res.json({ success: true, ...getSystemMetrics() });
  });

  // Protected Admin Audit Logs
  app.get('/api/admin/audit-logs', requireAdmin, (req, res) => {
    res.json({ success: true, logs: getAdminAuditLogs(100) });
  });

  // Protected Payment / Transaction Verification
  app.post('/api/admin/verify-payment', requireAdmin, (req, res) => {
    const { paymentId, approve, notes } = req.body || {};
    if (!paymentId) return res.status(400).json({ error: 'paymentId required' });
    const result = adminVerifyPayment(paymentId, Boolean(approve), 'admin', notes);
    if (!result.success) return res.status(404).json(result);
    res.json(result);
  });

  // Privacy-Friendly Analytics Event Logging
  app.post('/api/analytics/event', (req, res) => {
    const { eventName, metadata } = req.body || {};
    if (eventName && typeof eventName === 'string') {
      trackEvent(eventName.slice(0, 50), metadata);
    }
    res.json({ success: true });
  });

  // Audio File Transcription Endpoint
  app.post('/api/audio/transcribe', attachUser, upload.single('audio'), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ success: false, error: 'No audio file provided.' });
      }
      const result = await transcribeAudio(file.buffer, file.originalname, file.mimetype);
      if (!result.success) {
        return res.status(503).json(result);
      }
      trackEvent('audio_transcribed', { originalName: file.originalname });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: 'Audio transcription error' });
    }
  });

  // Academic Study & Revision Plan Generator Endpoint
  app.post('/api/study/plan', attachUser, async (req, res) => {
    try {
      const { subject, grade, board, examDate, targetScore, topics } = req.body || {};
      const prompt = `Create an elite, structured study, exam preparation, and revision plan for:
- Subject: ${subject || 'General'}
- Grade / Level: ${grade || 'FSc / Inter'}
- Education Board / Curriculum: ${board || 'Federal / BISE Punjab / Cambridge'}
- Target Exam: ${examDate || 'Upcoming Exam'} (Target: ${targetScore || 'Topper / 90%+'})
- Specific Topics: ${topics || 'All high-yield chapters'}

Format clearly with:
### 📅 1. High-Yield Revision Schedule
### 🎯 2. Board / Entry-Test Repeated Concepts
### 💡 3. Active Recall & MCQ Mastery Strategy
### ⚠️ 4. Common Examination Mistakes & Fixes`;

      const aiRes = await callAI([{ role: 'user', content: prompt }]);
      trackEvent('study_plan_generated', { subject, grade });
      res.json({ success: true, plan: aiRes.text || 'Study plan generated.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: 'Failed to generate study plan' });
    }
  });

  // Real-Time Streaming Chat Endpoint (Server-Sent Events)
  app.post('/api/chat/stream', attachUser, upload.array('files', 10), async (req, res) => {
    const user = resolveUserContext(req);
    const messageLimit = checkLimit(user.id, 'message', user.isPro, user.tier);
    if (!messageLimit.allowed) {
      return res.status(429).json({
        error: 'Quota Exceeded',
        message: `You have reached your daily limit of ${messageLimit.limit} AI messages. Upgrade to Khan G Student Pro for 500 messages/day.`,
        isQuotaExceeded: true,
        resetAt: messageLimit.resetAt,
      });
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if ((res as any).flushHeaders) {
      (res as any).flushHeaders();
    }

    let isAborted = false;
    req.on('close', () => {
      isAborted = true;
    });

    try {
      const messageText = (req.body.message || '').trim().slice(0, 20000);
      const rawHistory = req.body.history;
      const uploadedFiles = (req.files as Express.Multer.File[]) || [];

      const messages: ChatMessageParam[] = [];
      if (rawHistory) {
        try {
          const parsed = typeof rawHistory === 'string' ? JSON.parse(rawHistory) : rawHistory;
          if (Array.isArray(parsed)) {
            for (const item of parsed.slice(-6)) {
              if (item.sender === 'user') messages.push({ role: 'user', content: item.text });
              else if (item.sender === 'bot') messages.push({ role: 'assistant', content: item.text });
            }
          }
        } catch {}
      }

      messages.push({
        role: 'user',
        content: messageText || (uploadedFiles.length > 0 ? `I uploaded ${uploadedFiles.map(f => f.originalname).join(', ')}.` : 'Hello'),
      });

      const fileMetaList = uploadedFiles.map((f) => ({
        name: f.originalname,
        type: f.mimetype,
        size: f.size,
      }));

      const stream = streamAI(messages, TOOL_DEFINITIONS, { uploadedFiles: fileMetaList });

      for await (const chunk of stream) {
        if (isAborted) break;
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }

      recordUsage(user.id, 'message');
      trackEvent('message_streamed', { userId: user.id });
      if (!isAborted) {
        res.write('data: [DONE]\n\n');
        res.end();
      }
    } catch (err: any) {
      if (!isAborted) {
        res.write(`data: ${JSON.stringify({ type: 'error', error: 'Streaming processing error' })}\n\n`);
        res.end();
      }
    }
  });

  // Total request payload pre-check to prevent abuse
  const checkTotalPayloadSize = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const contentLength = req.headers['content-length'];
    if (contentLength && parseInt(contentLength, 10) > MAX_TOTAL_UPLOAD_MB * 1024 * 1024) {
      return res.status(413).json({
        error: 'Payload Too Large',
        message: `Total upload size exceeds the maximum allowed payload of ${MAX_TOTAL_UPLOAD_MB}MB.`,
      });
    }
    next();
  };

  // Chained Multi-Tool Workflow Execution Route
  app.post(
    '/api/workflow/execute',
    attachUser,
    rateLimiter,
    checkTotalPayloadSize,
    upload.array('files', 10),
    validateUploadedFiles,
    async (req, res) => {
      try {
        const userCtx = resolveUserContext(req);
        let workflowSteps: any[] = [];
        try {
          const raw = req.body.workflowSteps;
          workflowSteps = typeof raw === 'string' ? JSON.parse(raw) : raw;
        } catch {
          return res.status(400).json({ success: false, message: 'Invalid workflow steps format.' });
        }

        if (!Array.isArray(workflowSteps) || workflowSteps.length === 0) {
          return res.status(400).json({ success: false, message: 'Workflow steps must be a non-empty array.' });
        }

        const uploadedFiles = (req.files as Express.Multer.File[]) || [];
        const result = await executeWorkflow(
          workflowSteps,
          uploadedFiles,
          userCtx.id,
          userCtx.isPro,
          userCtx.tier
        );

        const processedFilesData = (result.files || []).map((file: any) => ({
          id: file.id,
          originalName: file.originalName,
          processedName: file.processedName,
          mimeType: file.mimeType,
          size: file.size,
          originalSize: file.originalSize,
          operation: file.operation,
          savingsPercent: file.savingsPercent,
          downloadUrl: `/api/download/${file.id}`,
          expiresAt: file.expiresAt,
          previewText: file.previewText,
          isImage: file.isImage,
        }));

        return res.json({
          ...result,
          files: processedFilesData,
        });
      } catch (err: any) {
        console.error('Workflow execution error:', err);
        return res.status(500).json({
          success: false,
          message: 'An error occurred during workflow execution: ' + (err?.message || 'Server error'),
        });
      }
    }
  );

  // Main Chat & File Processing API Route
  app.post(
    '/api/chat',
    attachUser,
    rateLimiter,
    checkTotalPayloadSize,
    upload.array('files', 10),
    validateUploadedFiles,
    async (req, res) => {
      try {
        const messageText = (req.body.message || '').trim().slice(0, 20000);
        const rawHistory = req.body.history;
        const uploadedFiles = (req.files as Express.Multer.File[]) || [];
        const user = (req as any).user;
        const userCtx = resolveUserContext(req);

        // Server-enforced daily message quota check
        const msgLimit = checkLimit(userCtx.id, 'message', userCtx.isPro, userCtx.tier);
        if (!msgLimit.allowed) {
          return res.status(429).json({
            error: 'Quota Exceeded',
            message: `You have reached your daily limit of ${msgLimit.limit} AI messages. Upgrade to Khan G Student Pro for 500 messages/day.`,
            isQuotaExceeded: true,
            resetAt: msgLimit.resetAt,
          });
        }

        // Build chat history for AI model
        const messages: ChatMessageParam[] = [];
        if (rawHistory) {
          try {
            const parsed = typeof rawHistory === 'string' ? JSON.parse(rawHistory) : rawHistory;
            if (Array.isArray(parsed)) {
              for (const item of parsed.slice(-6)) {
                if (item.sender === 'user') {
                  messages.push({ role: 'user', content: item.text });
                } else if (item.sender === 'bot') {
                  messages.push({ role: 'assistant', content: item.text });
                }
              }
            }
          } catch {}
        }

        messages.push({
          role: 'user',
          content: messageText || (uploadedFiles.length > 0 ? `I uploaded ${uploadedFiles.map(f => f.originalname).join(', ')}. What can you do with this?` : 'Hello'),
        });

        const fileMetaList = uploadedFiles.map((f) => ({
          name: f.originalname,
          type: f.mimetype,
          size: f.size,
        }));

        const aiResult = await callAI(messages, TOOL_DEFINITIONS, {
          uploadedFiles: fileMetaList,
        });

        // Multi-Step Workflow Plan response
        if (aiResult.type === 'workflow_plan' && aiResult.workflowSteps) {
          recordUsage(userCtx.id, 'message');
          trackEvent('workflow_plan_generated', { stepsCount: aiResult.workflowSteps.length });
          return res.json({
            type: 'workflow_plan',
            workflowPlan: {
              steps: aiResult.workflowSteps,
            },
            message: aiResult.text,
            text: aiResult.text,
            files: [],
            providerUsed: aiResult.provider,
          });
        }

        if (aiResult.type === 'tool_call' && aiResult.name) {
          const registeredTool = ToolRegistry.getTool(aiResult.name);
          if (registeredTool && !registeredTool.requiresUpload && registeredTool.handler) {
            recordUsage(userCtx.id, 'message');
            const handlerRes = await registeredTool.handler(aiResult.args || {}, uploadedFiles);
            let processedFilesData: any[] = [];
            if (handlerRes.outputBuffer) {
              const record = saveProcessedFile(
                handlerRes.outputBuffer,
                handlerRes.outputName || `${aiResult.name}.png`,
                handlerRes.outputName || `${aiResult.name}.png`,
                handlerRes.outputMimeType || 'image/png',
                registeredTool.name,
                true
              );
              processedFilesData = [{
                id: record.id,
                originalName: record.originalName,
                processedName: record.processedName,
                mimeType: record.mimeType,
                size: record.size,
                downloadUrl: `/api/download/${record.id}`,
                expiresAt: record.expiresAt,
                isImage: record.isImage,
              }];
            }
            return res.json({
              type: 'tool_call',
              toolCall: {
                name: registeredTool.name,
                args: aiResult.args || {},
              },
              message: handlerRes.message,
              text: handlerRes.message,
              files: processedFilesData,
              providerUsed: aiResult.provider,
              nextStepSuggestions: registeredTool.nextStepSuggestions || [],
            });
          }

          if (uploadedFiles.length === 0) {
            const promptMsg = 'Please upload the file you want me to process, and tell me what you would like me to do with it.';
            return res.json({
              type: 'message',
              message: promptMsg,
              text: promptMsg,
              files: [],
              providerUsed: aiResult.provider,
              isClarification: true,
            });
          }

          const validation = validateAndSanitizeToolCall(
            aiResult.name,
            aiResult.args || {},
            uploadedFiles.length
          );

          if (!validation.isValid) {
            return res.json({
              type: 'message',
              message: validation.errorMessage || 'Invalid parameters requested for this tool.',
              text: validation.errorMessage || 'Invalid parameters requested for this tool.',
              files: [],
              providerUsed: aiResult.provider,
              isClarification: true,
            });
          }

          const fileOpLimit = checkLimit(userCtx.id, 'file_operation', userCtx.isPro, userCtx.tier);
          if (!fileOpLimit.allowed) {
            return res.status(429).json({
              error: 'File Operation Quota Exceeded',
              message: `You have reached your daily limit of ${fileOpLimit.limit} file transformations. Upgrade to Khan G Student Pro for 100 transformations/day.`,
              isQuotaExceeded: true,
              resetAt: fileOpLimit.resetAt,
            });
          }

          const operationResult = await executeFileOperation({
            files: uploadedFiles,
            toolName: aiResult.name,
            args: validation.sanitizedArgs,
            userText: messageText,
            userId: user?.uid,
          });

          recordUsage(userCtx.id, 'file_operation');
          recordUsage(userCtx.id, 'message');
          trackEvent('file_operation_executed', { toolName: aiResult.name });

          const processedFilesData = operationResult.files.map((file) => ({
            id: file.id,
            originalName: file.originalName,
            processedName: file.processedName,
            mimeType: file.mimeType,
            size: file.size,
            originalSize: file.originalSize,
            operation: file.operation,
            savingsPercent: file.savingsPercent,
            downloadUrl: `/api/download/${file.id}`,
            expiresAt: file.expiresAt,
            previewText: file.previewText,
            isImage: file.isImage,
          }));

          return res.json({
            type: 'tool_call',
            toolCall: {
              name: aiResult.name,
              args: validation.sanitizedArgs,
            },
            message: operationResult.message,
            text: operationResult.message,
            files: processedFilesData,
            providerUsed: aiResult.provider,
            isClarification: operationResult.clarification,
            nextStepSuggestions: ToolRegistry.getTool(aiResult.name)?.nextStepSuggestions || [],
          });
        }

        recordUsage(userCtx.id, 'message');
        trackEvent('message_sent', { userId: userCtx.id });

        const responseText = aiResult.text || (uploadedFiles.length === 0 ? 'Please upload a file and tell me what you want me to do.' : 'How can I assist you with your files today?');
        return res.json({
          type: 'message',
          message: responseText,
          text: responseText,
          files: [],
          providerUsed: aiResult.provider,
        });
      } catch (err: any) {
        console.error('API /api/chat error:', err);
        const sanitizedMsg = 'An error occurred while processing your file request. Please verify the file is not corrupted and try again.';
        return res.status(500).json({
          error: 'Processing error',
          message: sanitizedMsg,
          text: sanitizedMsg,
        });
      }
    }
  );

  // =========================================================================
  // WhatsApp Agent & Bot Integration Routes
  // =========================================================================
  // Webhook verification challenge (Meta WhatsApp Cloud API standard handshake)
  app.get('/api/whatsapp/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || process.env.WHATSAPP_API_KEY;

    if (mode === 'subscribe' && (token === expectedToken || !expectedToken)) {
      return res.status(200).send(challenge);
    }
    return res.status(403).json({ error: 'Forbidden', message: 'Invalid verify token.' });
  });

  // WhatsApp Message Receiver & Autonomous AI Agent Endpoint
  app.post(['/api/whatsapp/webhook', '/api/whatsapp/chat'], express.json(), async (req, res) => {
    const authHeader = (req.headers['authorization'] || req.headers['x-whatsapp-api-key']) as string | undefined;
    const queryKey = req.query['apiKey'] as string | undefined;
    const providedKey = authHeader || queryKey;

    if (!verifyWhatsAppAuth(providedKey)) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid or missing WhatsApp API key. Pass Header "x-whatsapp-api-key" or "Authorization: Bearer <key>".',
      });
    }

    let from = req.body.from || 'whatsapp-user';
    let message = req.body.message || '';
    let name = req.body.name || '';

    // Handle Meta WhatsApp Cloud API nested webhook format
    if (req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
      const msgObj = req.body.entry[0].changes[0].value.messages[0];
      from = msgObj.from;
      message = msgObj.text?.body || '';
      name = req.body.entry[0].changes[0].value.contacts?.[0]?.profile?.name || '';
    }

    const response = await processWhatsAppMessage({ from, message, name });
    return res.json(response);
  });

  // File Download Route
  app.get('/api/download/:fileId', (req, res) => {
    const fileId = req.params.fileId;

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(fileId)) {
      return res.status(400).json({
        error: 'Invalid file ID',
        message: 'The requested file identifier is malformed.',
      });
    }

    const record = fileStore.get(fileId);

    if (!record) {
      return res.status(404).json({
        error: 'File not found',
        message: 'This file does not exist or has expired. Files are automatically deleted after 60 minutes for your privacy and security.',
      });
    }

    if (Date.now() > record.expiresAt) {
      fileStore.delete(fileId);
      if (fs.existsSync(record.filePath)) {
        try { fs.unlinkSync(record.filePath); } catch {}
      }
      return res.status(410).json({
        error: 'File expired',
        message: 'This download link has expired (60 minute TTL reached). Please upload and process the file again.',
      });
    }

    const resolvedPath = path.resolve(record.filePath);
    const processedDir = path.resolve(process.cwd(), '.tmp_storage', 'processed');
    if (!resolvedPath.startsWith(processedDir)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Invalid file storage location.',
      });
    }

    if (record.userId) {
      const user = parseFirebaseToken(req.headers.authorization);
      if (user && user.uid !== record.userId) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have permission to download this file.',
        });
      }
    }

    if (!fs.existsSync(record.filePath)) {
      return res.status(404).json({
        error: 'File missing',
        message: 'The requested file could not be located on the server disk.',
      });
    }

    const sanitizedName = record.processedName.replace(/[\r\n"']/g, '_');
    res.setHeader('Content-Type', record.mimeType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${sanitizedName}"; filename*=UTF-8''${encodeURIComponent(record.processedName)}`
    );
    res.setHeader('Content-Length', record.size);

    const stream = fs.createReadStream(record.filePath);
    stream.pipe(res);
  });

  // Cleanup trigger endpoint
  app.post('/api/cleanup', (req, res) => {
    cleanupExpiredFiles();
    res.json({
      success: true,
      message: 'Expired files cleanup completed.',
      remainingFiles: fileStore.size,
    });
  });

  // Catch-all 404 for /api routes
  app.all(['/api', '/api/*'], (req, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: `API endpoint ${req.method} ${req.path} not found.`,
    });
  });

  // Error-handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.startsWith('/api') || req.path === '/api' || req.headers.accept?.includes('application/json')) {
      const statusCode = err.status || err.statusCode || (err.name === 'MulterError' ? 400 : 500);
      let errMsg = 'An error occurred during request processing.';
      if (err.code === 'LIMIT_FILE_SIZE') {
        errMsg = `File exceeds the ${MAX_FILE_SIZE_MB}MB size limit.`;
      } else if (err.message && !err.message.includes('/') && !err.message.includes('\\')) {
        errMsg = err.message;
      }
      return res.status(statusCode).json({
        success: false,
        error: err.name || 'Error',
        message: errMsg,
        text: errMsg,
      });
    }
    next(err);
  });

  // Vite middleware vs Static production build
  const distPath = path.join(process.cwd(), 'dist');
  const hasDist = fs.existsSync(path.join(distPath, 'index.html'));

  if (process.env.NODE_ENV === 'production' || hasDist) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Khan G AI server running on http://0.0.0.0:${PORT}`);
    cleanupExpiredFiles();
    setInterval(cleanupExpiredFiles, 10 * 60 * 1000);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
});
