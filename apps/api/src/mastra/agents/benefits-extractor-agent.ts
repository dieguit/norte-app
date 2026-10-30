import { Agent } from '@mastra/core/agent';
import { resolveModel, roles, type LlmEnv } from '../../config/llm.config';
import { ExtractionOutputSchema, type Extract } from '../../benefits/harvest';

export function createBenefitsExtractorAgent(env: LlmEnv): Agent {
  return new Agent({
    id: 'benefits-extractor',
    name: 'Benefits extractor',
    instructions:
      'Extraés beneficios y promociones de bancos, tarjetas y billeteras de Argentina a datos estructurados. Nunca inventes datos que no estén en el contenido.',
    model: resolveModel(
      { ...roles.main, ...(env.LLM_MODEL ? { model: env.LLM_MODEL } : {}) },
      env,
    ).model,
  });
}

export const extractWith =
  (agent: Pick<Agent, 'generate'>): Extract =>
  async (prompt) =>
    (
      await agent.generate(prompt, {
        structuredOutput: { schema: ExtractionOutputSchema },
      })
    ).object;
