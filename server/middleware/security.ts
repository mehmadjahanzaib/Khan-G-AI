import { Request, Response, NextFunction } from 'express';
import path from 'path';

// Rate limiting in-memory store
interface RateLimitRecord {
  count: number;
  resetTime: number;
  expensiveCount: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export interface AuthenticatedUser {
  uid: string;
  email?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Extracts client IP or authenticated UID as rate limit key
 */
export function getRateLimitKey(req: Request): { key: string; isAuthenticated: boolean } {
  if (req.user && req.user.uid) {
    return { key: `auth_${req.user.uid}`, isAuthenticated: true };
  }

  const forwarded = req.headers['x-forwarded-for'];
  const clientIp = typeof forwarded === 'string'
    ? forwarded.split(',')[0].trim()
    : Array.isArray(forwarded)
    ? forwarded[0].trim()
    : req.socket.remoteAddress || 'unknown-ip';

  return { key: `ip_${clientIp}`, isAuthenticated: false };
}

/**
 * Robust multi-tier rate limiter distinguishing anonymous vs authenticated users
 */
export function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const { key, isAuthenticated } = getRateLimitKey(req);

  const anonLimit = parseInt(process.env.RATE_LIMIT_ANONYMOUS_PER_HOUR || '300', 10);
  const authLimit = parseInt(process.env.RATE_LIMIT_AUTH_PER_HOUR || '1200', 10);
  const maxRequests = isAuthenticated ? authLimit : anonLimit;

  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS, expensiveCount: 0 });
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', maxRequests - 1);
    return next();
  }

  if (record.count >= maxRequests) {
    const minutesLeft = Math.ceil((record.resetTime - now) / 60000);
    res.setHeader('Retry-After', Math.ceil((record.resetTime - now) / 1000));
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: `You have reached the limit of ${maxRequests} requests per hour for your tier. Please try again in ${minutesLeft} minute(s)${!isAuthenticated ? ' or sign in for higher quotas.' : '.'}`,
      resetInMinutes: minutesLeft,
    });
  }

  record.count += 1;
  res.setHeader('X-RateLimit-Limit', maxRequests);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - record.count));
  next();
}

/**
 * Strict Admin Login Rate Limiter (5 attempts per 15 minutes per IP to prevent brute force)
 */
const adminLoginLimitMap = new Map<string, { count: number; resetTime: number }>();
export function adminLoginRateLimiter(req: Request, res: Response, next: NextFunction) {
  const forwarded = req.headers['x-forwarded-for'];
  const clientIp = typeof forwarded === 'string'
    ? forwarded.split(',')[0].trim()
    : Array.isArray(forwarded)
    ? forwarded[0].trim()
    : req.socket.remoteAddress || 'unknown-ip';

  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 mins
  const maxAttempts = 5;

  const record = adminLoginLimitMap.get(clientIp);
  if (!record || now > record.resetTime) {
    adminLoginLimitMap.set(clientIp, { count: 1, resetTime: now + windowMs });
    return next();
  }

  if (record.count >= maxAttempts) {
    const minutesLeft = Math.ceil((record.resetTime - now) / 60000);
    return res.status(429).json({
      error: 'Too Many Login Attempts',
      message: `Too many unsuccessful admin login attempts. Access is locked for ${minutesLeft} minute(s).`,
    });
  }

  record.count += 1;
  next();
}

/**
 * Production Security Headers Middleware
 */
export function applySecurityHeaders(req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(self), geolocation=()');

  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
}

// Whitelist of allowed extensions
const ALLOWED_EXTENSIONS = new Set([
  // Images
  '.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.bmp', '.tiff',
  // Documents
  '.pdf', '.docx', '.doc', '.txt', '.md', '.rtf', '.json',
  // Spreadsheets & Data
  '.csv', '.tsv', '.xlsx', '.xls',
  // Archives
  '.zip', '.tar', '.gz'
]);

// Explicit forbidden dangerous extensions
const FORBIDDEN_EXTENSIONS = new Set([
  '.exe', '.sh', '.bat', '.cmd', '.vbs', '.bin', '.js', '.mjs', '.cjs',
  '.php', '.py', '.rb', '.pl', '.jar', '.com', '.msi', '.scr', '.ps1',
  '.apk', '.deb', '.rpm', '.iso', '.dmg', '.html', '.htm', '.xhtml',
  '.svg', '.xml', '.cgi', '.dll', '.so', '.dylib'
]);

/**
 * Validates real magic bytes / file signatures against expected format.
 * Prevents disguised executables and malicious payloads from slipping through.
 */
