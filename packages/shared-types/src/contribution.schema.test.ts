import { describe, expect, it } from 'vitest';
import {
  ConfirmSavingContributionWireSchema,
  SavingContributionConfirmationSchema,
  SavingContributionContextStateSchema,
  SavingContributionDraftWireSchema,
  UpdateSavingContributionWireSchema,
} from './index';

const placeId = '4b3d1c1e-1111-4111-8111-111111111111';
const token = 'a'.repeat(64);

describe('saving contribution wire schemas', () => {
  it('requires a place for saving drafts and allows investment drafts without one', () => {
    expect(SavingContributionDraftWireSchema.safeParse({ currency: 'ARS', amount: '100.00' }).success).toBe(false);
    expect(SavingContributionDraftWireSchema.parse({ kind: 'investment', currency: 'USD', amount: '100.00' })).toMatchObject({ kind: 'investment' });
  });

  it('defaults the draft kind to saving and rejects unknown keys', () => {
    expect(SavingContributionDraftWireSchema.parse({ currency: 'ARS', amount: '100.00', place: { kind: 'existing', placeId } }))
      .toMatchObject({ kind: 'saving' });
    expect(SavingContributionDraftWireSchema.safeParse({ currency: 'ARS', amount: '100.00', place: { kind: 'existing', placeId }, extra: true }).success).toBe(false);
  });

  it('keeps the first Spanish place message on the saving draft', () => {
    const result = SavingContributionDraftWireSchema.safeParse({ currency: 'ARS', amount: '100.00' });
    expect(result.success ? '' : result.error.issues[0].message).toBe('Elegí un lugar para tu ahorro.');
  });

  it('validates confirm tokens, catch-up months, and update bodies strictly', () => {
    const draft = { currency: 'ARS', amount: '100.00', place: { kind: 'existing', placeId } };
    expect(ConfirmSavingContributionWireSchema.safeParse({ draft, previewToken: 'bad' }).success).toBe(false);
    expect(ConfirmSavingContributionWireSchema.safeParse({ draft, previewToken: token, catchUpMonth: '2026-13' }).success).toBe(false);
    expect(ConfirmSavingContributionWireSchema.parse({ draft, previewToken: token, catchUpMonth: '2026-07' })).toMatchObject({ catchUpMonth: '2026-07' });
    expect(UpdateSavingContributionWireSchema.safeParse({ draft, previewToken: token }).success).toBe(false);
  });

  it('parses the context missing and confirmation unions', () => {
    expect(SavingContributionContextStateSchema.parse({ profile: 'missing' })).toEqual({ profile: 'missing' });
    expect(SavingContributionConfirmationSchema.parse({ status: 'created', contributionId: '5c1d1c1e-1111-4111-8111-111111111111' }))
      .toEqual({ status: 'created', contributionId: '5c1d1c1e-1111-4111-8111-111111111111' });
    expect(SavingContributionConfirmationSchema.safeParse({ status: 'invalid', message: 'x' }).success).toBe(false);
  });
});
