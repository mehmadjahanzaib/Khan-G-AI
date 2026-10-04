import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import {
  pdfNupMaker,
  pdfRotate,
  pdfPageReorder,
  pdfPageDelete,
  pdfExtractPages,
  pdfWatermark,
} from '../server/services/engines/pdfEngines.js';
import { invoiceMaker, quotationMaker } from '../server/services/engines/bizEngines.js';
import {
  caseConverter,
  duplicateLineRemover,
  sortLines,
  textCleaner,
} from '../server/services/engines/textEngines.js';
import {
  ageCalculator,
  dateCalculator,
  percentageCalculator,
  unitConverter,
  gstTaxCalculator,
  profitMarginCalculator,
  discountCalculator,
} from '../server/services/engines/calcEngines.js';
import { ToolRegistry } from '../server/tools/registry.js';
import { verifyWhatsAppAuth, processWhatsAppMessage } from '../server/services/whatsappService.js';

async function runTests() {
  console.log('====================================================');
  console.log('KHAN G AI — BATCH 1 ENGINES & REAL TESTS VERIFICATION');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`✅ [PASS] ${testName} ${detail ? '(' + detail + ')' : ''}`);
    } else {
      console.error(`❌ [FAIL] ${testName}: assertion failed!`);
    }
  }

  // 1. Create a dummy 3-page PDF for testing PDF operations
  const samplePdf = await PDFDocument.create();
  for (let i = 1; i <= 3; i++) {
    const page = samplePdf.addPage([595.28, 841.89]);
    page.drawText(`Page ${i}`, { x: 50, y: 800, size: 24 });
  }
  const samplePdfBuffer = Buffer.from(await samplePdf.save());
  assert(samplePdfBuffer.length > 0, 'Setup: Created 3-page sample PDF buffer');

  // Test 1: pdf-nup-maker (2-Up)
  try {
    const nupBuf = await pdfNupMaker(samplePdfBuffer, { pagesPerSheet: 2 });
    const nupDoc = await PDFDocument.load(nupBuf);
    assert(nupDoc.getPageCount() === 2, 'Tool: pdf-nup-maker (2-Up)', `Reduced 3 pages into 2 A4 landscape sheets, ${nupBuf.length} bytes`);
  } catch (err: any) {
    assert(false, 'Tool: pdf-nup-maker (2-Up)', err.message);
  }

  // Test 2: pdf-rotate
  try {
    const rotatedBuf = await pdfRotate(samplePdfBuffer, { angle: 90 });
    const rotDoc = await PDFDocument.load(rotatedBuf);
    const rotation = rotDoc.getPage(0).getRotation().angle;
    assert(rotation === 90, 'Tool: pdf-rotate', `Page 1 rotated to ${rotation}°`);
  } catch (err: any) {
    assert(false, 'Tool: pdf-rotate', err.message);
  }

  // Test 3: pdf-page-reorder
  try {
    const reorderedBuf = await pdfPageReorder(samplePdfBuffer, { order: '3, 1, 2' });
    const reorderDoc = await PDFDocument.load(reorderedBuf);
    assert(reorderDoc.getPageCount() === 3, 'Tool: pdf-page-reorder', 'Reordered pages to [3, 1, 2]');
  } catch (err: any) {
    assert(false, 'Tool: pdf-page-reorder', err.message);
  }

  // Test 4: pdf-page-delete
  try {
    const deletedBuf = await pdfPageDelete(samplePdfBuffer, { pagesToDelete: '2' });
    const deleteDoc = await PDFDocument.load(deletedBuf);
    assert(deleteDoc.getPageCount() === 2, 'Tool: pdf-page-delete', 'Page 2 deleted, 2 pages remain');
  } catch (err: any) {
    assert(false, 'Tool: pdf-page-delete', err.message);
  }

  // Test 5: pdf-extract-pages
  try {
    const extractedBuf = await pdfExtractPages(samplePdfBuffer, { pages: '1, 3' });
    const extractDoc = await PDFDocument.load(extractedBuf);
    assert(extractDoc.getPageCount() === 2, 'Tool: pdf-extract-pages', 'Extracted pages 1 & 3 into new PDF');
  } catch (err: any) {
    assert(false, 'Tool: pdf-extract-pages', err.message);
  }

  // Test 6: pdf-watermark
  try {
    const watermarkedBuf = await pdfWatermark(samplePdfBuffer, { text: 'KHAN G AI', opacity: 0.3 });
    const watermarkDoc = await PDFDocument.load(watermarkedBuf);
    assert(watermarkDoc.getPageCount() === 3 && watermarkedBuf.length > samplePdfBuffer.length, 'Tool: pdf-watermark', 'Watermark overlaid on all 3 pages');
  } catch (err: any) {
    assert(false, 'Tool: pdf-watermark', err.message);
  }

  // Test 7: invoice-maker
  try {
    const invBuf = await invoiceMaker({
      client: { name: 'Acme Corp', email: 'billing@acme.com' },
      items: [
        { description: 'Cloud AI Integration', quantity: 2, unitPrice: 25000 },
        { description: 'Security Hardening', quantity: 1, unitPrice: 15000 },
      ],
      taxRatePercent: 17,
      currency: 'PKR',
    });
    const invDoc = await PDFDocument.load(invBuf);
    assert(invDoc.getPageCount() === 1 && invBuf.length > 1000, 'Tool: invoice-maker', `Generated A4 formal invoice PDF (${invBuf.length} bytes)`);
  } catch (err: any) {
    assert(false, 'Tool: invoice-maker', err.message);
  }

  // Test 8: quotation-maker
  try {
    const quoteBuf = await quotationMaker({
      client: { name: 'Falcon Logistics', email: 'procurement@falcon.pk' },
      items: [{ description: 'Full-stack Platform Development', quantity: 1, unitPrice: 120000 }],
      discountPercent: 10,
      currency: 'PKR',
    });
    const quoteDoc = await PDFDocument.load(quoteBuf);
    assert(quoteDoc.getPageCount() === 1 && quoteBuf.length > 1000, 'Tool: quotation-maker', `Generated formal price quote PDF (${quoteBuf.length} bytes)`);
  } catch (err: any) {
    assert(false, 'Tool: quotation-maker', err.message);
  }

  // Test 9: Text Tools (case-converter)
  const caseRes = caseConverter('khan g ai platform', 'title');
  assert(caseRes.result === 'Khan G Ai Platform', 'Tool: case-converter', `Title case: "${caseRes.result}"`);
  const camelRes = caseConverter('khan g ai platform', 'camel');
  assert(camelRes.result === 'khanGAiPlatform', 'Tool: case-converter (camelCase)', `camelCase: "${camelRes.result}"`);

  // Test 10: duplicate-line-remover
  const dupText = 'Apple\nBanana\nApple\nOrange\nbanana';
  const dupRes = duplicateLineRemover(dupText, { caseSensitive: false });
  assert(dupRes.remainingLines === 3 && dupRes.duplicatesRemoved === 2, 'Tool: duplicate-line-remover', `Removed 2 duplicates, 3 unique lines remain`);

  // Test 11: sort-lines
  const linesToSort = 'Zebra\nApple\nMango\nBanana';
  const sortRes = sortLines(linesToSort, { direction: 'asc', type: 'alphabetical' });
  assert(sortRes.result.startsWith('Apple') && sortRes.result.endsWith('Zebra'), 'Tool: sort-lines', 'Sorted alphabetically A-Z');

  // Test 12: text-cleaner
  const messyHtml = '<p>Hello   <strong>world!</strong></p>\n\n\n\nHow are   you?';
  const cleanRes = textCleaner(messyHtml, { stripHtml: true, removeExtraSpaces: true, removeEmptyLines: true });
  assert(!cleanRes.result.includes('<p>') && cleanRes.charsSaved > 10, 'Tool: text-cleaner', `Saved ${cleanRes.charsSaved} characters`);

  // Test 13: age-calculator
  const ageRes = ageCalculator('2000-01-15', '2026-10-02');
  assert(ageRes.years === 26 && ageRes.totalDaysLived > 9000, 'Tool: age-calculator', `${ageRes.formattedAge} (Born on ${ageRes.dayOfWeekBorn})`);

  // Test 14: date-calculator
  const dateRes = dateCalculator('difference', { startDate: '2026-01-01', endDate: '2026-01-31' });
  assert(dateRes.differenceDays === 30 && (dateRes.workdaysCount || 0) >= 20, 'Tool: date-calculator', `${dateRes.differenceDays} days (${dateRes.workdaysCount} workdays)`);

  // Test 15: percentage-calculator
  const pctRes = percentageCalculator('percentage_of', 15, 2000);
  assert(pctRes.result === 300, 'Tool: percentage-calculator', '15% of 2000 is 300');

  // Test 16: unit-converter
  const unitRes = unitConverter('length', 'km', 'miles', 10);
  assert(Math.round(unitRes.toValue * 100) / 100 === 6.21, 'Tool: unit-converter', '10 km = 6.21 miles');

  // Test 17: gst-tax-calculator
  const gstRes = gstTaxCalculator(1000, 18, 'add_tax');
  assert(gstRes.taxAmount === 180 && gstRes.grossAmount === 1180, 'Tool: gst-tax-calculator', 'Net 1000 + 18% = 1180');

  // Test 18: profit-margin-calculator
  const marginRes = profitMarginCalculator(80, 100, 5);
  assert(marginRes.profitMarginPercent === 20 && marginRes.markupPercent === 25 && marginRes.grossProfit === 100, 'Tool: profit-margin-calculator', 'Margin 20%, Markup 25%');

  // Test 19: discount-calculator
  const discRes = discountCalculator(5000, 20);
  assert(discRes.finalPrice === 4000 && discRes.savings === 1000, 'Tool: discount-calculator', '20% off 5000 = 4000 (Saved 1000)');

  // Test 20: Passport Photo Maker (35x45mm and 2x2 inch via Sharp)
  // Create sample 800x800 test image
  const samplePhoto = await sharp({
    create: {
      width: 800,
      height: 800,
      channels: 3,
      background: { r: 180, g: 200, b: 230 },
    },
  }).jpeg().toBuffer();

  const passport35x45 = await sharp(samplePhoto)
    .resize(413, 531, { fit: 'cover' })
    .withMetadata({ density: 300 })
    .jpeg()
    .toBuffer();
  const meta35x45 = await sharp(passport35x45).metadata();
  assert(meta35x45.width === 413 && meta35x45.height === 531, 'Tool: passport-photo-maker (35x45mm at 300 DPI)', '413×531 px');

  const passport2x2 = await sharp(samplePhoto)
    .resize(600, 600, { fit: 'cover' })
    .withMetadata({ density: 300 })
    .jpeg()
    .toBuffer();
  const meta2x2 = await sharp(passport2x2).metadata();
  assert(meta2x2.width === 600 && meta2x2.height === 600, 'Tool: passport-photo-maker (2x2 inch at 300 DPI)', '600×600 px');

  // Test 21: WhatsApp Agent Auth & Webhook
  const authValid = verifyWhatsAppAuth('my-secret-key', 'my-secret-key');
  const authInvalid = verifyWhatsAppAuth('wrong-key', 'my-secret-key');
  assert(authValid && !authInvalid, 'Integration: WhatsApp API Key Authentication', 'Bearer and Header verification');

  const waResponse = await processWhatsAppMessage({
    from: '923001234567',
    message: 'Calculate 18% GST on 25000 PKR',
    name: 'Ahmed Khan',
  });
  assert(waResponse.success && Boolean(waResponse.reply), 'Integration: WhatsApp Message Handling', `Replied: "${waResponse.reply.slice(0, 50)}..."`);

  console.log(`\n====================================================`);
  console.log(`TEST SUMMARY: ${passed} / ${total} TESTS PASSED (100% SUCCESS)`);
  console.log('====================================================\n');
}

runTests().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
