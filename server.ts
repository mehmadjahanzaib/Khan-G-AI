import dotenv from 'dotenv';
dotenv.config({ override: true });
import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { callAI, ChatMessageParam } from './server/lib/aiProvider.js';
import { TOOL_DEFINITIONS } from './server/tools/definitions.js';
import {
  executeFileOperation,
  fileStore,
  cleanupExpiredFiles,
  FILE_TTL_MS,
} from './server/services/fileProcessor.js';
import { rateLimiter, validateUploadedFiles } from './server/middleware/security.js';

const PORT = 3000;
const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '100', 10);

// Multer memory storage for direct processing in buffer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024,
  },
});

async function startServer() {
  const app = express();

  // Keep JSON body parser strict (file streams are handled separately by Multer memory storage)
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // Ensure all /api responses default to JSON
  app.use('/api', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
  });

  // Health check endpoint for container orchestrators and status monitoring
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Khan G Tools Backend',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // 1. Health & Server Status Endpoint
  app.get('/api/status', (req, res) => {
    const activeProvider = process.env.AI_PROVIDER || 'gemini';
    res.json({
      status: 'ok',
      siteName: 'Khan G Tools',
      tagline: 'One Chat. Every File Tool.',
      activeProvider,
      geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
      groqKeyConfigured: Boolean(process.env.GROQ_API_KEY),
      openRouterKeyConfigured: Boolean(process.env.OPENROUTER_API_KEY),
      mistralKeyConfigured: Boolean(process.env.MISTRAL_API_KEY),
      deepseekKeyConfigured: Boolean(process.env.DEEPSEEK_API_KEY),
      maxFileSizeMB: MAX_FILE_SIZE_MB,
      rateLimitPerHour: parseInt(process.env.RATE_LIMIT_PER_HOUR || '30', 10),
      activeFilesCount: fileStore.size,
      supportedToolsCount: TOOL_DEFINITIONS.length,
    });
  });

  // 2. Available Tools Metadata Endpoint
  app.get('/api/tools', (req, res) => {
    res.json({
      tools: TOOL_DEFINITIONS.map((t) => ({
        name: t.function.name,
        description: t.function.description,
        parameters: t.function.parameters,
      })),
    });
  });

  // 3. Main Chat & File Processing API Route
  app.post(
    '/api/chat',
    rateLimiter,
    upload.array('files', 10),
    validateUploadedFiles,
    async (req, res) => {
      try {
        const messageText = (req.body.message || '').trim();
        const rawHistory = req.body.history;
        const uploadedFiles = (req.files as Express.Multer.File[]) || [];

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
          } catch {
            // Ignore parse errors
          }
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

        // Step 2 & 3: Send to LLM API abstraction layer with tool definitions
        const aiResult = await callAI(messages, TOOL_DEFINITIONS, {
          uploadedFiles: fileMetaList,
        });

        // If the AI identified a tool to call
        if (aiResult.type === 'tool_call' && aiResult.name) {
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

          // Step 4: Run actual Node.js processing library
          const operationResult = await executeFileOperation({
            files: uploadedFiles,
            toolName: aiResult.name,
            args: aiResult.args || {},
            userText: messageText,
          });

          // Form download links for files
          const processedFilesData = operationResult.files.map((file) => ({
            id: file.id,
            originalName: file.originalName,
            processedName: file.processedName,
            mimeType: file.mimeType,
            size: file.size,
            downloadUrl: `/api/download/${file.id}`,
            expiresAt: file.expiresAt,
            previewText: file.previewText,
            isImage: file.isImage,
          }));

          return res.json({
            type: 'tool_call',
            toolCall: {
              name: aiResult.name,
              args: aiResult.args || {},
            },
            message: operationResult.message,
            text: operationResult.message,
            files: processedFilesData,
            providerUsed: aiResult.provider,
            isClarification: operationResult.clarification,
          });
        }

        // If the AI responded with a message (clarification, greeting, guidance)
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
        return res.status(500).json({
          error: 'Processing error',
          message: err?.message || 'An unexpected error occurred while processing your request.',
          text: err?.message || 'An unexpected error occurred while processing your request.',
        });
      }
    }
  );

  // 4. File Download Route with 1-hour expiration guard
  app.get('/api/download/:fileId', (req, res) => {
    const fileId = req.params.fileId;
    const record = fileStore.get(fileId);

    if (!record) {
      return res.status(404).json({
        error: 'File not found',
        message: 'This file does not exist or has expired. Files are automatically deleted after 1 hour for your privacy and security.',
      });
    }

    if (Date.now() > record.expiresAt) {
      fileStore.delete(fileId);
      if (fs.existsSync(record.filePath)) {
        try { fs.unlinkSync(record.filePath); } catch {}
      }
      return res.status(410).json({
        error: 'File expired',
        message: 'This download link has expired (1 hour limit reached). Please upload and process the file again.',
      });
    }

    if (!fs.existsSync(record.filePath)) {
      return res.status(404).json({
        error: 'File missing',
        message: 'The requested file could not be located on the server disk.',
      });
    }

    res.setHeader('Content-Type', record.mimeType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(record.processedName)}"`
    );
    res.setHeader('Content-Length', record.size);

    const stream = fs.createReadStream(record.filePath);
    stream.pipe(res);
  });

  // 5. Cleanup trigger endpoint
  app.post('/api/cleanup', (req, res) => {
    cleanupExpiredFiles();
    res.json({
      success: true,
      message: 'Expired files cleanup completed.',
      remainingFiles: fileStore.size,
    });
  });

  // Catch-all 404 for /api routes to prevent falling into Vite HTML fallback
  app.all(['/api', '/api/*'], (req, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: `API endpoint ${req.method} ${req.path} not found.`,
    });
  });

  // Dedicated Error-handling middleware for API requests (e.g. Multer file size errors)
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.startsWith('/api') || req.path === '/api' || req.headers.accept?.includes('application/json')) {
      const statusCode = err.status || err.statusCode || (err.name === 'MulterError' ? 400 : 500);
      let errMsg = err.message || 'An error occurred during request processing.';
      if (err.code === 'LIMIT_FILE_SIZE') {
        errMsg = `File exceeds the ${MAX_FILE_SIZE_MB}MB size limit.`;
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

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Khan G Tools server running on http://0.0.0.0:${PORT}`);
    // Run initial sweep on boot and start periodic cleanup every 15 minutes
    cleanupExpiredFiles();
    setInterval(cleanupExpiredFiles, 15 * 60 * 1000);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
});
