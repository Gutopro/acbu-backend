/**
 * KYC application lifecycle: create, status transitions, machine → human routing.
 */
import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "../../config/database";
import { config } from "../../config/env";
import { getRabbitMQChannel, QUEUES } from "../../config/rabbitmq";
import { logger } from "../../config/logger";
import { verifyKycFeePayment, verifyKycFeeViaMint } from "./feeVerification";
import type { CreateKycApplicationInput } from "./types";
import { assignValidators } from "./validatorPool";

export const KYC_APPLICATION_STATUS = {
  PENDING: "pending",
  MACHINE_PROCESSING: "machine_processing",
  AWAITING_REVIEW: "awaiting_review",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

/**
 * Create a KYC application after verifying fee payment. Fee is either (a) Stellar tx to collector,
 * or (b) mint transaction — user deposited local currency, we minted ACBU, that mint covers the fee.
 */
export async function createApplication(
  input: CreateKycApplicationInput,
): Promise<string> {
  const hasMint = Boolean(input.feeMintTransactionId);
  const hasStellar = Boolean(input.feeTxHash);
  if (!hasMint && !hasStellar) {
    throw new Error(
      "KYC fee source required: provide mint_transaction_id (user deposited local currency, we minted ACBU) or fee_tx_hash (Stellar payment to collector).",
    );
  }
  if (hasMint) {
    const ok = await verifyKycFeeViaMint(
      input.feeMintTransactionId!,
      input.userId,
    );
    if (!ok) {
      throw new Error(
        "KYC fee via mint could not be verified. Provide a completed mint transaction id for this user with acbu_amount >= fee.",
      );
    }
  } else if (hasStellar) {
    const ok = await verifyKycFeePayment(input.feeTxHash!);
    if (!ok) {
      throw new Error(
        "KYC fee payment could not be verified. Provide a valid fee tx hash.",
      );
    }
  }
  const feeAcbu = new Decimal(config.kyc.feeAcbu);
  const app = await prisma.kycApplication.create({
    data: {
      userId: input.userId,
      countryCode: input.countryCode,
      status: KYC_APPLICATION_STATUS.PENDING,
      feePaidAcbu: feeAcbu,
      feeTxHash: input.feeTxHash ?? null,
      feeMintTransactionId: input.feeMintTransactionId ?? null,
      documents:
        input.documents.length > 0
          ? {
              create: input.documents.map((d) => ({
                kind: d.kind,
                storageRef: d.storageRef,
                checksum: d.checksum ?? null,
                mimeType: d.mimeType ?? null,
              })),
            }
          : undefined,
    },
  });
  if (input.documents.length > 0) {
    await transitionToMachineProcessing(app.id);
    await enqueueKycProcessing(app.id);
  }
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { stellarAddress: true },
  });
  if (user?.stellarAddress) {
    await enqueueWalletActivation(input.userId, user.stellarAddress);
  }
  logger.info("KYC application created", {
    applicationId: app.id,
    userId: input.userId,
    hasDocuments: input.documents.length > 0,
  });
  return app.id;
}

/**
 * Enqueue wallet activation: platform Stellar wallet will send min XLM to user's address (when KYC fee paid).
 */
async function enqueueWalletActivation(
  userId: string,
  stellarAddress: string,
): Promise<void> {
  try {
    const ch = getRabbitMQChannel();
    await ch.assertQueue(QUEUES.WALLET_ACTIVATION, { durable: true });
    ch.sendToQueue(
      QUEUES.WALLET_ACTIVATION,
      Buffer.from(JSON.stringify({ userId, stellarAddress })),
      { persistent: true },
    );
    logger.info("Wallet activation enqueued", {
      userId,
      stellarAddress: stellarAddress.slice(0, 8) + "…",
    });
  } catch (e) {
    logger.error("Failed to enqueue wallet activation", { userId, error: e });
  }
}

/**
 * Add documents to an application and enqueue machine processing if not already queued.
 */
export async function addDocumentsAndEnqueue(
  applicationId: string,
  userId: string,
  documents: {
    kind: string;
    storageRef: string;
    checksum?: string;
    mimeType?: string;
  }[],
): Promise<void> {
  const app = await prisma.kycApplication.findFirst({
    where: { id: applicationId, userId },
    include: { documents: true },
  });
  if (!app) throw new Error("Application not found");
  if (app.documents.length > 0) throw new Error("Documents already added");
  await prisma.kycDocument.createMany({
    data: documents.map((d) => ({
      applicationId,
      kind: d.kind,
      storageRef: d.storageRef,
      checksum: d.checksum ?? null,
      mimeType: d.mimeType ?? null,
    })),
  });
  await transitionToMachineProcessing(applicationId);
  await enqueueKycProcessing(applicationId);
  logger.info("KYC documents added and enqueued", { applicationId });
}

