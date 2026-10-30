import { describe, expect, it } from 'vitest';
import type { BenefitRules } from '@repo/shared-types';
import type { CandidateBenefit } from './benefits.types';
import { decideLifecycle, mergeProtectedFields } from './store';

describe('benefit store decisions', () => {
  it('publishes only complete rules under enabled auto-publication', () => {
    for (const autoPublish of [false, true]) {
      for (const eligibilityCompleteness of [
        'complete',
        'incomplete',
      ] as const) {
        expect(
          decideLifecycle(autoPublish, {
            eligibilityCompleteness,
          } as BenefitRules),
        ).toBe(
          autoPublish && eligibilityCompleteness === 'complete'
            ? 'published'
            : 'needs_review',
        );
      }
    }
  });

  it('preserves protected fields and reports conflicts without mutating inputs', () => {
    const candidate = {
      category: 'supermercado',
      snapshot: {
        title: 'new',
        merchant: 'new merchant',
        rules: { eligibilityCompleteness: 'complete' },
      },
    } as CandidateBenefit;
    const stored = {
      category: 'combustible' as const,
      snapshot: { ...candidate.snapshot, title: 'old' },
      protectedFields: ['title', 'category'],
    };
    const merged = mergeProtectedFields(stored, candidate);
    expect(merged.conflicts).toEqual(['title', 'category']);
    expect(merged.snapshot.title).toBe('old');
    expect(merged.snapshot.merchant).toBe('new merchant');
    expect(merged.category).toBe('combustible');
    expect(candidate.snapshot.title).toBe('new');
    expect(
      mergeProtectedFields({ ...stored, protectedFields: [] }, candidate)
        .conflicts,
    ).toEqual([]);
  });
});
