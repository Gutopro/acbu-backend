/**
 * Verifies KYC fee payment: either (a) Stellar tx to fee collector, or
 * (b) mint transaction — user deposited local currency, we minted ACBU, that mint covers the fee.
 */
import { config } from "../../config/env";
import { prisma } from "../../config/database";
import { stellarClient } from "../stellar/client";
import { logger } from "../../config/logger";

const feeAcbu = config.kyc.feeAcbu;
const feeCollector = config.kyc.feeCollectorAddress;

/**
 * Verify fee paid via mint: user deposited local currency, we minted ACBU; mint tx covers KYC fee.
 * Requires completed mint for this user with acbu_amount >= fee.
 */
export async function verifyKycFeeViaMint(
  mintTransactionId: string,
  userId: string,
): Promise<boolean> {
  try {
    const tx = await prisma.transaction.findFirst({
      where: {
        id: mintTransactionId,
        userId,
        type: "mint",
        status: "completed",
      },
      select: { id: true, acbuAmount: true },
    });
    if (!tx || !tx.acbuAmount) {
      logger.warn("KYC fee via mint: tx not found or not completed", {
        mintTransactionId,
        userId,
      });
      return false;
    }
    const amount = Number(tx.acbuAmount);
    if (amount < feeAcbu) {
      logger.warn("KYC fee via mint: mint amount less than fee", {
        mintTransactionId,
        amount,
        required: feeAcbu,
      });
      return false;
    }
    return true;
  } catch (e) {
    logger.error("KYC fee via mint verification failed", {
      mintTransactionId,
      userId,
      error: e,
    });
    return false;
  }
}

/**
 * Verifies that a Stellar transaction represents payment of the KYC fee (ACBU) to the collector.
 * When KYC_FEE_COLLECTOR_ADDRESS is not set, only checks that the tx exists and succeeded.
 */
export async function verifyKycFeePayment(feeTxHash: string): Promise<boolean> {
  try {
    const tx = await stellarClient.getTransaction(feeTxHash);
    if (!tx || (tx as any).successful !== true) {
      logger.warn("KYC fee tx missing or failed", { feeTxHash });
      return false;
    }
    if (!feeCollector) {
      logger.debug(
        "KYC fee collector not configured; accepting any successful tx",
        {
          feeTxHash,
        },
      );
      return true;
    }
    // Check for payment to collector (operation type payment, to=feeCollector, amount >= feeAcbu)
    const ops = (tx as any).operations || [];
    const payment = ops.find(
      (o: any) =>
        o.type === "payment" &&
        o.to === feeCollector &&
        parseFloat(o.amount) >= feeAcbu,
    );
    if (!payment) {
      logger.warn("KYC fee tx has no payment to collector", {
        feeTxHash,
        feeCollector,
        requiredAmount: feeAcbu,
      });
      return false;
    }
    return true;
  } catch (e) {
    logger.error("KYC fee verification failed", { feeTxHash, error: e });
    return false;
  }
}
