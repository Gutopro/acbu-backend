"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const APPLY_FLAG = "--apply";
const applyChanges = process.argv.includes(APPLY_FLAG);
async function countCandidates() {
    const rows = await prisma.$queryRaw `
    SELECT COUNT(*)::bigint AS count
    FROM transactions t
    WHERE t.type IN ('mint', 'burn')
      AND (t.rate_snapshot IS NULL OR t.rate_snapshot->>'organizationId' IS NULL)
  `;
    return rows[0]?.count ?? 0n;
}
async function countDerivable() {
    const rows = await prisma.$queryRaw `
    SELECT COUNT(*)::bigint AS count
    FROM transactions t
    JOIN users u ON u.id = t.user_id
    WHERE t.type IN ('mint', 'burn')
      AND (t.rate_snapshot IS NULL OR t.rate_snapshot->>'organizationId' IS NULL)
      AND u.organization_id IS NOT NULL
  `;
    return rows[0]?.count ?? 0n;
}
async function countUnresolved() {
    const rows = await prisma.$queryRaw `
    SELECT COUNT(*)::bigint AS count
    FROM transactions t
    WHERE t.type IN ('mint', 'burn')
      AND (t.rate_snapshot IS NULL OR t.rate_snapshot->>'organizationId' IS NULL)
      AND t.user_id IS NULL
  `;
    return rows[0]?.count ?? 0n;
}
async function run() {
    const candidates = await countCandidates();
    const derivable = await countDerivable();
    const unresolvedBefore = await countUnresolved();
    console.log("[org-backfill] candidate rows:", candidates.toString());
    console.log("[org-backfill] derivable rows (via users.organization_id):", derivable.toString());
    console.log("[org-backfill] unresolved rows (user_id is null):", unresolvedBefore.toString());
    if (!applyChanges) {
        console.log(`[org-backfill] dry-run only. Re-run with ${APPLY_FLAG} to apply transactional updates.`);
        return;
    }
    const updatedRows = await prisma.$transaction(async (tx) => {
        return tx.$executeRaw `
      UPDATE transactions t
      SET rate_snapshot = COALESCE(t.rate_snapshot, '{}'::jsonb) || jsonb_build_object('organizationId', u.organization_id)
      FROM users u
      WHERE t.user_id = u.id
        AND t.type IN ('mint', 'burn')
        AND (t.rate_snapshot IS NULL OR t.rate_snapshot->>'organizationId' IS NULL)
        AND u.organization_id IS NOT NULL
    `;
    });
    const remainingCandidates = await countCandidates();
    const unresolvedAfter = await countUnresolved();
    console.log("[org-backfill] updated rows:", updatedRows.toString());
    console.log("[org-backfill] remaining candidate rows:", remainingCandidates.toString());
    console.log("[org-backfill] unresolved rows after update:", unresolvedAfter.toString());
}
run()
    .catch((error) => {
    console.error("[org-backfill] failed:", error);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=backfillOrgTransactionContext.js.map