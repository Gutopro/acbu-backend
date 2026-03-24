/**
 * Oracle Layer 3: Forex price feed via ExchangeRate-API (or compatible).
 * Returns USD rate per 1 unit of currency (e.g. 1 NGN = x USD).
 */
import axios from "axios";
import { config } from "../../config/env";
import { logger } from "../../config/logger";

const BASE = config.oracle.forex.baseUrl;
const API_KEY = config.oracle.forex.apiKey;

interface ExchangeRateApiPairResponse {
  result?: string;
  conversion_rate?: number;
}

/**
 * Fetch USD rate for 1 unit of the given currency (e.g. 1 NGN = x USD).
 * Returns null if forex is not configured or request fails.
 */
export async function fetchForexRateUsd(
  currency: string,
): Promise<number | null> {
  if (!API_KEY) return null;
  const url = `${BASE}/${API_KEY}/pair/${currency}/USD`;
  try {
    const { data } = await axios.get<ExchangeRateApiPairResponse>(url, {
      timeout: 10_000,
    });
    if (data.result === "success" && typeof data.conversion_rate === "number") {
      return data.conversion_rate;
    }
    return null;
  } catch (e) {
    logger.warn("Oracle: forex rate failed", { currency, error: e });
    return null;
  }
}
