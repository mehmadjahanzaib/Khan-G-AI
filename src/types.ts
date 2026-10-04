export interface ProcessedFileInfo {
  id: string;
  originalName: string;
  processedName: string;
  mimeType: string;
  size: number;
  originalSize?: number;
  operation?: string;
  savingsPercent?: number;
  downloadUrl: string;
  expiresAt: number; // timestamp
  previewText?: string;
  isImage?: boolean;
}

export interface WorkflowStepItem {
  toolId: string;
  name?: string;
  args: Record<string, any>;
  title?: string;
  status?: 'queued' | 'running' | 'done' | 'failed';
  durationMs?: number;
  error?: string;
  message?: string;
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
  toolExecution?: {
    toolId: string;
    name: string;
    status: 'queued' | 'running' | 'done' | 'failed';
    durationMs?: number;
  };
  workflowPlan?: {
    steps: WorkflowStepItem[];
    approved?: boolean;
  };
  workflowExecution?: {
    steps: WorkflowStepItem[];
    totalDurationMs?: number;
  };
  files?: ProcessedFileInfo[];
  uploadedFiles?: {
    name: string;
    size: number;
    type: string;
  }[];
  isClarification?: boolean;
  nextStepSuggestions?: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  category?: string;
  isAiCallable?: boolean;
  status?: string;
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
  type: 'tool_call' | 'workflow_plan' | 'message';
  name?: string;
  args?: Record<string, any>;
  workflowPlan?: {
    steps: WorkflowStepItem[];
  };
  workflowExecution?: {
    steps: WorkflowStepItem[];
    totalDurationMs?: number;
  };
  text?: string;
  message?: string;
  files?: ProcessedFileInfo[];
  providerUsed?: string;
  nextStepSuggestions?: string[];
  isClarification?: boolean;
}
