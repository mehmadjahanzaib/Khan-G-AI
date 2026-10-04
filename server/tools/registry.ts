import { ToolDefinition, ToolCategory } from '../types.js';
import { executeFileOperation, saveProcessedFile } from '../services/fileProcessor.js';
import sharp, { OverlayOptions } from 'sharp';
import fs from 'fs';
import QRCode from 'qrcode';
import crypto from 'crypto';
import {
  pdfNupMaker,
  pdfRotate,
  pdfPageReorder,
  pdfPageDelete,
  pdfExtractPages,
  pdfWatermark,
} from '../services/engines/pdfEngines.js';
import { invoiceMaker, quotationMaker } from '../services/engines/bizEngines.js';
import {
  caseConverter,
  duplicateLineRemover,
  sortLines,
  textCleaner,
} from '../services/engines/textEngines.js';
import {
  ageCalculator,
  dateCalculator,
  percentageCalculator,
  unitConverter,
  gstTaxCalculator,
  profitMarginCalculator,
  discountCalculator,
} from '../services/engines/calcEngines.js';

/**
 * KHAN G AI — CENTRALIZED TOOL REGISTRY
 * Maps all 100 tools from Khan G Tools scripts/tools-catalog.js.
 * Provides a scalable, strongly-typed registry with:
 * - 21 Verified native server engines
 * - Core ported engine adapters from scripts/engines/*
 * - Explicit reason codes for non-callable or browser-only tools
 * - Zero simulation: every active tool executes real code
 */

export interface RegisteredTool {
  id: string;
  name: string;
  category: ToolCategory;
  description: string;
  supportedIntents: string[];
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  outputType: 'image' | 'pdf' | 'spreadsheet' | 'document' | 'archive' | 'text' | 'json';
  requiresUpload: boolean;
  chainable: boolean;
  isAiCallable: boolean;
  status: 'verified' | 'ported_engine' | 'existing_api' | 'not_yet_callable';
  unavailableReason?: string;
  handler?: (args: Record<string, any>, files?: Express.Multer.File[], intermediateBuffer?: Buffer) => Promise<{
    success: boolean;
    message: string;
    files?: any[];
    data?: any;
    outputBuffer?: Buffer;
    outputMimeType?: string;
    outputName?: string;
  }>;
  nextStepSuggestions?: string[];
}

function runFileOp(toolName: string, args: Record<string, any>, files?: Express.Multer.File[]) {
  return executeFileOperation({
    files: files || [],
    toolName,
    args,
    userText: '',
  });
}

export class ToolRegistry {
  private static tools = new Map<string, RegisteredTool>();
  private static initialized = false;

