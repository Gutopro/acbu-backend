import { Request, Response, NextFunction } from "express";

export async function postBulkTransfer(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // TODO: bulk transfer (many transfers); idempotency; enterprise limits
    res.status(501).json({
      error: "NOT_IMPLEMENTED",
      message:
        "Bulk transfer endpoint not yet implemented. Use /transfers for single transfers.",
    });
  } catch (e) {
    next(e);
  }
}

export async function getTreasury(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // TODO: aggregate treasury view from indexed transactions/reserves
    res.status(200).json({
      totalBalance: null,
      byCurrency: [],
      message: "Treasury view not yet implemented.",
    });
  } catch (e) {
    next(e);
  }
}
