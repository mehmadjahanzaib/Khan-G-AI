import React from 'react';
import { X, Key, Shield, ExternalLink, Cpu, CheckCircle } from 'lucide-react';

interface ProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProvider: string;
  serverStatus?: any;
  maxFileSizeMB?: number;
}

export const ProviderModal: React.FC<ProviderModalProps> = ({
  isOpen,
  onClose,
  activeProvider,
  serverStatus,
  maxFileSizeMB = 100,
}) => {
  if (!isOpen) return null;

  const providers = [
    {
      id: 'gemini',
      name: 'Google AI Studio (Gemini)',
      model: 'Gemini 2.5 / 3.8 Flash',
      link: 'https://aistudio.google.com/app/apikey',
      keyEnv: 'GEMINI_API_KEY',
      isConfigured: serverStatus?.geminiKeyConfigured ?? true,
      freeTier: 'Generous Free Tier (1M context window, fast tool calling)',
    },
    {
      id: 'groq',
      name: 'Groq Cloud',
      model: 'Llama 3.3 70B / 8B',
      link: 'https://console.groq.com/keys',
      keyEnv: 'GROQ_API_KEY',
      isConfigured: serverStatus?.groqKeyConfigured ?? false,
      freeTier: 'Free ultra-fast LPUs with 30 RPM',
    },
    {
      id: 'openrouter',
      name: 'OpenRouter',
      model: 'Llama-3.3-70b-instruct:free',
      link: 'https://openrouter.ai/keys',
      keyEnv: 'OPENROUTER_API_KEY',
      isConfigured: serverStatus?.openRouterKeyConfigured ?? false,
      freeTier: 'One key for multiple free models',
    },
    {
      id: 'mistral',
      name: 'Mistral AI',
      model: 'Mistral-small-latest',
      link: 'https://console.mistral.ai/api-keys/',
      keyEnv: 'MISTRAL_API_KEY',
      isConfigured: serverStatus?.mistralKeyConfigured ?? false,
      freeTier: 'Free tier with robust instruction following',
    },
    {
      id: 'deepseek',
      name: 'DeepSeek',
      model: 'DeepSeek-chat',
      link: 'https://platform.deepseek.com/api_keys',
      keyEnv: 'DEEPSEEK_API_KEY',
      isConfigured: serverStatus?.deepseekKeyConfigured ?? false,
      freeTier: 'Strong reasoning and structured tool calls',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-xl border border-stone-200 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-stone-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base">AI Providers & API Keys</h3>
              <p className="text-xs text-stone-500">
                Switch between free providers via the <code className="font-mono text-stone-700">AI_PROVIDER</code> environment variable
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-600">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-stone-900">Current Active Provider:</span>
              <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold border border-emerald-200 uppercase">
                {activeProvider || 'gemini'}
              </span>
            </div>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              All providers connect through <code className="font-mono">lib/aiProvider.ts</code> using OpenAI-compatible function calling schemas.
            </p>
          </div>

          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
              Supported Free API Providers
            </h4>

            {providers.map((p) => {
              const isActive = (activeProvider || 'gemini').toLowerCase() === p.id;
              return (
                <div
                  key={p.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isActive
                      ? 'bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-300'
                      : 'bg-white border-stone-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="text-xs font-bold text-stone-900">{p.name}</h5>
                        {isActive && (
                          <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-stone-500 font-mono mt-0.5">
                        Env key: {p.keyEnv} • Model: {p.model}
                      </div>
                      <p className="text-[11px] text-stone-600 mt-1">{p.freeTier}</p>
                    </div>

                    <a
                      href={p.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-200/60"
                    >
                      <span>Get Free Key</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Security & Limits overview */}
          <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 text-xs text-amber-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-amber-700" />
              <span>Protection & Limits</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Upload limit: {maxFileSizeMB}MB • Rate limit: 30 requests/hour • Storage: Temporary local disk with 1-hour guaranteed auto-cleanup.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 bg-stone-50 rounded-b-2xl flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-900 text-white font-medium text-xs hover:bg-stone-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
