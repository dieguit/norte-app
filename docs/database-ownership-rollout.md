# API database ownership: production rollout

The API owns the schema and migrations. Production already holds data migrated by the former web history, so takeover is additive only: the API appends `0021_api_database_ownership` after the 21 immutable web entries (`0000`–`0020`).

This is a **human** checklist. Commands are for an authorized operator; nothing here authorizes an agent to inspect or write production or the configured dev database. Nothing in this document is automated by `db:migrate`.

## Why the checklist is mandatory

Raw Drizzle ignores stored hashes. It reads only the latest `created_at` row of `drizzle.__drizzle_migrations` and runs a file only when that latest timestamp is below the file's `when`. It does not match file names, verify hashes or detect holes, duplicates or unknown rows. An unknown tracking timestamp at or above `1792368000000` makes the CLI silently skip takeover. A populated partial web history would run historical drops and backfills. Safety therefore comes from this gating, not from the CLI.

Never regenerate a larger `when`, edit or repair tracking rows, mark a baseline or run `db:push` to make the CLI execute.

## Acceptance table

| Starting state | Decision |
| --- | --- |
| Fresh empty database | Accept: replays web `0000`–`0020`, `0021` creates `users` and `whatsapp_auth_state`. 22 records. |
| Full web history (21 entries), API tables absent | Accept: only `0021` runs. 22 records. |
| Old API-only (web namespace verified absent, 2 old API rows) | Accept: web chain replays into the empty namespace, `0021` validates API tables. 24 records. |
| Combined old API + full web history | Accept: both record families kept, one appended record. 24 records. |
| Full web history, compatible API tables without API records | Accept: `0021` validates and leaves tables unchanged; no old API record is invented. |
| Already successful rerun | Accept as audited no-op with the exact recognized takeover hash; preflight must still detect later drift. |
| Journal hole | Reject: stop, discover, separately approved reconciliation. |
| Duplicate tracking row | Reject. |
| Hash mismatch against manifest | Reject. |
| Unknown or newer timestamp (at or above `1792368000000`) | Reject: CLI would skip takeover. Never move the cutoff. |
| Populated partial web history | Reject, even if the raw migrator would run. |
| Populated tables without tracking | Reject: no baseline marking or blind replay. |
| Incompatible users table | Reject: needs separately approved additive repair. |
| Incompatible whatsapp_auth_state table | Reject: needs separately approved additive repair. |

Incompatible means any view, materialized view, column type/nullability/default/collation difference, missing, extra or generated column, wrong, missing, composite or deferrable primary key, added unique/check/foreign key/index, renamed or altered PK index, trigger, policy, RLS, unlogged relation or inheritance. `0021` fails with `API ownership: incompatible public.<table>` and rolls back; the CLI may hide that text, so read the PostgreSQL server log.

## Checklist

1. **Target and exclusivity.** Fail fast if the target is unset, so neither `psql` nor the CLI can fall back to libpq defaults or `apps/api/.env` (`drizzle.config.ts` loads `dotenv/config`). The migration job checkout must contain no `apps/api/.env`:
   `: "${DATABASE_URL:?DATABASE_URL must be set}"; test ! -e apps/api/.env`
   Confirm the target without printing the secret URL:
   `psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -c 'select current_database(), current_user, inet_server_addr(), inet_server_port(), version();'`
   Check the supported PostgreSQL range and stop otherwise: `psql "$DATABASE_URL" -X -At -c 'show server_version_num'` must print a value from 150000 to 189999 (`0021` needs `pg_index.indnullsnotdistinct`, PostgreSQL 15+; the matrix is verified on PostgreSQL 17 and 18, and the validation ignores PostgreSQL 18 `NOT NULL` constraint rows). Stop concurrent migration jobs, deployments and DDL. Retire the web migration job. Name the migration operator and a maintenance/write-quiescence window. No parallel migrate invocations.

2. **Backup and restore rehearsal.** Back up application data and tracking:
   `pg_dump "$DATABASE_URL" -Fc --file takeover-before.dump`
   Restrict file permissions (`chmod 600`) and verify with `pg_restore --list takeover-before.dump`. Require a successful isolated restore rehearsal into a separately created disposable PostgreSQL of the same major version, never host dev or production, and keep evidence of recoverability, not only a file name. On that disposable server (`REHEARSAL_ADMIN_URL`, `REHEARSAL_URL`: different host or port than the target, a new empty database):
   `psql "$REHEARSAL_ADMIN_URL" -X -v ON_ERROR_STOP=1 -c 'create database norte_rehearsal'`
   `pg_restore --no-owner --no-acl --exit-on-error -d "$REHEARSAL_URL" takeover-before.dump`
   Then repeat steps 3, 4 and 6 captures against `"$REHEARSAL_URL"` and require equality with the target's.