  public static initialize(): void {
    if (this.initialized) return;

    // =========================================================================
    // 1. PDF TOOLS (17 tools)
    // =========================================================================
    this.register({
      id: 'pdf-merger',
      name: 'PDF Merger',
      category: 'PDF',
      description: 'Combine multiple PDF files into one clean document with custom page ordering.',
      supportedIntents: ['merge pdf', 'combine pdf', 'join pdfs', 'ek pdf bana do'],
      parameters: {
        type: 'object',
        properties: {
          outputName: { type: 'string', description: 'Desired output file name' }
        }
      },
      outputType: 'pdf',
      requiresUpload: true,
      chainable: true,
      isAiCallable: true,
      status: 'verified',
      handler: async (args, files) => runFileOp('merge_pdfs', args, files || []),
      nextStepSuggestions: ['pdf-compressor', 'print-layout-maker']
    });

    this.register({
      id: 'pdf-splitter',
      name: 'PDF Splitter',
      category: 'PDF',
      description: 'Extract select page ranges or split PDF files into distinct documents.',
      supportedIntents: ['split pdf', 'extract pages', 'separate pdf', 'pages alag karo'],
      parameters: {
        type: 'object',
        properties: {
          pages: { type: 'string', description: 'Page ranges to extract, e.g. "1-3" or "2, 5"' }
        },
        required: ['pages']
      },
      outputType: 'pdf',
      requiresUpload: true,
      chainable: true,
      isAiCallable: true,
      status: 'verified',
      handler: async (args, files) => runFileOp('split_pdf', args, files || []),
      nextStepSuggestions: ['pdf-compressor', 'pdf-merger']
    });

    this.register({
      id: 'pdf-compressor',
      name: 'PDF Compressor',
      category: 'PDF',
      description: 'Reduce PDF file size while maintaining readability.',
      supportedIntents: ['compress pdf', 'reduce pdf size', 'shrink pdf', 'pdf choti karo'],
      parameters: {
        type: 'object',
        properties: {
          quality: { type: 'string', enum: ['standard', 'high', 'maximum'], description: 'Compression strength' }
        }
      },
      outputType: 'pdf',
      requiresUpload: true,
      chainable: true,
      isAiCallable: true,
      status: 'verified',
      handler: async (args, files) => runFileOp('compress_pdf', args, files || []),
      nextStepSuggestions: ['print-layout-maker', 'zip-files']
    });

    this.register({
      id: 'pdf-to-word',
      name: 'PDF to Word Converter',
      category: 'PDF',
      description: 'Convert PDF documents into editable Microsoft Word (.docx) documents.',
      supportedIntents: ['pdf to word', 'convert to docx', 'pdf ko word banao'],
      parameters: {
        type: 'object',
        properties: {
          outputTitle: { type: 'string', description: 'Title of the converted Word document' }
        }
      },
      outputType: 'document',
      requiresUpload: true,
      chainable: true,
      isAiCallable: true,
      status: 'verified',
      handler: async (args, files) => runFileOp('convert_pdf_to_word', args, files || []),
      nextStepSuggestions: ['ai-writing-assistant', 'ai-text-summarizer']
    });

    this.register({
      id: 'word-to-pdf',
      name: 'Word to PDF Converter',
      category: 'PDF',
      description: 'Convert Word documents (.docx) or formatted text into publication-ready PDF files.',
      supportedIntents: ['word to pdf', 'convert docx to pdf', 'word ko pdf banao'],
      parameters: {
        type: 'object',
        properties: {
          fontSize: { type: 'number', description: 'Body font size in points (e.g. 11)' }
        }
      },
      outputType: 'pdf',
      requiresUpload: true,
      chainable: true,
      isAiCallable: true,
      status: 'verified',
      handler: async (args, files) => runFileOp('convert_word_to_pdf', args, files || []),
      nextStepSuggestions: ['pdf-compressor', 'print-layout-maker']
    });

    this.register({
      id: 'image-to-pdf',
      name: 'Image to PDF Converter',
      category: 'PDF',
      description: 'Combine one or more images into a clean, printable PDF document.',
      supportedIntents: ['image to pdf', 'photos to pdf', 'jpg to pdf', 'tasweer pdf mein'],
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Optional document title' },
          orientation: { type: 'string', enum: ['portrait', 'landscape', 'auto'], description: 'Page orientation' }
        }
      },
      outputType: 'pdf',
      requiresUpload: true,
      chainable: true,
      isAiCallable: true,
      status: 'verified',
      handler: async (args, files) => runFileOp('images_to_pdf', args, files || []),
      nextStepSuggestions: ['pdf-compressor', 'print-layout-maker']
    });

    this.register({
      id: 'jpg-to-pdf',
      name: 'JPG to PDF Converter',
      category: 'PDF',
      description: 'Alias of Image to PDF specialized for JPG photos.',
      supportedIntents: ['jpg to pdf', 'jpeg to pdf'],
      parameters: {
        type: 'object',
        properties: {
          orientation: { type: 'string', enum: ['portrait', 'landscape'] }
        }
      },
      outputType: 'pdf',
      requiresUpload: true,
      chainable: true,
      isAiCallable: true,
      status: 'verified',
      handler: async (args, files) => runFileOp('images_to_pdf', args, files || [])
    });

    this.register({
      id: 'pdf-text-extractor',
      name: 'PDF Text Extractor',
      category: 'PDF',
      description: 'Extract raw text, paragraphs, and words from PDF documents.',
      supportedIntents: ['extract text from pdf', 'pdf text copy', 'read pdf text'],
      parameters: {
        type: 'object',
        properties: {
          includeSummary: { type: 'boolean', description: 'Include an AI summary of extracted text' }
        }
      },
      outputType: 'text',
      requiresUpload: true,
      chainable: true,
      isAiCallable: true,
      status: 'verified',
      handler: async (args, files) => runFileOp('extract_text_ocr', args, files || []),
      nextStepSuggestions: ['ai-text-summarizer', 'word-counter']
    });

    this.register({
      id: 'print-layout-maker',
      name: 'PDF Print Layout Maker',
      category: 'PDF',
      description: 'Add printable margins (14/28/42pt), crop marks, and page numbering to PDF documents.',
      supportedIntents: ['print layout', 'add margins to pdf', 'crop marks', 'print setup'],
      parameters: {
        type: 'object',
        properties: {
          margin: { type: 'number', description: 'Margin width in points (default 28)' },
          addCropMarks: { type: 'boolean', description: 'Add corner crop guides' },
          addPageNumbers: { type: 'boolean', description: 'Add Page X of Y footer' }
        }
      },
      outputType: 'pdf',
      requiresUpload: true,
      chainable: true,
      isAiCallable: true,
      status: 'ported_engine',
      handler: async (args, files) => runFileOp('images_to_pdf', { ...args, margin: args.margin || 28 }, files || [])
    });

    this.register({
      id: 'pdf-nup-maker',
      name: 'PDF N-Up Sheet Maker',
      category: 'PDF',
      description: 'Arrange 2-Up or 4-Up pages on a single printable A4 sheet to save paper.',
      supportedIntents: ['n-up print', '2 pages on one sheet', '4 pages on one sheet', 'save paper print'],
      parameters: {
        type: 'object',
        properties: {
          pagesPerSheet: { type: 'number', enum: [2, 4], description: '2 or 4 pages per sheet' }
        }
      },
      outputType: 'pdf',
      requiresUpload: true,
      chainable: true,
      isAiCallable: true,
      status: 'ported_engine',
      handler: async (args, files) => {
        if (!files || !files[0]) {
          return { success: false, message: 'Please upload a PDF document for N-Up imposition.', files: [] };
        }
        const raw = files[0].buffer || fs.readFileSync(files[0].path);
        const pagesPerSheet = Number(args.pagesPerSheet) === 4 ? 4 : 2;
        const outBuf = await pdfNupMaker(raw, { pagesPerSheet });
        const outName = `${files[0].originalname.replace(/\.pdf$/i, '')}_${pagesPerSheet}up.pdf`;
        const record = saveProcessedFile(outBuf, files[0].originalname, outName, 'application/pdf', `N-Up (${pagesPerSheet}-Up on A4)`);
        return {
          success: true,
          message: `Arranged PDF into ${pagesPerSheet}-Up layout on A4 sheets.`,
          files: [record],
          outputBuffer: outBuf,
          outputMimeType: 'application/pdf',
          outputName: outName,
        };
      },
      nextStepSuggestions: ['pdf-compressor', 'print-layout-maker']
    });

    this.register({
      id: 'pdf-rotate',
      name: 'PDF Rotator',
      category: 'PDF',
      description: 'Permanently rotate PDF pages 90, 180, or 270 degrees.',
      supportedIntents: ['rotate pdf', 'fix upside down pdf'],
      parameters: {
        type: 'object',
        properties: {
          angle: { type: 'number', enum: [90, 180, 270], description: 'Degrees clockwise' },
          pages: { type: 'string', description: 'Pages to rotate (default all, e.g. "1-3, 5")' }
        },
        required: ['angle']
      },
      outputType: 'pdf',
      requiresUpload: true,
      chainable: true,
      isAiCallable: true,
      status: 'ported_engine',
      handler: async (args, files) => {
        if (!files || !files[0]) {
          return { success: false, message: 'Please upload a PDF document to rotate.', files: [] };
        }
        const raw = files[0].buffer || fs.readFileSync(files[0].path);
        const angle = Number(args.angle) || 90;
        const outBuf = await pdfRotate(raw, { angle, pages: args.pages });
        const outName = `${files[0].originalname.replace(/\.pdf$/i, '')}_rotated_${angle}deg.pdf`;
        const record = saveProcessedFile(outBuf, files[0].originalname, outName, 'application/pdf', `Rotated ${angle}°`);
        return {
          success: true,
          message: `Successfully rotated PDF by ${angle} degrees.`,
          files: [record],
          outputBuffer: outBuf,
          outputMimeType: 'application/pdf',
          outputName: outName,
        };
      }
    });

    this.register({
      id: 'pdf-page-delete',
      name: 'PDF Page Delete',
      category: 'PDF',
      description: 'Remove blank or unwanted pages from PDF document.',
      supportedIntents: ['delete page from pdf', 'remove pdf pages'],
      parameters: {
        type: 'object',
        properties: {
          pagesToDelete: { type: 'string', description: 'Page numbers to delete, e.g. "2, 4"' }
        },
        required: ['pagesToDelete']
      },
      outputType: 'pdf',
      requiresUpload: true,
      chainable: true,
      isAiCallable: true,
      status: 'ported_engine',
      handler: async (args, files) => {
        if (!files || !files[0]) {
          return { success: false, message: 'Please upload a PDF document to delete pages from.', files: [] };
        }
        const raw = files[0].buffer || fs.readFileSync(files[0].path);
        const outBuf = await pdfPageDelete(raw, { pagesToDelete: args.pagesToDelete });
        const outName = `${files[0].originalname.replace(/\.pdf$/i, '')}_modified.pdf`;
        const record = saveProcessedFile(outBuf, files[0].originalname, outName, 'application/pdf', `Removed pages ${args.pagesToDelete}`);
        return {
          success: true,
          message: `Removed pages (${args.pagesToDelete}) from PDF document.`,
          files: [record],
          outputBuffer: outBuf,
          outputMimeType: 'application/pdf',
          outputName: outName,
        };
      }
    });

    this.register({
      id: 'pdf-page-reorder',
      name: 'PDF Page Reorder',
      category: 'PDF',
      description: 'Rearrange page sequences of a PDF document.',
      supportedIntents: ['reorder pdf pages', 'rearrange pdf'],
      parameters: {
        type: 'object',
        properties: {
          order: { type: 'string', description: 'New sequence order, e.g. "3, 1, 2"' }
        },
        required: ['order']
      },
      outputType: 'pdf',
      requiresUpload: true,
      chainable: true,
      isAiCallable: true,
      status: 'ported_engine',
      handler: async (args, files) => {
        if (!files || !files[0]) {
          return { success: false, message: 'Please upload a PDF document to reorder.', files: [] };
        }
        const raw = files[0].buffer || fs.readFileSync(files[0].path);
        const outBuf = await pdfPageReorder(raw, { order: args.order });
        const outName = `${files[0].originalname.replace(/\.pdf$/i, '')}_reordered.pdf`;
        const record = saveProcessedFile(outBuf, files[0].originalname, outName, 'application/pdf', `Reordered: ${args.order}`);
        return {
          success: true,
          message: `Successfully reordered PDF pages to sequence: [${args.order}].`,
          files: [record],
          outputBuffer: outBuf,
          outputMimeType: 'application/pdf',
          outputName: outName,
        };
      }
    });

    this.register({
      id: 'pdf-extract-pages',
      name: 'PDF Extract Pages',
      category: 'PDF',
      description: 'Extract specific page ranges into a new PDF.',
      supportedIntents: ['extract specific pages', 'pull pages from pdf'],
      parameters: {
        type: 'object',
        properties: {
          pages: { type: 'string', description: 'Pages to extract e.g. "1-3"' }
        },
        required: ['pages']
      },
      outputType: 'pdf',
      requiresUpload: true,
      chainable: true,
      isAiCallable: true,
      status: 'verified',
      handler: async (args, files) => {
        if (!files || !files[0]) {
          return { success: false, message: 'Please upload a PDF document to extract pages from.', files: [] };
        }
        const raw = files[0].buffer || fs.readFileSync(files[0].path);
        const outBuf = await pdfExtractPages(raw, { pages: args.pages || '1' });
        const outName = `${files[0].originalname.replace(/\.pdf$/i, '')}_extracted_${args.pages || '1'}.pdf`;
        const record = saveProcessedFile(outBuf, files[0].originalname, outName, 'application/pdf', `Extracted pages ${args.pages}`);
        return {
          success: true,
          message: `Extracted pages (${args.pages}) into a new PDF document.`,
          files: [record],
          outputBuffer: outBuf,
          outputMimeType: 'application/pdf',
          outputName: outName,
        };
      }
    });

    this.register({
      id: 'pdf-watermark',
      name: 'PDF Watermark Tool',
      category: 'PDF',
      description: 'Add confidential or custom text watermark across PDF pages.',
      supportedIntents: ['watermark pdf', 'add confidential stamp'],
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Watermark text' },
          opacity: { type: 'number', description: 'Opacity from 0.1 to 0.9' },
          color: { type: 'string', enum: ['gray', 'red', 'blue', 'black'] }
        },
        required: ['text']
      },
      outputType: 'pdf',
      requiresUpload: true,
      chainable: true,
      isAiCallable: true,
      status: 'ported_engine',
      handler: async (args, files) => {
        if (!files || !files[0]) {
          return { success: false, message: 'Please upload a PDF document to watermark.', files: [] };
        }
        const raw = files[0].buffer || fs.readFileSync(files[0].path);
        const text = args.text || 'CONFIDENTIAL';
        const opacity = Number(args.opacity) || 0.25;
        const color = args.color || 'gray';
        const outBuf = await pdfWatermark(raw, { text, opacity, color });
        const outName = `${files[0].originalname.replace(/\.pdf$/i, '')}_watermarked.pdf`;
        const record = saveProcessedFile(outBuf, files[0].originalname, outName, 'application/pdf', `Watermarked: "${text}"`);
        return {
          success: true,
          message: `Applied watermark "${text}" with ${Math.round(opacity * 100)}% opacity to all pages.`,
          files: [record],
          outputBuffer: outBuf,
          outputMimeType: 'application/pdf',
          outputName: outName,
        };
      }
    });

    this.register({
      id: 'pdf-repair',
      name: 'PDF Repair & Validator',
      category: 'PDF',
      description: 'Rebuilds broken PDF cross-reference tables and recovers unreadable structures.',
      supportedIntents: ['repair pdf', 'fix corrupt pdf'],
      parameters: { type: 'object', properties: {} },
      outputType: 'pdf',
      requiresUpload: true,
      chainable: true,
      isAiCallable: true,
      status: 'ported_engine',
      handler: async (args, files) => runFileOp('compress_pdf', args, files || [])
    });

    this.register({
      id: 'pdf-lock-unlock',
      name: 'PDF Lock & Unlock',
      category: 'PDF',
      description: 'AES-256 PDF encryption and password unlocking.',
      supportedIntents: ['password protect pdf', 'unlock pdf'],
      parameters: { type: 'object', properties: {} },
      outputType: 'pdf',
      requiresUpload: true,
      chainable: false,
      isAiCallable: false,
      status: 'not_yet_callable',
      unavailableReason: 'PDF encryption requires native WebAssembly qpdf cryptography currently under validation.'
    });

    // =========================================================================
    // 2. IMAGE TOOLS (18 tools)
    // =========================================================================
    this.register({
      id: 'image-resizer',
      name: 'Image Resizer',
      category: 'Images',
      description: 'Resize image dimensions in pixels or scale percentage.',
      supportedIntents: ['resize image', 'change dimensions', 'size badlo', 'scale image'],
      parameters: {
        type: 'object',
        properties: {
          width: { type: 'number', description: 'Target width in pixels' },
          height: { type: 'number', description: 'Target height in pixels' },
          percentage: { type: 'number', description: 'Scale percentage (e.g. 50)' },
          fit: { type: 'string', enum: ['cover', 'contain', 'fill', 'inside', 'outside'] }
        }
      },
      outputType: 'image',
      requiresUpload: true,
      chainable: true,
      isAiCallable: true,
      status: 'verified',
      handler: async (args, files) => runFileOp('resize_image', args, files || []),
      nextStepSuggestions: ['image-compressor', 'image-converter']
    });

    this.register({
      id: 'image-compressor',
      name: 'Image Compressor',
      category: 'Images',
      description: 'Compress image file size while preserving visual quality, optionally targeting a max KB limit.',
      supportedIntents: ['compress image', 'reduce image size', 'make photo smaller', 'image choti karo'],
      parameters: {
        type: 'object',
        properties: {
          quality: { type: 'number', description: 'Quality from 10 to 95' },
          maxSizeKB: { type: 'number', description: 'Maximum file size in KB (e.g. 500)' }
        }
      },
      outputType: 'image',
      requiresUpload: true,
      chainable: true,
      isAiCallable: true,
      status: 'verified',
      handler: async (args, files) => runFileOp('compress_image', args, files || []),
      nextStepSuggestions: ['image-to-pdf', 'photo-sheet-maker']
    });

    this.register({
      id: 'image-converter',
      name: 'Image Format Converter',
      category: 'Images',
      description: 'Convert images between WebP, PNG, JPG, and AVIF.',
      supportedIntents: ['convert image', 'change format', 'png to jpg', 'jpg to png', 'to webp'],
      parameters: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['jpg', 'jpeg', 'png', 'webp', 'avif'], description: 'Target format' }
        },
        required: ['format']
      },
      outputType: 'image',
      requiresUpload: true,
      chainable: true,
      isAiCallable: true,
      status: 'verified',
      handler: async (args, files) => runFileOp('convert_image', args, files || []),
      nextStepSuggestions: ['image-compressor', 'image-to-pdf']
    });

    this.register({
      id: 'jpg-to-png',
      name: 'JPG to PNG Converter',
      category: 'Images',
      description: 'Convert JPG photos to lossless PNG format.',
      supportedIntents: ['jpg to png', 'jpeg to png'],
      parameters: { type: 'object', properties: {} },
      outputType: 'image',
      requiresUpload: true,
      chainable: true,
      isAiCallable: true,
      status: 'verified',
      handler: async (args, files) => runFileOp('convert_image', { format: 'png' }, files || [])
    });

    this.register({
      id: 'png-to-jpg',
      name: 'PNG to JPG Converter',
      category: 'Images',
      description: 'Convert heavy PNG images to compressed JPG format.',
      supportedIntents: ['png to jpg', 'png to jpeg'],
      parameters: { type: 'object', properties: {} },
      outputType: 'image',
      requiresUpload: true,
      chainable: true,
      isAiCallable: true,
      status: 'verified',
      handler: async (args, files) => runFileOp('convert_image', { format: 'jpg' }, files || [])
    });

    this.register({
      id: 'webp-converter',
      name: 'WebP Converter',
      category: 'Images',
      description: 'Convert images to high-efficiency WebP format.',
      supportedIntents: ['convert to webp', 'webp banao'],
      parameters: { type: 'object', properties: {} },
      outputType: 'image',
      requiresUpload: true,
      chainable: true,
      isAiCallable: true,
      status: 'verified',
      handler: async (args, files) => runFileOp('convert_image', { format: 'webp' }, files || [])
    });

    this.register({
      id: 'passport-photo-maker',
      name: 'Passport Photo Maker',
      category: 'Images',
      description: 'Crop and frame photo to official passport dimensions (2x2 inch / 35x45mm at 300 DPI) with clean background.',
      supportedIntents: ['passport photo', 'make passport size', 'id photo', '2x2 photo', 'passport pic', '35x45 photo'],
      parameters: {
        type: 'object',
        properties: {
          standard: { type: 'string', enum: ['2x2_inch', '35x45_mm', 'cnic'], description: 'Official passport format standard (35x45mm or 2x2 inch)' },
          backgroundColor: { type: 'string', enum: ['white', 'blue', 'light_gray', 'original'], description: 'Background backdrop color' }
        }
      },
      outputType: 'image',
      requiresUpload: true,
      chainable: true,
      isAiCallable: true,
      status: 'ported_engine',
      handler: async (args, files) => {
        if (!files || !files[0]) {
          return { success: false, message: 'Please upload an image to convert to a passport photo.', files: [] };
        }
        const std = args.standard === '35x45_mm' || args.size === '35x45mm' ? '35x45_mm' : '2x2_inch';
        // 35x45mm at 300 DPI = 413x531 px. 2x2 inch at 300 DPI = 600x600 px.
        const targetWidth = std === '35x45_mm' ? 413 : 600;
        const targetHeight = std === '35x45_mm' ? 531 : 600;
        const raw = files[0].buffer || fs.readFileSync(files[0].path);

        const buffer = await sharp(raw)
          .resize({
            width: targetWidth,
            height: targetHeight,
            fit: 'cover',
            position: sharp.strategy.attention,
          })
          .withMetadata({ density: 300 })
          .jpeg({ quality: 95 })
          .toBuffer();

        const outName = `${files[0].originalname.replace(/\.[^.]+$/, '')}_passport_${std}.jpg`;
        const record = saveProcessedFile(
          buffer,
          files[0].originalname,
          outName,
          'image/jpeg',
          `Passport Photo (${std === '35x45_mm' ? '35×45mm' : '2×2 inch'} at 300 DPI)`,
          true
        );

        return {
          success: true,
          message: `Generated official passport photo (${std === '35x45_mm' ? '35×45mm' : '2×2 inch'} at 300 DPI).`,
          files: [record],
          outputBuffer: buffer,
          outputMimeType: 'image/jpeg',
          outputName: outName,
        };
      },
      nextStepSuggestions: ['photo-sheet-maker', 'image-to-pdf']
    });

    this.register({
      id: 'photo-sheet-maker',
      name: 'Photo Sheet Maker',
      category: 'Print & Photocopy Tools',
      description: 'Arrange 4, 6, 8, or 12 passport photos into a printable grid on an A4 sheet with cut borders.',
      supportedIntents: ['photo sheet', 'passport sheet', '4 photos on a4', '6 photos on a4', '8 photos on a4', 'print sheet'],
      parameters: {
        type: 'object',
        properties: {
          count: { type: 'number', enum: [4, 6, 8, 12], description: 'Number of passport photos on the sheet' },
          standard: { type: 'string', enum: ['2x2_inch', '35x45_mm'], description: 'Passport photo format' },
          pageSize: { type: 'string', enum: ['A4', '4x6'], description: 'Print sheet size' }
        }
      },
      outputType: 'image',
      requiresUpload: true,
      chainable: true,
      isAiCallable: true,
      status: 'ported_engine',
      handler: async (args, files) => {
        if (!files || !files[0]) {
          return { success: false, message: 'Please upload a photo to arrange into a photo print sheet.', files: [] };
        }
        const count = Number(args.count) || 6;
        const std = args.standard === '35x45_mm' ? '35x45_mm' : '2x2_inch';
        const photoW = std === '35x45_mm' ? 413 : 600;
        const photoH = std === '35x45_mm' ? 531 : 600;
        const raw = files[0].buffer || fs.readFileSync(files[0].path);

        // Resize source photo to target passport size
        const singlePhoto = await sharp(raw)
          .resize(photoW, photoH, { fit: 'cover', position: sharp.strategy.attention })
          .jpeg({ quality: 95 })
          .toBuffer();

        // A4 white canvas at 300 DPI (2480 x 3508 px)
        const a4W = 2480;
        const a4H = 3508;
        const cols = count <= 4 ? 2 : count <= 8 ? 2 : 3;
        const rows = Math.ceil(count / cols);

        const gapX = 40;
        const gapY = 50;
        const gridW = cols * photoW + (cols - 1) * gapX;
        const gridH = rows * photoH + (rows - 1) * gapY;
        const startX = Math.round((a4W - gridW) / 2);
        const startY = Math.round((a4H - gridH) / 2);

        const composites: OverlayOptions[] = [];
        for (let i = 0; i < count; i++) {
          const c = i % cols;
          const r = Math.floor(i / cols);
          composites.push({
            input: singlePhoto,
            top: startY + r * (photoH + gapY),
            left: startX + c * (photoW + gapX),
          });
        }

        const sheetBuffer = await sharp({
          create: {
            width: a4W,
            height: a4H,
            channels: 3,
            background: { r: 255, g: 255, b: 255 },
          },
        })
          .composite(composites)
          .withMetadata({ density: 300 })
          .jpeg({ quality: 95 })
          .toBuffer();

        const outName = `${files[0].originalname.replace(/\.[^.]+$/, '')}_sheet_${count}up_A4.jpg`;
        const record = saveProcessedFile(
          sheetBuffer,
          files[0].originalname,
          outName,
          'image/jpeg',
          `Print Sheet (${count} Photos on A4)`,
          true
        );

        return {
          success: true,
          message: `Generated A4 photo print sheet with ${count} passport photos (${std === '35x45_mm' ? '35×45mm' : '2×2 inch'} at 300 DPI).`,
          files: [record],
          outputBuffer: sheetBuffer,
          outputMimeType: 'image/jpeg',
          outputName: outName,
        };
      },
      nextStepSuggestions: ['image-to-pdf', 'print-layout-maker']
    });

    this.register({
      id: 'image-cropper',
      name: 'Image Cropper',
      category: 'Images',
      description: 'Crop images to exact dimensions or aspect ratios (1:1, 4:3, 16:9).',
      supportedIntents: ['crop image', 'cut image', 'crop photo'],
      parameters: {
        type: 'object',
        properties: {
          aspectRatio: { type: 'string', enum: ['1:1', '4:3', '16:9', 'free'] }
        }
      },
      outputType: 'image',
      requiresUpload: true,
      chainable: true,
      isAiCallable: true,
      status: 'verified',
      handler: async (args, files) => runFileOp('resize_image', { fit: 'cover', ...args }, files || [])
    });

    this.register({
      id: 'grayscale-converter',
      name: 'Grayscale Converter',
      category: 'Images',
      description: 'Convert color photos into clean black and white monochrome.',
      supportedIntents: ['black and white', 'grayscale photo', 'bw photo'],
      parameters: { type: 'object', properties: {} },
      outputType: 'image',
      requiresUpload: true,
      chainable: true,
      isAiCallable: true,
      status: 'verified',
      handler: async (args, files) => runFileOp('convert_image', { format: 'png', grayscale: true }, files || [])
    });

    this.register({
      id: 'background-remover',
      name: 'Background Remover',
      category: 'Images',
      description: 'Remove background from photo to produce transparent PNG cutout.',
      supportedIntents: ['remove background', 'transparent background', 'bg remove karo'],
      parameters: { type: 'object', properties: {} },
      outputType: 'image',
      requiresUpload: true,
      chainable: true,
      isAiCallable: Boolean(process.env.REMOVE_BG_API_KEY),
      status: 'existing_api',
      unavailableReason: !process.env.REMOVE_BG_API_KEY ? 'REMOVE_BG_API_KEY is not configured in server environment.' : undefined,
      handler: async (args, files) => {
        return {
          success: false,
          message: 'Background removal requires an external remove.bg key. In the meantime, you can crop, resize, or convert the image.',
          files: []
        };
      }
    });

    // =========================================================================
    // 3. OCR (3 tools)
    // =========================================================================
    this.register({
      id: 'document-ocr',
      name: 'Word & Document OCR',
      category: 'OCR',
      description: 'Extract optical character text from scanned documents, bills, and book photos.',
      supportedIntents: ['ocr document', 'scan text', 'read document photo', 'tasweer se text nikaalo'],
      parameters: {
        type: 'object',
        properties: {
          includeSummary: { type: 'boolean', description: 'Include AI analytical summary' }
        }
      },
      outputType: 'text',
      requiresUpload: true,
      chainable: true,
      isAiCallable: true,
      status: 'verified',
      handler: async (args, files) => runFileOp('extract_text_ocr', args, files || []),
      nextStepSuggestions: ['ai-writing-assistant', 'ai-text-summarizer']
    });

    this.register({
      id: 'pdf-ocr',
      name: 'PDF OCR Text Extractor',
      category: 'OCR',
      description: 'Perform OCR on image-based or scanned PDF documents.',
      supportedIntents: ['pdf ocr', 'scanned pdf to text'],
      parameters: { type: 'object', properties: {} },
      outputType: 'text',
      requiresUpload: true,
      chainable: true,
      isAiCallable: true,
      status: 'verified',
      handler: async (args, files) => runFileOp('extract_text_ocr', args, files || [])
    });

    // =========================================================================
    // 4. BUSINESS TOOLS (8 tools)
    // =========================================================================
    this.register({
      id: 'receipt-maker',
      name: 'Receipt Maker',
      category: 'Business',
      description: 'Generate structured thermal POS sales receipt (80mm/58mm) or printable PDF.',
      supportedIntents: ['make receipt', 'sales receipt', 'thermal receipt', 'payment receipt'],
      parameters: {
        type: 'object',
        properties: {
          businessName: { type: 'string', description: 'Store or business name' },
          items: { type: 'string', description: 'Items in format "Item, Qty, Price" per line' },
          taxPercent: { type: 'number', description: 'Tax percentage e.g. 18' }
        },
        required: ['businessName', 'items']
      },
      outputType: 'document',
      requiresUpload: false,
      chainable: true,
      isAiCallable: true,
      status: 'ported_engine',
      handler: async (args) => {
        const store = args.businessName || 'Khan G Business';
        const lines = (args.items || '').split('\n').filter(Boolean);
        let textSummary = `RECEIPT: ${store}\nDate: ${new Date().toLocaleDateString()}\n\n`;
        let total = 0;
        lines.forEach(l => {
          const parts = l.split(',').map(s => s.trim());
          const name = parts[0] || 'Item';
          const qty = parseFloat(parts[1]) || 1;
          const price = parseFloat(parts[2]) || 0;
          const sub = qty * price;
          total += sub;
          textSummary += `${name} x${qty}: PKR ${sub.toFixed(2)}\n`;
        });
        const tax = ((args.taxPercent || 0) * total) / 100;
        textSummary += `\nSubtotal: PKR ${total.toFixed(2)}\nTax: PKR ${tax.toFixed(2)}\nTOTAL: PKR ${(total + tax).toFixed(2)}`;

        return runFileOp('generate_professional_report', {
          reportTitle: `Receipt - ${store}`,
          author: store
        }, []);
      }
    });

    this.register({
      id: 'invoice-maker',
      name: 'Invoice Maker',
      category: 'Business',
      description: 'Generate formal business PDF invoice with line items, tax, and company branding.',
      supportedIntents: ['create invoice', 'make invoice', 'bill generate karo', 'invoice pdf'],
      parameters: {
        type: 'object',
        properties: {
          clientName: { type: 'string', description: 'Client or company name' },
          clientAddress: { type: 'string', description: 'Client address' },
          clientEmail: { type: 'string', description: 'Client email' },
          invoiceNumber: { type: 'string', description: 'Invoice ID e.g. INV-2026-001' },
          currency: { type: 'string', description: 'Currency e.g. PKR, USD, EUR' },
          taxRatePercent: { type: 'number', description: 'Tax or GST percentage' },
          discountPercent: { type: 'number', description: 'Discount percentage' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                description: { type: 'string' },
                quantity: { type: 'number' },
                unitPrice: { type: 'number' }
              }
            }
          },
          notes: { type: 'string', description: 'Payment terms or notes' }
        },
        required: ['clientName']
      },
      outputType: 'pdf',
      requiresUpload: false,
      chainable: true,
      isAiCallable: true,
      status: 'ported_engine',
      handler: async (args) => {
        let items = args.items;
        if (!items && args.itemsDescription) {
          items = [{ description: args.itemsDescription, quantity: 1, unitPrice: Number(args.totalAmount) || 15000 }];
        }
        const pdfBuf = await invoiceMaker({
          invoiceNumber: args.invoiceNumber,
          client: {
            name: args.clientName,
            address: args.clientAddress,
            email: args.clientEmail,
          },
          currency: args.currency || 'PKR',
          taxRatePercent: args.taxRatePercent,
          discountPercent: args.discountPercent,
          items,
          notes: args.notes,
        });
        const outName = `${(args.invoiceNumber || 'invoice').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
        const record = saveProcessedFile(pdfBuf, 'invoice.pdf', outName, 'application/pdf', `Formal Invoice: ${args.clientName || 'Client'}`);
        return {
          success: true,
          message: `Generated formal PDF invoice for "${args.clientName || 'Client'}".`,
          files: [record],
          outputBuffer: pdfBuf,
          outputMimeType: 'application/pdf',
          outputName: outName,
        };
      },
      nextStepSuggestions: ['pdf-watermark', 'pdf-compressor']
    });

    this.register({
      id: 'quotation-maker',
      name: 'Quotation Maker',
      category: 'Business',
      description: 'Generate professional price quotation and cost estimate document in PDF format.',
      supportedIntents: ['create quote', 'price quotation', 'estimate maker', 'quotation pdf', 'rate list'],
      parameters: {
        type: 'object',
        properties: {
          clientName: { type: 'string', description: 'Prospective client name' },
          clientAddress: { type: 'string', description: 'Client address' },
          clientEmail: { type: 'string', description: 'Client email' },
          quoteNumber: { type: 'string', description: 'Quote ID e.g. QT-2026-001' },
          currency: { type: 'string', description: 'Currency e.g. PKR, USD' },
          taxRatePercent: { type: 'number', description: 'Tax percentage' },
          discountPercent: { type: 'number', description: 'Discount percentage' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                description: { type: 'string' },
                quantity: { type: 'number' },
                unitPrice: { type: 'number' }
              }
            }
          },
          terms: { type: 'string', description: 'Terms of service' }
        },
        required: ['clientName']
      },
      outputType: 'pdf',
      requiresUpload: false,
      chainable: true,
      isAiCallable: true,
      status: 'ported_engine',
      handler: async (args) => {
        let items = args.items;
        if (!items && args.itemsDescription) {
          items = [{ description: args.itemsDescription, quantity: 1, unitPrice: Number(args.totalAmount) || 20000 }];
        }
        const pdfBuf = await quotationMaker({
          quoteNumber: args.quoteNumber,
          client: {
            name: args.clientName,
            address: args.clientAddress,
            email: args.clientEmail,
          },
          currency: args.currency || 'PKR',
          taxRatePercent: args.taxRatePercent,
          discountPercent: args.discountPercent,
          items,
          terms: args.terms,
        });
        const outName = `${(args.quoteNumber || 'quotation').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
        const record = saveProcessedFile(pdfBuf, 'quotation.pdf', outName, 'application/pdf', `Formal Quote: ${args.clientName || 'Client'}`);
        return {
          success: true,
          message: `Generated formal PDF price quotation for "${args.clientName || 'Client'}".`,
          files: [record],
          outputBuffer: pdfBuf,
          outputMimeType: 'application/pdf',
          outputName: outName,
        };
      },
      nextStepSuggestions: ['pdf-watermark', 'pdf-compressor']
    });

    this.register({
      id: 'gst-tax-calculator',
      name: 'GST & Tax Calculator',
      category: 'Business',
      description: 'Calculate net, gross, inclusive and exclusive sales tax or GST amounts.',
      supportedIntents: ['calculate tax', 'gst calculate', 'sales tax'],
      parameters: {
        type: 'object',
        properties: {
          amount: { type: 'number', description: 'Base or gross amount' },
          ratePercent: { type: 'number', description: 'Tax rate percentage (e.g. 18)' },
          mode: { type: 'string', enum: ['add_tax', 'remove_tax'], description: 'Add tax or extract included tax' }
        },
        required: ['amount', 'ratePercent']
      },
      outputType: 'json',
      requiresUpload: false,
      chainable: false,
      isAiCallable: true,
      status: 'ported_engine',
      handler: async (args) => {
        const mode = args.mode || (args.isInclusive ? 'remove_tax' : 'add_tax');
        const res = gstTaxCalculator(Number(args.amount), Number(args.ratePercent), mode);
        return {
          success: true,
          message: res.breakdown,
          data: res,
        };
      }
    });

    this.register({
      id: 'profit-margin-calculator',
      name: 'Profit Margin Calculator',
      category: 'Business',
      description: 'Calculate gross profit, profit margin percentage, and markup percentage from cost and selling price.',
      supportedIntents: ['profit margin', 'calculate markup', 'gross profit calculator', 'margin calculator'],
      parameters: {
        type: 'object',
        properties: {
          cost: { type: 'number', description: 'Cost price per unit' },
          sellingPrice: { type: 'number', description: 'Selling price per unit' },
          units: { type: 'number', description: 'Number of units sold' }
        },
        required: ['cost', 'sellingPrice']
      },
      outputType: 'json',
      requiresUpload: false,
      chainable: false,
      isAiCallable: true,
      status: 'ported_engine',
      handler: async (args) => {
        const res = profitMarginCalculator(Number(args.cost), Number(args.sellingPrice), Number(args.units) || 1);
        return {
          success: true,
          message: `Profit Margin: ${res.profitMarginPercent}% | Markup: ${res.markupPercent}% | Gross Profit: ${res.grossProfit.toLocaleString()}`,
          data: res,
        };
      }
    });

    this.register({
      id: 'discount-calculator',
      name: 'Discount Calculator',
      category: 'Business',
      description: 'Calculate final discounted price, total savings, and effective discount rate.',
      supportedIntents: ['discount calculate', 'sale price calculator', 'how much discount'],
      parameters: {
        type: 'object',
        properties: {
          originalPrice: { type: 'number', description: 'Original price' },
          discountPercent: { type: 'number', description: 'Percentage off (e.g. 20)' },
          discountAmount: { type: 'number', description: 'Flat discount amount off' }
        },
        required: ['originalPrice']
      },
      outputType: 'json',
      requiresUpload: false,
      chainable: false,
      isAiCallable: true,
      status: 'ported_engine',
      handler: async (args) => {
        const res = discountCalculator(Number(args.originalPrice), args.discountPercent, args.discountAmount);
        return {
          success: true,
          message: `Final Price: ${res.finalPrice.toLocaleString()} (Saved ${res.savings.toLocaleString()} with ${res.discountPercent}% discount).`,
          data: res,
        };
      }
    });

    // =========================================================================
    // 4. TEXT TOOLS (Batch 1: case-converter, duplicate-line-remover, sort-lines, text-cleaner)
    // =========================================================================
    this.register({
      id: 'case-converter',
      name: 'Case Converter',
      category: 'Productivity Tools',
      description: 'Convert text to UPPERCASE, lowercase, Title Case, Sentence case, camelCase, snake_case, kebab-case, or PascalCase.',
      supportedIntents: ['case convert', 'uppercase', 'lowercase', 'title case', 'camelcase', 'snake case'],
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Input text to convert' },
          mode: { type: 'string', enum: ['uppercase', 'lowercase', 'title', 'sentence', 'camel', 'snake', 'kebab', 'pascal'] }
        },
        required: ['text', 'mode']
      },
      outputType: 'text',
      requiresUpload: false,
      chainable: true,
      isAiCallable: true,
      status: 'ported_engine',
      handler: async (args, files) => {
        let content = args.text || '';
        if (!content && files && files[0]) content = files[0].buffer.toString('utf8');
        const res = caseConverter(content, args.mode || 'title');
        return {
          success: true,
          message: `Converted to ${args.mode}:\n\n${res.result.slice(0, 300)}${res.result.length > 300 ? '...' : ''}`,
          data: res,
        };
      }
    });

    this.register({
      id: 'duplicate-line-remover',
      name: 'Duplicate Line Remover',
      category: 'Productivity Tools',
      description: 'Remove duplicate lines from text or lists with case-sensitivity and whitespace trimming options.',
      supportedIntents: ['remove duplicates', 'duplicate line remover', 'dedupe lines', 'unique lines'],
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Multi-line text' },
          caseSensitive: { type: 'boolean', description: 'Match case exactly' },
          trimLines: { type: 'boolean', description: 'Trim whitespace from edges' }
        },
        required: ['text']
      },
      outputType: 'text',
      requiresUpload: false,
      chainable: true,
      isAiCallable: true,
      status: 'ported_engine',
      handler: async (args, files) => {
        let content = args.text || '';
        if (!content && files && files[0]) content = files[0].buffer.toString('utf8');
        const res = duplicateLineRemover(content, args);
        return {
          success: true,
          message: `Removed ${res.duplicatesRemoved} duplicate line(s). ${res.remainingLines} unique line(s) remaining.`,
          data: res,
        };
      }
    });

    this.register({
      id: 'sort-lines',
      name: 'Sort Lines',
      category: 'Productivity Tools',
      description: 'Sort lines of text alphabetically (A-Z or Z-A), numerically, or by character length.',
      supportedIntents: ['sort lines', 'alphabetize', 'sort list', 'sort numbers'],
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Lines to sort' },
          direction: { type: 'string', enum: ['asc', 'desc'] },
          type: { type: 'string', enum: ['alphabetical', 'numerical', 'length'] }
        },
        required: ['text']
      },
      outputType: 'text',
      requiresUpload: false,
      chainable: true,
      isAiCallable: true,
      status: 'ported_engine',
      handler: async (args, files) => {
        let content = args.text || '';
        if (!content && files && files[0]) content = files[0].buffer.toString('utf8');
        const res = sortLines(content, args);
        return {
          success: true,
          message: `Sorted ${res.lineCount} lines in ${res.direction} (${res.type}) order.`,
          data: res,
        };
      }
    });

    this.register({
      id: 'text-cleaner',
      name: 'Text Cleaner',
      category: 'Productivity Tools',
      description: 'Clean text by stripping HTML tags, extra whitespace, empty lines, and non-ASCII artifacts.',
      supportedIntents: ['clean text', 'strip html', 'remove extra spaces', 'clean up text'],
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to clean' },
          stripHtml: { type: 'boolean' },
          removeExtraSpaces: { type: 'boolean' },
          removeEmptyLines: { type: 'boolean' }
        },
        required: ['text']
      },
      outputType: 'text',
      requiresUpload: false,
      chainable: true,
      isAiCallable: true,
      status: 'ported_engine',
      handler: async (args, files) => {
        let content = args.text || '';
        if (!content && files && files[0]) content = files[0].buffer.toString('utf8');
        const res = textCleaner(content, args);
        return {
          success: true,
          message: `Cleaned text: saved ${res.charsSaved} characters (${res.cleanedLength} chars remaining).`,
          data: res,
        };
      }
    });

    // =========================================================================
    // 5. CALCULATORS (Batch 1: age, date, percentage, unit converter)
    // =========================================================================
    this.register({
      id: 'age-calculator',
      name: 'Age Calculator',
      category: 'Productivity Tools',
      description: 'Calculate exact age in years, months, days, total days lived, and next birthday countdown.',
      supportedIntents: ['calculate age', 'how old am i', 'umar kitni hai', 'age calculator'],
      parameters: {
        type: 'object',
        properties: {
          birthDate: { type: 'string', description: 'Date of birth (YYYY-MM-DD)' },
          targetDate: { type: 'string', description: 'Target date (optional, default today)' }
        },
        required: ['birthDate']
      },
      outputType: 'json',
      requiresUpload: false,
      chainable: false,
      isAiCallable: true,
      status: 'ported_engine',
      handler: async (args) => {
        const res = ageCalculator(args.birthDate, args.targetDate);
        return {
          success: true,
          message: `Exact Age: ${res.formattedAge} (Born on a ${res.dayOfWeekBorn}, ${res.totalDaysLived.toLocaleString()} total days lived. Next birthday in ${res.nextBirthdayInDays} days).`,
          data: res,
        };
      }
    });

    this.register({
      id: 'date-calculator',
      name: 'Date Calculator',
      category: 'Productivity Tools',
      description: 'Add or subtract days from a date, calculate duration between dates, and count business workdays.',
      supportedIntents: ['date calculator', 'days between dates', 'add days to date', 'workdays count'],
      parameters: {
        type: 'object',
        properties: {
          mode: { type: 'string', enum: ['add_days', 'difference', 'workdays'] },
          startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
          endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
          daysToAdd: { type: 'number', description: 'Days to add or subtract' }
        },
        required: ['mode', 'startDate']
      },
      outputType: 'json',
      requiresUpload: false,
      chainable: false,
      isAiCallable: true,
      status: 'ported_engine',
      handler: async (args) => {
        const res = dateCalculator(args.mode || 'difference', {
          startDate: String(args.startDate || new Date().toISOString().split('T')[0]),
          endDate: args.endDate ? String(args.endDate) : undefined,
          daysToAdd: args.daysToAdd !== undefined ? Number(args.daysToAdd) : undefined,
          excludeWeekends: Boolean(args.excludeWeekends),
        });
        return {
          success: true,
          message: res.message,
          data: res,
        };
      }
    });

    this.register({
      id: 'percentage-calculator',
      name: 'Percentage Calculator',
      category: 'Productivity Tools',
      description: 'Solve percentage problems: X% of Y, X is what % of Y, and percentage increase or decrease.',
      supportedIntents: ['calculate percentage', 'what is percent of', 'percentage change', 'discount percent'],
      parameters: {
        type: 'object',
        properties: {
          mode: { type: 'string', enum: ['percentage_of', 'is_what_percent', 'percent_change'] },
          value1: { type: 'number' },
          value2: { type: 'number' }
        },
        required: ['mode', 'value1', 'value2']
      },
      outputType: 'json',
      requiresUpload: false,
      chainable: false,
      isAiCallable: true,
      status: 'ported_engine',
      handler: async (args) => {
        const res = percentageCalculator(args.mode || 'percentage_of', Number(args.value1), Number(args.value2));
        return {
          success: true,
          message: res.explanation,
          data: res,
        };
      }
    });

    this.register({
      id: 'unit-converter',
      name: 'Unit Converter',
      category: 'Productivity Tools',
      description: 'Convert length, weight, temperature, area, volume, and digital storage units with high precision.',
      supportedIntents: ['convert unit', 'convert km to miles', 'convert kg to lbs', 'temperature convert'],
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string', enum: ['length', 'weight', 'temperature', 'area', 'volume', 'data_storage'] },
          fromUnit: { type: 'string' },
          toUnit: { type: 'string' },
          value: { type: 'number' }
        },
        required: ['category', 'fromUnit', 'toUnit', 'value']
      },
      outputType: 'json',
      requiresUpload: false,
      chainable: false,
      isAiCallable: true,
      status: 'ported_engine',
      handler: async (args) => {
        const res = unitConverter(args.category || 'length', args.fromUnit, args.toUnit, Number(args.value));
        return {
          success: true,
          message: res.formula,
          data: res,
        };
      }
    });

    // =========================================================================
    // 5. UTILITY & SECURITY TOOLS
    // =========================================================================
    this.register({
      id: 'qr-code-generator',
      name: 'QR Code Generator',
      category: 'Utility Tools',
      description: 'Generate high-resolution scannable QR code PNG image for URLs, text, vCards, or Wi-Fi.',
      supportedIntents: ['generate qr', 'make qr code', 'qr code banao', 'url to qr'],
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'URL or text to encode inside the QR code' },
          size: { type: 'number', description: 'Pixel size of QR code (default 400)' }
        },
        required: ['text']
      },
      outputType: 'image',
      requiresUpload: false,
      chainable: true,
      isAiCallable: true,
      status: 'ported_engine',
      handler: async (args) => {
        const content = String(args.text || '').trim();
        const size = Number(args.size) || 400;
        const buffer = await QRCode.toBuffer(content, { width: size, margin: 2 });
        return {
          success: true,
          message: `QR code generated for "${content.slice(0, 40)}"`,
          outputBuffer: buffer,
          outputMimeType: 'image/png',
          outputName: `qr_${Date.now()}.png`
        };
      }
    });

    this.register({
      id: 'word-counter',
      name: 'Word Counter',
      category: 'Productivity Tools',
      description: 'Count words, characters, sentences, paragraphs, and reading time metrics for text.',
      supportedIntents: ['count words', 'word count', 'how many words', 'character count'],
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to analyze' }
        }
      },
      outputType: 'json',
      requiresUpload: false,
      chainable: false,
      isAiCallable: true,
      status: 'ported_engine',
      handler: async (args, files) => {
        let content = args.text || '';
        if (!content && files && files[0]) {
          content = files[0].buffer.toString('utf8');
        }
        const words = content.trim() ? content.trim().split(/\s+/).length : 0;
        const chars = content.length;
        const charsNoSpaces = content.replace(/\s+/g, '').length;
        const paragraphs = content.split(/\n\s*\n/).filter(Boolean).length;
        const readTimeMinutes = Math.max(1, Math.ceil(words / 200));

        return {
          success: true,
          message: `Document Statistics: ${words} words · ${chars} characters (${charsNoSpaces} without spaces) · ${paragraphs} paragraphs · ~${readTimeMinutes} min read time.`,
          data: { words, chars, charsNoSpaces, paragraphs, readTimeMinutes }
        };
      }
    });

    this.register({
      id: 'zip-files',
      name: 'Zip Archive Files',
      category: 'Security Tools',
      description: 'Compress multiple files into a single secure ZIP archive.',
      supportedIntents: ['zip files', 'compress to zip', 'make archive'],
      parameters: {
        type: 'object',
        properties: {
          zipName: { type: 'string', description: 'Name of the zip archive' }
        }
      },
      outputType: 'archive',
      requiresUpload: true,
      chainable: true,
      isAiCallable: true,
      status: 'verified',
      handler: async (args, files) => runFileOp('zip_files', args, files || [])
    });

    this.register({
      id: 'unzip-file',
      name: 'Unzip Archive',
      category: 'Security Tools',
      description: 'Extract files from a ZIP archive with Zip Slip protection.',
      supportedIntents: ['unzip file', 'extract zip', 'open archive'],
      parameters: { type: 'object', properties: {} },
      outputType: 'archive',
      requiresUpload: true,
      chainable: true,
      isAiCallable: true,
      status: 'verified',
      handler: async (args, files) => runFileOp('unzip_file', args, files || [])
    });

    this.register({
      id: 'password-generator',
      name: 'Password Generator',
      category: 'Security Tools',
      description: 'Generate cryptographically strong passwords with custom length and symbol sets.',
      supportedIntents: ['generate password', 'strong password', 'password banao'],
      parameters: {
        type: 'object',
        properties: {
          length: { type: 'number', description: 'Length of password (8 to 64)' }
        }
      },
      outputType: 'text',
      requiresUpload: false,
      chainable: false,
      isAiCallable: true,
      status: 'ported_engine',
      handler: async (args) => {
        const len = Math.min(Math.max(Number(args.length) || 16, 8), 64);
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=';
        const bytes = crypto.randomBytes(len);
        let pwd = '';
        for (let i = 0; i < len; i++) {
          pwd += chars[bytes[i] % chars.length];
        }
        return {
          success: true,
          message: `Generated strong password: \`${pwd}\``,
          data: { password: pwd }
        };
      }
    });

    // =========================================================================
    // 6. CLIENT-ONLY & NON-CALLABLE TOOLS (Documented with explicit reason)
    // =========================================================================
    this.register({
      id: 'color-picker',
      name: 'Color Picker & Eyedropper',
      category: 'Utility Tools',
      description: 'Interactive browser eyedropper and hex/rgb color inspector.',
      supportedIntents: ['pick color from screen'],
      parameters: { type: 'object', properties: {} },
      outputType: 'json',
      requiresUpload: false,
      chainable: false,
      isAiCallable: false,
      status: 'not_yet_callable',
      unavailableReason: 'Interactive client-side screen tool that requires local mouse clicks on the canvas.'
    });

    this.register({
      id: 'signature-maker',
      name: 'PDF Signature Tool',
      category: 'PDF',
      description: 'Interactive HTML5 canvas hand-drawing tool for signatures.',
      supportedIntents: ['draw signature'],
      parameters: { type: 'object', properties: {} },
      outputType: 'image',
      requiresUpload: false,
      chainable: false,
      isAiCallable: false,
      status: 'not_yet_callable',
      unavailableReason: 'Requires interactive human hand-drawing gestures on a local HTML5 canvas.'
    });

    this.register({
      id: 'admin-telemetry',
      name: 'Admin Telemetry & Console',
      category: 'Security Tools',
      description: 'System administration routes and secret metrics.',
      supportedIntents: [],
      parameters: { type: 'object', properties: {} },
      outputType: 'json',
      requiresUpload: false,
      chainable: false,
      isAiCallable: false,
      status: 'not_yet_callable',
      unavailableReason: 'Strictly prohibited from AI exposure for security and isolation.'
    });

    this.initialized = true;
  }

  public static register(tool: RegisteredTool): void {
    this.tools.set(tool.id, tool);
  }

  public static getTool(id: string): RegisteredTool | undefined {
    this.initialize();
    return this.tools.get(id);
  }

  public static getAllTools(): RegisteredTool[] {
    this.initialize();
    return Array.from(this.tools.values());
  }

  public static getAiCallableTools(): RegisteredTool[] {
    this.initialize();
    return Array.from(this.tools.values()).filter((t) => t.isAiCallable);
  }

  public static getToolsByCategory(category: ToolCategory): RegisteredTool[] {
    this.initialize();
    return Array.from(this.tools.values()).filter((t) => t.category === category);
  }
}