function verifyMagicBytes(buffer: Buffer, ext: string): { valid: boolean; reason?: string } {
  if (!buffer || buffer.length === 0) {
    return { valid: false, reason: 'File is empty (0 bytes).' };
  }

  // 1. PDF signature: starts with %PDF- (0x25, 0x50, 0x44, 0x46, 0x2D)
  if (ext === '.pdf') {
    if (buffer.length < 5 || buffer.toString('ascii', 0, 5) !== '%PDF-') {
      return { valid: false, reason: 'File does not contain a valid PDF header (%PDF-).' };
    }
    return { valid: true };
  }

  // 2. PNG signature: 89 50 4E 47 0D 0A 1A 0A
  if (ext === '.png') {
    if (
      buffer.length < 8 ||
      buffer[0] !== 0x89 ||
      buffer[1] !== 0x50 ||
      buffer[2] !== 0x4e ||
      buffer[3] !== 0x47 ||
      buffer[4] !== 0x0d ||
      buffer[5] !== 0x0a ||
      buffer[6] !== 0x1a ||
      buffer[7] !== 0x0a
    ) {
      return { valid: false, reason: 'File signature does not match PNG image format.' };
    }
    return { valid: true };
  }

  // 3. JPEG/JPG signature: FF D8 FF
  if (ext === '.jpg' || ext === '.jpeg') {
    if (buffer.length < 3 || buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) {
      return { valid: false, reason: 'File signature does not match JPEG/JPG image format.' };
    }
    return { valid: true };
  }

  // 4. WEBP signature: 'RIFF' .... 'WEBP'
  if (ext === '.webp') {
    if (
      buffer.length < 12 ||
      buffer.toString('ascii', 0, 4) !== 'RIFF' ||
      buffer.toString('ascii', 8, 12) !== 'WEBP'
    ) {
      return { valid: false, reason: 'File signature does not match WEBP image format.' };
    }
    return { valid: true };
  }

  // 5. GIF signature: GIF87a or GIF89a
  if (ext === '.gif') {
    const header = buffer.toString('ascii', 0, 6);
    if (header !== 'GIF87a' && header !== 'GIF89a') {
      return { valid: false, reason: 'File signature does not match GIF image format.' };
    }
    return { valid: true };
  }

  // 6. BMP signature: BM (0x42, 0x4D)
  if (ext === '.bmp') {
    if (buffer.length < 2 || buffer[0] !== 0x42 || buffer[1] !== 0x4d) {
      return { valid: false, reason: 'File signature does not match BMP image format.' };
    }
    return { valid: true };
  }

  // 7. ZIP / DOCX / XLSX: PK signature (0x50, 0x4B, 0x03, 0x04 or 0x50, 0x4B, 0x05, 0x06 or 0x50, 0x4B, 0x07, 0x08)
  if (['.zip', '.docx', '.xlsx'].includes(ext)) {
    if (
      buffer.length < 4 ||
      buffer[0] !== 0x50 ||
      buffer[1] !== 0x4b ||
      ![0x03, 0x05, 0x07].includes(buffer[2])
    ) {
      return {
        valid: false,
        reason: `File claims to be ${ext.slice(1).toUpperCase()} but does not have a valid PK zip container signature.`,
      };
    }
    return { valid: true };
  }

  // 8. Plain Text, CSV, JSON, Markdown:
  // Must NOT contain executable headers (MZ, \x7fELF, Mach-O) or excessive null bytes
  if (['.txt', '.csv', '.tsv', '.json', '.md', '.rtf'].includes(ext)) {
    // Check for Windows executable MZ (0x4D, 0x5A)
    if (buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a) {
      return { valid: false, reason: 'File appears to be a Windows binary disguised as text.' };
    }
    // Check for Linux ELF (\x7fELF = 0x7F, 0x45, 0x4C, 0x46)
    if (
      buffer.length >= 4 &&
      buffer[0] === 0x7f &&
      buffer[1] === 0x45 &&
      buffer[2] === 0x4c &&
      buffer[3] === 0x46
    ) {
      return { valid: false, reason: 'File appears to be a Linux ELF binary disguised as text.' };
    }
    // Check for null bytes in initial 512 bytes (indicative of binary/executable files)
    const inspectLength = Math.min(buffer.length, 512);
    let nullCount = 0;
    for (let i = 0; i < inspectLength; i++) {
      if (buffer[i] === 0x00) nullCount++;
    }
    if (nullCount > 2) {
      return { valid: false, reason: 'File contains binary null characters and is not valid text.' };
    }

    return { valid: true };
  }

  return { valid: true };
}

/**
 * Server-side upload validation middleware:
 * - Checks file extension
 * - Checks forbidden executable types
 * - Validates true file signatures (magic bytes)
 * - Returns user-friendly error messages
 */
export function validateUploadedFiles(req: Request, res: Response, next: NextFunction) {
  const files = (req.files as Express.Multer.File[]) || (req.file ? [req.file] : []);

  const MAX_FILES_PER_REQUEST = parseInt(process.env.MAX_FILES_PER_REQUEST || '10', 10);
  if (files.length > MAX_FILES_PER_REQUEST) {
    return res.status(400).json({
      error: 'Too many files',
      message: `You can upload a maximum of ${MAX_FILES_PER_REQUEST} files per request.`,
    });
  }

  for (const file of files) {
    const ext = path.extname(file.originalname).toLowerCase();

    // Check forbidden extensions
    if (FORBIDDEN_EXTENSIONS.has(ext)) {
      return res.status(403).json({
        error: 'Forbidden file type',
        message: `Executable and script files ("${ext}") are strictly prohibited for security.`,
      });
    }

    // Check allowed whitelist
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return res.status(400).json({
        error: 'Unsupported file format',
        message: `File format "${ext || 'unknown'}" is not supported. Supported formats include: Images (JPG, PNG, WebP), PDFs, Documents (DOCX, TXT), Spreadsheets (CSV, XLSX), and Archives (ZIP).`,
      });
    }

    // Magic bytes / signature verification
    if (file.buffer) {
      const signatureCheck = verifyMagicBytes(file.buffer, ext);
      if (!signatureCheck.valid) {
        return res.status(400).json({
          error: 'Invalid file signature',
          message: `Validation failed for "${file.originalname}": ${signatureCheck.reason}`,
        });
      }
    }
  }

  next();
}
