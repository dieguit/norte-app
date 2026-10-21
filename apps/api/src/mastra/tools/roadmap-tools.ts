import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import type { NorteServices } from '../services';
import { toolResult } from './tool-result';
import { requireUserId } from './user-context';

export function createRoadmapTools(
  { home }: Pick<NorteServices, 'home'>,
  webAppUrl?: string,
) {
  return {
    getRoadmap: createTool({
      id: 'get-roadmap',
      description:
        'The user\'s financial roadmap: timeline of months, upcoming milestones, goal completion projections and goals ready to complete. Use for "¿voy bien?", "¿cuándo llego?", or roadmap questions.',
      inputSchema: z.object({}),
      execute: (_input, context) =>
        toolResult(async () => {
          const result = await home.getHome(
            requireUserId(context?.requestContext),
          );
          if ('profile' in result)
            return {
              ...result,
              appUrl: webAppUrl && `${webAppUrl}/onboarding`,
            };
          return { ...result, appUrl: webAppUrl && `${webAppUrl}/app` };
        }),
    }),
  };
}
