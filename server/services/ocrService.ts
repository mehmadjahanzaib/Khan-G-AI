import { GoogleGenAI } from '@google/genai';
import sharp from 'sharp';

export interface OCROptions {
  includeSummary?: boolean;
}

export interface OCRResult {
  success: boolean;
  text: string;
  wordCount: number;
  lineCount: number;
  confidenceNote?: string;
  errorMessage?: string;
}

/**
 * Modular OCR Service
 * Uses Google GenAI multimodal vision (Gemini 3.8 Flash) to genuinely extract
 * optical character text from images (JPG, PNG, WebP, AVIF).
 * Never fakes metadata analysis as OCR.
 */
export async function performImageOCR(
  imageBuffer: Buffer,
  mimeType: string,
  options?: OCROptions
): Promise<OCRResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return {
      success: false,
      text: '',
      wordCount: 0,
      lineCount: 0,
      errorMessage:
        'Optical Character Recognition (OCR) requires an active Gemini API key. Please configure GEMINI_API_KEY in your settings to transcribe text from images.',
    };
  }

  try {
    // 1. Validate image can be loaded by sharp and optimize for OCR if needed
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      return {
        success: false,
        text: '',
        wordCount: 0,
        lineCount: 0,
        errorMessage: 'The uploaded image appears corrupt or unreadable.',
      };
    }

    // Convert to a standardized PNG or JPEG buffer if image is in rare format
    let normalizedBuffer = imageBuffer;
    let targetMime = mimeType;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
      normalizedBuffer = await image.png().toBuffer();
      targetMime = 'image/png';
    }

    // 2. Call Gemini 3.8 Flash with multimodal vision
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'khangtools-ocr',
        },
      },
    });

    const base64Data = normalizedBuffer.toString('base64');

    const prompt = `You are a high-precision Optical Character Recognition (OCR) engine.
Your task is to transcribe all text, numbers, punctuation, and symbols visible in this image.
Preserve paragraph structure, lines, and layout order as closely as possible.
Support multilingual content including English, Urdu, Arabic, Hindi, and Latin scripts.

STRICT RULES:
1. Return ONLY the transcribed text. Do NOT add preamble, conversational remarks, markdown code blocks, or explanations.
2. If the image contains NO legible text, or is purely a photo/graphic without readable words, output EXACTLY:
NO_READABLE_TEXT_DETECTED`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: targetMime,
                data: base64Data,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
      config: {
        temperature: 0.1,
      },
    });

    const rawOutput = (response.text || '').trim();

    if (!rawOutput || rawOutput.includes('NO_READABLE_TEXT_DETECTED')) {
      return {
        success: false,
        text: '',
        wordCount: 0,
        lineCount: 0,
        errorMessage: "I couldn't extract readable text from this image. The image appears blank, illegible, or does not contain recognizable text.",
      };
    }

    // Clean up any extraneous code fences if the model wrapped output
    let cleanText = rawOutput;
    if (cleanText.startsWith('```') && cleanText.endsWith('```')) {
      cleanText = cleanText.replace(/^```[a-z]*\n?/i, '').replace(/```$/, '').trim();
    }

    const lines = cleanText.split('\n').filter((l) => l.trim().length > 0);
    const words = cleanText.split(/\s+/).filter(Boolean);

    return {
      success: true,
      text: cleanText,
      wordCount: words.length,
      lineCount: lines.length,
      confidenceNote: `Transcribed ${words.length} words across ${lines.length} lines via Gemini Vision OCR`,
    };
  } catch (err: any) {
    console.error('OCR Error:', err);
    return {
      success: false,
      text: '',
      wordCount: 0,
      lineCount: 0,
      errorMessage:
        err?.message?.includes('API_KEY') || err?.status === 403
          ? 'OCR service authentication failed. Please check your API credentials.'
          : `Optical Character Recognition failed: ${err?.message || 'Unable to process image'}`,
    };
  }
}
