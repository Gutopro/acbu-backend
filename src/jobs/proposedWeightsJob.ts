/**
 * Proposed basket weights job: ingest metrics (GDP, trade, liquidity) and create
 * BasketConfig rows with status 'proposed'. Admin approves to move to 'active'.
 * Runs on a long interval (e.g. monthly); configurable via env.
 */
import { logger } from "../config/logger";
import { ingestMetricsAndProposeWeights } from "../services/metrics/metricsService";

const DEFAULT_INTERVAL_DAYS = 30;
const INTERVAL_MS =
  (parseInt(
    process.env.BASKET_METRICS_INTERVAL_DAYS || String(DEFAULT_INTERVAL_DAYS),
    10,
  ) || DEFAULT_INTERVAL_DAYS) *
  24 *
  60 *
  60 *
  1000;

let timeoutId: ReturnType<typeof setTimeout> | null = null;

function getPeriod(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export async function startProposedWeightsScheduler(): Promise<void> {
  if (timeoutId) return;

  async function runOnce(): Promise<void> {
    try {
      const period = getPeriod();
      await ingestMetricsAndProposeWeights(period);
    } catch (e) {
      logger.error("Proposed weights job failed", { error: e });
    }
  }

  function scheduleNext(): void {
    timeoutId = setTimeout(async () => {
      await runOnce();
      scheduleNext();
    }, INTERVAL_MS);
    logger.info("Proposed weights next run scheduled", {
      inDays: INTERVAL_MS / (24 * 60 * 60 * 1000),
    });
  }

  await runOnce();
  scheduleNext();
  logger.info("Proposed weights scheduler started", {
    intervalDays: INTERVAL_MS / (24 * 60 * 60 * 1000),
  });
}

export function stopProposedWeightsScheduler(): void {
  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
    logger.info("Proposed weights scheduler stopped");
  }
}
