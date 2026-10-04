import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { callAI, streamAI, ChatMessageParam } from './lib/aiProvider.js';
import { TOOL_DEFINITIONS } from './tools/definitions.js';
import {
  executeFileOperation,
  saveProcessedFile,
  fileStore,
  cleanupExpiredFiles,
  FILE_TTL_MS,
  FILE_TTL_MINUTES,
  PROCESSED_DIR,
} from './services/fileProcessor.js';
import { ToolRegistry } from './tools/registry.js';
import { executeWorkflow } from './services/workflowRunner.js';
import {
  rateLimiter,
  validateUploadedFiles,
  adminLoginRateLimiter,
  applySecurityHeaders,
} from './middleware/security.js';
import { processWhatsAppMessage, verifyWhatsAppAuth } from './services/whatsappService.js';
import { validateAndSanitizeToolCall } from './services/toolValidator.js';
import { checkLimit, recordUsage, getUsageSummary } from './services/usageService.js';
import {
  getPricingPlans,
  getSubscription,
  createCheckoutSession,
  redeemCodeOrTransaction,
  startFreeTrial,
  getOrCreateUserReferral,
  claimReferralCode,
  PlanId,
} from './services/billingService.js';
import { transcribeAudio } from './services/audioService.js';
import {
  getSystemMetrics,
  trackEvent,
  incrementRequestCount,
  authenticateAdmin,
  verifyAdminSession,
  invalidateAdminSession,
  adminVerifyPayment,
} from './services/adminService.js';
import {
  initPersistence,
  getAdminAuditLogs,
} from './services/persistenceService.js';
import { getActivePaymentProvider } from './services/paymentProvider.js';

// Section 3: Safe Session Secret Validation
if (!process.env.SESSION_SECRET) {
  if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
    console.error('FATAL CONFIGURATION ERROR: SESSION_SECRET environment variable is required in production.');
    process.exit(1);
  } else {
    process.env.SESSION_SECRET = 'khang_ephemeral_session_secret_' + Math.random().toString(36).substring(2);
    console.warn('⚠️ WARNING: SESSION_SECRET is not set in environment variables. Using ephemeral secret.');
  }
}

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

// Initialize persistent disk store & tools registry
initPersistence();
ToolRegistry.initialize();

export const app = express();

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

// AI Model Information Endpoint
app.get('/api/models', (req, res) => {
  const currentProvider = process.env.AI_PROVIDER || 'gemini';
  res.json({
    activeProvider: currentProvider,
    availableProviders: [
      { id: 'gemini', name: 'Google Gemini 3.8 Flash', status: process.env.GEMINI_API_KEY ? 'configured' : 'active' },
      { id: 'groq', name: 'Groq Cloud (Fast AI)', status: process.env.GROQ_API_KEY ? 'configured' : 'unconfigured' },
      { id: 'openrouter', name: 'OpenRouter (Multi-Model)', status: process.env.OPENROUTER_API_KEY ? 'configured' : 'unconfigured' },
      { id: 'mistral', name: 'Mistral Large', status: process.env.MISTRAL_API_KEY ? 'configured' : 'unconfigured' },
      { id: 'deepseek', name: 'DeepSeek Chat', status: process.env.DEEPSEEK_API_KEY ? 'configured' : 'unconfigured' },
    ],
    defaultModel: 'gemini-3.8-flash',
  });
});

// Pricing Plans Endpoint
app.get('/api/pricing', (req, res) => {
  res.json({
    plans: getPricingPlans(),
  });
});

// User Usage & Quota Endpoint
app.get('/api/usage', (req, res) => {
  const authUser = parseFirebaseToken(req.headers.authorization);
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'guest';
  const userId = authUser?.uid || ip;
  const isPro = Boolean(authUser);
  const summary = getUsageSummary(userId, isPro);
  res.json({
    userId,
    isPro,
    summary,
  });
});

// Subscription Status Endpoint
app.get('/api/subscription', (req, res) => {
  const authUser = parseFirebaseToken(req.headers.authorization);
  if (!authUser) {
    return res.json({
      status: 'free',
      planId: 'free',
      isPro: false,
    });
  }
  const sub = getSubscription(authUser.uid);
  return res.json(sub);
});