/**
 * Transition application to machine_processing and enqueue job.
 */
export async function transitionToMachineProcessing(
  applicationId: string,
): Promise<void> {
  await prisma.kycApplication.update({
    where: { id: applicationId },
    data: { status: KYC_APPLICATION_STATUS.MACHINE_PROCESSING },
  });
}

/**
 * Enqueue a job for the KYC processing worker (machine layer).
 */
export async function enqueueKycProcessing(
  applicationId: string,
): Promise<void> {
  try {
    const ch = getRabbitMQChannel();
    await ch.assertQueue(QUEUES.KYC_PROCESSING, { durable: true });
    ch.sendToQueue(
      QUEUES.KYC_PROCESSING,
      Buffer.from(JSON.stringify({ applicationId })),
      {
        persistent: true,
      },
    );
  } catch (e) {
    logger.error("Failed to enqueue KYC processing", {
      applicationId,
      error: e,
    });
    throw e;
  }
}

/**
 * After machine layer runs: either auto-approve or route to human validators.
 */
export async function afterMachineProcessing(
  applicationId: string,
  confidence: number,
  machineRedactedPayload: object,
  machineExtractedPayload: object,
): Promise<void> {
  const threshold = config.kyc.machineConfidenceThreshold;
  await prisma.kycApplication.update({
    where: { id: applicationId },
    data: {
      machineConfidence: new Decimal(confidence),
      machineRedactedPayload: machineRedactedPayload as any,
      machineExtractedPayload: machineExtractedPayload as any,
    },
  });

  if (confidence >= threshold) {
    await approveApplication(applicationId);
    return;
  }
  await prisma.kycApplication.update({
    where: { id: applicationId },
    data: { status: KYC_APPLICATION_STATUS.AWAITING_REVIEW },
  });
  await assignValidators(applicationId);
  logger.info("KYC application routed to human review", { applicationId });
}

/**
 * Mark application approved and update user KYC status.
 */
export async function approveApplication(applicationId: string): Promise<void> {
  const app = await prisma.kycApplication.findUnique({
    where: { id: applicationId },
    select: { userId: true, countryCode: true },
  });
  if (!app) return;
  const now = new Date();
  await prisma.$transaction([
    prisma.kycApplication.update({
      where: { id: applicationId },
      data: {
        status: KYC_APPLICATION_STATUS.APPROVED,
        resolvedAt: now,
      },
    }),
    prisma.user.update({
      where: { id: app.userId },
      data: {
        kycStatus: "verified",
        kycVerifiedAt: now,
        countryCode: app.countryCode,
      },
    }),
  ]);
  const { createRewardsForApplication } = await import("./rewardService");
  await createRewardsForApplication(applicationId);
  logger.info("KYC application approved", {
    applicationId,
    userId: app.userId,
  });
}

/**
 * Mark application rejected and update user KYC status.
 */
export async function rejectApplication(
  applicationId: string,
  reason?: string,
): Promise<void> {
  const app = await prisma.kycApplication.findUnique({
    where: { id: applicationId },
    select: { userId: true },
  });
  if (!app) return;
  const now = new Date();
  await prisma.$transaction([
    prisma.kycApplication.update({
      where: { id: applicationId },
      data: {
        status: KYC_APPLICATION_STATUS.REJECTED,
        rejectionReason: reason ?? null,
        resolvedAt: now,
      },
    }),
    prisma.user.update({
      where: { id: app.userId },
      data: { kycStatus: "rejected" },
    }),
  ]);
  logger.info("KYC application rejected", {
    applicationId,
    userId: app.userId,
  });
}

/**
 * Get application by id for the owning user (no PII in response for validators).
 */
export async function getApplicationForUser(
  applicationId: string,
  userId: string,
): Promise<{ id: string; status: string; createdAt: Date } | null> {
  const app = await prisma.kycApplication.findFirst({
    where: { id: applicationId, userId },
    select: { id: true, status: true, createdAt: true },
  });
  return app;
}

/**
 * List applications for a user.
 */
export async function listApplicationsForUser(
  userId: string,
): Promise<{ id: string; status: string; createdAt: Date }[]> {
  const list = await prisma.kycApplication.findMany({
    where: { userId },
    select: { id: true, status: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return list;
}
