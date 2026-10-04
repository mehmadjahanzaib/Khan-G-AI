export type ToolCategory =
  | 'PDF'
  | 'Images'
  | 'OCR'
  | 'Print & Photocopy Tools'
  | 'Business'
  | 'Productivity Tools'
  | 'AI'
  | 'Security Tools'
  | 'Document'
  | 'Utility Tools';

export interface FileRecord {
  id: string;
  originalName: string;
  processedName: string;
  filePath: string;
  storagePath?: string;
  mimeType: string;
  size: number;
  originalSize?: number;
  operation?: string;
  savingsPercent?: number;
  createdAt: number;
  expiresAt: number;
  previewText?: string;
  isImage?: boolean;
  userId?: string;
}

export interface ToolCallResult {
  name: string;
  args: Record<string, any>;
}

export interface AIProviderResult {
  type: 'tool_call' | 'workflow_plan' | 'message';
  name?: string;
  args?: Record<string, any>;
  workflowSteps?: Array<{ toolId: string; args: Record<string, any>; title?: string }>;
  text?: string;
  provider: string;
  isClarification?: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}
