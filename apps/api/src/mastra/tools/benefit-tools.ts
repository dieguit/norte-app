import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import type { NorteServices } from '../services';
import { toolResult } from './tool-result';
import { requireUserId } from './user-context';

export function createBenefitTools({
  benefits,
}: Pick<NorteServices, 'benefits'>) {
  return {
    getTodayBenefits: createTool({
      id: 'get-today-benefits',
      description:
        "Today's (Argentina) benefits/discounts matching the user's cards, wallets, memberships and chosen categories, with conditions and sourceUrl. Use for follow-ups to the daily savings digest.",
      inputSchema: z.object({}),
      execute: (_input, context) =>
        toolResult('get-today-benefits', context?.requestContext as never, () =>
          benefits.findMatching(
            requireUserId(context?.requestContext as never),
          ),
        ),
    }),
  };
}
