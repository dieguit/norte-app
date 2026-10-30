import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { BenefitProfileFactsSchema } from '@repo/shared-types';
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
        toolResult(
          'get-today-benefits',
          context?.requestContext as never,
          async () => {
            const matches = await benefits.findMatching(
              requireUserId(context?.requestContext as never),
            );
            const compact = ({
              benefit,
              match,
              instrumentLabels,
            }: (typeof matches)[number]) => ({
              id: benefit.id,
              title: benefit.title,
              merchant: benefit.merchant,
              offer: benefit.rules.offer,
              minimumSpendMinor: benefit.rules.minimumSpendMinor,
              capState: benefit.rules.capState,
              caps: benefit.rules.caps,
              validity: benefit.rules.validity,
              instrumentLabels,
              ...match,
              questions: match.missingFacts.map(
                (fact) => `¿Podés confirmar ${fact}?`,
              ),
              sourceUrl: benefit.sourceUrl,
              termsUrl: benefit.termsUrl,
            });
            return {
              eligible: matches
                .filter((m) => m.match.eligibility === 'eligible')
                .map(compact),
              needs_information: matches
                .filter((m) => m.match.eligibility === 'needs_information')
                .map(compact),
            };
          },
        ),
    }),
    updateBenefitProfile: createTool({
      id: 'update-benefit-profile',
      description:
        'Update declared cards, memberships and eligibility facts. Does not activate the digest. Only save facts explicitly confirmed by the user.',
      inputSchema: z.object({
        addInstrumentSlugs: z.array(z.string()).max(100).optional(),
        removeInstrumentSlugs: z.array(z.string()).max(100).optional(),
        instrumentFacts: BenefitProfileFactsSchema.shape.instrumentFacts
          .removeDefault()
          .optional(),
        providerFacts: BenefitProfileFactsSchema.shape.providerFacts
          .removeDefault()
          .optional(),
      }),
      execute: (input, context) =>
        toolResult(
          'update-benefit-profile',
          context?.requestContext as never,
          () =>
            benefits.updateProfile(
              requireUserId(context?.requestContext as never),
              input,
            ),
        ),
    }),
    getBenefitCatalog: createTool({
      id: 'get-benefit-catalog',
      description:
        'Get known provider and instrument labels and slugs before mapping a user declaration to their benefit profile.',
      inputSchema: z.object({}),
      execute: (_input, context) =>
        toolResult(
          'get-benefit-catalog',
          context?.requestContext as never,
          () => {
            requireUserId(context?.requestContext as never);
            return benefits.catalog();
          },
        ),
    }),
  };
}
