import { callAI } from '../lib/aiProvider.js';
import { ToolRegistry } from '../tools/registry.js';

export interface WhatsAppIncomingMessage {
  from: string;
  message: string;
  name?: string;
  messageId?: string;
  timestamp?: number;
}

/**
 * Validates whether the incoming request contains the authorized WhatsApp API key.
 */
export function verifyWhatsAppAuth(
  providedKey: string | undefined,
  configuredKey = process.env.WHATSAPP_API_KEY
): boolean {
  if (!configuredKey) {
    // If not configured in environment, allow testing or require key if present
    return true;
  }
  if (!providedKey) return false;

  // Clean strings
  const cleanProvided = providedKey.replace(/^Bearer\s+/i, '').trim();
  const cleanConfigured = configuredKey.trim();

  return cleanProvided === cleanConfigured;
}

/**
 * Processes an incoming WhatsApp user message through Khan G AI.
 * Routes the query to Khan G AI's intelligent reasoning engine and tools,
 * returning a crisp, WhatsApp-friendly formatted response.
 */
export async function processWhatsAppMessage(
  incoming: WhatsAppIncomingMessage
): Promise<{
  success: boolean;
  reply: string;
  from: string;
  providerUsed?: string;
}> {
  const { from, message, name } = incoming;
  const userText = (message || '').trim();

  if (!userText) {
    return {
      success: true,
      reply: 'Salam! Main Khan G AI hoon. Main aapki kis tarah madad kar sakta hoon? (Documents, calculations, summaries, tools, ya sawalat poochhein).',
      from,
    };
  }

  try {
    // Initialize ToolRegistry if needed
    ToolRegistry.initialize();

    // System instruction tuned for WhatsApp: concise, formatted, mobile-friendly
    const systemPrompt = `You are Khan G AI operating as the WhatsApp Intelligent Agent.
The user is messaging from WhatsApp (${name || from}).
Respond concisely, clearly, and politely. Use WhatsApp formatting (*bold*, _italic_, bullet points).
You have access to 100+ Khan G Tools including PDF processing, document conversion, calculators, business tools (invoices/quotations), image editing, and text utilities.
If the user asks for a calculation or quick tool (tax, age, date, percentage, unit conversion, text conversion), provide the answer directly and accurately.
Greet appropriately in Urdu or English according to the user's language.`;

    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userText },
    ];

    const aiResponse = await callAI(messages);

    let replyText = (aiResponse.text || '').trim();

    if (!replyText) {
      replyText = 'Main ne aap ka message process kar liya hai. Agar aapko kisi makhsoos tool ya document conversion ki zaroorat hai to baraye meherbani batayein.';
    }

    return {
      success: true,
      reply: replyText,
      from,
      providerUsed: aiResponse.provider,
    };
  } catch (err: any) {
    console.error('[WhatsApp Agent Error]:', err?.message || err);
    return {
      success: false,
      reply: 'Maazrat! Request process karte waqt aik issue pesh aya. Baraye meherbani thori der baad dobara koshish karein.',
      from,
    };
  }
}
