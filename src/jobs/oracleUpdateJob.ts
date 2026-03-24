/**
 * Oracle update job: run fetchAndStoreRates every ORACLE_UPDATE_INTERVAL_HOURS (default 6).
 */
import { config } from "../config/env";
import { logger } from "../config/logger";
import { fetchAndStoreRates } from "../services/oracle";

const INTERVAL_MS = (config.oracle?.updateIntervalHours ?? 6) * 60 * 60 * 1000;

let intervalId: ReturnType<typeof setInterval> | null = null;

export async function startOracleUpdateScheduler(): Promise<void> {
  if (intervalId) return;
  try {
    await fetchAndStoreRates();
  } catch (e) {
    logger.error("Oracle initial update failed", e);
  }
  intervalId = setInterval(async () => {
    try {
      await fetchAndStoreRates();
    } catch (e) {
      logger.error("Oracle scheduled update failed", e);
    }
  }, INTERVAL_MS);
  logger.info("Oracle update scheduler started", {
    intervalHours: config.oracle?.updateIntervalHours ?? 6,
  });
}

export function stopOracleUpdateScheduler(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logger.info("Oracle update scheduler stopped");
  }
}
