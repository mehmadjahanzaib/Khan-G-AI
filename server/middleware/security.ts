import { Request, Response, NextFunction } from 'express';
import path from 'path';

// Rate limiting in-memory store
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const DEFAULT_MAX_REQUESTS = 30;

export function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const maxRequests = parseInt(process.env.RATE_LIMIT_PER_HOUR || String(DEFAULT_MAX_REQUESTS), 10);
  const forwarded = req.headers['x-forwarded-for'];
  const clientIp = typeof forwarded === 'string'
    ? forwarded.split(',')[0].trim()
    : Array.isArray(forwarded)
    ? forwarded[0].trim()
    : req.socket.remoteAddress || 'unknown-ip';

  const now = Date.now();
  const record = rateLimitMap.get(clientIp);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(clientIp, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return next();
  }

  if (record.count >= maxRequests) {
    const minutesLeft = Math.ceil((record.resetTime - now) / 60000);
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: `You have reached the limit of ${maxRequests} requests per hour. Please try again in ${minutesLeft} minute(s).`,
      resetInMinutes: minutesLeft,
    });
  }

  record.count += 1;
  next();
}

// Whitelist of allowed MIME types & extensions
const ALLOWED_EXTENSIONS = new Set([
  // Images
  '.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.bmp', '.tiff', '.svg',
  // Documents
  '.pdf', '.docx', '.doc', '.txt', '.md', '.rtf', '.json',
  // Spreadsheets & Data
  '.csv', '.tsv', '.xlsx', '.xls',
  // Archives
  '.zip', '.tar', '.gz'
]);

export function validateUploadedFiles(req: Request, res: Response, next: NextFunction) {
  const files = (req.files as Express.Multer.File[]) || (req.file ? [req.file] : []);

  for (const file of files) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return res.status(400).json({
        error: 'Unsupported file format',
        message: `File type "${ext || 'unknown'}" is not supported. Allowed formats include: Images (JPG, PNG, WEBP), PDFs, Documents (DOCX, TXT), Spreadsheets (CSV, XLSX), and Archives (ZIP).`,
      });
    }

    // Disallow dangerous files
    if (ext.match(/\.(exe|sh|bat|cmd|vbs|bin|js|php|py|jar)$/i)) {
      return res.status(403).json({
        error: 'Forbidden file type',
        message: 'Executable and script files are strictly prohibited.',
      });
    }
  }

  next();
}
