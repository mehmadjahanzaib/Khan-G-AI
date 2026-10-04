import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total?: number;
}

export interface InvoiceOptions {
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  currency?: string;
  sender?: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    taxId?: string;
  };
  client?: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  items?: InvoiceItem[];
  taxRatePercent?: number;
  discountPercent?: number;
  notes?: string;
  paymentDetails?: string;
}

export interface QuotationOptions {
  quoteNumber?: string;
  quoteDate?: string;
  validUntil?: string;
  currency?: string;
  sender?: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  client?: {
    name?: string;
    address?: string;
    email?: string;
  };
  items?: InvoiceItem[];
  taxRatePercent?: number;
  discountPercent?: number;
  terms?: string;
}

/**
 * Cleanly truncates text to fit within a given column width in points
 */
function fitText(text: string, font: any, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 3 && font.widthOfTextAtSize(truncated + '...', size) > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + '...';
}

/**
 * Invoice Maker: Generates a high-quality professional PDF invoice
 */
export async function invoiceMaker(options: InvoiceOptions = {}): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4 Portrait
  const { width, height } = page.getSize();

  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const primaryColor = rgb(0.08, 0.18, 0.36); // Deep Navy
  const secondaryColor = rgb(0.25, 0.35, 0.45); // Slate
  const textColor = rgb(0.12, 0.12, 0.12);
  const lightBg = rgb(0.96, 0.97, 0.98);
  const borderColor = rgb(0.85, 0.88, 0.92);

  // Top header banner
  page.drawRectangle({
    x: 0,
    y: height - 100,
    width,
    height: 100,
    color: primaryColor,
  });

  // Header Title
  page.drawText('INVOICE', {
    x: 40,
    y: height - 55,
    size: 28,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  const invNum = options.invoiceNumber || `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const invDate = options.invoiceDate || new Date().toISOString().split('T')[0];
  const dueDate = options.dueDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
  const currency = options.currency || 'PKR';

  // Invoice Meta right-aligned
  page.drawText(`Invoice #: ${invNum}`, {
    x: width - 200,
    y: height - 42,
    size: 11,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  page.drawText(`Date: ${invDate}`, {
    x: width - 200,
    y: height - 58,
    size: 9.5,
    font: fontRegular,
    color: rgb(0.9, 0.9, 0.9),
  });
  page.drawText(`Due Date: ${dueDate}`, {
    x: width - 200,
    y: height - 74,
    size: 9.5,
    font: fontRegular,
    color: rgb(0.9, 0.9, 0.9),
  });

  // Sender & Client Section
  let currentY = height - 135;

  // Sender (From)
  const senderName = options.sender?.name || 'Khan G Enterprise';
  const senderAddress = options.sender?.address || 'Islamabad, Pakistan';
  const senderPhone = options.sender?.phone || '+92 300 0000000';
  const senderEmail = options.sender?.email || 'contact@khang.ai';

  page.drawText('BILLED FROM:', { x: 40, y: currentY, size: 9, font: fontBold, color: secondaryColor });
  page.drawText(senderName, { x: 40, y: currentY - 16, size: 12, font: fontBold, color: textColor });
  page.drawText(senderAddress, { x: 40, y: currentY - 30, size: 9, font: fontRegular, color: textColor });
  page.drawText(`${senderPhone} | ${senderEmail}`, { x: 40, y: currentY - 44, size: 8.5, font: fontRegular, color: secondaryColor });

  // Client (To)
  const clientName = options.client?.name || 'Valued Client';
  const clientAddress = options.client?.address || 'Pakistan';
  const clientEmail = options.client?.email || 'client@example.com';

  page.drawText('BILLED TO:', { x: width / 2 + 20, y: currentY, size: 9, font: fontBold, color: secondaryColor });
  page.drawText(clientName, { x: width / 2 + 20, y: currentY - 16, size: 12, font: fontBold, color: textColor });
  page.drawText(clientAddress, { x: width / 2 + 20, y: currentY - 30, size: 9, font: fontRegular, color: textColor });
  page.drawText(clientEmail, { x: width / 2 + 20, y: currentY - 44, size: 8.5, font: fontRegular, color: secondaryColor });

  currentY -= 75;

  // Items Table Header
  const tableX = 40;
  const tableWidth = width - 80;
  const colDescWidth = 270;
  const colQtyWidth = 60;
  const colPriceWidth = 90;
  const colTotalWidth = 95;

  page.drawRectangle({
    x: tableX,
    y: currentY - 6,
    width: tableWidth,
    height: 24,
    color: primaryColor,
  });

  page.drawText('Item Description', { x: tableX + 8, y: currentY + 1, size: 9, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText('Qty', { x: tableX + colDescWidth + 10, y: currentY + 1, size: 9, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText(`Unit Price (${currency})`, { x: tableX + colDescWidth + colQtyWidth + 8, y: currentY + 1, size: 9, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText(`Total (${currency})`, { x: tableX + colDescWidth + colQtyWidth + colPriceWidth + 10, y: currentY + 1, size: 9, font: fontBold, color: rgb(1, 1, 1) });

  currentY -= 26;

  // Items
  const items: InvoiceItem[] = options.items && options.items.length > 0
    ? options.items
    : [
        { description: 'Consulting & Software Development Services', quantity: 1, unitPrice: 25000 },
        { description: 'Cloud Infrastructure & System Setup', quantity: 1, unitPrice: 15000 },
      ];

  let subtotal = 0;

  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    const itemQty = Number(item.quantity) || 1;
    const itemPrice = Number(item.unitPrice) || 0;
    const itemTotal = item.total !== undefined ? Number(item.total) : itemQty * itemPrice;
    subtotal += itemTotal;

    const rowBg = idx % 2 === 1 ? lightBg : rgb(1, 1, 1);
    page.drawRectangle({
      x: tableX,
      y: currentY - 4,
      width: tableWidth,
      height: 20,
      color: rowBg,
    });

    const desc = fitText(item.description || `Item #${idx + 1}`, fontRegular, 8.5, colDescWidth - 10);
    page.drawText(desc, { x: tableX + 8, y: currentY + 2, size: 8.5, font: fontRegular, color: textColor });
    page.drawText(String(itemQty), { x: tableX + colDescWidth + 18, y: currentY + 2, size: 8.5, font: fontRegular, color: textColor });
    page.drawText(itemPrice.toLocaleString('en-US'), { x: tableX + colDescWidth + colQtyWidth + 12, y: currentY + 2, size: 8.5, font: fontRegular, color: textColor });
    page.drawText(itemTotal.toLocaleString('en-US'), { x: tableX + colDescWidth + colQtyWidth + colPriceWidth + 14, y: currentY + 2, size: 8.5, font: fontBold, color: textColor });

    currentY -= 22;
  }

  // Divider line
  page.drawLine({
    start: { x: tableX, y: currentY },
    end: { x: tableX + tableWidth, y: currentY },
    thickness: 1,
    color: borderColor,
  });

  currentY -= 16;

  // Calculation section
  const taxRate = Number(options.taxRatePercent) || 0;
  const discountRate = Number(options.discountPercent) || 0;
  const discountAmount = (subtotal * discountRate) / 100;
  const taxableSubtotal = Math.max(0, subtotal - discountAmount);
  const taxAmount = (taxableSubtotal * taxRate) / 100;
  const grandTotal = taxableSubtotal + taxAmount;

  const totalsX = width - 240;

  // Subtotal
  page.drawText('Subtotal:', { x: totalsX, y: currentY, size: 9, font: fontRegular, color: secondaryColor });
  page.drawText(`${currency} ${subtotal.toLocaleString('en-US')}`, { x: width - 110, y: currentY, size: 9, font: fontRegular, color: textColor });
  currentY -= 16;

  if (discountRate > 0) {
    page.drawText(`Discount (${discountRate}%):`, { x: totalsX, y: currentY, size: 9, font: fontRegular, color: rgb(0.8, 0.2, 0.2) });
    page.drawText(`- ${currency} ${discountAmount.toLocaleString('en-US')}`, { x: width - 110, y: currentY, size: 9, font: fontRegular, color: rgb(0.8, 0.2, 0.2) });
    currentY -= 16;
  }

  if (taxRate > 0) {
    page.drawText(`GST / Tax (${taxRate}%):`, { x: totalsX, y: currentY, size: 9, font: fontRegular, color: secondaryColor });
    page.drawText(`${currency} ${taxAmount.toLocaleString('en-US')}`, { x: width - 110, y: currentY, size: 9, font: fontRegular, color: textColor });
    currentY -= 16;
  }

  // Grand Total Box
  page.drawRectangle({
    x: totalsX - 10,
    y: currentY - 8,
    width: 170,
    height: 28,
    color: primaryColor,
  });

  page.drawText('TOTAL DUE:', { x: totalsX, y: currentY, size: 11, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText(`${currency} ${grandTotal.toLocaleString('en-US')}`, { x: width - 110, y: currentY, size: 11, font: fontBold, color: rgb(1, 1, 1) });

  // Payment terms & Notes at bottom
  const notes = options.notes || 'Thank you for your business! Payment is requested within 14 days of invoice issue.';
  page.drawText('Payment & Notes:', { x: 40, y: 100, size: 9, font: fontBold, color: primaryColor });
  page.drawText(notes, { x: 40, y: 84, size: 8, font: fontRegular, color: secondaryColor });
  page.drawText('Generated securely by Khan G AI Platform', { x: 40, y: 50, size: 7.5, font: fontRegular, color: rgb(0.6, 0.6, 0.6) });

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}

/**
 * Quotation Maker: Generates a formal PDF quotation / estimate
 */
export async function quotationMaker(options: QuotationOptions = {}): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4 Portrait
  const { width, height } = page.getSize();

  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const primaryColor = rgb(0.12, 0.35, 0.28); // Forest / Emerald Business Green
  const secondaryColor = rgb(0.3, 0.4, 0.35);
  const textColor = rgb(0.12, 0.12, 0.12);
  const lightBg = rgb(0.96, 0.98, 0.96);
  const borderColor = rgb(0.85, 0.9, 0.85);

  // Top header banner
  page.drawRectangle({
    x: 0,
    y: height - 100,
    width,
    height: 100,
    color: primaryColor,
  });

  // Header Title
  page.drawText('PRICE QUOTATION', {
    x: 40,
    y: height - 55,
    size: 26,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  const quoteNum = options.quoteNumber || `QT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const quoteDate = options.quoteDate || new Date().toISOString().split('T')[0];
  const validUntil = options.validUntil || 'Valid for 30 days from date of issue';
  const currency = options.currency || 'PKR';

  // Quotation Meta right-aligned
  page.drawText(`Quote #: ${quoteNum}`, {
    x: width - 210,
    y: height - 42,
    size: 11,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  page.drawText(`Date: ${quoteDate}`, {
    x: width - 210,
    y: height - 58,
    size: 9.5,
    font: fontRegular,
    color: rgb(0.9, 0.9, 0.9),
  });
  page.drawText(validUntil, {
    x: width - 210,
    y: height - 74,
    size: 8.5,
    font: fontRegular,
    color: rgb(0.85, 0.95, 0.85),
  });

  // Provider & Client Section
  let currentY = height - 135;

  const senderName = options.sender?.name || 'Khan G Solutions';
  const senderAddress = options.sender?.address || 'Islamabad, Pakistan';
  const senderPhone = options.sender?.phone || '+92 300 0000000';
  const senderEmail = options.sender?.email || 'sales@khang.ai';

  page.drawText('PROPOSED BY:', { x: 40, y: currentY, size: 9, font: fontBold, color: secondaryColor });
  page.drawText(senderName, { x: 40, y: currentY - 16, size: 12, font: fontBold, color: textColor });
  page.drawText(senderAddress, { x: 40, y: currentY - 30, size: 9, font: fontRegular, color: textColor });
  page.drawText(`${senderPhone} | ${senderEmail}`, { x: 40, y: currentY - 44, size: 8.5, font: fontRegular, color: secondaryColor });

  const clientName = options.client?.name || 'Prospective Client';
  const clientAddress = options.client?.address || 'Pakistan';
  const clientEmail = options.client?.email || 'client@example.com';

  page.drawText('PREPARED FOR:', { x: width / 2 + 20, y: currentY, size: 9, font: fontBold, color: secondaryColor });
  page.drawText(clientName, { x: width / 2 + 20, y: currentY - 16, size: 12, font: fontBold, color: textColor });
  page.drawText(clientAddress, { x: width / 2 + 20, y: currentY - 30, size: 9, font: fontRegular, color: textColor });
  page.drawText(clientEmail, { x: width / 2 + 20, y: currentY - 44, size: 8.5, font: fontRegular, color: secondaryColor });

  currentY -= 75;

  // Items Table Header
  const tableX = 40;
  const tableWidth = width - 80;
  const colDescWidth = 270;
  const colQtyWidth = 60;
  const colPriceWidth = 90;

  page.drawRectangle({
    x: tableX,
    y: currentY - 6,
    width: tableWidth,
    height: 24,
    color: primaryColor,
  });

  page.drawText('Scope of Services / Items', { x: tableX + 8, y: currentY + 1, size: 9, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText('Qty', { x: tableX + colDescWidth + 10, y: currentY + 1, size: 9, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText(`Est. Rate (${currency})`, { x: tableX + colDescWidth + colQtyWidth + 8, y: currentY + 1, size: 9, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText(`Amount (${currency})`, { x: tableX + colDescWidth + colQtyWidth + colPriceWidth + 10, y: currentY + 1, size: 9, font: fontBold, color: rgb(1, 1, 1) });

  currentY -= 26;

  const items: InvoiceItem[] = options.items && options.items.length > 0
    ? options.items
    : [
        { description: 'Architecture & System Design Proposal', quantity: 1, unitPrice: 20000 },
        { description: 'Implementation & Quality Verification', quantity: 1, unitPrice: 35000 },
      ];

  let subtotal = 0;

  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    const itemQty = Number(item.quantity) || 1;
    const itemPrice = Number(item.unitPrice) || 0;
    const itemTotal = item.total !== undefined ? Number(item.total) : itemQty * itemPrice;
    subtotal += itemTotal;

    const rowBg = idx % 2 === 1 ? lightBg : rgb(1, 1, 1);
    page.drawRectangle({
      x: tableX,
      y: currentY - 4,
      width: tableWidth,
      height: 20,
      color: rowBg,
    });

    const desc = fitText(item.description || `Service #${idx + 1}`, fontRegular, 8.5, colDescWidth - 10);
    page.drawText(desc, { x: tableX + 8, y: currentY + 2, size: 8.5, font: fontRegular, color: textColor });
    page.drawText(String(itemQty), { x: tableX + colDescWidth + 18, y: currentY + 2, size: 8.5, font: fontRegular, color: textColor });
    page.drawText(itemPrice.toLocaleString('en-US'), { x: tableX + colDescWidth + colQtyWidth + 12, y: currentY + 2, size: 8.5, font: fontRegular, color: textColor });
    page.drawText(itemTotal.toLocaleString('en-US'), { x: tableX + colDescWidth + colQtyWidth + colPriceWidth + 14, y: currentY + 2, size: 8.5, font: fontBold, color: textColor });

    currentY -= 22;
  }

  // Divider line
  page.drawLine({
    start: { x: tableX, y: currentY },
    end: { x: tableX + tableWidth, y: currentY },
    thickness: 1,
    color: borderColor,
  });

  currentY -= 16;

  const taxRate = Number(options.taxRatePercent) || 0;
  const discountRate = Number(options.discountPercent) || 0;
  const discountAmount = (subtotal * discountRate) / 100;
  const taxableSubtotal = Math.max(0, subtotal - discountAmount);
  const taxAmount = (taxableSubtotal * taxRate) / 100;
  const grandTotal = taxableSubtotal + taxAmount;

  const totalsX = width - 240;

  page.drawText('Subtotal Estimate:', { x: totalsX, y: currentY, size: 9, font: fontRegular, color: secondaryColor });
  page.drawText(`${currency} ${subtotal.toLocaleString('en-US')}`, { x: width - 110, y: currentY, size: 9, font: fontRegular, color: textColor });
  currentY -= 16;

  if (discountRate > 0) {
    page.drawText(`Promotional Discount (${discountRate}%):`, { x: totalsX, y: currentY, size: 9, font: fontRegular, color: rgb(0.8, 0.2, 0.2) });
    page.drawText(`- ${currency} ${discountAmount.toLocaleString('en-US')}`, { x: width - 110, y: currentY, size: 9, font: fontRegular, color: rgb(0.8, 0.2, 0.2) });
    currentY -= 16;
  }

  if (taxRate > 0) {
    page.drawText(`Estimated Tax (${taxRate}%):`, { x: totalsX, y: currentY, size: 9, font: fontRegular, color: secondaryColor });
    page.drawText(`${currency} ${taxAmount.toLocaleString('en-US')}`, { x: width - 110, y: currentY, size: 9, font: fontRegular, color: textColor });
    currentY -= 16;
  }

  page.drawRectangle({
    x: totalsX - 10,
    y: currentY - 8,
    width: 170,
    height: 28,
    color: primaryColor,
  });

  page.drawText('TOTAL ESTIMATE:', { x: totalsX, y: currentY, size: 10, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText(`${currency} ${grandTotal.toLocaleString('en-US')}`, { x: width - 110, y: currentY, size: 10.5, font: fontBold, color: rgb(1, 1, 1) });

  // Terms and acceptance
  const terms = options.terms || 'Terms: 50% advance upon project kickoff, 50% upon final delivery and acceptance. Validity: 30 days.';
  page.drawText('Terms & Conditions:', { x: 40, y: 130, size: 9, font: fontBold, color: primaryColor });
  page.drawText(terms, { x: 40, y: 114, size: 8, font: fontRegular, color: secondaryColor });

  // Signature lines
  page.drawLine({ start: { x: 40, y: 65 }, end: { x: 200, y: 65 }, thickness: 0.8, color: borderColor });
  page.drawText('Authorized Signature (Provider)', { x: 40, y: 52, size: 7.5, font: fontRegular, color: secondaryColor });

  page.drawLine({ start: { x: width - 200, y: 65 }, end: { x: width - 40, y: 65 }, thickness: 0.8, color: borderColor });
  page.drawText('Client Acceptance Signature & Date', { x: width - 200, y: 52, size: 7.5, font: fontRegular, color: secondaryColor });

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}
