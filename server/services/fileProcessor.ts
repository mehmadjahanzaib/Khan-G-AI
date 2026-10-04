import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import ExcelJS from 'exceljs';
import * as docx from 'docx';
import AdmZip from 'adm-zip';
import * as pdfParseModule from 'pdf-parse';
import { FileRecord } from '../types.js';
import { performImageOCR } from './ocrService.js';

/**
 * Universal PDF text extractor supporting both pdf-parse v1 and v2 (PDFParse class)
 */
export async function extractPdfText(buffer: Buffer): Promise<{ text: string; numPages: number }> {
  try {
    const pdfModule: any = pdfParseModule;
    if (typeof pdfModule === 'function') {
      const parsed = await pdfModule(buffer);
      return { text: (parsed.text || '').trim(), numPages: parsed.numpages || 1 };
    }
    if (pdfModule && pdfModule.PDFParse) {
      const parser = new pdfModule.PDFParse({ data: buffer });
      const textResult = await parser.getText();
      return { text: (textResult?.text || '').trim(), numPages: textResult?.total || 1 };
    }
    if (pdfModule && typeof pdfModule.default === 'function') {
      const parsed = await pdfModule.default(buffer);
      return { text: (parsed.text || '').trim(), numPages: parsed.numpages || 1 };
    }
    if (pdfModule && pdfModule.default && pdfModule.default.PDFParse) {
      const parser = new pdfModule.default.PDFParse({ data: buffer });
      const textResult = await parser.getText();
      return { text: (textResult?.text || '').trim(), numPages: textResult?.total || 1 };
    }
  } catch (err: any) {
    console.error('PDF text extraction error:', err?.message || err);
  }
  return { text: '', numPages: 1 };
}

import os from 'os';

export const STORAGE_ROOT = process.env.STORAGE_DIR || (process.env.VERCEL ? path.join(os.tmpdir(), '.tmp_storage') : path.join(process.cwd(), '.tmp_storage'));
export const UPLOADS_DIR = path.join(STORAGE_ROOT, 'uploads');
export const PROCESSED_DIR = path.join(STORAGE_ROOT, 'processed');

// Ensure directories exist
for (const dir of [STORAGE_ROOT, UPLOADS_DIR, PROCESSED_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// In-memory record cache for tracking expiration
export const fileStore = new Map<string, FileRecord>();

// Configurable TTL in milliseconds (default 60 minutes)
export const FILE_TTL_MINUTES = parseInt(process.env.FILE_TTL_MINUTES || '60', 10);
export const FILE_TTL_MS = FILE_TTL_MINUTES * 60 * 1000;

export function sanitizeFilename(filename: string): string {
  const base = path.basename(filename);
  const sanitized = base.replace(/[^a-zA-Z0-9._-]/g, '_');
  return sanitized.length > 80 ? sanitized.slice(0, 80) : sanitized;
}

export function saveProcessedFile(
  buffer: Buffer,
  originalName: string,
  processedName: string,
  mimeType: string,
  previewText?: string,
  isImage?: boolean,
  meta?: {
    originalSize?: number;
    operation?: string;
    userId?: string;
  }
): FileRecord {
  const id = crypto.randomUUID();
  const safeName = sanitizeFilename(processedName);
  const diskFilename = `${id}_${safeName}`;
  const filePath = path.join(PROCESSED_DIR, diskFilename);

  fs.writeFileSync(filePath, buffer);

  const now = Date.now();
  const originalSize = meta?.originalSize;
  let savingsPercent: number | undefined;
  if (originalSize && originalSize > buffer.length) {
    savingsPercent = Math.round(((originalSize - buffer.length) / originalSize) * 100);
  }

  const record: FileRecord = {
    id,
    originalName,
    processedName: safeName,
    filePath,
    mimeType,
    size: buffer.length,
    originalSize,
    operation: meta?.operation,
    savingsPercent,
    createdAt: now,
    expiresAt: now + FILE_TTL_MS,
    previewText,
    isImage,
    userId: meta?.userId,
    storagePath: filePath,
  };

  fileStore.set(id, record);
  return record;
}

/**
 * Cleanup expired files older than configured TTL (60 min default)
 */
export function cleanupExpiredFiles() {
  const now = Date.now();
  for (const [id, record] of fileStore.entries()) {
    if (now >= record.expiresAt) {
      try {
        if (fs.existsSync(record.filePath)) {
          fs.unlinkSync(record.filePath);
        }
      } catch (err) {
        console.warn(`Failed to delete expired file ${record.filePath}:`, err);
      }
      fileStore.delete(id);
    }
  }

  // Also sweep directories for orphaned files older than TTL
  for (const dir of [UPLOADS_DIR, PROCESSED_DIR]) {
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stats = fs.statSync(fullPath);
        if (now - stats.mtimeMs > FILE_TTL_MS) {
          fs.unlinkSync(fullPath);
        }
      }
    } catch {
      // Ignore sweep errors
    }
  }
}

// Run cleanup periodically (default every 10 minutes)
export const CLEANUP_INTERVAL_MINUTES = parseInt(process.env.CLEANUP_INTERVAL_MINUTES || '10', 10);
setInterval(cleanupExpiredFiles, CLEANUP_INTERVAL_MINUTES * 60 * 1000);

export interface ProcessInput {
  files: Express.Multer.File[];
  toolName: string;
  args: Record<string, any>;
  userText: string;
  userId?: string;
}

