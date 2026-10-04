import { ToolRegistry, RegisteredTool } from '../tools/registry.js';
import { saveProcessedFile, fileStore } from './fileProcessor.js';
import { checkLimit, recordUsage } from './usageService.js';

export interface WorkflowStep {
  toolId: string;
  args: Record<string, any>;
  title?: string;
}

export interface WorkflowStepResult {
  stepIndex: number;
  toolId: string;
  name: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  durationMs: number;
  message?: string;
  outputName?: string;
  error?: string;
}

export interface WorkflowExecutionResult {
  success: boolean;
  message: string;
  steps: WorkflowStepResult[];
  finalFile?: any;
  files: any[];
  totalDurationMs: number;
}

/**
 * Multi-Tool Hybrid Autonomous Workflow Runner
 * Executes real chained operations with buffer piping between steps.
 * Validates quotas per step and stops truthfully on error.
 */
export async function executeWorkflow(
  workflowSteps: WorkflowStep[],
  initialFiles: Express.Multer.File[],
  userId: string,
  isPro: boolean,
  tier: 'free' | 'pro_student' | 'pro_business'
): Promise<WorkflowExecutionResult> {
  const startTime = Date.now();
  const stepResults: WorkflowStepResult[] = workflowSteps.map((step, idx) => {
    const def = ToolRegistry.getTool(step.toolId);
    return {
      stepIndex: idx,
      toolId: step.toolId,
      name: def ? def.name : step.toolId,
      status: 'queued',
      durationMs: 0,
    };
  });

  let currentFiles: Express.Multer.File[] = [...initialFiles];
  let lastProcessedFileRecord: any = null;
  const createdFiles: any[] = [];

  for (let i = 0; i < workflowSteps.length; i++) {
    const step = workflowSteps[i];
    const stepRes = stepResults[i];
    const stepStart = Date.now();
    stepRes.status = 'running';

    // 1. Quota check per tool step
    const limit = checkLimit(userId, 'file_operation', isPro, tier);
    if (!limit.allowed) {
      stepRes.status = 'failed';
      stepRes.durationMs = Date.now() - stepStart;
      stepRes.error = `Daily file operation limit reached (${limit.limit}/day). Upgrade to Pro for higher limits.`;
      return {
        success: false,
        message: `Workflow halted at step ${i + 1} (${stepRes.name}): Quota exceeded.`,
        steps: stepResults,
        files: createdFiles,
        totalDurationMs: Date.now() - startTime,
      };
    }

    // 2. Fetch tool definition
    const tool = ToolRegistry.getTool(step.toolId);
    if (!tool || !tool.isAiCallable || !tool.handler) {
      stepRes.status = 'failed';
      stepRes.durationMs = Date.now() - stepStart;
      stepRes.error = tool?.unavailableReason || `Tool "${step.toolId}" is not currently available for AI execution.`;
      return {
        success: false,
        message: `Workflow halted at step ${i + 1} (${stepRes.name}): ${stepRes.error}`,
        steps: stepResults,
        files: createdFiles,
        totalDurationMs: Date.now() - startTime,
      };
    }

    // 3. Execute tool handler
    try {
      const result = await tool.handler(step.args || {}, currentFiles);
      stepRes.durationMs = Date.now() - stepStart;

      if (!result.success) {
        stepRes.status = 'failed';
        stepRes.error = result.message || 'Operation failed.';
        return {
          success: false,
          message: `Workflow failed at step ${i + 1} (${tool.name}): ${result.message}`,
          steps: stepResults,
          files: createdFiles,
          totalDurationMs: Date.now() - startTime,
        };
      }

      stepRes.status = 'done';
      stepRes.message = result.message;
      recordUsage(userId, 'file_operation');

      // 4. Pipe output buffer to next step if applicable
      if (result.outputBuffer) {
        const outName = result.outputName || `step_${i + 1}_${step.toolId}.${result.outputMimeType?.includes('png') ? 'png' : 'pdf'}`;
        const record = saveProcessedFile(
          result.outputBuffer,
          currentFiles[0]?.originalname || 'source_file',
          outName,
          result.outputMimeType || 'application/octet-stream',
          `${tool.name} (Step ${i + 1})`,
          true
        );
        createdFiles.push(record);
        lastProcessedFileRecord = record;

        // Pipe to next step
        currentFiles = [
          {
            fieldname: 'files',
            originalname: outName,
            encoding: '7bit',
            mimetype: result.outputMimeType || 'application/octet-stream',
            size: result.outputBuffer.length,
            buffer: result.outputBuffer,
            destination: '',
            filename: outName,
            path: '',
          } as Express.Multer.File,
        ];
      } else if (result.files && result.files.length > 0) {
        lastProcessedFileRecord = result.files[0];
        createdFiles.push(...result.files);

        // Fetch buffer from store for piping
        const stored = fileStore.get(lastProcessedFileRecord.id);
        if (stored && stored.storagePath) {
          try {
            const fs = await import('fs');
            const buf = fs.readFileSync(stored.storagePath);
            currentFiles = [
              {
                fieldname: 'files',
                originalname: lastProcessedFileRecord.processedName,
                encoding: '7bit',
                mimetype: lastProcessedFileRecord.mimeType,
                size: buf.length,
                buffer: buf,
                destination: '',
                filename: lastProcessedFileRecord.processedName,
                path: stored.storagePath,
              } as Express.Multer.File,
            ];
          } catch {}
        }
      }
    } catch (err: any) {
      stepRes.status = 'failed';
      stepRes.durationMs = Date.now() - stepStart;
      stepRes.error = err?.message || 'Unexpected execution error';
      return {
        success: false,
        message: `Workflow halted at step ${i + 1} (${tool.name}): ${stepRes.error}`,
        steps: stepResults,
        files: createdFiles,
        totalDurationMs: Date.now() - startTime,
      };
    }
  }

  return {
    success: true,
    message: `Successfully completed all ${workflowSteps.length} workflow steps.`,
    steps: stepResults,
    finalFile: lastProcessedFileRecord,
    files: createdFiles,
    totalDurationMs: Date.now() - startTime,
  };
}
