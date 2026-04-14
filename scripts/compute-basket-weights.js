"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../src/config/database");
const metricsService_1 = require("../src/services/metrics/metricsService");
/**
 * Main execution function for the basket weight computation script.
 * Ingests macroeconomic and platform metrics, computes proposed weights,
 * and generates a summary report for review.
 *
 * @returns {Promise<void>}
 */
async function main() {
    const runStartTime = new Date();
    console.log("Starting basket weight computation...");
    // 1. Get current period (UTC based for consistency)
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, "0");
    const period = `${y}-${m}`;
    // 2. Compute and propose weights
    console.log(`Ingesting metrics and computing weights for period: ${period}`);
    await (0, metricsService_1.ingestMetricsAndProposeWeights)(period);
    // 3. Fetch the updated metrics and proposed weights for this specific run
    const metrics = await database_1.prisma.basketMetrics.findMany({
        where: { period },
    });
    const proposedConfigs = await database_1.prisma.basketConfig.findMany({
        // Fetch proposals created during this specific run execution
        where: {
            status: "proposed",
            effectiveFrom: { gte: runStartTime }
        },
        orderBy: { weight: "desc" },
    });
    // 4. Generate report
    console.log("\n===========================================================================");
    console.log(`               B A S K E T   W E I G H T S   R E P O R T  (${period}) `);
    console.log("===========================================================================\n");
    console.log("Factors Considered:");
    console.log("- GDP (40% weight): Macroeconomic size (Sourced from World Bank API)");
    console.log("- Trade Volume (30% weight): Platform usage (Sourced from token burns)");
    console.log("- Liquidity (30% weight): Market depth (Baseline default)\n");
    const reportData = proposedConfigs.map((config) => {
        const metric = metrics.find((m) => m.currency === config.currency);
        const rawValues = metric?.rawValues;
        const rawGdp = rawValues?.gdpUsd ? `$${Number(rawValues.gdpUsd).toLocaleString()}` : "N/A";
        const rawTrade = rawValues?.tradeVolume ? Number(rawValues.tradeVolume).toLocaleString() : "0";
        return {
            Currency: config.currency,
            "Proposed Weight": config.weight.toNumber().toFixed(4),
            "GDP Score": metric?.gdpScore?.toNumber().toFixed(2) || "0.00",
            "Trade Score": metric?.tradeScore?.toNumber().toFixed(2) || "0.00",
            "Liquidity Score": metric?.liquidityScore?.toNumber().toFixed(2) || "0.00",
            "Raw GDP (USD)": rawGdp,
            "Raw Trade Vol": rawTrade
        };
    });
    console.table(reportData);
    console.log("\nComputation complete. Weights have been proposed and stored in the database.");
}
main()
    .catch((e) => {
    console.error("Error computing basket weights:", e);
    // Use exitCode instead of immediate exit to allow cleanup in .finally()
    process.exitCode = 1;
})
    .finally(async () => {
    // Ensure database disconnection happens before the script exits
    await database_1.prisma.$disconnect();
});
//# sourceMappingURL=compute-basket-weights.js.map