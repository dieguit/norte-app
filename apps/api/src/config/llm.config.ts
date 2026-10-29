import type { ProcessInputStepResult } from '@mastra/core/processors';

const providers = {
  omniroute: { apiKey: 'LLM_API_KEY', url: 'LLM_BASE_URL' },
  openai: { apiKey: 'OPENAI_API_KEY' },
  groq: { apiKey: 'GROQ_API_KEY' },
} as const;

const models = {
  'agy-flash-low': { provider: 'omniroute', id: 'agy/gemini-3.8-flash-low' },
  'agy-flash-medium': {
    provider: 'omniroute',
    id: 'agy/gemini-3.8-flash-medium',
  },
  'agy-flash-high': { provider: 'omniroute', id: 'agy/gemini-3.8-flash-high' },
  'agy-flash': { provider: 'omniroute', id: 'agy/gemini-3-flash' },
  'agy-flash-lite': { provider: 'omniroute', id: 'agy/gemini-3.5-flash-lite' },
  'gemini-flash-3.6': { provider: 'omniroute', id: 'gemini/gemini-3.6-flash' },
  'gemini-flash-3.5': { provider: 'omniroute', id: 'gemini/gemini-3.5-flash' },
  'gemini-flash-lite': {
    provider: 'omniroute',
    id: 'gemini/gemini-3.1-flash-lite',
  },
  'cx-gpt-6.1-terra': { provider: 'omniroute', id: 'cx/gpt-6.1-terra' },
  'cx-gpt-6-luna': { provider: 'omniroute', id: 'cx/gpt-6-luna' },
  'omniroute-gpt-6.1-terra': {
    provider: 'omniroute',
    id: 'openai/gpt-6.1-terra',
  },
  'omniroute-gpt-6-luna': { provider: 'omniroute', id: 'openai/gpt-6-luna' },
  'openai-gpt-6.1-terra': { provider: 'openai', id: 'gpt-6.1-terra' },
  'openai-gpt-6-luna': { provider: 'openai', id: 'gpt-6-luna' },
  'groq-gpt-oss-safeguard-20b': {
    provider: 'groq',
    id: 'openai/gpt-oss-safeguard-20b',
  },
} as const satisfies Record<
  string,
  { provider: keyof typeof providers; id: string }
>;

export type ModelAlias = keyof typeof models;
export type ReasoningEffort = 'none' | 'minimal' | 'low' | 'medium' | 'high';
export type ModelRef = { model: string; effort?: ReasoningEffort };
type ConfigRef = { model: ModelAlias; effort?: ReasoningEffort };
export type DomainModels = Partial<
  Record<'goals' | 'finances' | 'notifications' | 'advice', ModelRef>
>;

export const roles = {
  main: { model: 'agy-flash-low', effort: 'low' },
  // Guard checks are classifications; thinking adds blocking latency per message.
  guard: { model: 'agy-flash-lite', effort: 'none' },
  domains: {},
  judge: { model: 'agy-flash' },
} as const satisfies {
  main: ConfigRef;
  guard: ConfigRef;
  domains?: Partial<Record<keyof DomainModels, ConfigRef>>;
  judge: ConfigRef;
};

export type LlmEnv = {
  LLM_BASE_URL?: string;
  LLM_API_KEY?: string;
  OPENAI_API_KEY?: string;
  GROQ_API_KEY?: string;
  LLM_MODEL?: string;
  LLM_GUARD_MODEL?: string;
};
export type ProviderOptions = Record<string, { reasoningEffort: string }>;
export type ResolvedModel = {
  model: NonNullable<ProcessInputStepResult['model']>;
  providerOptions?: ProviderOptions;
};

export function modelAlias(value: string): ModelAlias {
  if (Object.hasOwn(models, value)) return value as ModelAlias;
  const matches = (Object.keys(models) as ModelAlias[]).filter(
    (alias) => models[alias].id === value,
  );
  if (matches.length === 1) return matches[0];
  throw new Error(
    `Unknown or ambiguous LLM model "${value}"; select an alias from config/llm.config.ts`,
  );
}

export function resolveModel(ref: ModelRef, env: LlmEnv): ResolvedModel {
  const { provider, id } = models[modelAlias(ref.model)];
  const key = providers[provider].apiKey;
  const apiKey = env[key];
  if (!apiKey)
    throw new Error(`${key} is required for LLM model "${ref.model}"`);
  if (provider === 'omniroute' && !env.LLM_BASE_URL)
    throw new Error('LLM_BASE_URL is required for omniroute');
  return {
    // OmniRoute IDs contain slashes and must reach the upstream unchanged.
    model:
      provider === 'omniroute'
        ? { providerId: provider, modelId: id, url: env.LLM_BASE_URL!, apiKey }
        : { id: `${provider}/${id}` as const, apiKey },
    ...(ref.effort
      ? { providerOptions: { [provider]: { reasoningEffort: ref.effort } } }
      : {}),
  };
}
