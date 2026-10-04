import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  Download,
  Eye,
  ArrowRight,
  Sparkles,
  Layers,
  FileCheck
} from 'lucide-react';
import { ProcessedFileInfo, WorkflowStepItem } from '../types.js';

interface ToolExecutionCardProps {
  toolId?: string;
  toolName?: string;
  status?: 'queued' | 'running' | 'done' | 'failed';
  durationMs?: number;
  workflowSteps?: WorkflowStepItem[];
  workflowPlan?: {
    steps: WorkflowStepItem[];
    approved?: boolean;
  };
  files?: ProcessedFileInfo[];
  onApproveWorkflow?: (steps: WorkflowStepItem[]) => void;
  onPreviewFile?: (file: ProcessedFileInfo) => void;
  onSelectPrompt?: (prompt: string) => void;
  nextStepSuggestions?: string[];
}

export const ToolExecutionCard: React.FC<ToolExecutionCardProps> = ({
  toolId,
  toolName,
  status = 'done',
  durationMs,
  workflowSteps,
  workflowPlan,
  files = [],
  onApproveWorkflow,
  onPreviewFile,
  onSelectPrompt,
  nextStepSuggestions = [],
}) => {
  const [isApproving, setIsApproving] = useState(false);

  // Status badge styling
  const renderStatusBadge = (s: string = 'done') => {
    switch (s) {
      case 'done':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Done</span>
          </span>
        );
      case 'running':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 dark:text-sky-300">
            <Loader2 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 animate-spin" />
            <span>Running</span>
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span>Failed</span>
          </span>
        );
      case 'queued':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-500 dark:text-stone-400">
            <Clock className="w-3.5 h-3.5 text-stone-400" />
            <span>Queued</span>
          </span>
        );
    }
  };

  // 1. Workflow Approval Confirmation Card
  if (workflowPlan && !workflowPlan.approved) {
    return (
      <div className="mt-3 bg-white dark:bg-stone-900 border border-emerald-300 dark:border-emerald-800 rounded-xl p-4 shadow-xs">
        <div className="flex items-center gap-2 mb-2.5">
          <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <h4 className="text-xs font-bold text-stone-900 dark:text-white uppercase tracking-wider">
            Multi-Step Workflow Plan
          </h4>
          <span className="text-[11px] text-stone-400 dark:text-stone-500">·</span>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            {workflowPlan.steps.length} Steps
          </span>
        </div>

        <p className="text-xs text-stone-600 dark:text-stone-300 mb-3 leading-relaxed">
          Khan G AI has structured your workflow into verified backend steps. Click approve to run end-to-end:
        </p>

        <div className="space-y-1.5 mb-4">
          {workflowPlan.steps.map((step, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-stone-50 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-700/60"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <span className="font-medium text-stone-800 dark:text-stone-200 truncate">
                  {step.title || step.toolId}
                </span>
              </div>
              <span className="text-[10px] font-mono text-stone-400 shrink-0 ml-2">
                Pending Approval
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 pt-1 border-t border-stone-100 dark:border-stone-800">
          <button
            type="button"
            disabled={isApproving}
            onClick={() => {
              setIsApproving(true);
              if (onApproveWorkflow) onApproveWorkflow(workflowPlan.steps);
            }}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            {isApproving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Starting Workflow...</span>
              </>
            ) : (
              <>
                <FileCheck className="w-3.5 h-3.5" />
                <span>Approve &amp; Execute Workflow</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // 2. Chained Multi-Step Execution Card
  if (workflowSteps && workflowSteps.length > 0) {
    const isAllDone = workflowSteps.every((s) => s.status === 'done');
    const isAnyFailed = workflowSteps.some((s) => s.status === 'failed');

    return (
      <div className="mt-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3 border-b border-stone-100 dark:border-stone-800 pb-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-bold text-stone-900 dark:text-white">
              Workflow Execution Pipeline
            </span>
          </div>
          <div>
            {isAnyFailed
              ? renderStatusBadge('failed')
              : isAllDone
              ? renderStatusBadge('done')
              : renderStatusBadge('running')}
          </div>
        </div>

        <div className="space-y-2 mb-3">
          {workflowSteps.map((step, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-stone-50 dark:bg-stone-800/60 border border-stone-100 dark:border-stone-800"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-stone-400 text-[10px] font-mono">#{idx + 1}</span>
                <span className="font-medium text-stone-800 dark:text-stone-200 truncate">
                  {step.name || step.toolId}
                </span>
                {step.durationMs ? (
                  <span className="text-[10px] text-stone-400 font-mono">
                    · {step.durationMs}ms
                  </span>
                ) : null}
              </div>
              <div className="shrink-0 ml-2">
                {renderStatusBadge(step.status || 'queued')}
              </div>
            </div>
          ))}
        </div>

        {/* Download Actions when finalized */}
        {files.length > 0 && isAllDone && (
          <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
            <div className="text-[11px] font-semibold text-stone-500 mb-1.5">
              Final Artifact Ready:
            </div>
            <div className="flex flex-wrap gap-2">
              {files.map((file) => (
                <div key={file.id} className="flex items-center gap-1.5">
                  <a
                    href={file.downloadUrl}
                    download={file.processedName}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download {file.processedName}</span>
                  </a>
                  {onPreviewFile && (
                    <button
                      type="button"
                      onClick={() => onPreviewFile(file)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-medium transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 3. Single Tool Execution Card
  return (
    <div className="mt-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-3.5 shadow-xs">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-xs font-bold text-stone-900 dark:text-white truncate">
            {toolName || toolId || 'Tool Execution'}
          </span>
          {durationMs ? (
            <span className="text-[11px] text-stone-400 font-mono shrink-0">
              · {durationMs}ms
            </span>
          ) : null}
        </div>
        <div className="shrink-0">{renderStatusBadge(status)}</div>
      </div>

      {/* Download file actions if present */}
      {files.length > 0 && status === 'done' && (
        <div className="mt-2.5 pt-2 border-t border-stone-100 dark:border-stone-800 flex flex-wrap gap-2 items-center">
          {files.map((file) => (
            <div key={file.id} className="flex items-center gap-1.5">
              <a
                href={file.downloadUrl}
                download={file.processedName}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download ({Math.round(file.size / 1024)} KB)</span>
              </a>
              {onPreviewFile && (
                <button
                  type="button"
                  onClick={() => onPreviewFile(file)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-medium transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Relevant next step suggestions */}
      {nextStepSuggestions && nextStepSuggestions.length > 0 && status === 'done' && onSelectPrompt && (
        <div className="mt-2.5 pt-2 border-t border-stone-100 dark:border-stone-800">
          <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider block mb-1.5">
            Suggested Next Step:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {nextStepSuggestions.map((sug, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onSelectPrompt(`Use ${sug} on this file`)}
                className="inline-flex items-center gap-1 text-[11px] py-1 px-2 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950 dark:hover:text-emerald-300 transition-colors"
              >
                <span>{sug}</span>
                <ArrowRight className="w-2.5 h-2.5 opacity-60" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
