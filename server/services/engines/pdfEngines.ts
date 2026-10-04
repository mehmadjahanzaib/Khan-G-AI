import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';

/**
 * Parses page range strings like "1-3, 5, 8" into 1-based page numbers.
 */
export function parsePageRangeString(rangeStr: string, totalPages: number): number[] {
  const pages = new Set<number>();
  const parts = rangeStr.split(',').map((p) => p.trim()).filter(Boolean);

  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-').map((s) => s.trim());
      const start = Math.max(1, parseInt(startStr, 10) || 1);
      const end = Math.min(totalPages, parseInt(endStr, 10) || totalPages);
      for (let i = start; i <= end; i++) {
        pages.add(i);
      }
    } else {
      const pageNum = parseInt(part, 10);
      if (pageNum >= 1 && pageNum <= totalPages) {
        pages.add(pageNum);
      }
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
}

/**
 * PDF N-Up Maker: Arranges 2-up or 4-up pages on A4 sheets to save paper.
 */
export async function pdfNupMaker(
  inputBuffer: Buffer,
  options: { pagesPerSheet?: number } = {}
): Promise<Buffer> {
  const pagesPerSheet = options.pagesPerSheet === 4 ? 4 : 2;
  const srcDoc = await PDFDocument.load(inputBuffer);
  const totalPages = srcDoc.getPageCount();

  if (totalPages === 0) {
    throw new Error('Input PDF document has no pages.');
  }

  const outDoc = await PDFDocument.create();

  if (pagesPerSheet === 2) {
    // 2-Up: Sheet is A4 Landscape (841.89 x 595.28 points)
    const sheetWidth = 841.89;
    const sheetHeight = 595.28;
    const margin = 20;
    const slotWidth = (sheetWidth - margin * 3) / 2;
    const slotHeight = sheetHeight - margin * 2;

    for (let i = 0; i < totalPages; i += 2) {
      const sheet = outDoc.addPage([sheetWidth, sheetHeight]);

      // Left page (i)
      const [embeddedLeft] = await outDoc.embedPdf(srcDoc, [i]);
      const leftScale = Math.min(slotWidth / embeddedLeft.width, slotHeight / embeddedLeft.height);
      const lw = embeddedLeft.width * leftScale;
      const lh = embeddedLeft.height * leftScale;
      const lx = margin + (slotWidth - lw) / 2;
      const ly = margin + (slotHeight - lh) / 2;

      sheet.drawPage(embeddedLeft, { x: lx, y: ly, width: lw, height: lh });

      // Subtle border around left slot
      sheet.drawRectangle({
        x: lx - 1,
        y: ly - 1,
        width: lw + 2,
        height: lh + 2,
        borderColor: rgb(0.85, 0.85, 0.85),
        borderWidth: 0.5,
      });

      // Right page (i + 1) if available
      if (i + 1 < totalPages) {
        const [embeddedRight] = await outDoc.embedPdf(srcDoc, [i + 1]);
        const rightScale = Math.min(slotWidth / embeddedRight.width, slotHeight / embeddedRight.height);
        const rw = embeddedRight.width * rightScale;
        const rh = embeddedRight.height * rightScale;
        const rx = margin * 2 + slotWidth + (slotWidth - rw) / 2;
        const ry = margin + (slotHeight - rh) / 2;

        sheet.drawPage(embeddedRight, { x: rx, y: ry, width: rw, height: rh });

        // Subtle border around right slot
        sheet.drawRectangle({
          x: rx - 1,
          y: ry - 1,
          width: rw + 2,
          height: rh + 2,
          borderColor: rgb(0.85, 0.85, 0.85),
          borderWidth: 0.5,
        });
      }
    }
  } else {
    // 4-Up: Sheet is A4 Portrait (595.28 x 841.89 points) in 2x2 grid
    const sheetWidth = 595.28;
    const sheetHeight = 841.89;
    const margin = 16;
    const slotWidth = (sheetWidth - margin * 3) / 2;
    const slotHeight = (sheetHeight - margin * 3) / 2;

    for (let i = 0; i < totalPages; i += 4) {
      const sheet = outDoc.addPage([sheetWidth, sheetHeight]);

      for (let slot = 0; slot < 4; slot++) {
        const pageIdx = i + slot;
        if (pageIdx >= totalPages) break;

        const col = slot % 2;
        const row = Math.floor(slot / 2); // 0 = top, 1 = bottom

        const [embedded] = await outDoc.embedPdf(srcDoc, [pageIdx]);
        const scale = Math.min(slotWidth / embedded.width, slotHeight / embedded.height);
        const w = embedded.width * scale;
        const h = embedded.height * scale;

        const slotX = margin + col * (slotWidth + margin);
        // row 0 is top half, row 1 is bottom half
        const slotY = row === 0 ? margin * 2 + slotHeight : margin;

        const x = slotX + (slotWidth - w) / 2;
        const y = slotY + (slotHeight - h) / 2;

        sheet.drawPage(embedded, { x, y, width: w, height: h });

        sheet.drawRectangle({
          x: x - 1,
          y: y - 1,
          width: w + 2,
          height: h + 2,
          borderColor: rgb(0.85, 0.85, 0.85),
          borderWidth: 0.5,
        });
      }
    }
  }

  const pdfBytes = await outDoc.save();
  return Buffer.from(pdfBytes);
}

