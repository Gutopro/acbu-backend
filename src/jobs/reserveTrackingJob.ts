/**
 * Reserve tracking job: run trackReserves every 6 hours (reserve status publishing to oracle).
 */
import { logger } from "../config/logger";
import { reserveTracker } from "../services/reserve/ReserveTracker";

const INTERVAL_MS = 6 * 60 * 60 * 1000; // 6h

let intervalId: ReturnType<typeof setInterval> | null = null;

export async function startReserveTrackingScheduler(): Promise<void> {
  if (intervalId) return;
  try {
    await reserveTracker.trackReserves();
  } catch (e) {
    logger.error("Reserve tracking initial run failed", e);
  }
  intervalId = setInterval(async () => {
    try {
      await reserveTracker.trackReserves();
    } catch (e) {
      logger.error("Reserve tracking scheduled run failed", e);
    }
  }, INTERVAL_MS);
  logger.info("Reserve tracking scheduler started (every 6h)");
}

export function stopReserveTrackingScheduler(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logger.info("Reserve tracking scheduler stopped");
  }
}
