export interface BenchConfig {
  name: string;
  model: string;
  effort?: string;
  guardModel?: string;
  guardEffort?: string;
  domainModels?: Partial<
    Record<'finances' | 'goals' | 'notifications' | 'advice', string>
  >;
}

const matrix: BenchConfig[] = [
  ...[
    'cx-gpt-6.1-terra',
    'cx-gpt-6-luna',
    'omniroute-gpt-6.1-terra',
    'omniroute-gpt-6-luna',
    'openai-gpt-6.1-terra',
    'openai-gpt-6-luna',
  ].map((model) => ({ name: model, model })),
  ...['low', 'medium', 'high'].map((effort) => ({
    name: `3.8-${effort}`,
    model: `agy-flash-${effort}`,
  })),
  { name: '3-flash', model: 'agy-flash' },
  ...['low', 'medium'].map((effort) => ({
    name: `3.6-${effort}`,
    model: 'gemini-flash-3.6',
    effort,
  })),
  { name: '3.5-flash', model: 'gemini-flash-3.5' },
  { name: '3.1-lite', model: 'gemini-flash-lite' },
  {
    name: 'mix-goals',
    model: 'agy-flash-low',
    domainModels: { goals: 'agy-flash-medium' },
  },
  {
    name: 'guard-low',
    model: 'agy-flash-low',
    guardModel: 'agy-flash-lite',
    guardEffort: 'low',
  },
];
export default matrix;