/**
 * PDF Rotate: Permanently rotates pages by 90, 180, or 270 degrees.
 */
export async function pdfRotate(
  inputBuffer: Buffer,
  options: { angle?: number; pages?: string } = {}
): Promise<Buffer> {
  const angle = Number(options.angle) || 90;
  const srcDoc = await PDFDocument.load(inputBuffer);
  const totalPages = srcDoc.getPageCount();

  if (totalPages === 0) {
    throw new Error('Input PDF has no pages to rotate.');
  }

  const targetPageNums = options.pages
    ? parsePageRangeString(options.pages, totalPages)
    : Array.from({ length: totalPages }, (_, i) => i + 1);

  const targetSet = new Set(targetPageNums);

  for (let i = 0; i < totalPages; i++) {
    if (targetSet.has(i + 1)) {
      const page = srcDoc.getPage(i);
      const current = page.getRotation().angle;
      const nextAngle = ((current + angle) % 360 + 360) % 360;
      page.setRotation(degrees(nextAngle));
    }
  }

  const pdfBytes = await srcDoc.save();
  return Buffer.from(pdfBytes);
}

/**
 * PDF Page Reorder: Reorders pages according to a sequence e.g. "3, 1, 2"
 */
export async function pdfPageReorder(
  inputBuffer: Buffer,
  options: { order: string | number[] }
): Promise<Buffer> {
  const srcDoc = await PDFDocument.load(inputBuffer);
  const totalPages = srcDoc.getPageCount();

  if (totalPages === 0) {
    throw new Error('Input PDF has no pages to reorder.');
  }

  let orderIndices: number[] = [];
  if (Array.isArray(options.order)) {
    orderIndices = options.order.map((n) => Number(n));
  } else if (typeof options.order === 'string') {
    orderIndices = options.order
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));
  }

  if (orderIndices.length === 0) {
    throw new Error('Please specify a valid page order (e.g., "3, 1, 2").');
  }

  for (const pageNum of orderIndices) {
    if (pageNum < 1 || pageNum > totalPages) {
      throw new Error(`Page number ${pageNum} is out of range (PDF contains 1-${totalPages} pages).`);
    }
  }

  const outDoc = await PDFDocument.create();
  // Map 1-based page numbers to 0-based indices
  const zeroBasedIndices = orderIndices.map((p) => p - 1);
  const copiedPages = await outDoc.copyPages(srcDoc, zeroBasedIndices);
  copiedPages.forEach((page) => outDoc.addPage(page));

  const pdfBytes = await outDoc.save();
  return Buffer.from(pdfBytes);
}

/**
 * PDF Page Delete: Removes specified pages from a PDF.
 */