3. **Full journal comparison.** Export every tracking row:
   `psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -c '\copy (select id,hash,created_at from drizzle.__drizzle_migrations order by id) to journal-before.csv csv header'`
   A missing table is acceptable only for a truly empty namespace. Compare every pair against `apps/api/migration-history/manifest.json` (SQL SHA-256 and `when`). Require no duplicates, holes, mismatches or unknown rows. Accept the full 21-entry web history plus zero or recognized old API rows. For API-only, verify ALL web financial/legacy tables are absent. Never infer completion from max timestamp or row count. Reject populated partial web history.

4. **Catalog review.** Take a schema-only dump and inventory `pg_namespace`, `pg_class`, `pg_attribute`, `pg_attrdef`, `pg_constraint`, `pg_index`, triggers and policies:
   `pg_dump "$DATABASE_URL" --schema-only --file schema-before.sql`
   Review the actual names of the seven deployed foreign keys: `savings_places_user_id_fk`, `savings_place_transfers_user_id_fk`, `savings_place_transfers_from_place_id_fk`, `savings_place_transfers_to_place_id_fk`, `saving_contributions_place_id_fk`, `goal_completion_withdrawals_goal_id_fk`, `goal_completion_withdrawals_place_id_fk`. Compare normalized expressions, truncated identifiers, actions, indexes, defaults and both API table definitions. Preserve unexplained deployment-only objects but STOP until they are reviewed. Incompatible or partial tables need a separately approved additive repair; there is no automatic adoption.

5. **Timestamp cutoff.** Reject unknown or newer tracking timestamps. Every recognized deployment timestamp must be strictly below `1792368000000` before takeover is published. A rerun after takeover is a separate audited no-op state carrying the exact recognized takeover hash; preflight must still detect later drift because applied SQL is skipped.

6. **Exact row evidence.** Quiesce writers or use a coordinated consistent snapshot. Record PK/content checks for ALL existing application, API, legacy and deployment-owned tables, including money, microsecond timestamps and JSON. Use the full custom dump plus a per-table export ordered by the actual PK, for example
   `\copy (select to_jsonb(t)::text from public.<table> t order by <pk columns>) to rows-before-<table>.txt`
   and compare after. Counts alone are not evidence. Tables without a PK need a sorted full-row multiset comparison. Keep old journal rows and IDs exact. Keep evidence files local and protected: they hold sensitive data.

7. **SQL review and rehearsal.** Review `apps/api/drizzle/0021_api_database_ownership.sql`: only conditional creation of missing API tables plus catalog assertions; no destructive DDL, no financial/legacy DML, no data conversion. Rehearse the real CLI against the restored copy from step 2 only, never the target, with the same `apps/api/.env`-free checkout (`REHEARSAL_URL` must differ from `DATABASE_URL`):
   `: "${REHEARSAL_URL:?}"; DATABASE_URL="$REHEARSAL_URL" pnpm --filter @repo/api db:migrate`
   Capture before/after equality, verify the catalog and exactly one appended record, then rerun for a no-op. Historical drops and backfills live only in immutable early history and must NOT run on a supported populated production takeover.

8. **Execute once.** Only after the evidence is accepted and the operator authorizes, the migration job re-runs the step 1 prechecks (`DATABASE_URL` set, no `apps/api/.env`, supported version), supplies the intended `DATABASE_URL` and runs, once, against the target (the only target invocation):
   `pnpm --filter @repo/api db:migrate`
   Check the exact appended hash/timestamp, unchanged old records, rows, constraints and indexes, compatible API tables, and authenticated `/app` flows. Re-enable traffic and jobs only after acceptance. API and web runtime never run migrations.

9. **Failure and rollback.** On migration failure keep the error, catalog and journal evidence. Inspect transaction rollback before any retry; never reset or repair tracking. After a successful additive migration, an application regression is handled by rolling back the application deployment while keeping the added tables and history; there is no down migration. Restore the backup only through a separately authorized recovery procedure, never automatically, since that discards new writes.

## Release record

The operator keeps: intended target and version, backup and restore-rehearsal evidence, journal comparison, catalog review, row evidence, authorization, migration output and post-migration results.
