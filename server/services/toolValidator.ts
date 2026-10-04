import { TOOL_DEFINITIONS } from '../tools/definitions.js';

export interface ValidatedToolCall {
  isValid: boolean;
  toolName: string;
  sanitizedArgs: Record<string, any>;
  errorMessage?: string;
}

const ALLOWED_TOOL_NAMES = new Set(TOOL_DEFINITIONS.map((t) => t.function.name));

/**
 * Validates and sanitizes AI-generated tool names and parameters
 * Ensures bounds, valid enumerations, and safety rules before execution.
 */
export function validateAndSanitizeToolCall(
  toolName: string,
  rawArgs: Record<string, any>,
  uploadedFilesCount: number
): ValidatedToolCall {
  // 1. Strict tool name whitelist
  if (!ALLOWED_TOOL_NAMES.has(toolName)) {
    return {
      isValid: false,
      toolName,
      sanitizedArgs: {},
      errorMessage: `Unrecognized or unauthorized tool "${toolName}". Operation blocked for security.`,
    };
  }

  const args: Record<string, any> = { ...rawArgs };

  // 2. Validate per-tool rules and bounds
  switch (toolName) {
    case 'resize_image': {
      if (args.width !== undefined) {
        const w = Number(args.width);
        if (isNaN(w) || w < 1 || w > 10000) {
          return { isValid: false, toolName, sanitizedArgs: {}, errorMessage: 'Width must be between 1 and 10,000 pixels.' };
        }
        args.width = Math.round(w);
      }
      if (args.height !== undefined) {
        const h = Number(args.height);
        if (isNaN(h) || h < 1 || h > 10000) {
          return { isValid: false, toolName, sanitizedArgs: {}, errorMessage: 'Height must be between 1 and 10,000 pixels.' };
        }
        args.height = Math.round(h);
      }
      if (args.percentage !== undefined) {
        const p = Number(args.percentage);
        if (isNaN(p) || p < 1 || p > 1000) {
          return { isValid: false, toolName, sanitizedArgs: {}, errorMessage: 'Scale percentage must be between 1% and 1000%.' };
        }
        args.percentage = p;
      }
      if (args.fit && !['cover', 'contain', 'fill', 'inside', 'outside'].includes(args.fit)) {
        args.fit = 'cover';
      }
      break;
    }

    case 'compress_image': {
      let q = Number(args.quality);
      if (isNaN(q) || q < 5 || q > 100) {
        args.quality = 70; // Sensible default
      } else {
        args.quality = Math.round(q);
      }
      if (args.maxSizeKB !== undefined) {
        const m = Number(args.maxSizeKB);
        if (isNaN(m) || m <= 0) {
          delete args.maxSizeKB;
        } else {
          args.maxSizeKB = Math.round(m);
        }
      }
      break;
    }

    case 'convert_image': {
      const allowedFormats = ['jpg', 'jpeg', 'png', 'webp', 'avif'];
      const targetFormat = String(args.format || '').toLowerCase();
      if (!allowedFormats.includes(targetFormat)) {
        return {
          isValid: false,
          toolName,
          sanitizedArgs: {},
          errorMessage: `Invalid target image format "${targetFormat}". Allowed formats: jpg, png, webp, avif.`,
        };
      }
      args.format = targetFormat === 'jpeg' ? 'jpg' : targetFormat;
      break;
    }

    case 'merge_pdfs': {
      if (uploadedFilesCount < 2) {
        return {
          isValid: false,
          toolName,
          sanitizedArgs: {},
          errorMessage: 'Merging requires at least 2 PDF files to be uploaded.',
        };
      }
      if (args.outputName) {
        args.outputName = String(args.outputName).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);
      }
      break;
    }

    case 'split_pdf': {
      const pages = String(args.pages || '').trim();
      if (!pages) {
        return {
          isValid: false,
          toolName,
          sanitizedArgs: {},
          errorMessage: 'Please specify the pages to extract (e.g. "1", "1-3", "2,4").',
        };
      }
      // Sanitize page specifier
      if (!/^([0-9]+(-[0-9]+)?(,\s*[0-9]+(-[0-9]+)?)*|all)$/i.test(pages)) {
        return {
          isValid: false,
          toolName,
          sanitizedArgs: {},
          errorMessage: 'Invalid page range format. Example: "1", "1-3", or "1,2,5".',
        };
      }
      args.pages = pages;
      break;
    }

    case 'convert_excel_to_csv': {
      const idx = Number(args.sheetIndex || 1);
      args.sheetIndex = isNaN(idx) || idx < 1 ? 1 : Math.round(idx);
      break;
    }

    case 'calculate_excel_data': {
      const validOps = ['total', 'average', 'all_stats'];
      if (!validOps.includes(args.operation)) {
        args.operation = 'all_stats';
      }
      break;
    }

    case 'translate_document': {
      const validLangs = ['urdu', 'roman_urdu', 'english'];
      const target = String(args.targetLanguage || '').toLowerCase();
      if (!validLangs.includes(target)) {
        args.targetLanguage = 'urdu';
      }
      break;
    }

    case 'zip_files': {
      if (args.zipName) {
        args.zipName = String(args.zipName).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50);
      }
      break;
    }

    case 'rename_file': {
      if (!args.newName || typeof args.newName !== 'string') {
        return {
          isValid: false,
          toolName,
          sanitizedArgs: {},
          errorMessage: 'A valid new filename must be provided.',
        };
      }
      args.newName = args.newName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
      break;
    }
  }

  return {
    isValid: true,
    toolName,
    sanitizedArgs: args,
  };
}