export async function pdfPageDelete(
  inputBuffer: Buffer,
  options: { pagesToDelete: string | number[] }
): Promise<Buffer> {
  const srcDoc = await PDFDocument.load(inputBuffer);
  const totalPages = srcDoc.getPageCount();

  if (totalPages === 0) {
    throw new Error('Input PDF has no pages.');
  }

  let pagesToDeleteSet = new Set<number>();
  if (Array.isArray(options.pagesToDelete)) {
    options.pagesToDelete.forEach((p) => pagesToDeleteSet.add(Number(p)));
  } else if (typeof options.pagesToDelete === 'string') {
    const parsed = parsePageRangeString(options.pagesToDelete, totalPages);
    parsed.forEach((p) => pagesToDeleteSet.add(p));
  }

  const remainingIndices: number[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (!pagesToDeleteSet.has(i)) {
      remainingIndices.push(i - 1);
    }
  }

  if (remainingIndices.length === 0) {
    throw new Error('Cannot delete all pages from the PDF document.');
  }

  const outDoc = await PDFDocument.create();
  const copiedPages = await outDoc.copyPages(srcDoc, remainingIndices);
  copiedPages.forEach((page) => outDoc.addPage(page));

  const pdfBytes = await outDoc.save();
  return Buffer.from(pdfBytes);
}

/**
 * PDF Extract Pages: Extracts specific page numbers or ranges to a new PDF.
 */
export async function pdfExtractPages(
  inputBuffer: Buffer,
  options: { pages: string }
): Promise<Buffer> {
  const srcDoc = await PDFDocument.load(inputBuffer);
  const totalPages = srcDoc.getPageCount();

  if (totalPages === 0) {
    throw new Error('Input PDF has no pages.');
  }

  const pagesToExtract = parsePageRangeString(options.pages || '1', totalPages);
  if (pagesToExtract.length === 0) {
    throw new Error(`No valid pages found in range "${options.pages}". Document has ${totalPages} pages.`);
  }

  const outDoc = await PDFDocument.create();
  const zeroBased = pagesToExtract.map((p) => p - 1);
  const copiedPages = await outDoc.copyPages(srcDoc, zeroBased);
  copiedPages.forEach((page) => outDoc.addPage(page));

  const pdfBytes = await outDoc.save();
  return Buffer.from(pdfBytes);
}

/**
 * PDF Watermark: Adds a diagonal semi-transparent watermark text to all pages.
 */
export async function pdfWatermark(
  inputBuffer: Buffer,
  options: {
    text?: string;
    opacity?: number;
    fontSize?: number;
    color?: 'gray' | 'red' | 'blue' | 'black';
  } = {}
): Promise<Buffer> {
  const watermarkText = (options.text || 'CONFIDENTIAL').trim();
  const opacity = Math.min(Math.max(Number(options.opacity) || 0.22, 0.05), 0.8);
  const srcDoc = await PDFDocument.load(inputBuffer);
  const font = await srcDoc.embedFont(StandardFonts.HelveticaBold);
  const totalPages = srcDoc.getPageCount();

  let textColor = rgb(0.5, 0.5, 0.5);
  if (options.color === 'red') textColor = rgb(0.85, 0.15, 0.15);
  if (options.color === 'blue') textColor = rgb(0.15, 0.35, 0.85);
  if (options.color === 'black') textColor = rgb(0.1, 0.1, 0.1);

  for (let i = 0; i < totalPages; i++) {
    const page = srcDoc.getPage(i);
    const { width, height } = page.getSize();

    // Auto-calculate font size if not specified
    const fontSize = options.fontSize || Math.max(Math.min(width, height) / 8, 36);
    const textWidth = font.widthOfTextAtSize(watermarkText, fontSize);
    const textHeight = font.heightAtSize(fontSize);

    // Center point
    const centerX = width / 2;
    const centerY = height / 2;

    // Draw rotated diagonal watermark
    page.drawText(watermarkText, {
      x: centerX - (textWidth / 2) * Math.cos(Math.PI / 4) + (textHeight / 2) * Math.sin(Math.PI / 4),
      y: centerY - (textWidth / 2) * Math.sin(Math.PI / 4) - (textHeight / 2) * Math.cos(Math.PI / 4),
      size: fontSize,
      font,
      color: textColor,
      opacity,
      rotate: degrees(45),
    });
  }

  const pdfBytes = await srcDoc.save();
  return Buffer.from(pdfBytes);
}
