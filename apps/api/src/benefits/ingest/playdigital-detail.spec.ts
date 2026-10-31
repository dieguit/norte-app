import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  mapPlaydigitalDetail,
  playdigitalAudiences,
} from './playdigital-detail';

const bank = {
  slug: 'macro',
  name: 'Macro',
  playdigitalId: '6a089c91-a7d3-4199-a578-2132a3733f69',
};
function fixture() {
  return JSON.parse(
    readFileSync(
      resolve('test/fixtures/benefits-v3/playdigital/v2-selecta.json'),
      'utf8',
    ),
  );
}
const map = (d: unknown) => mapPlaydigitalDetail(d, bank);

describe('PlayDigital JSON detail', () => {
  it('maps audience, locations, money and caps', () => {
    const terms = map(fixture());
    expect(terms.eligibility).toEqual(
      expect.objectContaining({
        allOf: expect.arrayContaining([
          {
            providerFact: {
              providerSlug: 'macro',
              key: 'tier',
              values: ['selecta-2'],
            },
          },
          { membership: { instrumentSlug: 'modo' } },
        ]),
      }),
    );
    expect(terms.purchaseConditions).toContainEqual(
      expect.objectContaining({ kind: 'participating_locations' }),
    );
    expect(terms.eligibilityCompleteness).toBe('complete');
    expect(terms.offers).toContainEqual({
      kind: 'percent',
      percentageBps: 3000,
      mode: 'cashback',
    });
    expect(terms.caps).toContainEqual({
      amountMinor: 6000000,
      period: 'month',
      scope: 'person',
    });
  });
  it('uses broadest tier with no audience or unknown audience', () => {
    const d = fixture();
    delete d.offers[0].segmentations.audiences;
    expect(JSON.stringify(map(d).eligibility)).not.toContain('providerFact');
    d.offers[0].segmentations.audiences = ['spx-santander'];
    expect(JSON.stringify(map(d).eligibility)).not.toContain('providerFact');
    expect(playdigitalAudiences(d, bank).unknown).toEqual(['spx-santander']);
  });
  it('ignores BIN and maps physical channel and coupon', () => {
    const d = fixture();
    d.offers[0].segmentations.whitelist = [
      'bin',
      'user_id',
      'user_national_id',
    ];
    d.conditions.payment_flow.flows = ['physical_card'];
    d.coupon = { code: 'SAVE' };
    const terms = map(d);
    expect(terms.purchaseConditions).not.toContainEqual(
      expect.objectContaining({ kind: 'participating_locations' }),
    );
    expect(terms.purchaseConditions).toContainEqual(
      expect.objectContaining({ kind: 'coupon', code: 'SAVE' }),
    );
    expect(terms.channels).toContain('physical_card');
    expect(terms.eligibilityCompleteness).toBe('complete');
  });
  it('rejects unsupported-only cards, inactive offers, and missing values', () => {
    const d = fixture();
    d.conditions.payment_methods.methods = [
      { type: 'credit_card', issuer: 'other' },
    ];
    expect(() => map(d)).toThrow('no supported cards');
    d.real_status = 'FINISHED';
    expect(() => map(d)).toThrow('not running');
    d.real_status = 'RUNNING';
    d.conditions.payment_methods.methods = [
      { type: 'credit_card', issuer: 'visa' },
    ];
    d.offers[0].outcomes.cashback = null;
    expect(() => map(d)).toThrow('no offer value');
  });
  it('does not block unknown cap shapes or legal text', () => {
    const d = fixture();
    d.offers[0].limits.period_cap.reset_by = 'unknown';
    d.terms_and_conditions = '<p>cupón exclusivo Selecta</p>';
    const terms = map(d);
    expect(terms.capState).toBe('unknown');
    expect(terms.legalText).toBe('cupón exclusivo Selecta');
    expect(terms.unresolved).toEqual([]);
  });
  it('maps mixed and repeated audiences conservatively', () => {
    const d = fixture();
    d.offers[0].segmentations.audiences = [
      'selecta-nivel-2',
      'selecta-nivel-2',
      'selecta-nivel-4',
    ];
    expect(playdigitalAudiences(d, bank)).toEqual({
      codes: ['selecta-2', 'selecta-4'],
      unknown: [],
    });
    d.offers[0].segmentations.audiences.push('private-nivel-5', null);
    expect(playdigitalAudiences(d, bank)).toEqual({
      codes: [],
      unknown: ['private-nivel-5', 'null'],
    });
    d.offers[0].segmentations.audiences = [];
    expect(playdigitalAudiences(d, bank)).toEqual({ codes: [], unknown: [] });
  });
  it('handles matching, conflicting, and malformed transaction caps', () => {
    const d = fixture();
    d.offers[0].offer_transaction_cap = 123.45;
    d.offers[0].limits.transaction_cap = { amount_by_transaction: 123.45 };
    expect(map(d).caps).toContainEqual({
      amountMinor: 12345,
      period: 'transaction',
      scope: null,
    });
    d.offers[0].offer_transaction_cap = 100;
    expect(map(d).capState).toBe('unknown');
    d.offers[0].limits.transaction_cap = { bad: true };
    expect(map(d).capState).toBe('unknown');
  });
});
