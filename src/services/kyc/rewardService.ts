/**
 * Validator rewards: create reward rows on human approval and optionally payout via Stellar.
 */
import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "../../config/database";
import { config } from "../../config/env";
import { logger } from "../../config/logger";

const SHARE = config.kyc.rewardSharePerValidator;

/**
 * Create KycValidatorReward rows for each validator who participated in an approved application.
 */
export async function createRewardsForApplication(
  applicationId: string,
): Promise<void> {
  const app = await prisma.kycApplication.findUnique({
    where: { id: applicationId },
    select: { id: true, status: true, feePaidAcbu: true },
  });
  if (!app || app.status !== "approved") return;
  const validations = await prisma.kycValidation.findMany({
    where: { applicationId },
    include: { validator: true },
  });
  const amount = Number(app.feePaidAcbu) * SHARE;
  for (const v of validations) {
    await prisma.kycValidatorReward.create({
      data: {
        validatorId: v.validatorId,
        applicationId,
        acbuAmount: new Decimal(amount),
        status: "pending",
      },
    });
  }
  logger.info("KYC validator rewards created", {
    applicationId,
    count: validations.length,
  });
}

/**
 * Process pending rewards (e.g. Stellar disbursement). Placeholder: marks as paid when tx is sent.
 */
export async function processPendingRewards(): Promise<void> {
  const pending = await prisma.kycValidatorReward.findMany({
    where: { status: "pending" },
    include: { validator: { include: { user: true } } },
  });
  for (const r of pending) {
    // Placeholder: in production, send ACBU to validator's Stellar address (user.stellarAddress)
    // and set txHash + status 'paid'. Here we leave as pending until Stellar payout is implemented.
    logger.debug("Reward pending payout", {
      rewardId: r.id,
      validatorId: r.validatorId,
    });
  }
}
