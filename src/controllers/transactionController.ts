/**
 * GET /v1/transactions/:id - Get transaction by id.
 */
import { Response, NextFunction } from "express";
import { prisma } from "../config/database";
import { AuthRequest } from "../middleware/auth";

export async function getTransactionById(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const tx = await prisma.transaction.findUnique({
      where: { id },
    });
    if (!tx) {
      res.status(404).json({ error: "Transaction not found" });
      return;
    }
    if (req.apiKey?.userId && tx.userId && tx.userId !== req.apiKey.userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    res.status(200).json({
      id: tx.id,
      type: tx.type,
      status: tx.status,
      usdc_amount: tx.usdcAmount?.toString() ?? null,
      acbu_amount: tx.acbuAmount?.toString() ?? null,
      acbu_amount_burned: tx.acbuAmountBurned?.toString() ?? null,
      local_currency: tx.localCurrency ?? null,
      local_amount: tx.localAmount?.toString() ?? null,
      recipient_account: tx.recipientAccount ?? null,
      recipient_address: tx.recipientAddress ?? null,
      fee: tx.fee?.toString() ?? null,
      rate_snapshot: tx.rateSnapshot ?? null,
      blockchain_tx_hash: tx.blockchainTxHash ?? null,
      confirmations: tx.confirmations,
      created_at: tx.createdAt.toISOString(),
      completed_at: tx.completedAt?.toISOString() ?? null,
    });
  } catch (error) {
    next(error);
  }
}
