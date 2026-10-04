import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';

export interface AudioTranscriptionResult {
  success: boolean;
  transcript?: string;
  language?: string;
  durationSeconds?: number;
  error?: string;
}

/**
 * Transcribes an audio file buffer or disk path using Groq Whisper or Gemini Multimodal
 */
export async function transcribeAudio(
  fileBuffer: Buffer,
  filename: string,
  mimeType: string
): Promise<AudioTranscriptionResult> {
  // 1. Try Groq Whisper (Ultra-fast, high accuracy transcription)
  if (process.env.GROQ_API_KEY) {
    try {
      const groq = new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: 'https://api.groq.com/openai/v1',
      });

      // Write temp file for the OpenAI SDK file input
      const tempPath = path.join(process.cwd(), '.tmp_storage', `audio_${Date.now()}_${filename}`);
      fs.writeFileSync(tempPath, fileBuffer);

      try {
        const fileStream = fs.createReadStream(tempPath);
        const transcription = await groq.audio.transcriptions.create({
          file: fileStream,
          model: 'whisper-large-v3-turbo',
          response_format: 'verbose_json',
        });

        // Clean up temp file
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }

        if (transcription && transcription.text) {
          return {
            success: true,
            transcript: transcription.text.trim(),
            language: (transcription as any).language || 'en',
            durationSeconds: (transcription as any).duration || undefined,
          };
        }
      } catch (err: any) {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
        console.warn('Groq Whisper error, trying alternative:', err?.message || err);
      }
    } catch (e) {
      console.warn('Groq audio init error:', e);
    }
  }

  // 2. Try Gemini Multimodal Audio transcription
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY') {
    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const audioBase64 = fileBuffer.toString('base64');
      const audioPart = {
        inlineData: {
          mimeType: mimeType || 'audio/mp3',
          data: audioBase64,
        },
      };

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          audioPart,
          {
            text: 'Please transcribe the following audio verbatim. Provide the full text clearly without editorial commentary.',
          },
        ],
      });

      const text = response.text?.trim();
      if (text) {
        return {
          success: true,
          transcript: text,
        };
      }
    } catch (geminiErr: any) {
      console.warn('Gemini audio transcription error:', geminiErr?.message || geminiErr);
    }
  }

  return {
    success: false,
    error: 'Audio transcription is currently unavailable. To enable speech-to-text for uploaded audio files, please configure a free GROQ_API_KEY or GEMINI_API_KEY in your settings.',
  };
}
