/**
 * Human validator pool: same-country selection, assignment, task listing.
 */
import { prisma } from "../../config/database";
import { config } from "../../config/env";
import { logger } from "../../config/logger";

const MIN_VALIDATORS = config.kyc.minValidatorsPerApplication;

/**
 * Assign N same-country validators to an application in awaiting_review.
 */
export async function assignValidators(applicationId: string): Promise<void> {
  const app = await prisma.kycApplication.findUnique({
    where: { id: applicationId },
    select: { countryCode: true, status: true },
  });
  if (!app || app.status !== "awaiting_review") {
    logger.warn("assignValidators: app not in awaiting_review", {
      applicationId,
    });
    return;
  }
  const existing = await prisma.kycValidation.count({
    where: { applicationId },
  });
  if (existing >= MIN_VALIDATORS) return;

  const pool = await prisma.kycValidator.findMany({
    where: {
      countryCode: app.countryCode,
      status: "active",
      agreementAcceptedAt: { not: null },
      trainingCompletedAt: { not: null },
    },
    include: {
      user: { select: { kycStatus: true } },
      validations: { where: { applicationId }, select: { id: true } },
    },
  });
  type V = (typeof pool)[number];
  const eligible = pool.filter(
    (v: V) => v.user.kycStatus === "verified" && v.validations.length === 0,
  );
  const needed = MIN_VALIDATORS - existing;
  const shuffled = [...eligible].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, needed);
  for (const v of selected) {
    await prisma.kycValidation.create({
      data: { applicationId, validatorId: v.id, result: "pending" },
    });
  }
  logger.info("KYC validators assigned", {
    applicationId,
    count: selected.length,
  });
}

/**
 * Get next redacted task(s) for a validator (only machineRedactedPayload, no PII).
 */
export async function getTasksForValidator(validatorUserId: string): Promise<
  {
    validationId: string;
    applicationId: string;
    machineRedactedPayload: object;
  }[]
> {
  const validator = await prisma.kycValidator.findFirst({
    where: { userId: validatorUserId, status: "active" },
    select: { id: true },
  });
  if (!validator) return [];
  const tasks = await prisma.kycValidation.findMany({
    where: { validatorId: validator.id, result: "pending" },
    include: {
      application: {
        select: { id: true, machineRedactedPayload: true },
      },
    },
  });
  type T = (typeof tasks)[number];
  return tasks
    .filter((t: T) => t.application.machineRedactedPayload != null)
    .map((t: T) => ({
      validationId: t.id,
      applicationId: t.application.id,
      machineRedactedPayload: t.application.machineRedactedPayload as object,
    }));
}

/**
 * Submit validator result and optionally resolve application (consensus).
 */
export async function submitValidationResult(
  validationId: string,
  validatorUserId: string,
  result: "approve" | "reject",
  notes?: string,
): Promise<void> {
  const val = await prisma.kycValidation.findFirst({
    where: { id: validationId },
    include: {
      validator: { where: { userId: validatorUserId }, select: { id: true } },
      application: { select: { id: true, status: true } },
    },
  });
  if (!val || !val.validator || val.result !== "pending") {
    throw new Error("Validation task not found or already submitted.");
  }
  if (val.application.status !== "awaiting_review") {
    throw new Error("Application no longer awaiting review.");
  }
  await prisma.kycValidation.update({
    where: { id: validationId },
    data: { result, notes: notes ?? null },
  });
  await prisma.kycValidator.update({
    where: { id: val.validator.id },
    data: { completedCount: { increment: 1 } },
  });
  await tryResolveApplication(val.application.id);
}

/**
 * If all validators have submitted, compute consensus and approve/reject.
 */
async function tryResolveApplication(applicationId: string): Promise<void> {
  const validations = await prisma.kycValidation.findMany({
    where: { applicationId },
    select: { result: true },
  });
  const pending = validations.some(
    (v: { result: string }) => v.result === "pending",
  );
  if (pending) return;
  const results = validations.map((v: { result: string }) => v.result);
  const rule = config.kyc.consensusRule;
  const approved =
    rule === "all_approve"
      ? results.every((r: string) => r === "approve")
      : results.filter((r: string) => r === "approve").length >
        results.length / 2;
  const { approveApplication, rejectApplication } =
    await import("./applicationService");
  if (approved) {
    await approveApplication(applicationId);
  } else {
    await rejectApplication(
      applicationId,
      "Human validation consensus: reject",
    );
  }
}