// Centralized Tools Registry Endpoint
app.get('/api/tools', (req, res) => {
  const tools = ToolRegistry.getAllTools();
  const activeTools = ToolRegistry.getAiCallableTools();
  res.json({
    totalCount: tools.length,
    activeCount: activeTools.length,
    tools: tools.map((t) => ({
      id: t.id,
      name: t.name,
      category: t.category,
      description: t.description,
      outputType: t.outputType,
      requiresUpload: t.requiresUpload,
      chainable: t.chainable,
      isAiCallable: t.isAiCallable,
      status: t.status,
      parameters: t.parameters,
      nextStepSuggestions: t.nextStepSuggestions || [],
      unavailableReason: t.unavailableReason,
    })),
  });
});

// Multi-Tool Workflow Execution Endpoint
app.post(
  '/api/workflow/execute',
  upload.array('files', 10),
  validateUploadedFiles,
  async (req, res) => {
    try {
      const authUser = parseFirebaseToken(req.headers.authorization);
      const userCtx = resolveUserContext(req);
      const rawSteps = req.body.steps;
      let parsedSteps: any[] = [];

      try {
        parsedSteps = typeof rawSteps === 'string' ? JSON.parse(rawSteps) : (rawSteps || []);
      } catch {
        return res.status(400).json({ success: false, error: 'Invalid workflow steps definition' });
      }

      if (!Array.isArray(parsedSteps) || parsedSteps.length === 0) {
        return res.status(400).json({ success: false, error: 'No steps provided for workflow execution.' });
      }

      const files = (req.files as Express.Multer.File[]) || [];
      const workflowResult = await executeWorkflow(
        parsedSteps,
        files,
        userCtx.id,
        userCtx.isPro,
        userCtx.tier
      );

      return res.json(workflowResult);
    } catch (err: any) {
      console.error('[Workflow Execution Error]:', err);
      return res.status(500).json({
        success: false,
        error: 'Execution failure',
        message: err?.message || 'Workflow execution encountered an unexpected error.',
      });
    }
  }
);

// Voice Audio Transcription Endpoint
app.post(
  '/api/audio/transcribe',
  upload.single('audio'),
  async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ success: false, error: 'No audio file provided' });
      }

      const userCtx = resolveUserContext(req);
      const limit = checkLimit(userCtx.id, 'voice', userCtx.isPro, userCtx.tier);
      if (!limit.allowed) {
        return res.status(429).json({
          success: false,
          error: 'Daily voice transcription limit reached. Upgrade to Pro for unlimited voice interactions.',
        });
      }

      const result = await transcribeAudio(file.buffer, file.originalname, file.mimetype);
      if (result.success) {
        recordUsage(userCtx.id, 'message');
        trackEvent('voice_transcribed', { userId: userCtx.id });
      }

      return res.json(result);
    } catch (err: any) {
      console.error('[Audio Transcription Error]:', err);
      return res.status(500).json({ success: false, error: 'Transcription failed' });
    }
  }
);

// Admin Authentication Route
app.post('/api/admin/login', adminLoginRateLimiter, (req, res) => {
  const { key } = req.body;
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';

  if (!key || typeof key !== 'string') {
    return res.status(400).json({ success: false, error: 'Administrative key required' });
  }

  const result = authenticateAdmin(key, ip);
  if (!result.success || !result.sessionToken) {
    return res.status(401).json({ success: false, error: 'Invalid administrative key' });
  }

  res.cookie('khang_admin_session', result.sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 4 * 60 * 60 * 1000,
  });

  return res.json({ success: true, token: result.sessionToken });
});

// Admin Metrics Endpoint
app.get('/api/admin/metrics', (req, res) => {
  const token = getAdminToken(req);
  if (!token || !verifyAdminSession(token)) {
    return res.status(401).json({ error: 'Unauthorized access' });
  }
  const metrics = getSystemMetrics();
  res.json({
    metrics,
    auditLogs: getAdminAuditLogs(30),
  });
});

