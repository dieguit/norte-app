import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import {
  BenefitSearchQuerySchema,
  BenefitSearchResultSchema,
  BenefitResultSchema,
  UpdateBenefitProfileSchema,
} from '@repo/shared-types';
import type { NorteServices } from '../services';
import { toolResult } from './tool-result';
import { requireUserId } from './user-context';

export function createBenefitTools({
  benefits,
}: Pick<NorteServices, 'benefits'>) {
  return {
    searchBenefits: createTool({
      id: 'search-benefits',
      description:
        'Find catalog benefits compatible with the user’s bank/card profile, not guaranteed entitlement. Returns up to 10 ranked results, purchase requirements, verification links and total. Each variant has its own bank/cards, eligibility and purchase requirements: never describe alternate-bank offers using parent conditions. Never invent benefits.',
      inputSchema: BenefitSearchQuerySchema.pick({
        q: true,
        category: true,
        day: true,
      }),
      outputSchema: z.union([
        BenefitSearchResultSchema.pick({
          total: true,
          profileConfigured: true,
          staleBanks: true,
        }).extend({
          items: z.array(
            BenefitResultSchema.omit({
              source: true,
              categories: true,
              updatedAt: true,
            }),
          ),
        }),
        z.object({ error: z.string() }),
      ]),
      execute: (input, context) =>
        toolResult(
          'search-benefits',
          context?.requestContext as never,
          async () => {
            const result = await benefits.search(
              requireUserId(context?.requestContext as never),
              { ...input, page: 1, pageSize: 10 },
            );
            return {
              total: result.total,
              profileConfigured: result.profileConfigured,
              staleBanks: result.staleBanks,
              items: result.items.map(
                ({
                  id,
                  title,
                  brandName,
                  offers,
                  capState,
                  caps,
                  minimumSpendMinor,
                  purchaseConditions,
                  variants,
                  channels,
                  where,
                  nextDate,
                  validity,
                  usableWith,
                  requiresModo,
                  match,
                  tierLabels,
                  verifyUrl,
                  verifyHint,
                }) => ({
                  id,
                  title,
                  brandName,
                  offers,
                  capState,
                  caps,
                  minimumSpendMinor,
                  purchaseConditions,
                  variants,
                  channels,
                  where,
                  nextDate,
                  validity,
                  usableWith,
                  requiresModo,
                  match,
                  tierLabels,
                  verifyUrl,
                  verifyHint,
                }),
              ),
            };
          },
        ),
    }),
    updateBenefitProfile: createTool({
      id: 'update-benefit-profile',
      description:
        'Patch banks, tiers, cards, MODO use or digest categories explicitly confirmed by the user. Does not activate the digest. Get bank slugs and tier codes with getBenefitBanks first.',
      inputSchema: UpdateBenefitProfileSchema.partial(),
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
    getBenefitBanks: createTool({
      id: 'get-benefit-banks',
      description:
        'List available banks, honest catalog coverage, and bank-specific tier codes and labels.',
      inputSchema: z.object({}),
      execute: (_input, context) =>
        toolResult(
          'get-benefit-banks',
          context?.requestContext as never,
          () => {
            requireUserId(context?.requestContext as never);
            return benefits.banks();
          },
        ),
    }),
  };
}
