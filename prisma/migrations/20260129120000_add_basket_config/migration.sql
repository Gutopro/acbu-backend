-- CreateTable
CREATE TABLE "basket_config" (
    "id" UUID NOT NULL,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "weight" DECIMAL(5,2) NOT NULL,
    "proposal_id" UUID,
    "status" VARCHAR(20) NOT NULL,

    CONSTRAINT "basket_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "basket_config_effective_from_currency_key" ON "basket_config"("effective_from", "currency");

-- CreateIndex
CREATE INDEX "idx_basket_config_status" ON "basket_config"("status");

-- CreateIndex
CREATE INDEX "idx_basket_config_effective_from" ON "basket_config"("effective_from");

-- CreateIndex
CREATE INDEX "idx_basket_config_current" ON "basket_config"("status", "effective_from" DESC);
