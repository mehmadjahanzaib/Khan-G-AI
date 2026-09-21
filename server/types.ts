export interface FileRecord {
  id: string;
  originalName: string;
  processedName: string;
  filePath: string;
  mimeType: string;
  size: number;
  createdAt: number;
  expiresAt: number;
  previewText?: string;
  isImage?: boolean;
}

export interface ToolCallResult {
  name: string;
  args: Record<string, any>;
}

export interface AIProviderResult {
  type: 'tool_call' | 'message';
  name?: string;
  args?: Record<string, any>;
  text?: string;
  provider: string;
  isClarification?: boolean;
}
