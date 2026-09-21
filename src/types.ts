export interface ProcessedFileInfo {
  id: string;
  originalName: string;
  processedName: string;
  mimeType: string;
  size: number;
  downloadUrl: string;
  expiresAt: number; // timestamp
  previewText?: string;
  isImage?: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot' | 'system';
  text: string;
  timestamp: number;
  toolCall?: {
    name: string;
    args: Record<string, any>;
  };
  files?: ProcessedFileInfo[];
  uploadedFiles?: {
    name: string;
    size: number;
    type: string;
  }[];
  isClarification?: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required?: string[];
  };
}

export interface AIResponse {
  type: 'tool_call' | 'message';
  name?: string;
  args?: Record<string, any>;
  text?: string;
  providerUsed?: string;
}
