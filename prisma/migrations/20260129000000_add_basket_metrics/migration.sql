-- CreateTable
CREATE TABLE "basket_metrics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "currency" VARCHAR(3) NOT NULL,
    "period" VARCHAR(20) NOT NULL,
    "gdp_score" DECIMAL(10,4),
    "trade_score" DECIMAL(10,4),
    "liquidity_score" DECIMAL(10,4),
    "raw_values" JSONB,
    "source" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "basket_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "basket_metrics_currency_period_key" ON "basket_metrics"("currency", "period");

-- CreateIndex
CREATE INDEX "idx_basket_metrics_currency" ON "basket_metrics"("currency");

-- CreateIndex
CREATE INDEX "idx_basket_metrics_period" ON "basket_metrics"("period");
