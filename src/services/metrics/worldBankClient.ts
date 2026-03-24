/**
 * World Bank API client for GDP data (metrics for basket weight formula).
 * Free, no API key: https://api.worldbank.org/v2/country/{iso2}/indicator/NY.GDP.MKTP.CD?format=json
 */
import axios from "axios";
import { logger } from "../../config/logger";

const WORLD_BANK_BASE = "https://api.worldbank.org/v2";
const GDP_INDICATOR = "NY.GDP.MKTP.CD";

/** Basket currency to World Bank country ISO2 code. */
export const CURRENCY_TO_ISO2: Record<string, string> = {
  NGN: "NG",
  ZAR: "ZA",
  KES: "KE",
  EGP: "EG",
  GHS: "GH",
  RWF: "RW",
  XOF: "SN",
  MAD: "MA",
  TZS: "TZ",
  UGX: "UG",
};

interface WorldBankResponseItem {
  indicator?: { id: string; value: string };
  country?: { id: string; value: string };
  value?: number | null;
  date?: string;
}

type WorldBankResponse = [unknown, WorldBankResponseItem[]?];

/**
 * Fetch latest GDP (current US$) for a country. Returns null if not available.
 */
export async function fetchGdpUsd(currency: string): Promise<number | null> {
  const iso2 = CURRENCY_TO_ISO2[currency];
  if (!iso2) return null;
  const url = `${WORLD_BANK_BASE}/country/${iso2}/indicator/${GDP_INDICATOR}?format=json&per_page=1`;
  try {
    const { data } = await axios.get<WorldBankResponse>(url, {
      timeout: 15_000,
    });
    const rows =
      Array.isArray(data) && data[1]
        ? (data[1] as WorldBankResponseItem[])
        : [];
    const first = rows[0];
    if (first?.value != null && typeof first.value === "number") {
      return first.value;
    }
    return null;
  } catch (e) {
    logger.warn("World Bank GDP fetch failed", { currency, iso2, error: e });
    return null;
  }
}