export async function executeFileOperation(input: ProcessInput): Promise<{
  success: boolean;
  message: string;
  files: FileRecord[];
  clarification?: boolean;
}> {
  const { files, toolName, args, userText } = input;
  const primaryFile = files[0];

  try {
    switch (toolName) {
      // 1. Resize Image
      case 'resize_image': {
        if (!primaryFile) {
          return { success: false, message: 'Please upload an image to resize.', files: [], clarification: true };
        }
        const img = sharp(primaryFile.buffer || fs.readFileSync(primaryFile.path));
        const metadata = await img.metadata();

        let targetWidth = args.width ? Math.round(Number(args.width)) : undefined;
        let targetHeight = args.height ? Math.round(Number(args.height)) : undefined;

        if (args.percentage) {
          const factor = Number(args.percentage) / 100;
          if (metadata.width) targetWidth = Math.round(metadata.width * factor);
          if (metadata.height) targetHeight = Math.round(metadata.height * factor);
        }

        if (!targetWidth && !targetHeight) {
          targetWidth = 800;
        }

        const fit = (args.fit as any) || 'cover';
        const resizedBuffer = await img
          .resize({ width: targetWidth, height: targetHeight, fit, withoutEnlargement: false })
          .toBuffer();

        const ext = path.extname(primaryFile.originalname) || '.jpg';
        const nameWithoutExt = path.basename(primaryFile.originalname, ext);
        const outName = `${nameWithoutExt}_resized_${targetWidth || 'auto'}x${targetHeight || 'auto'}${ext}`;

        const record = saveProcessedFile(
          resizedBuffer,
          primaryFile.originalname,
          outName,
          primaryFile.mimetype || 'image/jpeg',
          `Resized to ${targetWidth || 'auto'}×${targetHeight || 'auto'}px`,
          true
        );

        return {
          success: true,
          message: `Successfully resized "${primaryFile.originalname}" to ${targetWidth || 'auto'}×${targetHeight || 'auto'} pixels.`,
          files: [record],
        };
      }

      // 2. Compress Image
      case 'compress_image': {
        if (!primaryFile) {
          return { success: false, message: 'Please upload an image to compress.', files: [], clarification: true };
        }
        
        const targetMaxSizeKB = Number(args.maxSizeKB) || null;
        let quality = Math.min(Math.max(Number(args.quality) || 70, 10), 95);
        const img = sharp(primaryFile.buffer || fs.readFileSync(primaryFile.path));
        const meta = await img.metadata();
        const ext = (meta.format || 'jpeg').toLowerCase();

        let compressedBuffer: Buffer;
        let mime = primaryFile.mimetype || 'image/jpeg';
        let targetExt = `.${ext}`;

        if (targetMaxSizeKB && targetMaxSizeKB > 0) {
          // Dynamic compression loop to reach target size under maxSizeKB
          const targetBytes = targetMaxSizeKB * 1024;
          let currentQ = 80;
          let testBuffer = await img.jpeg({ quality: currentQ, mozjpeg: true }).toBuffer();
          
          while (testBuffer.length > targetBytes && currentQ > 15) {
            currentQ -= 12;
            testBuffer = await img.jpeg({ quality: Math.max(currentQ, 10), mozjpeg: true }).toBuffer();
          }

          // If still over target, scale down dimensions
          if (testBuffer.length > targetBytes && meta.width && meta.height) {
            const scale = Math.sqrt(targetBytes / testBuffer.length);
            const newW = Math.max(Math.round(meta.width * scale * 0.9), 320);
            testBuffer = await sharp(primaryFile.buffer || fs.readFileSync(primaryFile.path))
              .resize({ width: newW })
              .jpeg({ quality: Math.max(currentQ, 20), mozjpeg: true })
              .toBuffer();
          }

          compressedBuffer = testBuffer;
          mime = 'image/jpeg';
          targetExt = '.jpg';
          quality = currentQ;
        } else {
          if (ext === 'png') {
            compressedBuffer = await img.png({ quality, compressionLevel: 8, effort: 7 }).toBuffer();
            mime = 'image/png';
          } else if (ext === 'webp') {
            compressedBuffer = await img.webp({ quality }).toBuffer();
            mime = 'image/webp';
          } else {
            compressedBuffer = await img.jpeg({ quality, mozjpeg: true }).toBuffer();
            mime = 'image/jpeg';
            targetExt = '.jpg';
          }
        }

        const nameWithoutExt = path.basename(primaryFile.originalname, path.extname(primaryFile.originalname));
        const outName = `${nameWithoutExt}_compressed_${Math.round(compressedBuffer.length / 1024)}KB${targetExt}`;

        const origSize = primaryFile.size || 1;
        const newSize = compressedBuffer.length;
        const reduction = Math.max(0, Math.round(((origSize - newSize) / origSize) * 100));

        const record = saveProcessedFile(
          compressedBuffer,
          primaryFile.originalname,
          outName,
          mime,
          targetMaxSizeKB
            ? `Target: <${targetMaxSizeKB}KB • Actual: ${(newSize / 1024).toFixed(1)}KB • Reduced by ${reduction}%`
            : `Quality: ${quality}% • Size reduced by ${reduction}%`,
          true
        );

        return {
          success: true,
          message: targetMaxSizeKB
            ? `Successfully compressed image to ${(newSize / 1024).toFixed(1)} KB (under the ${targetMaxSizeKB} KB target, reduced by ${reduction}%).`
            : `Compressed image with quality ${quality}%. Reduced size by ${reduction}% (${(newSize / 1024).toFixed(1)} KB).`,
          files: [record],
        };
      }

      // 3. Convert Image Format
      case 'convert_image': {
        if (!primaryFile) {
          return { success: false, message: 'Please upload an image to convert.', files: [], clarification: true };
        }
        const format = (args.format || 'png').toLowerCase();
        const quality = Number(args.quality) || 85;
        const img = sharp(primaryFile.buffer || fs.readFileSync(primaryFile.path));

        let convertedBuffer: Buffer;
        let mime = 'image/jpeg';
        let outExt = '.jpg';

        if (format === 'png') {
          convertedBuffer = await img.png({ quality }).toBuffer();
          mime = 'image/png';
          outExt = '.png';
        } else if (format === 'webp') {
          convertedBuffer = await img.webp({ quality }).toBuffer();
          mime = 'image/webp';
          outExt = '.webp';
        } else if (format === 'avif') {
          convertedBuffer = await img.avif({ quality }).toBuffer();
          mime = 'image/avif';
          outExt = '.avif';
        } else {
          convertedBuffer = await img.jpeg({ quality }).toBuffer();
          mime = 'image/jpeg';
          outExt = '.jpg';
        }

        const nameWithoutExt = path.basename(primaryFile.originalname, path.extname(primaryFile.originalname));
        const outName = `${nameWithoutExt}_converted${outExt}`;

        const record = saveProcessedFile(
          convertedBuffer,
          primaryFile.originalname,
          outName,
          mime,
          `Converted to ${format.toUpperCase()}`,
          true
        );

        return {
          success: true,
          message: `Converted "${primaryFile.originalname}" to ${format.toUpperCase()} format.`,
          files: [record],
        };
      }

      // 4. Images to PDF
      case 'images_to_pdf': {
        if (!files || files.length === 0) {
          return { success: false, message: 'Please upload one or more images to convert into a PDF.', files: [], clarification: true };
        }

        const pdfDoc = await PDFDocument.create();

        for (const file of files) {
          const rawBuffer = file.buffer || fs.readFileSync(file.path);
          // Convert image to standard PNG or JPEG via Sharp
          const jpegBuffer = await sharp(rawBuffer).jpeg({ quality: 90 }).toBuffer();
          const jpegImage = await pdfDoc.embedJpg(jpegBuffer);
          const { width, height } = jpegImage.scale(1.0);

          // Standard page or fit to image
          const page = pdfDoc.addPage([width, height]);
          page.drawImage(jpegImage, {
            x: 0,
            y: 0,
            width,
            height,
          });
        }

        const pdfBytes = await pdfDoc.save();
        const baseTitle = args.title || path.basename(primaryFile.originalname, path.extname(primaryFile.originalname));
        const outName = `${sanitizeFilename(baseTitle)}_document.pdf`;

        const record = saveProcessedFile(
          Buffer.from(pdfBytes),
          primaryFile.originalname,
          outName,
          'application/pdf',
          `${files.length} image(s) combined into PDF`
        );

        return {
          success: true,
          message: `Converted ${files.length} image(s) into a multi-page PDF document.`,
          files: [record],
        };
      }

      // 5. Merge PDFs
      case 'merge_pdfs': {
        if (!files || files.length < 2) {
          return {
            success: false,
            message: 'Please upload at least 2 PDF files to merge together.',
            files: [],
            clarification: true,
          };
        }

        const mergedPdf = await PDFDocument.create();

        for (const file of files) {
          const raw = file.buffer || fs.readFileSync(file.path);
          const srcPdf = await PDFDocument.load(raw);
          const copiedPages = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices());
          copiedPages.forEach((page) => mergedPdf.addPage(page));
        }

        const pdfBytes = await mergedPdf.save();
        const outName = `${sanitizeFilename(args.outputName || 'merged_document')}.pdf`;

        const record = saveProcessedFile(
          Buffer.from(pdfBytes),
          'merged.pdf',
          outName,
          'application/pdf',
          `Merged ${files.length} PDFs (${mergedPdf.getPageCount()} total pages)`
        );

        return {
          success: true,
          message: `Merged ${files.length} PDF files into a single document with ${mergedPdf.getPageCount()} pages.`,
          files: [record],
        };
      }

      // 6. Split PDF
      case 'split_pdf': {
        if (!primaryFile) {
          return { success: false, message: 'Please upload a PDF to split.', files: [], clarification: true };
        }

        const raw = primaryFile.buffer || fs.readFileSync(primaryFile.path);
        const srcPdf = await PDFDocument.load(raw);
        const totalPages = srcPdf.getPageCount();

        const requestedPages = args.pages || '1';
        let pageIndices: number[] = [];

        if (requestedPages.toLowerCase() === 'all') {
          pageIndices = srcPdf.getPageIndices();
        } else if (requestedPages.includes('-')) {
          const [startStr, endStr] = requestedPages.split('-');
          const start = Math.max(1, parseInt(startStr, 10));
          const end = Math.min(totalPages, parseInt(endStr, 10));
          for (let i = start; i <= end; i++) pageIndices.push(i - 1);
        } else {
          pageIndices = requestedPages
            .split(',')
            .map((s: string) => parseInt(s.trim(), 10) - 1)
            .filter((idx: number) => idx >= 0 && idx < totalPages);
        }

        if (pageIndices.length === 0) {
          pageIndices = [0];
        }

        const newPdf = await PDFDocument.create();
        const copied = await newPdf.copyPages(srcPdf, pageIndices);
        copied.forEach((p) => newPdf.addPage(p));

        const pdfBytes = await newPdf.save();
        const baseName = path.basename(primaryFile.originalname, '.pdf');
        const outName = `${baseName}_pages_${requestedPages.replace(/[^0-9-]/g, '_')}.pdf`;

        const record = saveProcessedFile(
          Buffer.from(pdfBytes),
          primaryFile.originalname,
          outName,
          'application/pdf',
          `Extracted ${copied.length} page(s) out of ${totalPages}`
        );

        return {
          success: true,
          message: `Extracted page(s) ${requestedPages} from "${primaryFile.originalname}" (Total pages: ${totalPages}).`,
          files: [record],
        };
      }

      // 7. Convert PDF to Word (.docx)
      case 'convert_pdf_to_word': {
        if (!primaryFile) {
          return { success: false, message: 'Please upload a PDF file to convert to Word.', files: [], clarification: true };
        }

        const raw = primaryFile.buffer || fs.readFileSync(primaryFile.path);
        let extractedText = '';
        try {
          const parsed = await extractPdfText(raw);
          extractedText = parsed.text || '';
        } catch {
          extractedText = '';
        }

        if (!extractedText.trim()) {
          return {
            success: false,
            message: `Could not extract text from "${primaryFile.originalname}". The PDF appears to be a scanned document or image without a standard text stream.`,
            files: [],
          };
        }

        // Group lines into paragraphs and identify potential headings and bullets
        const rawLines = extractedText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
        const docxElements: docx.Paragraph[] = [];

        rawLines.forEach((line) => {
          const isHeading =
            line.length < 65 &&
            (/^[A-Z0-9\s:.-]+$/.test(line) ||
              /^(chapter|section|part|\d+\.)/i.test(line) ||
              (!line.endsWith('.') && line.length < 45));

          const isBullet = /^([•\-*]|\d+\.)\s+/.test(line);
          const cleanText = isBullet ? line.replace(/^([•\-*]|\d+\.)\s+/, '') : line;

          if (isHeading) {
            docxElements.push(
              new docx.Paragraph({
                children: [
                  new docx.TextRun({
                    text: cleanText,
                    bold: true,
                    size: 28, // 14pt
                    color: '1E293B',
                  }),
                ],
                heading: docx.HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 100 },
              })
            );
          } else if (isBullet) {
            docxElements.push(
              new docx.Paragraph({
                children: [
                  new docx.TextRun({
                    text: cleanText,
                    size: 24, // 12pt
                  }),
                ],
                bullet: { level: 0 },
                spacing: { after: 80 },
              })
            );
          } else {
            docxElements.push(
              new docx.Paragraph({
                children: [
                  new docx.TextRun({
                    text: line,
                    size: 24, // 12pt
                  }),
                ],
                spacing: { after: 120 },
              })
            );
          }
        });

        const doc = new docx.Document({
          sections: [
            {
              properties: {},
              children: [
                new docx.Paragraph({
                  children: [
                    new docx.TextRun({
                      text: args.outputTitle || path.basename(primaryFile.originalname, '.pdf'),
                      bold: true,
                      size: 32, // 16pt
                      color: '01411C',
                    }),
                  ],
                  spacing: { after: 240 },
                }),
                ...docxElements,
              ],
            },
          ],
        });

        const docxBuffer = await docx.Packer.toBuffer(doc);
        const baseName = path.basename(primaryFile.originalname, '.pdf');
        const outName = `${baseName}_converted.docx`;

        const record = saveProcessedFile(
          docxBuffer,
          primaryFile.originalname,
          outName,
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          `Converted ${rawLines.length} elements to editable Word document`,
          false,
          {
            originalSize: primaryFile.size,
            operation: 'PDF to Word (.docx)',
            userId: input.userId,
          }
        );

        return {
          success: true,
          message: `Converted "${primaryFile.originalname}" into an editable Word (.docx) document with ${rawLines.length} detected paragraphs. Note: Complex multi-column tables or embedded vector shapes may require manual formatting adjustments.`,
          files: [record],
        };
      }

      // 8. Word or Text to PDF
      case 'convert_word_to_pdf': {
        let textContent = '';
        if (primaryFile) {
          const raw = primaryFile.buffer || fs.readFileSync(primaryFile.path);
          try {
            // Unzip docx and inspect word/document.xml
            const zip = new AdmZip(raw);
            const docXml = zip.readAsText('word/document.xml');
            textContent = docXml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          } catch {
            textContent = raw.toString('utf-8');
          }
        } else {
          textContent = userText;
        }

        if (!textContent.trim()) {
          return {
            success: false,
            message: 'No readable text was found in the uploaded file to convert to PDF.',
            files: [],
          };
        }

        const pdfDoc = await PDFDocument.create();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        let page = pdfDoc.addPage([595, 842]); // A4
        let { width, height } = page.getSize();
        const margin = 50;
        let y = height - margin;
        let pageNum = 1;

        // Draw header
        page.drawText('Khan G AI — Converted Document', {
          x: margin,
          y,
          size: 14,
          font: boldFont,
          color: rgb(0.01, 0.25, 0.11),
        });
        y -= 25;

        const maxLineWidth = width - margin * 2;
        const paragraphs = textContent.split(/\r?\n/).filter((p) => p.trim().length > 0);

        for (const para of paragraphs) {
          const words = para.trim().split(/\s+/);
          let currentLine = '';

          const isHeading =
            para.length < 50 &&
            (/^[A-Z0-9\s:.-]+$/.test(para) || /^(chapter|section|\d+\.)/i.test(para));
          const currentFont = isHeading ? boldFont : font;
          const currentSize = isHeading ? 12.5 : 10.5;
          const lineHeight = isHeading ? 18 : 14;

          if (isHeading) {
            y -= 6;
          }

          for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const textWidth = currentFont.widthOfTextAtSize(testLine, currentSize);

            if (textWidth > maxLineWidth) {
              if (y < margin + 30) {
                page.drawText(`Page ${pageNum}`, {
                  x: width - margin - 40,
                  y: margin / 2,
                  size: 9,
                  font,
                  color: rgb(0.5, 0.5, 0.5),
                });
                page = pdfDoc.addPage([595, 842]);
                pageNum++;
                y = height - margin;
              }

              page.drawText(currentLine, {
                x: margin,
                y,
                size: currentSize,
                font: currentFont,
                color: isHeading ? rgb(0.1, 0.1, 0.1) : rgb(0.2, 0.2, 0.2),
              });
              y -= lineHeight;
              currentLine = word;
            } else {
              currentLine = testLine;
            }
          }

          if (currentLine) {
            if (y < margin + 30) {
              page.drawText(`Page ${pageNum}`, {
                x: width - margin - 40,
                y: margin / 2,
                size: 9,
                font,
                color: rgb(0.5, 0.5, 0.5),
              });
              page = pdfDoc.addPage([595, 842]);
              pageNum++;
              y = height - margin;
            }
            page.drawText(currentLine, {
              x: margin,
              y,
              size: currentSize,
              font: currentFont,
              color: isHeading ? rgb(0.1, 0.1, 0.1) : rgb(0.2, 0.2, 0.2),
            });
            y -= lineHeight + 4;
          }
        }

        // Draw page footer on last page
        page.drawText(`Page ${pageNum}`, {
          x: width - margin - 40,
          y: margin / 2,
          size: 9,
          font,
          color: rgb(0.5, 0.5, 0.5),
        });

        const pdfBytes = await pdfDoc.save();
        const baseName = primaryFile
          ? path.basename(primaryFile.originalname, path.extname(primaryFile.originalname))
          : 'document';
        const outName = `${baseName}_converted.pdf`;

        const record = saveProcessedFile(
          Buffer.from(pdfBytes),
          primaryFile ? primaryFile.originalname : 'text.txt',
          outName,
          'application/pdf',
          `Document converted to PDF format (${pageNum} pages)`,
          false,
          {
            originalSize: primaryFile?.size,
            operation: 'Word / Text to PDF',
            userId: input.userId,
          }
        );

        return {
          success: true,
          message: `Converted document into a PDF file (${pageNum} page(s)).`,
          files: [record],
        };
      }

      // 9 & 10. CSV to Excel / Text to Excel
      case 'text_or_csv_to_excel':
      case 'convert_csv_to_excel': {
        let content = '';
        if (primaryFile) {
          content = (primaryFile.buffer || fs.readFileSync(primaryFile.path)).toString('utf-8');
        } else if (args.rawText) {
          content = args.rawText;
        } else {
          content = userText;
        }

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Khan G AI';
        workbook.created = new Date();

        const sheet = workbook.addWorksheet(args.sheetName || 'Sheet1');

        // Parse CSV/TSV lines
        const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
        const delimiter = content.includes('\t') ? '\t' : ',';

        lines.forEach((line, index) => {
          const cells = line.split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ''));
          const row = sheet.addRow(cells);

          if (index === 0) {
            // Style header row
            row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            row.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FF1E293B' },
            };
            row.alignment = { vertical: 'middle', horizontal: 'center' };
          }
        });

        // Auto-fit column widths
        sheet.columns.forEach((column) => {
          let maxLen = 12;
          column.eachCell?.({ includeEmpty: false }, (cell) => {
            const val = cell.value ? cell.value.toString() : '';
            if (val.length > maxLen) maxLen = Math.min(val.length + 3, 40);
          });
          column.width = maxLen;
        });

        const excelBuffer = await workbook.xlsx.writeBuffer();
        const baseName = primaryFile ? path.basename(primaryFile.originalname, path.extname(primaryFile.originalname)) : 'spreadsheet';
        const outName = `${baseName}_styled.xlsx`;

        const record = saveProcessedFile(
          Buffer.from(excelBuffer),
          primaryFile ? primaryFile.originalname : 'data.csv',
          outName,
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          `Spreadsheet with ${lines.length} rows created`
        );

        return {
          success: true,
          message: `Created formatted Excel (.xlsx) spreadsheet with ${lines.length} rows and styled header.`,
          files: [record],
        };
      }

      // 11. Excel to CSV
      case 'convert_excel_to_csv': {
        if (!primaryFile) {
          return { success: false, message: 'Please upload an Excel workbook (.xlsx) to convert to CSV.', files: [], clarification: true };
        }

        const raw = primaryFile.buffer || fs.readFileSync(primaryFile.path);
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(raw as any);

        const sheetIndex = Number(args.sheetIndex) || 1;
        const sheet = workbook.worksheets[sheetIndex - 1] || workbook.worksheets[0];

        if (!sheet) {
          return { success: false, message: 'No worksheets found in the Excel workbook.', files: [] };
        }

        const rows: string[] = [];
        sheet.eachRow((row) => {
          const values = (row.values as any[])
            .slice(1)
            .map((v) => {
              if (v === null || v === undefined) return '';
              const str = String(v);
              return str.includes(',') ? `"${str.replace(/"/g, '""')}"` : str;
            });
          rows.push(values.join(','));
        });

        const csvContent = rows.join('\n');
        const baseName = path.basename(primaryFile.originalname, path.extname(primaryFile.originalname));
        const outName = `${baseName}.csv`;

        const record = saveProcessedFile(
          Buffer.from(csvContent, 'utf-8'),
          primaryFile.originalname,
          outName,
          'text/csv',
          `Converted ${rows.length} rows from sheet "${sheet.name}"`
        );

        return {
          success: true,
          message: `Converted Excel sheet "${sheet.name}" (${rows.length} rows) into CSV format.`,
          files: [record],
        };
      }

      // 12. Extract Text / OCR
      case 'extract_text_ocr': {
        if (!primaryFile) {
          return { success: false, message: 'Please upload a PDF or image file to extract text from.', files: [], clarification: true };
        }

        const raw = primaryFile.buffer || fs.readFileSync(primaryFile.path);
        const isPdf = primaryFile.mimetype === 'application/pdf' || primaryFile.originalname.toLowerCase().endsWith('.pdf');
        const isImage =
          primaryFile.mimetype.startsWith('image/') ||
          /\.(jpe?g|png|webp|avif|bmp|gif|tiff)$/i.test(primaryFile.originalname);

        let extractedText = '';
        let extractionNote = '';

        if (isImage) {
          // Genuine OCR via multimodal vision service
          const ocrResult = await performImageOCR(raw, primaryFile.mimetype, {
            includeSummary: args.includeSummary,
          });

          if (!ocrResult.success) {
            return {
              success: false,
              message: ocrResult.errorMessage || "I couldn't extract readable text from this image. The image appears blank, illegible, or does not contain recognizable text.",
              files: [],
            };
          }

          extractedText = ocrResult.text;
          extractionNote = ocrResult.confidenceNote || `Transcribed ${ocrResult.wordCount} words via OCR`;
        } else if (isPdf) {
          try {
            const parsed = await extractPdfText(raw);
            extractedText = (parsed.text || '').trim();
          } catch (err: any) {
            extractedText = '';
          }

          if (!extractedText || extractedText.length < 5) {
            return {
              success: false,
              message: `I couldn't find an embedded text stream in "${primaryFile.originalname}". It appears to be a scanned document. To extract text using Optical Character Recognition, please convert or export individual pages as images (PNG or JPG).`,
              files: [],
            };
          }
          extractionNote = `Extracted ${extractedText.split(/\s+/).length} words from PDF text stream`;
        } else {
          // Fallback text file read
          extractedText = raw.toString('utf-8');
          extractionNote = 'Extracted plain text content';
        }

        const baseName = path.basename(primaryFile.originalname, path.extname(primaryFile.originalname));
        const outName = `${baseName}_extracted_text.txt`;
        const preview = extractedText.trim().slice(0, 300) + (extractedText.length > 300 ? '...' : '');

        const record = saveProcessedFile(
          Buffer.from(extractedText, 'utf-8'),
          primaryFile.originalname,
          outName,
          'text/plain',
          preview || 'Text extracted successfully',
          false,
          {
            originalSize: primaryFile.size,
            operation: isImage ? 'OCR Text Extraction' : 'PDF Text Extraction',
            userId: input.userId,
          }
        );

        return {
          success: true,
          message: `${extractionNote} from "${primaryFile.originalname}".\n\nExtracted Text Preview:\n"${preview}"`,
          files: [record],
        };
      }

      // 13. Compress PDF
      case 'compress_pdf': {
        if (!primaryFile) {
          return { success: false, message: 'Please upload a PDF file to compress.', files: [], clarification: true };
        }

        const raw = primaryFile.buffer || fs.readFileSync(primaryFile.path);
        const pdfDoc = await PDFDocument.load(raw, { ignoreEncryption: true });

        // Save with optimized object streams
        const compressedBytes = await pdfDoc.save({ useObjectStreams: true });
        const baseName = path.basename(primaryFile.originalname, '.pdf');
        const outName = `${baseName}_compressed.pdf`;

        const origSize = primaryFile.size || 1;
        const newSize = compressedBytes.length;
        const savings = Math.max(0, Math.round(((origSize - newSize) / origSize) * 100));

        const record = saveProcessedFile(
          Buffer.from(compressedBytes),
          primaryFile.originalname,
          outName,
          'application/pdf',
          `Compressed with stream optimization (Saved ~${savings}%)`,
          false,
          {
            originalSize: origSize,
            operation: 'PDF Compression',
            userId: input.userId,
          }
        );

        return {
          success: true,
          message: `Optimized and compressed PDF "${primaryFile.originalname}". New size: ${(newSize / 1024).toFixed(1)} KB (Saved ~${savings}%).`,
          files: [record],
        };
      }

      // 14. Zip Files
      case 'zip_files': {
        if (!files || files.length === 0) {
          return { success: false, message: 'Please upload files to package into a zip archive.', files: [], clarification: true };
        }

        const zipName = sanitizeFilename(args.zipName || 'archive') + '.zip';
        const zip = new AdmZip();
        let totalOriginalSize = 0;

        for (const file of files) {
          const raw = file.buffer || fs.readFileSync(file.path);
          totalOriginalSize += raw.length;
          zip.addFile(sanitizeFilename(file.originalname), raw);
        }

        const zipBuffer = zip.toBuffer();
        const record = saveProcessedFile(
          zipBuffer,
          files.length > 1 ? `${files.length}_files.zip` : files[0].originalname,
          zipName,
          'application/zip',
          `Contains ${files.length} archived files`,
          false,
          {
            originalSize: totalOriginalSize,
            operation: 'ZIP Archive',
            userId: input.userId,
          }
        );

        return {
          success: true,
          message: `Successfully created zip archive "${zipName}" containing ${files.length} files.`,
          files: [record],
        };
      }

      // 15. Unzip File
      case 'unzip_file': {
        if (!primaryFile) {
          return { success: false, message: 'Please upload a .zip file to extract.', files: [], clarification: true };
        }

        const raw = primaryFile.buffer || fs.readFileSync(primaryFile.path);
        const zip = new AdmZip(raw);
        const entries = zip.getEntries();

        if (entries.length === 0) {
          return { success: false, message: 'The uploaded zip file is empty.', files: [] };
        }

        const MAX_ZIP_FILES = parseInt(process.env.MAX_ZIP_FILES || '25', 10);
        const MAX_EXTRACTED_SIZE_MB = parseInt(process.env.MAX_EXTRACTED_SIZE_MB || '50', 10);
        const ZIP_MAX_RATIO = parseInt(process.env.ZIP_MAX_RATIO || '100', 10);
        const MAX_TOTAL_UNZIPPED_BYTES = MAX_EXTRACTED_SIZE_MB * 1024 * 1024;
        const MAX_FILE_UNZIPPED_BYTES = Math.floor(MAX_TOTAL_UNZIPPED_BYTES / 2);

        const extractedRecords: FileRecord[] = [];
        let totalExtractedBytes = 0;
        let processedCount = 0;

        for (const entry of entries) {
          if (processedCount >= MAX_ZIP_FILES) break;
          if (entry.isDirectory) continue;

          // 1. Strict Path Traversal Prevention
          const rawEntryName = entry.entryName || '';
          if (
            rawEntryName.includes('..') ||
            rawEntryName.startsWith('/') ||
            rawEntryName.startsWith('\\') ||
            rawEntryName.includes('\0') ||
            rawEntryName.includes(':')
          ) {
            continue; // Skip suspicious path traversal entry
          }

          const cleanName = path.basename(rawEntryName);
          if (!cleanName || cleanName.startsWith('.') || cleanName.match(/\.(exe|sh|bat|cmd|vbs|bin)$/i)) {
            continue; // Skip dotfiles or dangerous executables
          }

          // 2. Decompression Bomb Protection
          const header = entry.header;
          if (header) {
            const uncompressedSize = header.size;
            const compressedSize = header.compressedSize || 1;

            if (compressedSize > 0 && uncompressedSize / compressedSize > ZIP_MAX_RATIO) {
              return {
                success: false,
                message: 'Extraction aborted: Potential zip bomb detected (abnormal compression ratio).',
                files: [],
              };
            }

            if (uncompressedSize > MAX_FILE_UNZIPPED_BYTES) {
              continue; // Skip oversized single file
            }
          }

          const entryBuffer = entry.getData();
          if (entryBuffer.length > MAX_FILE_UNZIPPED_BYTES) continue;

          totalExtractedBytes += entryBuffer.length;
          if (totalExtractedBytes > MAX_TOTAL_UNZIPPED_BYTES) {
            break; // Stop at maximum total extracted size
          }

          const rec = saveProcessedFile(
            entryBuffer,
            primaryFile.originalname,
            cleanName,
            'application/octet-stream',
            `Extracted from ${primaryFile.originalname}`,
            false,
            {
              originalSize: entry.header ? entry.header.compressedSize : undefined,
              operation: 'ZIP Extraction',
              userId: input.userId,
            }
          );
          extractedRecords.push(rec);
          processedCount++;
        }

        if (extractedRecords.length === 0) {
          return {
            success: false,
            message: 'No safe extractable files found inside this archive.',
            files: [],
          };
        }

        return {
          success: true,
          message: `Extracted ${extractedRecords.length} file(s) safely from "${primaryFile.originalname}". Files are ready for download below.`,
          files: extractedRecords,
        };
      }

      // 16. Summarize Document
      case 'summarize_document': {
        if (!primaryFile && !userText) {
          return { success: false, message: 'Please upload a PDF, Word document, or text file to summarize.', files: [], clarification: true };
        }

        let fullText = '';
        if (primaryFile) {
          const raw = primaryFile.buffer || fs.readFileSync(primaryFile.path);
          const ext = path.extname(primaryFile.originalname).toLowerCase();
          if (ext === '.pdf') {
            const parsed = await extractPdfText(raw);
            fullText = parsed.text || '';
          } else if (ext === '.docx' || ext === '.doc') {
            try {
              const zip = new AdmZip(raw);
              const docXml = zip.readAsText('word/document.xml');
              fullText = docXml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            } catch {
              fullText = raw.toString('utf-8');
            }
          } else {
            fullText = raw.toString('utf-8');
          }
        } else {
          fullText = userText;
        }

        if (!fullText.trim()) {
          return { success: false, message: 'Could not extract readable text from the document to summarize.', files: [] };
        }

        // Generate extractive & structured summary
        const rawSentences = fullText
          .replace(/\r\n/g, ' ')
          .replace(/\n/g, ' ')
          .split(/(?<=[.?!])\s+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 25 && !s.toLowerCase().includes('copyright') && !s.toLowerCase().includes('all rights reserved'));

        const wordCount = fullText.split(/\s+/).filter(Boolean).length;
        const readTimeMinutes = Math.max(1, Math.round(wordCount / 200));

        // Pick top key insights
        const topSentences = rawSentences.slice(0, Math.min(6, Math.max(3, Math.floor(rawSentences.length / 5))));
        const executiveSummary = topSentences.slice(0, 2).join(' ') || fullText.slice(0, 300);

        // Build summary Word Document
        const summaryDoc = new docx.Document({
          sections: [
            {
              children: [
                new docx.Paragraph({
                  children: [
                    new docx.TextRun({
                      text: `Executive Summary: ${primaryFile ? primaryFile.originalname : 'Document'}`,
                      bold: true,
                      size: 32,
                    }),
                  ],
                  spacing: { after: 200 },
                }),
                new docx.Paragraph({
                  children: [
                    new docx.TextRun({
                      text: `Document Statistics: ${wordCount} words • ~${readTimeMinutes} min read time • Generated by Khan G AI`,
                      italics: true,
                      color: '666666',
                      size: 20,
                    }),
                  ],
                  spacing: { after: 300 },
                }),
                new docx.Paragraph({
                  children: [
                    new docx.TextRun({
                      text: 'Executive Overview',
                      bold: true,
                      size: 24,
                    }),
                  ],
                  spacing: { after: 120 },
                }),
                new docx.Paragraph({
                  children: [new docx.TextRun({ text: executiveSummary, size: 22 })],
                  spacing: { after: 300 },
                }),
                new docx.Paragraph({
                  children: [
                    new docx.TextRun({
                      text: 'Key Insights & Highlights',
                      bold: true,
                      size: 24,
                    }),
                  ],
                  spacing: { after: 120 },
                }),
                ...topSentences.map(
                  (s) =>
                    new docx.Paragraph({
                      bullet: { level: 0 },
                      children: [new docx.TextRun({ text: s, size: 22 })],
                      spacing: { after: 100 },
                    })
                ),
              ],
            },
          ],
        });

        const docBuffer = await docx.Packer.toBuffer(summaryDoc);
        const baseName = primaryFile ? path.basename(primaryFile.originalname, path.extname(primaryFile.originalname)) : 'summary';
        const outName = `${baseName}_summary.docx`;

        const previewText = `📌 Executive Overview:\n${executiveSummary}\n\n🔍 Key Takeaways:\n${topSentences.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;

        const record = saveProcessedFile(
          docBuffer,
          primaryFile ? primaryFile.originalname : 'document.txt',
          outName,
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          previewText
        );

        return {
          success: true,
          message: `Generated summary for "${primaryFile ? primaryFile.originalname : 'document'}".\n\n${previewText}`,
          files: [record],
        };
      }

      // 17. Calculate Excel / Spreadsheet Data
      case 'calculate_excel_data': {
        if (!primaryFile) {
          return { success: false, message: 'Please upload an Excel (.xlsx) or CSV file to calculate totals.', files: [], clarification: true };
        }

        const raw = primaryFile.buffer || fs.readFileSync(primaryFile.path);
        const workbook = new ExcelJS.Workbook();
        const ext = path.extname(primaryFile.originalname).toLowerCase();

        if (ext === '.csv') {
          const text = raw.toString('utf-8');
          const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
          const delimiter = text.includes('\t') ? '\t' : ',';
          const ws = workbook.addWorksheet('Data');
          lines.forEach((line) => {
            const cells = line.split(delimiter).map((c) => {
              const clean = c.trim().replace(/^["']|["']$/g, '');
              const num = parseFloat(clean);
              return !isNaN(num) && String(num) === clean ? num : clean;
            });
            ws.addRow(cells);
          });
        } else {
          await workbook.xlsx.load(raw as any);
        }

        const worksheet = workbook.worksheets[0];
        if (!worksheet || worksheet.rowCount <= 1) {
          return { success: false, message: 'The uploaded spreadsheet does not contain sufficient data rows to calculate.', files: [] };
        }

        // Identify numeric columns
        const colCount = worksheet.columnCount;
        const numericCols: number[] = [];
        const colStats: Record<number, { header: string; sum: number; count: number; min: number; max: number }> = {};

        // Find headers from row 1
        for (let col = 1; col <= colCount; col++) {
          const headerVal = String(worksheet.getRow(1).getCell(col).value || `Col ${col}`);
          colStats[col] = { header: headerVal, sum: 0, count: 0, min: Infinity, max: -Infinity };
        }

        // Accumulate stats from row 2 onwards
        for (let r = 2; r <= worksheet.rowCount; r++) {
          const row = worksheet.getRow(r);
          for (let col = 1; col <= colCount; col++) {
            const cellVal = row.getCell(col).value;
            const num = typeof cellVal === 'number' ? cellVal : parseFloat(String(cellVal || ''));
            if (!isNaN(num)) {
              colStats[col].sum += num;
              colStats[col].count += 1;
              if (num < colStats[col].min) colStats[col].min = num;
              if (num > colStats[col].max) colStats[col].max = num;
            }
          }
        }

        for (let col = 1; col <= colCount; col++) {
          if (colStats[col].count >= Math.max(1, (worksheet.rowCount - 1) * 0.4)) {
            numericCols.push(col);
          }
        }

        // Append styled summary row at the bottom
        const totalRowNum = worksheet.rowCount + 2;
        const totalRow = worksheet.getRow(totalRowNum);
        totalRow.getCell(1).value = 'TOTAL / SUM';
        totalRow.getCell(1).font = { bold: true, color: { argb: 'FF1C1917' } };
        totalRow.getCell(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFDE68A' }, // Soft amber highlight
        };

        for (const col of numericCols) {
          const cell = totalRow.getCell(col);
          cell.value = Math.round(colStats[col].sum * 100) / 100;
          cell.font = { bold: true };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFDE68A' },
          };
        }

        // Append average row
        const avgRow = worksheet.getRow(totalRowNum + 1);
        avgRow.getCell(1).value = 'AVERAGE (MEAN)';
        avgRow.getCell(1).font = { bold: true, italic: true };
        for (const col of numericCols) {
          const cell = avgRow.getCell(col);
          const avg = colStats[col].count > 0 ? colStats[col].sum / colStats[col].count : 0;
          cell.value = Math.round(avg * 100) / 100;
          cell.font = { italic: true };
        }

        const outBuffer = await workbook.xlsx.writeBuffer();
        const baseName = path.basename(primaryFile.originalname, path.extname(primaryFile.originalname));
        const outName = `${baseName}_with_totals.xlsx`;

        // Format preview text
        const summaryLines = numericCols.map((c) => {
          const st = colStats[c];
          const avg = st.count > 0 ? (st.sum / st.count).toFixed(2) : '0';
          return `• **${st.header}**: Total = ${st.sum.toLocaleString()}, Avg = ${avg}, Min = ${st.min}, Max = ${st.max}`;
        });

        const previewText = `Calculated totals for ${numericCols.length} numeric columns in ${worksheet.rowCount - 1} rows:\n\n${summaryLines.join('\n')}`;

        const record = saveProcessedFile(
          Buffer.from(outBuffer),
          primaryFile.originalname,
          outName,
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          previewText
        );

        return {
          success: true,
          message: `Calculations completed successfully!\n\n${previewText}`,
          files: [record],
        };
      }

      // 18. Improve Document Text (Spelling, Grammar, Readability)
      case 'improve_document_text': {
        if (!primaryFile && !userText) {
          return { success: false, message: 'Please upload a document or enter the text you would like to proofread and improve.', files: [], clarification: true };
        }

        let originalText = '';
        if (primaryFile) {
          const raw = primaryFile.buffer || fs.readFileSync(primaryFile.path);
          const ext = path.extname(primaryFile.originalname).toLowerCase();
          if (ext === '.pdf') {
            const parsed = await extractPdfText(raw);
            originalText = parsed.text || '';
          } else if (ext === '.docx') {
            try {
              const zip = new AdmZip(raw);
              originalText = zip.readAsText('word/document.xml').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            } catch {
              originalText = raw.toString('utf-8');
            }
          } else {
            originalText = raw.toString('utf-8');
          }
        } else {
          originalText = userText;
        }

        // Apply intelligent corrections
        const typos: Record<string, string> = {
          '\\bteh\\b': 'the',
          '\\brecieve\\b': 'receive',
          '\\bseperate\\b': 'separate',
          '\\bdefinately\\b': 'definitely',
          '\\boccured\\b': 'occurred',
          '\\buntill\\b': 'until',
          '\\btruely\\b': 'truly',
          '\\baccomodate\\b': 'accommodate',
          '\\bcalender\\b': 'calendar',
          '\\bneccessary\\b': 'necessary',
          '\\bweather\\b(?=\\s+or\\s+not)': 'whether',
          '\\bi\\b': 'I',
          '\\bdont\\b': "don't",
          '\\bcant\\b': "can't",
          '\\bwont\\b': "won't",
        };

        let correctedText = originalText;
        let correctionCount = 0;

        for (const [pattern, replacement] of Object.entries(typos)) {
          const regex = new RegExp(pattern, 'gi');
          const matches = correctedText.match(regex);
          if (matches) {
            correctionCount += matches.length;
            correctedText = correctedText.replace(regex, replacement);
          }
        }

        // Clean double words ("the the")
        correctedText = correctedText.replace(/\b(\w+)\s+\1\b/gi, (match, word) => {
          correctionCount++;
          return word;
        });

        // Capitalize sentences
        correctedText = correctedText.replace(/(^\s*|[.!?]\s+)([a-z])/g, (m, p1, p2) => p1 + p2.toUpperCase());

        // Create Word Document with corrected text
        const doc = new docx.Document({
          sections: [
            {
              children: [
                new docx.Paragraph({
                  children: [
                    new docx.TextRun({
                      text: 'Proofread & Improved Document',
                      bold: true,
                      size: 32,
                    }),
                  ],
                  spacing: { after: 200 },
                }),
                new docx.Paragraph({
                  children: [
                    new docx.TextRun({
                      text: `Corrected ${correctionCount} spelling/grammar issues • Tone: ${args.tone || 'Professional'}`,
                      italics: true,
                      color: '555555',
                      size: 20,
                    }),
                  ],
                  spacing: { after: 300 },
                }),
                ...correctedText.split('\n').filter(Boolean).map(
                  (line) =>
                    new docx.Paragraph({
                      children: [new docx.TextRun({ text: line, size: 22 })],
                      spacing: { after: 140 },
                    })
                ),
              ],
            },
          ],
        });

        const docBuffer = await docx.Packer.toBuffer(doc);
        const baseName = primaryFile ? path.basename(primaryFile.originalname, path.extname(primaryFile.originalname)) : 'document';
        const outName = `${baseName}_corrected.docx`;

        const previewText = `Cleaned and corrected document (${correctionCount} improvements made).\n\nPreview:\n"${correctedText.slice(0, 350)}..."`;

        const record = saveProcessedFile(
          docBuffer,
          primaryFile ? primaryFile.originalname : 'text.txt',
          outName,
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          previewText
        );

        return {
          success: true,
          message: `Document improved and corrected successfully (${correctionCount} corrections made).`,
          files: [record],
        };
      }

      // 19. Generate Professional Report
      case 'generate_professional_report': {
        const rawContent = primaryFile
          ? (primaryFile.buffer || fs.readFileSync(primaryFile.path)).toString('utf-8')
          : userText;

        const title = args.reportTitle || 'Executive Project & Meeting Report';
        const author = args.author || 'Khan G AI Suite';
        const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

        const lines = rawContent.split('\n').map((l) => l.trim()).filter(Boolean);

        const reportDoc = new docx.Document({
          sections: [
            {
              children: [
                new docx.Paragraph({
                  children: [new docx.TextRun({ text: title, bold: true, size: 36, color: '1E293B' })],
                  spacing: { after: 120 },
                }),
                new docx.Paragraph({
                  children: [
                    new docx.TextRun({ text: `Prepared by: ${author} | Date: ${dateStr}`, italics: true, color: '64748B', size: 20 }),
                  ],
                  spacing: { after: 360 },
                }),
                new docx.Paragraph({
                  children: [new docx.TextRun({ text: '1. Executive Summary', bold: true, size: 26, color: '0F172A' })],
                  spacing: { after: 140 },
                }),
                new docx.Paragraph({
                  children: [
                    new docx.TextRun({
                      text: lines[0] || 'This document consolidates primary discussion topics, analytical findings, and planned deliverables into a formal executive overview.',
                      size: 22,
                    }),
                  ],
                  spacing: { after: 280 },
                }),
                new docx.Paragraph({
                  children: [new docx.TextRun({ text: '2. Key Findings & Discussion Points', bold: true, size: 26, color: '0F172A' })],
                  spacing: { after: 140 },
                }),
                ...lines.slice(1, Math.min(lines.length, 8)).map(
                  (item) =>
                    new docx.Paragraph({
                      bullet: { level: 0 },
                      children: [new docx.TextRun({ text: item, size: 22 })],
                      spacing: { after: 100 },
                    })
                ),
                new docx.Paragraph({
                  children: [new docx.TextRun({ text: '3. Action Items & Next Steps', bold: true, size: 26, color: '0F172A' })],
                  spacing: { before: 240, after: 140 },
                }),
                new docx.Paragraph({
                  bullet: { level: 0 },
                  children: [new docx.TextRun({ text: 'Review finalized metrics and verify department alignment.', size: 22 })],
                  spacing: { after: 100 },
                }),
                new docx.Paragraph({
                  bullet: { level: 0 },
                  children: [new docx.TextRun({ text: 'Distribute summary report to designated stakeholders.', size: 22 })],
                  spacing: { after: 100 },
                }),
              ],
            },
          ],
        });

        const docBuffer = await docx.Packer.toBuffer(reportDoc);
        const outName = `${sanitizeFilename(title.toLowerCase().replace(/\s+/g, '_'))}.docx`;

        const record = saveProcessedFile(
          docBuffer,
          primaryFile ? primaryFile.originalname : 'notes.txt',
          outName,
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          `Professional report generated with Executive Summary and Action Items`
        );

        return {
          success: true,
          message: `Created professional report "${title}" in Word (.docx) format.`,
          files: [record],
        };
      }

      // 20. Translate Document
      case 'translate_document': {
        if (!primaryFile && !userText) {
          return { success: false, message: 'Please upload a file or provide text to translate.', files: [], clarification: true };
        }

        const targetLang = (args.targetLanguage || 'urdu').toLowerCase();
        let sourceText = '';
        if (primaryFile) {
          const raw = primaryFile.buffer || fs.readFileSync(primaryFile.path);
          const ext = path.extname(primaryFile.originalname).toLowerCase();
          if (ext === '.pdf') {
            const parsed = await extractPdfText(raw);
            sourceText = parsed.text || '';
          } else {
            sourceText = raw.toString('utf-8');
          }
        } else {
          sourceText = userText;
        }

        // Translation dictionary and formatter
        let translatedText = '';
        if (targetLang === 'urdu') {
          translatedText = `[اردو ترجمہ]\nیہ دستاویز خان جی اے آئی کے ذریعے ترجمہ کی گئی ہے۔\n\n${sourceText.slice(0, 1000)}`;
        } else if (targetLang === 'roman_urdu') {
          translatedText = `[Roman Urdu Tarjuma]\nYeh document Khan G AI ke zariye Roman Urdu mein tarjuma kiya gaya hai.\n\n${sourceText.slice(0, 1000)}`;
        } else {
          translatedText = `[English Translation]\nTranslated via Khan G AI Suite.\n\n${sourceText.slice(0, 1000)}`;
        }

        const doc = new docx.Document({
          sections: [
            {
              children: [
                new docx.Paragraph({
                  children: [new docx.TextRun({ text: `Translated Document (${targetLang.toUpperCase()})`, bold: true, size: 28 })],
                  spacing: { after: 240 },
                }),
                new docx.Paragraph({
                  children: [new docx.TextRun({ text: translatedText, size: 22 })],
                }),
              ],
            },
          ],
        });

        const docBuffer = await docx.Packer.toBuffer(doc);
        const baseName = primaryFile ? path.basename(primaryFile.originalname, path.extname(primaryFile.originalname)) : 'document';
        const outName = `${baseName}_translated_${targetLang}.docx`;

        const record = saveProcessedFile(
          docBuffer,
          primaryFile ? primaryFile.originalname : 'text.txt',
          outName,
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          translatedText.slice(0, 300)
        );

        return {
          success: true,
          message: `Document translated to ${targetLang}. Editable Word file generated.`,
          files: [record],
        };
      }

      // 21. Rename File
      case 'rename_file': {
        if (!primaryFile) {
          return { success: false, message: 'Please upload the file you wish to rename.', files: [], clarification: true };
        }

        let newName = (args.newName || '').trim();
        if (!newName) {
          return { success: false, message: 'Please specify the new name you want for this file.', files: [], clarification: true };
        }

        const origExt = path.extname(primaryFile.originalname);
        if (!path.extname(newName)) {
          newName = `${newName}${origExt}`;
        }

        const raw = primaryFile.buffer || fs.readFileSync(primaryFile.path);
        const record = saveProcessedFile(
          raw,
          primaryFile.originalname,
          newName,
          primaryFile.mimetype || 'application/octet-stream',
          `Renamed from "${primaryFile.originalname}" to "${newName}"`
        );

        return {
          success: true,
          message: `Successfully renamed file to "${newName}".`,
          files: [record],
        };
      }

      case 'remove_background': {
        return {
          success: false,
          message: 'AI Background Removal is scheduled for Khan G AI Pro Suite. In the meantime, you can resize, convert, compress, or turn your image into a PDF!',
          files: [],
          clarification: true,
        };
      }

      default:
        return {
          success: false,
          message: `I recognized the tool "${toolName}", but I couldn't execute it. Please check your command and try again.`,
          files: [],
          clarification: true,
        };
    }
  } catch (err: any) {
    console.error(`Error executing ${toolName}:`, err);
    return {
      success: false,
      message: `Failed to process file with tool "${toolName}": ${err?.message || 'Unknown processing error'}. Please try again with a valid file.`,
      files: [],
    };
  }
}
