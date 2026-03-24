/**
 * Metrics ingestion for basket weight formula: GDP (40%), Trade (30%), Liquidity (30%).
 * Fetches from World Bank API and platform data; stores BasketMetrics; computes proposed weights.
 */
import { prisma } from "../../config/database";
import { logger } from "../../config/logger";
import { basketService } from "../basket";
import { fetchGdpUsd } from "./worldBankClient";
import { BASKET_CURRENCIES } from "../../config/basket";
import { Decimal } from "@prisma/client/runtime/library";

const GDP_WEIGHT = 0.4;
const TRADE_WEIGHT = 0.3;
const LIQUIDITY_WEIGHT = 0.3;

/** Normalize values to scores that sum to 100 (share of total * 100). */
function normalizeToScores(values: Map<string, number>): Map<string, number> {
  const total = [...values.values()].reduce((a, b) => a + b, 0);
  if (total <= 0) return values;
  const out = new Map<string, number>();
  for (const [k, v] of values) {
    out.set(k, (v / total) * 100);
  }
  return out;
}

/**
 * Fetch trade volume per currency from platform (burn transactions by localCurrency).
 * Returns map of currency -> volume (e.g. sum of localAmount or acbuAmountBurned).
 */
async function getTradeVolumeByCurrency(
  periodDays: number,
): Promise<Map<string, number>> {
  const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
  const burns = await prisma.transaction.findMany({
    where: {
      type: "burn",
      status: "completed",
      localCurrency: { not: null },
      createdAt: { gte: since },
    },
    select: { localCurrency: true, acbuAmountBurned: true, localAmount: true },
  });
  const byCurrency = new Map<string, number>();
  for (const c of BASKET_CURRENCIES) {
    byCurrency.set(c, 0);
  }
  for (const b of burns) {
    const cc = b.localCurrency ?? "";
    if (!byCurrency.has(cc)) continue;
    const amount =
      b.acbuAmountBurned?.toNumber() ?? b.localAmount?.toNumber() ?? 0;
    byCurrency.set(cc, (byCurrency.get(cc) ?? 0) + amount);
  }
  return byCurrency;
}

/**
 * Ingest metrics for a period (e.g. "2025-Q1" or "monthly-202501"), store in BasketMetrics,
 * then compute proposed weights and create BasketConfig rows with status 'proposed'.
 */
export async function ingestMetricsAndProposeWeights(
  period: string,
): Promise<void> {
  const periodDays = 90;
  let currencies = await basketService.getCurrencies();
  if (currencies.length === 0) {
    currencies = [...BASKET_CURRENCIES];
  }

  const gdpRaw = new Map<string, number>();
  for (const currency of currencies) {
    const gdp = await fetchGdpUsd(currency);
    if (gdp != null && gdp > 0) gdpRaw.set(currency, gdp);
  }

  const tradeRaw = await getTradeVolumeByCurrency(periodDays);
  for (const c of currencies) {
    if (!tradeRaw.has(c)) tradeRaw.set(c, 0);
  }
  const liquidityRaw = new Map<string, number>();
  for (const c of currencies) {
    liquidityRaw.set(c, 1);
  }

  const gdpScores = normalizeToScores(gdpRaw);
  const tradeScores = normalizeToScores(tradeRaw);
  const liquidityScores = normalizeToScores(liquidityRaw);

  const effectiveFrom = new Date();

  for (const currency of currencies) {
    const gdpScore = gdpScores.get(currency) ?? 0;
    const tradeScore = tradeScores.get(currency) ?? 0;
    const liquidityScore = liquidityScores.get(currency) ?? 0;
    const rawValues = {
      gdpUsd: gdpRaw.get(currency) ?? null,
      tradeVolume: tradeRaw.get(currency) ?? null,
    };

    await prisma.basketMetrics.upsert({
      where: {
        currency_period: { currency, period },
      },
      create: {
        currency,
        period,
        gdpScore: new Decimal(gdpScore),
        tradeScore: new Decimal(tradeScore),
        liquidityScore: new Decimal(liquidityScore),
        rawValues,
        source: "world_bank+platform",
      },
      update: {
        gdpScore: new Decimal(gdpScore),
        tradeScore: new Decimal(tradeScore),
        liquidityScore: new Decimal(liquidityScore),
        rawValues,
        source: "world_bank+platform",
      },
    });
  }

  const proposedWeightRaw = new Map<string, number>();
  for (const currency of currencies) {
    const w =
      GDP_WEIGHT * (gdpScores.get(currency) ?? 0) +
      TRADE_WEIGHT * (tradeScores.get(currency) ?? 0) +
      LIQUIDITY_WEIGHT * (liquidityScores.get(currency) ?? 0);
    proposedWeightRaw.set(currency, w);
  }
  const proposedWeights = normalizeToScores(proposedWeightRaw);

  for (const [currency, weight] of proposedWeights) {
    await prisma.basketConfig.create({
      data: {
        effectiveFrom,
        currency,
        weight: new Decimal(Math.round(weight * 100) / 100),
        status: "proposed",
      },
    });
  }

  logger.info("Metrics ingested and proposed weights created", {
    period,
    currencies: currencies.length,
  });
}