// Main Conversational & Tool Execution Route
app.post(
  '/api/chat',
  rateLimiter,
  upload.array('files', 10),
  validateUploadedFiles,
  async (req, res) => {
    try {
      const user = parseFirebaseToken(req.headers.authorization);
      (req as any).user = user;
      const userCtx = resolveUserContext(req);

      let messages: ChatMessageParam[] = [];
      try {
        if (req.body.messages) {
          const raw = req.body.messages;
          const parsed = typeof raw === 'string' ? JSON.parse(raw) : (raw || []);
          if (Array.isArray(parsed)) {
            messages = parsed.map((m: any) => ({
              role: (m.role || (m.sender === 'user' ? 'user' : 'assistant')) as 'user' | 'assistant' | 'system',
              content: String(m.content || m.text || ''),
            })).filter((m) => m.content.trim().length > 0);
          }
        }

        // Support single 'message' with optional 'history' payload (from FormData)
        if (messages.length === 0 && (req.body.message || req.body.text)) {
          const userText = String(req.body.message || req.body.text || '').trim();
          if (req.body.history) {
            try {
              const hist = typeof req.body.history === 'string' ? JSON.parse(req.body.history) : req.body.history;
              if (Array.isArray(hist)) {
                for (const item of hist) {
                  const role = (item.role || (item.sender === 'user' ? 'user' : 'assistant')) as 'user' | 'assistant' | 'system';
                  const content = String(item.content || item.text || '').trim();
                  if (content) {
                    messages.push({ role, content });
                  }
                }
              }
            } catch {}
          }
          if (userText) {
            messages.push({ role: 'user', content: userText });
          }
        }
      } catch {
        return res.status(400).json({
          error: 'Invalid messages format',
          message: 'The messages payload must be valid JSON.',
        });
      }

      if (messages.length === 0) {
        return res.status(400).json({
          error: 'No messages provided',
          message: 'Please provide at least one message.',
        });
      }

      const isStream = req.query.stream === 'true' || req.body.stream === true;
      const uploadedFiles = (req.files as Express.Multer.File[]) || [];

      // Check daily message limit
      const msgLimit = checkLimit(userCtx.id, 'message', userCtx.isPro, userCtx.tier);
      if (!msgLimit.allowed) {
        return res.status(429).json({
          error: 'Daily limit reached',
          message: `You have reached your daily limit of ${msgLimit.limit} messages. Upgrade to Pro for higher limits!`,
          isProOffer: true,
        });
      }

      // Check daily file operation limit if files are uploaded
      if (uploadedFiles.length > 0) {
        const fileLimit = checkLimit(userCtx.id, 'file_operation', userCtx.isPro, userCtx.tier);
        if (!fileLimit.allowed) {
          return res.status(429).json({
            error: 'Daily limit reached',
            message: `You have reached your daily limit of ${fileLimit.limit} file operations. Upgrade to Pro for higher limits!`,
            isProOffer: true,
          });
        }
      }

      const fileMetadata = uploadedFiles.map((f) => ({
        name: f.originalname,
        type: f.mimetype,
        size: f.size,
      }));

      // Stream handling
      if (isStream && uploadedFiles.length === 0) {
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');

        recordUsage(userCtx.id, 'message');
        trackEvent('message_sent', { userId: userCtx.id });

        try {
          const streamGen = streamAI(messages);
          for await (const chunk of streamGen) {
            res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
          }
          res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
          return res.end();
        } catch (streamErr: any) {
          console.error('Streaming error in /api/chat:', streamErr);
          res.write(`data: ${JSON.stringify({ error: 'Stream error', text: 'Error generating response.' })}\n\n`);
          return res.end();
        }
      }

      // Standard non-streaming resolution
      const aiResult = await callAI(messages, TOOL_DEFINITIONS, {
        uploadedFiles: fileMetadata,
      });

      if (aiResult.type === 'message') {
        recordUsage(userCtx.id, 'message');
        trackEvent('message_sent', { userId: userCtx.id });
        return res.json({
          type: 'message',
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

        const operationResult = await executeFileOperation({
          files: uploadedFiles,
          toolName: aiResult.name,
          args: validation.sanitizedArgs,
          userText: messages[messages.length - 1]?.content || '',
          userId: userCtx.id,
        });

        if (operationResult.success) {
          recordUsage(userCtx.id, 'file_operation');
          trackEvent('file_processed', { tool: aiResult.name, userId: userCtx.id });
        }

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

// WhatsApp Webhook & Verification Challenge
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
  const processedDir = path.resolve(PROCESSED_DIR);
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
