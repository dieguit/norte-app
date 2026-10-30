import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  mapPlaydigitalDetail,
  playdigitalDetailSchema,
  readableLegal,
} from './playdigital-detail';

function fixture(name: string) {
  return JSON.parse(
    readFileSync(
      resolve('test/fixtures/benefits-v3/playdigital', `${name}.json`),
      'utf8',
    ),
  );
}
const bank = {
  slug: 'macro',
  name: 'Macro',
  playdigitalId: '6a089c91-a7d3-4199-a578-2132a3733f69',
};
function normal() {
  const d = fixture('v2-jetsmart');
  d.conditions.payment_methods.methods = [
    { type: 'credit_card', issuer: 'visa' },
  ];
  d.terms_and_conditions = '<p>Pagando con MODO</p>';
  d.details = null;
  d.card = null;
  return d;
}
const map = (d: unknown) => mapPlaydigitalDetail(d, bank, [], null);

describe('current MODO v2 detail', () => {
  const legalSources = [
    'terms_and_conditions',
    'details.faq',
    'details.name',
    'card.benefit',
  ];
  function setLegalSource(
    d: ReturnType<typeof normal>,
    path: string,
    text: string,
  ) {
    const [root, child] = path.split('.');
    if (child) d[root] = { ...d[root], [child]: text };
    else d[root] = text;
  }

  it.each(legalSources)(
    'retains a profile restriction appearing only in %s',
    (path) => {
      const d = normal();
      setLegalSource(d, path, 'Exclusivo para clientes seleccionados.');
      expect(map(d).eligibilityCompleteness).toBe('incomplete');
      expect(map(d).unresolved).toContain('legal profile restriction');
      expect(map(d).purchaseConditions).toEqual([]);
    },
  );

  it.each(
    legalSources.flatMap((purchasePath) =>
      legalSources
        .filter((profilePath) => profilePath !== purchasePath)
        .map((profilePath) => ({ purchasePath, profilePath })),
    ),
  )(
    'classifies $purchasePath independently from audience blocker in $profilePath',
    ({ purchasePath, profilePath }) => {
      const d = normal();
      setLegalSource(d, purchasePath, 'No aplica para compras online.');
      setLegalSource(d, profilePath, 'Exclusivo para clientes seleccionados.');
      const terms = map(d);
      expect(terms.eligibilityCompleteness).toBe('incomplete');
      expect(terms.unresolved).toContain('legal profile restriction');
      expect(terms.purchaseConditions).toEqual([
        {
          kind: 'legal_purchase',
          text: 'No aplica para compras online.',
          evidence: purchasePath,
        },
      ]);
    },
  );
  it('represents generic legal restrictions without blocking the profile', () => {
    const d = normal();
    d.terms_and_conditions = 'No aplica con otras promociones.';
    expect(map(d).eligibilityCompleteness).toBe('complete');
    expect(map(d).purchaseConditions).toContainEqual({
      kind: 'legal_purchase',
      text: d.terms_and_conditions,
      evidence: 'terms_and_conditions',
    });
  });

  it.each([
    'No aplica con otras promociones para clientes seleccionados.',
    'Sólo para titulares.',
    'Exclusiva para Visa.',
    'Únicamente con tarjetas de débito.',
    'Beneficio para jubilados.',
    'Tarjetas emitidas por otro banco.',
    'Promoción para segmento Selecta.',
    'Exclusivo para otra billetera.',
    'No aplica para pagos; tengan una cuenta abierta en la Entidad Adherida; y no registren deuda o mora.',
    'Titulares de cuenta.',
    'Poseer una cuenta.',
    'Cuenta sueldo.',
    'No registren mora.',
    'Sin deuda.',
    'Situación crediticia favorable.',
    'Antigüedad como cliente.',
    'Mayores de 18 años.',
    'Residentes en Argentina.',
    'Nuevos clientes.',
    'Alta de un producto.',
    'Exclusivo para clientes de Banco X.',
    'Exclusivamente con Banco X.',
    'Sólo con tarjetas Visa.',
    'ADICIONALES DE TARJETAS DE CRÉDITO NO CONTARÁN CON EL BENEFICIO ATENTO A QUE APLICA ÚNICAMENTE AL CLIENTE QUE PERCIBE SU JUBILACIÓN POR EL BNA.',
    'SIN TOPE DE REINTEGRO EN LA PRIMERA COMPRA POR CUENTA EXCLUSIVAMENTE PARA CLIENTES CUENTA HABERES (EXCLUYE EMPLEADOS Y GRUPO BNA).',
    'Únicamente al cliente.',
    'Exclusivamente para titulares.',
    'Cuenta haberes.',
    'Excluye empleados.',
    'Jubilación.',
    'Que tengan una cuenta abierta en Banco Macro.',
    'Que tengan una cuenta abierta en Banco Macro, y que dicha cuenta se encuentre asociada a MODO; No registren deuda o mora en ningún producto de la Entidad Adherida con la que realice el pago.',
    'Que tengan una cuenta abierta en la Entidad Adherida, y que dicha cuenta se encuentre asociada a MODO; No registren deuda o mora en Banco Macro.',
    'No aplica para pagos con transferencia desde cuenta bancaria ni para tarjetas American Express; Que tengan una cuenta abierta en la Entidad Adherida, y que dicha cuenta se encuentre asociada a MODO; No registren deuda o mora en ningún producto de la Entidad Adherida con la que realice el pago.',
    'No aplica para pagos con transferencia desde cuenta bancaria ni a pagos realizados con tarjetas CABAL; 3.3 Que tengan una cuenta abierta en la Entidad Adherida, y que dicha cuenta se encuentre asociada a MODO.',
    'Excepto tarjetas de débito.',
  ])('blocks profile restrictions: %s', (text) => {
    const d = normal();
    d.terms_and_conditions = text;
    expect(map(d).unresolved).toContain('legal profile restriction');
    expect(map(d).eligibilityCompleteness).toBe('incomplete');
  });

  it.each([
    'Que tengan una cuenta abierta en la Entidad Adherida, y que dicha cuenta se encuentre asociada a MODO dentro de los quince días de finalizada la Promoción; y No registren deuda o mora en ningún producto de la Entidad Adherida con la que realice el pago.',
    'No aplica para pagos con transferencia desde cuenta bancaria; Que tengan una cuenta abierta en la Entidad Adherida emisora de la tarjeta con la que realicen el pago, y que dicha cuenta se encuentre asociada a MODO dentro de los quince días de realizado el pago; y No registren deuda o mora en ningún producto de la Entidad Adherida con la que realice el pago.',
    'MODO Contactless está disponible únicamente en dispositivos Android; Que tengan una cuenta abierta en la Entidad Adherida, y que dicha cuenta se encuentre asociada a MODO; No registren deuda o mora en ningún producto de la Entidad Adherida con la que realice el pago.',
    'Que tengan una cuenta abierta en la Entidad Adherida emisora de la tarjeta con la que realicen el pago, y que dicha cuenta se encuentre asociada a MODO dentro de los quince días de realizado el pago; y 3.5.',
    'No registren deuda o mora en ningún producto de la Entidad Adherida con la que realice el pago.',
    'Que dicho pago sea realizado con tarjetas de crédito, débito MASTERCARD emitidas por alguna de las entidades adheridas; Que tengan una cuenta abierta en la Entidad Adherida emisora de la tarjeta MASTERCARD con la que realicen el pago, y que dicha cuenta se encuentre asociada a MODO; No registren deuda o mora en ningún producto de la Entidad Adherida con la que realice el pago.',
  ])('represents the standard MODO clause without blocking: %s', (text) => {
    const d = normal();
    d.terms_and_conditions = text;
    const terms = map(d);
    expect(terms.eligibilityCompleteness).toBe('complete');
    expect(terms.purchaseConditions).toContainEqual({
      kind: 'legal_purchase',
      text,
      evidence: 'terms_and_conditions',
    });
    d.terms_and_conditions = `${text.slice(0, -1)} para jubilados con cuenta haberes.`;
    expect(map(d).unresolved).toContain('legal profile restriction');
    d.terms_and_conditions = `${text} Exclusivo para jubilados con cuenta haberes.`;
    expect(map(d).eligibilityCompleteness).toBe('incomplete');
  });

  it('does not classify participating bank and wallet lists as profile restrictions', () => {
    const d = normal();
    d.terms_and_conditions =
      'Entidades Adheridas Para pagos con QR: Banco Nación Banco Santander Banco BBVA Banco Galicia Banco Santa Fe Banco Entre Rios Banco San Juan Banco Santa Cruz Banco Credicoop Banco Supervielle Banco Comafi Banco Columbia (Sólo en app bancaria) Banco ICBC Billetera YOY Banco Macro Banco Ciudad Billetera Buepp Banco Naranja. El pago deberá ser realizado exclusivamente escaneando un código QR.';
    expect(map(d).unresolved).not.toContain('legal profile restriction');
    expect(map(d).eligibilityCompleteness).toBe('complete');
  });

  it('merges excess legal sentences by source within schema limits', () => {
    const d = normal();
    d.terms_and_conditions = Array.from(
      { length: 30 },
      (_, i) => `No aplica con promoción ${i}.`,
    ).join(' ');
    const terms = map(d);
    expect(terms.eligibilityCompleteness).toBe('complete');
    expect(terms.purchaseConditions).toHaveLength(1);
    expect(terms.purchaseConditions[0]).toMatchObject({
      kind: 'legal_purchase',
      text: d.terms_and_conditions,
    });
    d.terms_and_conditions = Array.from(
      { length: 100 },
      (_, i) => `No aplica con promoción ${i}.`,
    ).join(' ');
    const merged = map(d).purchaseConditions[0];
    expect(merged.kind).toBe('legal_purchase');
    if (merged.kind === 'legal_purchase') {
      expect(merged.text.length).toBeLessThanOrEqual(2000);
      expect(merged.text).toMatch(/\.\u2026$/);
    }
  });
  it.each([
    'dinners_club',
    'maestro',
    'confiable',
    'naranja',
    'patagonia_365',
    'tarjeta_sol',
  ])(
    'keeps supported OR alternatives without expanding profile networks: %s',
    (issuer) => {
      const d = normal();
      d.conditions.payment_methods.methods.push({
        type: 'credit_card',
        issuer,
      });
      const terms = map(d);
      expect(terms.eligibilityCompleteness).toBe('complete');
      expect(JSON.stringify(terms.eligibility)).toContain('visa');
      expect(JSON.stringify(terms.eligibility)).not.toContain(issuer);
      d.conditions.payment_methods.methods = [{ type: 'credit_card', issuer }];
      expect(() => map(d)).toThrow('missing supported card networks');
    },
  );

  it.each([
    { type: 'credit_card', issuer: 'unknown_network' },
    { type: 'unknown_card', issuer: 'visa' },
    { type: 'credit_card', issuer: 'maestro', bins: ['secret-bin'] },
    null,
  ])(
    'retains profile blockers for unknown/null/extra restrictive alternatives: %j',
    (method) => {
      const d = normal();
      d.conditions.payment_methods.methods.push(method);
      expect(map(d).eligibilityCompleteness).toBe('incomplete');
    },
  );

  it.each(['store_cuit', 'store_terminal_id', 'store_financing_online_id'])(
    'represents merchant whitelist %s without exposing identifiers',
    (key) => {
      const d = normal();
      d.offers[0].segmentations = { whitelist: [key] };
      const terms = map(d);
      expect(terms.eligibilityCompleteness).toBe('complete');
      expect(terms.purchaseConditions).toEqual([
        {
          kind: 'participating_locations',
          instruction:
            'Consultá los locales adheridos en la página oficial de la promoción.',
          evidence: 'offers[].segmentations.whitelist',
        },
      ]);
      expect(JSON.stringify(terms.purchaseConditions)).not.toContain(key);
    },
  );

  it.each(
    [
      ['bin'],
      ['customer_id'],
      ['store_cuit', 'bin'],
      ['unknown'],
      [null],
      null,
      'store_cuit',
    ].map((value) => ({ value })),
  )('blocks nonmerchant or malformed whitelist $value', ({ value }) => {
    const d = normal();
    d.offers[0].segmentations = { whitelist: value };
    expect(map(d).eligibilityCompleteness).toBe('incomplete');
    expect(map(d).purchaseConditions).toEqual([]);
  });

  it.each([
    ['by_blacklist', 'exclude'],
    ['by_whitelist', 'include'],
  ])('preserves exact acquirer polarity: %s', (mode, expected) => {
    const d = normal();
    d.conditions.acquirers = {
      list: ['MERCADOLIBRE'],
      segmentation_mode: mode,
    };
    expect(map(d).purchaseConditions).toContainEqual({
      kind: 'acquirer',
      mode: expected,
      names: ['MERCADOLIBRE'],
      evidence: 'conditions.acquirers',
    });
    expect(map(d).eligibilityCompleteness).toBe('complete');
    d.conditions.acquirers.segmentation_mode = 'unknown';
    expect(map(d).eligibilityCompleteness).toBe('incomplete');
  });

  it('retains exact daily bounds; malformed and overnight windows cannot publish', () => {
    const d = normal();
    d.conditions.schedule.daily_start_time = '10:00:00';
    d.conditions.schedule.daily_stop_time = '23:59:00';
    expect(map(d).purchaseConditions).toContainEqual({
      kind: 'daily_time',
      from: '10:00:00',
      to: '23:59:00',
      timezone: 'America/Argentina/Buenos_Aires',
      evidence: 'conditions.schedule',
    });
    expect(map(d).eligibilityCompleteness).toBe('complete');
    for (const stop of ['09:00:00', '24:00:00', '9:00:00']) {
      d.conditions.schedule.daily_stop_time = stop;
      expect(() => map(d)).toThrow();
    }
  });

  it('demotes only narrow source-evidenced purchase legal text, never ambiguous profile or value clauses', () => {
    const d = normal();
    d.terms_and_conditions = '<p>No aplica para compras online.</p>';
    expect(map(d).purchaseConditions).toContainEqual({
      kind: 'legal_purchase',
      text: 'No aplica para compras online.',
      evidence: 'terms_and_conditions',
    });
    expect(map(d).eligibilityCompleteness).toBe('complete');
    for (const text of [
      'No aplica para clientes seleccionados.',
      'Excepto tarjetas empresariales.',
      'No aplica para compras online con tarjetas de clientes nuevos.',
      'Exclusivo para compras de clientes seleccionados.',
    ]) {
      d.terms_and_conditions = text;
      expect(map(d).eligibilityCompleteness).toBe('incomplete');
      expect(map(d).purchaseConditions).toEqual([]);
    }
  });

  it('accepts only explicit structured coupon code/instruction and keeps financial contradictions blocked', () => {
    const d = normal();
    d.coupon = { code: 'PROMO', instruction: 'Ingresá PROMO al pagar.' };
    expect(map(d).purchaseConditions).toContainEqual({
      kind: 'coupon',
      code: 'PROMO',
      instruction: 'Ingresá PROMO al pagar.',
      evidence: 'coupon',
    });
    expect(map(d).eligibilityCompleteness).toBe('complete');
    d.coupon.code = null;
    expect(map(d).purchaseConditions[0]).toMatchObject({ code: null });
    d.terms_and_conditions = 'Descuento usando código promocional PROMO.';
    expect(map(d).eligibilityCompleteness).toBe('incomplete');
    for (const coupon of [
      'PROMO',
      {},
      { code: 'PROMO' },
      { code: 'PROMO', instruction: 'Aplicar', audience: ['secret-customer'] },
    ]) {
      d.coupon = coupon;
      expect(map(d).eligibilityCompleteness).toBe('incomplete');
      expect(map(d).purchaseConditions).toEqual([]);
    }
  });
  it.each([
    ['inactive', 'RUNNING', null],
    ['active', 'FINISHED', null],
    ['active', 'CANCELLED', null],
    ['unknown', 'RUNNING', null],
    ['active', 'UNKNOWN', null],
    ['active', 'RUNNING', '2026-10-30T12:00:00.000Z'],
  ])(
    'withholds non-active, non-running or deleted benefits: %s/%s/%s',
    (status, realStatus, deletedAt) => {
      const d = normal();
      d.status = status;
      d.real_status = realStatus;
      d.deleted_at = deletedAt;
      expect(() => map(d)).toThrow(/status|running|deleted/);
    },
  );

  it.each(['status', 'real_status', 'deleted_at'])(
    'rejects missing/malformed lifecycle fields: %s',
    (field) => {
      const d = normal();
      d[field] = 42;
      expect(playdigitalDetailSchema.safeParse(d).success).toBe(false);
      delete d[field];
      expect(playdigitalDetailSchema.safeParse(d).success).toBe(false);
    },
  );
  it('maps a representable normal contract, exact bps/cents, and never assumes no cap', () => {
    const d = normal();
    d.offers[0].outcomes.cashback.amount = 12.34;
    d.offers[0].requirements.amount_range.min = 1234.56;
    const terms = map(d);
    expect(terms.eligibilityCompleteness).toBe('complete');
    expect(terms.offers).toEqual([
      { kind: 'percent', percentageBps: 1234, mode: 'cashback' },
    ]);
    expect(terms.minimumSpendMinor).toBe(123456);
    expect(terms.capState).toBe('unknown');
    expect(terms.validity).toEqual({
      from: '2026-10-30',
      to: '2026-11-06',
      weekdays: null,
    });
    expect(terms.channels).toContain('online');
  });

  it.each(['v2-selecta', 'v2-manso', 'v2-anonima', 'v2-americars'])(
    'maps verified capped fixture %s without dropping restrictions',
    (name) => {
      const terms = map(fixture(name));
      expect(terms.capState).toBe('known');
      expect(terms.caps[0].amountMinor).toBeGreaterThan(0);
      expect(terms.eligibilityCompleteness).toBe(
        ['v2-anonima', 'v2-americars'].includes(name)
          ? 'complete'
          : 'incomplete',
      );
      if (name === 'v2-anonima') expect(terms.minimumSpendMinor).toBe(5000000);
      if (name === 'v2-americars') {
        expect(terms.offers).toContainEqual({
          kind: 'installments',
          count: 6,
          upTo: false,
        });
        expect(terms.caps).toContainEqual({
          amountMinor: 500000,
          period: 'week',
          scope: 'bank',
        });
      }
      if (name === 'v2-manso')
        expect(terms.caps).toContainEqual({
          amountMinor: 2000000,
          period: 'transaction',
          scope: null,
        });
    },
  );

  it('keeps JetsMART coupon/legal contradiction incomplete and mode uncertain', () => {
    const terms = map(fixture('v2-jetsmart'));
    expect(terms.eligibilityCompleteness).toBe('incomplete');
    expect(terms.offers[0]).toMatchObject({ mode: 'unspecified' });
    expect(terms.unresolved).toContain('coupon restriction');
    expect(terms.legalText).not.toContain('<');
  });

  it('filters bank-specific branches rather than combining different offers', () => {
    const d = normal();
    const other = structuredClone(d.offers[0]);
    other.requirements.banks.list = ['other-bank'];
    other.outcomes.cashback.amount = 90;
    d.offers.push(other);
    expect(map(d).offers[0]).toMatchObject({ percentageBps: 2500 });
    other.requirements.banks.list.push(bank.playdigitalId);
    expect(() => map(d)).toThrow(/multiple bank offer variants/);
    d.offers = [other];
    other.requirements.banks.list = ['other-bank'];
    expect(() => map(d)).toThrow(/no offer for current bank/);
  });

  it.each(['method', 'bank', 'cashback', 'financing'])(
    'accepts evidenced nullable entries but never unrestricted eligibility: %s',
    (kind) => {
      const d = normal();
      if (kind === 'method') d.conditions.payment_methods.methods.push(null);
      if (kind === 'bank') d.offers[0].requirements.banks.list.push(null);
      if (kind === 'cashback') {
        d.offers[0].outcomes.cashback.amount = null;
        d.offers[0].outcomes.financing.installments = [
          {
            type: 'sin_interes',
            number: 6,
            coefficient: '0',
            annual_nominal_rate: '0',
            total_financial_cost: '0',
          },
        ];
      }
      if (kind === 'financing')
        d.offers[0].outcomes.financing.installments = [null];
      expect(map(d).eligibilityCompleteness).toBe('incomplete');
    },
  );

  it.each(['number', 'list', 'method'])(
    'rejects malformed non-null v2 fields: %s',
    (kind) => {
      const d = normal();
      if (kind === 'number') d.offers[0].outcomes.cashback.amount = '25';
      if (kind === 'list') d.conditions.payment_flow.flows = 'online';
      if (kind === 'method') d.conditions.payment_methods.methods = [42];
      expect(playdigitalDetailSchema.safeParse(d).success).toBe(false);
      expect(() => map(d)).toThrow(/invalid v2 detail/);
    },
  );

  it.each([
    'unknown requirement',
    'network',
    'time',
    'coupon',
    'cap',
    'financing',
    'precision',
  ])('never hides unsupported restrictions: %s', (kind) => {
    const d = normal();
    if (kind === 'unknown requirement')
      d.offers[0].requirements.salary_account = true;
    if (kind === 'network')
      d.conditions.payment_methods.methods.push({
        type: 'credit_card',
        issuer: 'unknown_network',
      });
    if (kind === 'time') d.conditions.schedule.daily_start_time = '25:00:00';
    if (kind === 'coupon') d.coupon = { code: 'PROMO' };
    if (kind === 'cap') d.offers[0].offer_caps = [{ amount: 100 }];
    if (kind === 'financing')
      d.offers[0].outcomes.financing.installments = [
        {
          type: 'con_interes',
          number: 6,
          coefficient: '1',
          annual_nominal_rate: '20',
          total_financial_cost: '30',
        },
      ];
    if (kind === 'time') expect(() => map(d)).toThrow();
    else if (kind === 'precision') {
      d.offers[0].requirements.amount_range.min = 1.001;
      expect(() => map(d)).toThrow(/precision/);
    } else expect(map(d).eligibilityCompleteness).toBe('incomplete');
  });

  it('renders legal text inert, including script bodies and entities', () => {
    expect(
      readableLegal('<script>alert(1)</script><p>A&nbsp;&amp; B &#225;</p>'),
    ).toBe('A & B á');
  });
});
