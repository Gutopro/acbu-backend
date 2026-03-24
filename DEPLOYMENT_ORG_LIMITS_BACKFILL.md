# Org Limits Backfill Plan

This rollout ensures org-scoped daily/monthly limits are correct immediately after deployment.

## Script Name

- `prisma/backfillOrgTransactionContext.ts`

## Selection Criteria

The script targets transactions that can be included by org-scoped limits but are missing org context:

- `type IN ('mint', 'burn')`
- `rate_snapshot IS NULL OR rate_snapshot->>'organizationId' IS NULL`

## Derivation Source

The value is derived from `users.organization_id` joined through `transactions.user_id`.
This matches the org context used by current writes in `mintController` and `burnController`, where org context comes from authenticated API-key context.

## Safe Rollout Plan

1. **Deploy code and schema first**
   - Apply `prisma/sql/20260323_add_api_key_lookup_key.sql`.
   - Deploy service code that writes `rateSnapshot.organizationId` for new mint/burn rows.
2. **Run dry-run**
   - `npx ts-node prisma/backfillOrgTransactionContext.ts`
   - Confirm candidate/derivable/unresolved counts.
3. **Run transactional update**
   - `npx ts-node prisma/backfillOrgTransactionContext.ts --apply`
   - Updates are executed inside a DB transaction.
4. **Verification queries**
   - Re-run dry-run command to confirm reduced candidate count.
   - Optional SQL checks:
     - `SELECT COUNT(*) FROM transactions t WHERE t.type IN ('mint','burn') AND (t.rate_snapshot IS NULL OR t.rate_snapshot->>'organizationId' IS NULL);`
     - `SELECT COUNT(*) FROM transactions t WHERE t.type IN ('mint','burn') AND t.user_id IS NULL AND (t.rate_snapshot IS NULL OR t.rate_snapshot->>'organizationId' IS NULL);`

## Notes on Unresolved Rows

Rows with `user_id IS NULL` and missing `rateSnapshot.organizationId` cannot be deterministically derived from current schema alone.
For those rows, treat deployment as a counter reset for org-level windows (24h/month) unless additional external mapping is available.
