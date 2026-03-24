/**
 * Quality control: accuracy scoring, suspension/removal of validators.
 */
import { prisma } from "../../config/database";
import { config } from "../../config/env";
import { logger } from "../../config/logger";

const ACCURACY_THRESHOLD = config.kyc.accuracyThresholdForRemoval;

/**
 * Update validator accuracy from cross-validation or golden set. Call when ground truth is known.
 */
export async function recordValidatorAccuracy(
  validatorId: string,
  correct: boolean,
): Promise<void> {
  const v = await prisma.kycValidator.findUnique({
    where: { id: validatorId },
    select: { completedCount: true, accuracyScore: true },
  });
  if (!v) return;
  const n = v.completedCount + 1;
  const prev = Number(v.accuracyScore);
  const newScore = (prev * (n - 1) + (correct ? 1 : 0)) / n;
  await prisma.kycValidator.update({
    where: { id: validatorId },
    data: {
      completedCount: n,
      accuracyScore: newScore,
      ...(newScore < ACCURACY_THRESHOLD
        ? { status: "suspended" as const }
        : {}),
    },
  });
  if (newScore < ACCURACY_THRESHOLD) {
    logger.warn("Validator suspended for low accuracy", {
      validatorId,
      newScore,
    });
  }
}

/**
 * Suspend or remove a validator (admin/abuse).
 */
export async function setValidatorStatus(
  validatorId: string,
  status: "active" | "suspended" | "removed",
): Promise<void> {
  await prisma.kycValidator.update({
    where: { id: validatorId },
    data: { status },
  });
  logger.info("Validator status updated", { validatorId, status });
}
