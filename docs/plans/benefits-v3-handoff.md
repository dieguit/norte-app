# Benefits v3 — handoff

Branch `feat/savings-benefits-digest`. Plan: `docs/plans/benefits-v3.md`. PRD: `docs/specs/benefits-prd.md`.

## What it does

Nightly, Norte imports card promotions from two deterministic sources, stores a normalized local copy, and matches them to each user's banks, cards and tier. Users see them in the app, in a daily digest by category and through agent tools. Admins inspect the catalog in an explorer. No LLM in ingestion.

## Scope (product decisions)

- Only these banks: Macro, Nación, Santander, Galicia, BBVA, Patagonia, Masventas, Hipotecario, Santiago del Estero, Credicoop, Comafi, Supervielle, HSBC, Brubank. MODO lists 11 of them; Masventas, HSBC and Brubank are not in MODO. Allowlist lives in `apps/api/src/benefits/ingest/tiers.ts`.
- Only currently running promotions are stored. Upcoming, ended, draft and unusable promotions are never stored; ended/withdrawn/other-bank rows are deleted, not hidden.
- Simple over clever: MODO is mapped from its JSON fields only. Legal text is display-only, never parsed.
- Out of v1: expense personalization, city filtering (neither source exposes location), brand following.

## Sources

| Source                     | Endpoint                                                                     | Notes                                                                                                   |
| -------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Galicia own catalog        | `loyalty.bff.bancogalicia.com.ar/.../promociones/catalogo`                   | One request, ~2,244 promos. `ingest/galicia.ts`.                                                        |
| MODO / PlayDigital listing | `rewards-handler.playdigital.com.ar/slots/?...&banks=<id>&limit=1000&page=N` | Per bank. `ingest/playdigital.ts`.                                                                      |
| MODO detail                | `modo.com.ar/promos/api/rewards/v2/benefit/<promo_id>`                       | One per promo, cached 7 days, refreshed when listing hash changes. The old `/landing/<id>` returns 400. |
| MODO banks                 | `modo.com.ar/promos/api/rewards/v2/banks`                                    | Filtered to the allowlist.                                                                              |

## MODO flow

1. Bank list → keep the 11 allowlisted banks.
2. Listing per bank → keep only `calculated_status = RUNNING` and `stop_date` not passed. Everything else is skipped (not stored, no detail fetch).
3. Detail (cached) → must be `active` + `real_status RUNNING`.
4. Offer for this bank: the `offers[]` entry whose `requirements.banks.list` contains the bank id.
5. Eligibility (all required):
   - bank;
   - one of the supported cards in `payment_methods` (credit/debit × Visa/Mastercard/Amex/Cabal; others ignored);
   - MODO app, always;
   - tier from `segmentations.audiences` (`selecta-nivel-N` → Macro `selecta-N`). None or unmapped → no tier requirement, plus an anomaly for unmapped.
6. Offer: `outcomes.cashback` percent; interest-free `financing.installments`; caps/minimum from `limits`/`amount_range`; `schedule` for days/hours. Cashback vs. discount is only wording.
7. Conditions (shown, never blocking): participating stores (store/mcc whitelist), hours, acquirer, coupon, payment flow (physical card / NFC / online). BIN and user whitelists ignored.
8. Not stored when: not running, no offer for the bank, no supported card, no offer value, invalid detail.

Galicia's mapper is unchanged and already simple.

## Storage, cleanup and the nightly job

- Cron `apps/api/src/benefits/benefits-ingest.cron.ts`: 03:00 Argentina time, `source: all`, `maxDetails: 4000`, advisory lock so only one instance runs.
- Each bank's results commit in one transaction (`ingest/store.ts` `commitRun`), followed by `pruneCampaigns` in the same transaction. It deletes:
  - other-bank and withdrawn presences;
  - non-running or rejected MODO rows;
  - campaigns that are expired or have no presence;
  - brands with no campaigns and no aliases/references;
  - unreferenced detail-cache rows older than 7 days.
    Kept: category mappings, ingest runs, admin brand edits.
- Safety:
  - A promo missing from the listing is withdrawn only after two runs at least 24h apart.
  - Withdrawal and pruning are skipped for a bank whose listing traversal was incomplete or whose count dropped suspiciously.
  - Detail download failures never delete. A changed promo with a failed refresh is hidden as "detail outdated" until refetched.

## Consumer side

- Matching: `apps/api/src/benefits/consumer.ts`, `benefits.service.ts`.
  - States: `eligible`, `conditional` (has conditions), `needs_tier` (user chose "No sé" for tier).
  - Per-bank variants carry their own cards and conditions.
- Digest: `apps/api/src/benefits/digest.ts`, top items per user category.
- Agent tools: `apps/api/src/mastra/tools/benefit-tools.ts`.
- Contracts: `packages/shared-types/src/benefits-{catalog,consumer,explorer}.schema.ts`.
- Customer UI: `apps/web/src/routes/app/finances/benefits/`.
- Admin explorer: `apps/web/src/routes/app/admin/benefits/`.
  - Pages: campaigns, brands (merge/aliases), category mappings, runs.
  - Status filters: available / incomplete / hidden / all.

## State at handoff

Local dev DB after the last full import:

- **Imports:** all 11 MODO banks and Galicia complete, 0 details missing.
- **Campaigns:** 3,965 (Galicia 2,242, MODO 1,721 publishable).
- **Incomplete:** 2 (Galicia, not investigated).
- **Brands:** 2,115, none empty.

Validation at HEAD:

- `pnpm test` passes.
- API e2e passes (100 tests).
- API and web typechecks pass.
- `pnpm fallow:audit` exits 0, with duplication warnings only.

## Open items

1. **Browser check not done.** Customer `/app/finances/benefits` and admin `/app/admin/benefits` have never been verified visually with a real Clerk login.
2. **Unused contract.** `legal_purchase` purchase-condition kind is no longer emitted. Remove it from shared types, digest and web.
3. **Galicia incomplete.** Look at the 2 incomplete Galicia promos.
4. **Unmapped tiers.** Macro audiences `private-nivel-5/6` and `spx-santander` produce anomalies and are treated as broadest tier. Map them if those tiers matter.
5. **Missing banks.** Masventas, HSBC and Brubank have no source yet.
6. **Duplication.** fallow reports 7 duplication groups (warnings).

## Production rollout (not done)

Migrations `0024`–`0029` (`apps/api/drizzle/`) are not on `main` or production. `0026`–`0029` drop the v2 benefit tables and clear old v2 preferences.

1. Back up the production DB.
2. `pnpm --filter @repo/api db:migrate`.
3. Run a first import manually and check the report before the cron takes over:
   ```bash
   pnpm --filter @repo/api benefits:ingest --source all --max-details 1500 --commit
   ```
   - Without `--commit` it's a dry run.
   - `--bank <slug>` limits it to one bank, which must be allowlisted.
   - Output is printed at the end; details are fetched sequentially, ~0.3s each.
4. Let the 03:00 cron run, then check `/app/admin/benefits/runs`.

## Commands

- Unit: `pnpm test`
- API e2e:
  ```bash
  DATABASE_URL=postgres://norte:norte@localhost:5434/norte_test pnpm --filter @repo/api db:migrate
  pnpm --filter @repo/api test:e2e
  ```
- Types: `pnpm --filter @repo/api check-types`, `pnpm --filter @repo/web check-types`
- Before commit/push: `pnpm fallow:audit`
- `packages/shared-types/dist` is gitignored build output; don't stage it.
