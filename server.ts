import dotenv from 'dotenv';
dotenv.config({ override: true });
import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { app } from './server/app.js';
import { cleanupExpiredFiles } from './server/services/fileProcessor.js';

const PORT = parseInt(process.env.PORT || '3000', 10);

async function startServer() {
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

// Only launch standalone listener when not running inside a serverless platform (Vercel)
if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error('Fatal server startup error:', err);
  });
}

export { app };
