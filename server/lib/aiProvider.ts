import { GoogleGenAI, Type } from '@google/genai';
import OpenAI from 'openai';
import { TOOL_DEFINITIONS, FunctionTool } from '../tools/definitions.js';
import { AIProviderResult } from '../types.js';

export interface ChatMessageParam {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CallAIOptions {
  uploadedFiles?: { name: string; type: string; size: number }[];
}

/**
 * Normalizes tool definitions for Google GenAI SDK
 */
function toGenAITools(tools: FunctionTool[]) {
  const functionDeclarations = tools.map((t) => {
    const fn = t.function;
    const properties: Record<string, any> = {};

    for (const [key, prop] of Object.entries(fn.parameters.properties || {})) {
      let propType = Type.STRING;
      if (prop.type === 'number') propType = Type.NUMBER;
      else if (prop.type === 'boolean') propType = Type.BOOLEAN;
      else if (prop.type === 'array') propType = Type.ARRAY;
      else if (prop.type === 'object') propType = Type.OBJECT;

      properties[key] = {
        type: propType,
        description: prop.description || '',
        ...(prop.enum ? { enum: prop.enum } : {}),
      };
    }

    return {
      name: fn.name,
      description: fn.description,
      parameters: {
        type: Type.OBJECT,
        properties,
        ...(fn.parameters.required ? { required: fn.parameters.required } : {}),
      },
    };
  });

  return [{ functionDeclarations }];
}

/**
 * Rule-based natural language intent resolver fallback.
 * Ensures the app works smoothly if third-party keys are absent or rate-limited.
 */
function resolveIntentFallback(userText: string, files?: { name: string; type: string }[]): AIProviderResult {
  const text = (userText || '').trim();
  const lower = text.toLowerCase();
  const file = files?.[0];
  const fileExt = file?.name?.split('.').pop()?.toLowerCase() || '';
  const hasFiles = Boolean(files && files.length > 0);

  // 1. Identity questions ("Who are you?", "Tum kon ho?")
  if (
    lower.includes('who are you') ||
    lower.includes('tum kon ho') ||
    lower.includes('aap kon hain') ||
    lower.includes('what are you') ||
    lower.includes('introduce yourself') ||
    lower.includes('apna taaruf')
  ) {
    return {
      type: 'message',
      text: lower.includes('tum') || lower.includes('aap')
        ? 'Main Khan G Tools hoon — aap ka AI file assistant! Main images, PDFs, Word documents, Excel spreadsheets aur Zip archives ko process, convert aur optimize karne mein aap ki madad kar sakta hoon.'
        : "I'm Khan G Tools, your AI-powered file assistant. I can help you process images, PDFs, documents, spreadsheets, and archives.",
      provider: 'built-in'
    };
  }

  // 2. Capabilities questions ("What can you do?", "Tum kya kya kar sakte ho?")
  if (
    lower.includes('what can you do') ||
    lower.includes('what do you do') ||
    lower.includes('tum kya kar sakte ho') ||
    lower.includes('tum kya kya kar sakte ho') ||
    lower.includes('aap kya kar sakte hain') ||
    lower.includes('help me') ||
    lower === 'help' ||
    lower === 'tools' ||
    lower.includes('kya kya tools hain')
  ) {
    const isUrdu = lower.includes('tum') || lower.includes('aap') || lower.includes('kya');
    if (isUrdu) {
      return {
        type: 'message',
        text: `Main Khan G Tools hoon! Main aap ki files ke sath yeh tamaam kaam kar sakta hoon:

🖼️ **Images**:
- Resize karna (maslan: "is image ko 800x600 mein resize karo" ya 50%)
- Compress karna (quality reduce karke size chhota karna)
- Format convert karna (JPG, PNG, WebP, AVIF)
- Images ko PDF document mein convert karna

📄 **PDF Tools**:
- Multiple PDFs ko ek file mein Merge karna
- PDF ke pages Split ya extract karna (maslan: "pages 1-3 alag karo")
- PDF file ko Compress karna
- PDF ko editable Word document (.docx) mein convert karna

📝 **Documents & Sheets**:
- Word (.docx) ya text ko PDF mein convert karna
- CSV file ko formatted Excel sheet (.xlsx) mein badalna
- Excel sheet ko CSV mein export karna
- Image ya document se Text / OCR extract karna

📦 **Archives**:
- Files ko .zip archive mein pack karna
- .zip file ko Unpack / extract karna

Bas paperclip icon se apni file upload karein aur batayein ke aap kya karna chahte hain!`,
        provider: 'built-in'
      };
    }

    return {
      type: 'message',
      text: `Hello! I am Khan G Tools, your AI file processing assistant. Here is everything I can do for you:

🖼️ **Image Tools**:
- **Resize**: Exact dimensions (e.g., "resize to 800x600") or percentage (e.g., "make it 50%")
- **Compress**: Reduce file size without noticeable loss of quality
- **Format Conversion**: Convert between JPG, PNG, WEBP, and AVIF
- **Images to PDF**: Combine one or multiple pictures into a PDF

📄 **PDF Tools**:
- **Merge PDFs**: Combine multiple PDF files into a single document
- **Split PDF**: Extract specific pages or page ranges (e.g., "extract pages 1-3")
- **Compress PDF**: Optimize and shrink PDF file size
- **PDF to Word**: Convert PDF pages into an editable Word (.docx) document

📝 **Spreadsheets & Text**:
- **CSV to Excel**: Transform CSV into a styled Excel (.xlsx) workbook
- **Excel to CSV**: Export spreadsheet data to standard CSV
- **Word to PDF**: Convert Word (.docx) into a printable PDF
- **Extract Text / OCR**: Extract text content from scanned documents and images

📦 **Archives**:
- **Zip Files**: Compress multiple files into a single .zip archive
- **Unzip**: Extract files from an uploaded .zip bundle

Just click the paperclip icon to upload a file and type your instruction!`,
      provider: 'built-in'
    };
  }

  // 3. Greetings ("Hello", "Hi", "Salam", "Aoa", "Kese ho")
  if (/^(hello|hi|hey|heya|howdy|good\s*(morning|afternoon|evening)|assalam|salam|aoa|kese ho|kya haal hai|hi there)(\s*[\.\!\?]*)?$/i.test(lower)) {
    if (lower.includes('salam') || lower.includes('aoa') || lower.includes('kese') || lower.includes('haal')) {
      return {
        type: 'message',
        text: 'Walaikum Assalam! Khan G Tools mein khush amdeed. Main aap ki file conversions aur editing mein kis tarah madad kar sakta hoon?',
        provider: 'built-in'
      };
    }
    return {
      type: 'message',
      text: 'Hello! Welcome to Khan G Tools. How can I help you today?',
      provider: 'built-in'
    };
  }

  // 4. Gratitude ("Thank you", "Thanks", "Shukriya")
  if (/^(thank\s*you|thanks|thx|shukriya|bohat\s*shukriya|jazakallah|dhanwad|merci)(\s*[\.\!\?]*)?$/i.test(lower)) {
    if (lower.includes('shukriya') || lower.includes('jazakallah')) {
      return {
        type: 'message',
        text: 'Bohat shukriya! Agar aap ko mazeed kisi file ko process ya convert karna ho to zaroor batayein.',
        provider: 'built-in'
      };
    }
    return {
      type: 'message',
      text: "You're very welcome! If you have any more files to process, I'm here to help.",
      provider: 'built-in'
    };
  }

  // 5. Background removal (explicit user test case)
  if (lower.includes('background remove') || lower.includes('bg remove') || lower.includes('remove background') || lower.includes('background hatao') || lower.includes('background saaf')) {
    return {
      type: 'message',
      text: "Background removal is currently under development (Coming Soon in our Pro Suite). In the meantime, you can resize, compress, or convert this image to PNG/WebP/JPG format!",
      provider: 'built-in'
    };
  }

  // 5b. Unsupported request detection (e.g. video, audio, code generation)
  if (
    lower.includes('video') ||
    lower.includes('mp4') ||
    lower.includes('mp3') ||
    lower.includes('music') ||
    lower.includes('song') ||
    lower.includes('python code') ||
    lower.includes('write code')
  ) {
    return {
      type: 'message',
      text: "Khan G Tools specializes in processing Images, PDFs, Word documents, Excel sheets, and Zip archives. Currently video and audio editing are not supported, but please feel free to upload any document or image!",
      provider: 'built-in'
    };
  }

  // 6. Check if user is asking for a file operation WITHOUT uploading a file
  const wantsFileOp =
    lower.includes('resize') ||
    lower.includes('compress') ||
    lower.includes('convert') ||
    lower.includes('merge') ||
    lower.includes('split') ||
    lower.includes('pdf') ||
    lower.includes('excel') ||
    lower.includes('csv') ||
    lower.includes('extract') ||
    lower.includes('ocr') ||
    lower.includes('zip') ||
    lower.includes('unzip') ||
    lower.includes('word') ||
    lower.includes('banao') ||
    lower.includes('karo') ||
    lower.includes('badal do');

  if (!hasFiles && wantsFileOp) {
    const isUrdu = lower.includes('karo') || lower.includes('karni') || lower.includes('banao') || lower.includes('ye') || lower.includes('is');
    return {
      type: 'message',
      text: isUrdu
        ? 'Barahe meherbani woh file upload karein jise aap process karna chahte hain, aur mujhe batayein ke aap is ke sath kya karna chahte hain.'
        : 'Please upload the file you want me to process, and tell me what you would like me to do with it.',
      provider: 'built-in',
      isClarification: true
    };
  }

  // If no files attached and not recognized above
  if (!hasFiles) {
    return {
      type: 'message',
      text: 'Please upload the file you want me to process, and tell me what you would like me to do with it.',
      provider: 'built-in',
      isClarification: true
    };
  }

  // =========================================================================
  // FILE OPERATIONS (When files ARE attached)
  // =========================================================================

  // 1. Resize Image (supports Roman Urdu: "is image ko 800x600 mein resize karo")
  const dimMatch = lower.match(/(\d+)\s*(?:x|\*|by)\s*(\d+)/i);
  const pctMatch = lower.match(/(\d+)%/);
  if (lower.includes('resize') || (dimMatch && (fileExt === 'jpg' || fileExt === 'png' || fileExt === 'webp' || fileExt === 'jpeg'))) {
    const width = dimMatch ? parseInt(dimMatch[1], 10) : undefined;
    const height = dimMatch ? parseInt(dimMatch[2], 10) : undefined;
    const percentage = pctMatch ? parseInt(pctMatch[1], 10) : undefined;
    return {
      type: 'tool_call',
      name: 'resize_image',
      args: { width, height, percentage },
      provider: 'built-in-intent'
    };
  }

  // 2. Compress image / Compress PDF ("mujhe pdf compress karni hai", "is image ka size 500 KB se kam karo")
  if (lower.includes('compress') || lower.includes('reduce size') || lower.includes('shrink') || lower.includes('size chhota') || lower.includes('chota karo') || lower.includes('se kam karo') || lower.includes('under')) {
    if (fileExt === 'pdf' || lower.includes('pdf')) {
      return {
        type: 'tool_call',
        name: 'compress_pdf',
        args: { quality: 'standard' },
        provider: 'built-in-intent'
      };
    }
    const kbMatch = lower.match(/(\d+)\s*(?:kb|kilo|k\b)/i);
    const mbMatch = lower.match(/(\d+)\s*(?:mb)/i);
    const maxSizeKB = kbMatch ? parseInt(kbMatch[1], 10) : mbMatch ? parseInt(mbMatch[1], 10) * 1024 : undefined;
    const qMatch = lower.match(/quality\s*(\d+)/i) || lower.match(/(\d+)%\s*quality/i);
    const quality = qMatch ? parseInt(qMatch[1], 10) : 70;
    return {
      type: 'tool_call',
      name: 'compress_image',
      args: { quality, ...(maxSizeKB ? { maxSizeKB } : {}) },
      provider: 'built-in-intent'
    };
  }

  // 3. Convert image format
  if (lower.includes('png') && (lower.includes('convert') || lower.includes('to png') || lower.includes('as png') || lower.includes('badal do') || lower.includes('banao'))) {
    return { type: 'tool_call', name: 'convert_image', args: { format: 'png' }, provider: 'built-in-intent' };
  }
  if (lower.includes('webp') && (lower.includes('convert') || lower.includes('to webp') || lower.includes('as webp') || lower.includes('badal do') || lower.includes('banao'))) {
    return { type: 'tool_call', name: 'convert_image', args: { format: 'webp' }, provider: 'built-in-intent' };
  }
  if ((lower.includes('jpg') || lower.includes('jpeg')) && (lower.includes('convert') || lower.includes('to jpg') || lower.includes('to jpeg') || lower.includes('badal do') || lower.includes('banao'))) {
    return { type: 'tool_call', name: 'convert_image', args: { format: 'jpg' }, provider: 'built-in-intent' };
  }

  // 4. Merge PDFs ("merge karo", "pdfs mila do")
  if (lower.includes('merge') || lower.includes('combine') || lower.includes('join') || lower.includes('mila do') || lower.includes('jod do')) {
    if (fileExt === 'pdf' || lower.includes('pdf')) {
      return {
        type: 'tool_call',
        name: 'merge_pdfs',
        args: {},
        provider: 'built-in-intent'
      };
    }
  }

  // 5. Split PDF ("split karo", "pages alag kar do")
  if (lower.includes('split') || lower.includes('extract page') || lower.includes('cut page') || lower.includes('alag karo') || lower.includes('nikal do')) {
    const pageMatch = lower.match(/page(?:s)?\s*([\d\-, ]+)/i);
    return {
      type: 'tool_call',
      name: 'split_pdf',
      args: { pages: pageMatch ? pageMatch[1].trim() : '1' },
      provider: 'built-in-intent'
    };
  }

  // 6. Convert PDF to Word ("ye pdf ko word mein convert kar do", "pdf to docx")
  if (lower.includes('to word') || lower.includes('to docx') || lower.includes('pdf to word') || (lower.includes('word') && (lower.includes('convert') || lower.includes('badal')))) {
    if (fileExt === 'pdf' || lower.includes('pdf')) {
      return {
        type: 'tool_call',
        name: 'convert_pdf_to_word',
        args: {},
        provider: 'built-in-intent'
      };
    }
  }

  // 7. Convert to PDF ("pdf bana do", "turn into pdf", "convert to pdf")
  if (lower.includes('to pdf') || lower.includes('as pdf') || lower.includes('make pdf') || lower.includes('convert to pdf') || lower.includes('pdf bana do') || lower.includes('pdf mein')) {
    if (fileExt === 'docx' || fileExt === 'doc' || file?.type?.includes('word')) {
      return {
        type: 'tool_call',
        name: 'convert_word_to_pdf',
        args: {},
        provider: 'built-in-intent'
      };
    }
    return {
      type: 'tool_call',
      name: 'images_to_pdf',
      args: {},
      provider: 'built-in-intent'
    };
  }

  // 8. CSV / Excel conversions ("mere liye excel sheet bana do", "convert to excel")
  if (lower.includes('csv to excel') || lower.includes('make excel') || lower.includes('excel sheet') || lower.includes('into an excel') || lower.includes('to excel') || lower.includes('as xlsx') || lower.includes('sheet bana do')) {
    if (fileExt === 'csv') {
      return { type: 'tool_call', name: 'convert_csv_to_excel', args: {}, provider: 'built-in-intent' };
    }
    return { type: 'tool_call', name: 'text_or_csv_to_excel', args: { rawText: userText }, provider: 'built-in-intent' };
  }
  if (lower.includes('excel to csv') || lower.includes('to csv') || lower.includes('as csv')) {
    return { type: 'tool_call', name: 'convert_excel_to_csv', args: {}, provider: 'built-in-intent' };
  }

  // 9. Extract Text / OCR ("text extract kar do", "likha hua text nikal do")
  if (lower.includes('extract text') || lower.includes('ocr') || lower.includes('read text') || lower.includes('get text') || lower.includes('transcribe') || lower.includes('text nikal')) {
    return {
      type: 'tool_call',
      name: 'extract_text_ocr',
      args: { includeSummary: true },
      provider: 'built-in-intent'
    };
  }

  // 10. Zip / Unzip ("zip bana do", "unzip kar do")
  if (lower.includes('unzip') || lower.includes('extract zip')) {
    return { type: 'tool_call', name: 'unzip_file', args: {}, provider: 'built-in-intent' };
  }
  if (lower.includes('zip') || lower.includes('archive') || lower.includes('compress files')) {
    return { type: 'tool_call', name: 'zip_files', args: {}, provider: 'built-in-intent' };
  }

  // 11. Summarize Document ("Is PDF ko summarize karo", "summarize", "khulasa")
  if (lower.includes('summarize') || lower.includes('summary') || lower.includes('khulasa') || lower.includes('overview do')) {
    return {
      type: 'tool_call',
      name: 'summarize_document',
      args: {},
      provider: 'built-in-intent'
    };
  }

  // 12. Calculate Excel / Spreadsheet Data ("Is Excel file mein total calculate karo", "total calculate karo")
  if (lower.includes('calculate') || lower.includes('total') || lower.includes('sum') || lower.includes('average') || lower.includes('hisab')) {
    if (fileExt === 'xlsx' || fileExt === 'xls' || fileExt === 'csv' || lower.includes('excel')) {
      return {
        type: 'tool_call',
        name: 'calculate_excel_data',
        args: { operation: 'all_stats' },
        provider: 'built-in-intent'
      };
    }
  }

  // 13. Improve Document Text / Spelling & Grammar ("Is document ki spelling mistakes correct karo")
  if (lower.includes('spelling') || lower.includes('grammar') || lower.includes('mistakes correct') || lower.includes('proofread') || lower.includes('improve text') || lower.includes('ghaltiyan theek karo')) {
    return {
      type: 'tool_call',
      name: 'improve_document_text',
      args: { tone: 'professional' },
      provider: 'built-in-intent'
    };
  }

  // 14. Generate Professional Report ("Is meeting notes ko professional report mein badal do")
  if (lower.includes('report') || lower.includes('meeting notes') || lower.includes('professional report') || lower.includes('report bana do')) {
    return {
      type: 'tool_call',
      name: 'generate_professional_report',
      args: {},
      provider: 'built-in-intent'
    };
  }

  // 15. Translate Document ("Is document ko Urdu / Roman Urdu / English mein translate karo")
  if (lower.includes('translate') || lower.includes('tarjuma') || lower.includes('urdu mein') || lower.includes('english mein')) {
    const targetLanguage = lower.includes('roman') ? 'roman_urdu' : lower.includes('urdu') ? 'urdu' : 'english';
    return {
      type: 'tool_call',
      name: 'translate_document',
      args: { targetLanguage },
      provider: 'built-in-intent'
    };
  }

  // 16. Rename File ("Is file ka naam change karo", "rename this file")
  if (lower.includes('rename') || lower.includes('naam badlo') || lower.includes('name change') || lower.includes('naam change')) {
    const nameMatch = lower.match(/(?:to|as|naam)\s+([a-zA-Z0-9_\-\s]+)/i);
    const newName = nameMatch ? nameMatch[1].trim() : 'renamed_document';
    return {
      type: 'tool_call',
      name: 'rename_file',
      args: { newName },
      provider: 'built-in-intent'
    };
  }

  // Clarifying question for attached file
  return {
    type: 'message',
    text: `I received your file "${files[0].name}", but could you please clarify what operation you'd like to perform? For example: "resize to 800x600", "compress", "convert to PDF", "extract text", or "convert to Excel"?`,
    provider: 'built-in',
    isClarification: true
  };
}

// In-memory cooldown tracking for permission-denied or rate-limited providers
let geminiPermissionDeniedUntil = 0;

/**
 * Universal AI Caller function
 * callAI(messages, tools, options)
 */
export async function callAI(
  messages: ChatMessageParam[],
  tools: FunctionTool[] = TOOL_DEFINITIONS,
  options?: CallAIOptions
): Promise<AIProviderResult> {
  const preferredProvider = (process.env.AI_PROVIDER || 'gemini').toLowerCase().trim();
  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content || '';

  const systemPrompt = `You are Khan G Tools AI, a polite, conversational AI file assistant similar to ChatGPT, with the tagline: "One Chat. Every File Tool."
You understand English, Urdu, and Roman Urdu fluently.
Attached uploaded files: ${JSON.stringify(options?.uploadedFiles || [])}

BEHAVIOR RULES:
1. CONVERSATIONAL REQUESTS (Normal chat):
   - If the user greets you ("Hello", "Hi", "Salam", "Aoa"), respond warmly: "Hello! Welcome to Khan G Tools. How can I help you today?" (or in Urdu/Roman Urdu if addressed in it).
   - If the user asks "Who are you?" or "Tum kon ho?", answer: "I’m Khan G Tools, your AI-powered file assistant. I can help you process images, PDFs, documents, spreadsheets, and archives."
   - If the user asks "What can you do?" or "Tum kya kya kar sakte ho?", explain all available tools (Images, PDFs, Word, Excel, CSV, OCR, Zip) in a friendly, structured, and simple way.
   - If the user says "Thank you" or "Shukriya", respond politely and warmly.
   - For any general or informational conversation, return a normal assistant message. Respond in the same language (English, Urdu, or Roman Urdu) the user used.

2. FILE OPERATIONS & TOOL CALLING:
   - ONLY call a tool function when:
     (a) There is at least ONE uploaded file present in the "Attached uploaded files" list above, AND
     (b) The user explicitly requested a supported file operation (resize, compress, convert, merge, split, pdf to word, excel, ocr, zip, unzip).
   - If the user asks for a file operation BUT NO files are uploaded, DO NOT CALL ANY TOOL. Instead respond naturally:
     "Please upload the file you want me to process, and tell me what you would like me to do with it." (or in Roman Urdu: "Barahe meherbani woh file upload karein jise aap process karna chahte hain, aur mujhe batayein ke aap is ke sath kya karna chahte hain.")
   - NEVER pretend that a file was processed if no actual backend operation was completed.
   - If a file is uploaded but the instruction is ambiguous, ask a concise clarification question instead of guessing.
   - If the user asks for background removal, explain that Background Removal is currently in development (Coming Soon in our Pro Suite), and suggest supported image operations like resizing, format conversion, or compression.
   - If the request is unsupported (e.g. video, audio editing), explain what Khan G Tools supports.`;

  // Check for direct high-confidence tool intent when files are attached
  const directIntent = resolveIntentFallback(lastUserMessage, options?.uploadedFiles);
  if (directIntent.type === 'tool_call' && options?.uploadedFiles && options.uploadedFiles.length > 0) {
    return directIntent;
  }

  // 1. Google AI Studio (Gemini) - Primary provider
  if (preferredProvider === 'gemini' && Date.now() > geminiPermissionDeniedUntil) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        const genAITools = toGenAITools(tools);
        const contents = [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\nUser request: ${lastUserMessage}` }] }
        ];

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents,
          config: {
            tools: genAITools,
            temperature: 0.2,
          },
        });

        const functionCalls = response.functionCalls;
        if (functionCalls && functionCalls.length > 0) {
          const call = functionCalls[0];
          return {
            type: 'tool_call',
            name: call.name,
            args: (call.args as Record<string, any>) || {},
            provider: 'Gemini 3.8 Flash'
          };
        }

        const textOutput = response.text || '';
        if (textOutput) {
          return {
            type: 'message',
            text: textOutput,
            provider: 'Gemini 3.8 Flash'
          };
        }
      } catch (err: any) {
        const errMsg = err?.message || '';
        // If permission denied or project blocked, back off to avoid spamming the endpoint
        if (errMsg.includes('PERMISSION_DENIED') || errMsg.includes('403') || err?.status === 403) {
          geminiPermissionDeniedUntil = Date.now() + 10 * 60 * 1000;
        }
        // Seamless failover to secondary provider without triggering unhandled console error alarms
      }
    }
  }

  // 2. Groq Provider (Fast secondary fallback or direct provider)
  if (process.env.GROQ_API_KEY) {
    try {
      const groq = new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: 'https://api.groq.com/openai/v1',
      });

      const response = await groq.chat.completions.create({
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
        tools: tools.map((t) => ({
          type: 'function',
          function: {
            name: t.function.name,
            description: t.function.description,
            parameters: t.function.parameters,
          },
        })),
        tool_choice: 'auto',
        max_tokens: 600,
      });

      const message = response.choices[0]?.message;
      if (message?.tool_calls && message.tool_calls.length > 0) {
        const toolCall = message.tool_calls[0] as any;
        let args = {};
        if (toolCall?.function?.arguments) {
          try {
            args = JSON.parse(toolCall.function.arguments);
          } catch {
            args = {};
          }
        }
        return {
          type: 'tool_call',
          name: toolCall?.function?.name || 'unknown_tool',
          args,
          provider: 'Groq Cloud (GPT-OSS 120B)',
        };
      }

      if (message?.content && message.content.trim().length > 0) {
        return {
          type: 'message',
          text: message.content.trim(),
          provider: 'Groq Cloud (GPT-OSS 120B)',
        };
      }
    } catch {
      // Continue to next fallback
    }
  }

  // 3. OpenRouter Provider
  if (process.env.OPENROUTER_API_KEY) {
    try {
      const openrouter = new OpenAI({
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: 'https://openrouter.ai/api/v1',
      });

      const response = await openrouter.chat.completions.create({
        model: 'liquid/lfm-2.5-2.6b:free',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
        max_tokens: 400,
      });

      const content = response.choices[0]?.message?.content;
      if (content && content.trim().length > 0) {
        // Guard against hallucinated raw tool tokens from small open models
        if (content.includes('<|tool_call') || content.includes('<tool_call') || content.includes('[read_file(') || content.includes('[tool_call(')) {
          return resolveIntentFallback(lastUserMessage, options?.uploadedFiles);
        }
        return {
          type: 'message',
          text: content.trim(),
          provider: 'OpenRouter',
        };
      }
    } catch {
      // Continue to next fallback
    }
  }

  // 4. Built-in intelligent rule-based intent resolver (Zero network failure guarantee)
  return resolveIntentFallback(lastUserMessage, options?.uploadedFiles);
}
