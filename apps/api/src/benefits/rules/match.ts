import type { BenefitMatch, BenefitRules } from '@repo/shared-types';
import { todayInArgentina } from '../../argentina-time';
import { evaluateAvailability } from './availability';
import { evaluateEligibility, type EligibilityProfile } from './eligibility';
import { estimateSaving } from './estimate';

export function evaluateBenefit(
  benefit: {
    id: string;
    rules: BenefitRules;
    lifecycle: string;
    lastVerifiedAt: Date | null;
    excludeAfterMs?: number;
  },
  profile: EligibilityProfile,
  ctx: { now: Date; purchase?: { amountMinor: number } },
): BenefitMatch {
  const today = todayInArgentina(ctx.now).today;
  const eligibility = evaluateEligibility(
    benefit.rules.eligibility,
    profile,
    today,
  );
  const availability = evaluateAvailability(benefit.rules, {
    lifecycle: benefit.lifecycle,
    lastVerifiedAt: benefit.lastVerifiedAt,
    excludeAfterMs: benefit.excludeAfterMs,
    today,
    now: ctx.now,
  });
  const incomplete = benefit.rules.eligibilityCompleteness === 'incomplete';
  const estimate = ctx.purchase
    ? estimateSaving(benefit.rules, ctx.purchase)
    : { estimatedSavingMinor: null, assumptions: [] };
  return {
    benefitId: benefit.id,
    eligibility:
      eligibility.result === 'no'
        ? 'ineligible'
        : eligibility.result === 'unknown' || incomplete
          ? 'needs_information'
          : 'eligible',
    availability: availability.availability,
    nextDate: availability.nextDate,
    stale: availability.stale,
    channels: benefit.rules.channels,
    matchedInstrumentSlugs: eligibility.matchedInstrumentSlugs,
    missingFacts: eligibility.missingFacts,
    reasons: [
      ...eligibility.reasons,
      ...availability.reasons,
      ...(incomplete
        ? ['Requisitos de la fuente incompletos', ...benefit.rules.unresolved]
        : []),
    ],
    requiredActions: benefit.rules.requiredActions,
    estimatedSavingMinor: estimate.estimatedSavingMinor,
    estimateAssumptions: estimate.assumptions,
  };
}

export function rankMatches(matches: BenefitMatch[]): BenefitMatch[] {
  const groups = [
    matches.filter(
      (m) => m.eligibility === 'eligible' && m.availability === 'available',
    ),
    matches.filter(
      (m) => m.eligibility === 'eligible' && m.availability === 'upcoming',
    ),
    matches.filter(
      (m) =>
        m.eligibility === 'needs_information' &&
        m.availability !== 'unavailable',
    ),
  ];
  return groups.flatMap((group) =>
    group.every((m) => m.estimatedSavingMinor !== null)
      ? group.sort((a, b) => b.estimatedSavingMinor! - a.estimatedSavingMinor!)
      : group,
  );
}
