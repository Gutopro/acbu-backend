import { Request, Response, NextFunction } from "express";

export async function postSalaryDisburse(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // TODO: batch salary disbursement via transfer service; idempotency; approvals
    res.status(501).json({
      error: "NOT_IMPLEMENTED",
      message:
        "Salary disburse endpoint not yet implemented. Use /transfers for single transfers.",
    });
  } catch (e) {
    next(e);
  }
}

export async function getSalaryBatches(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // TODO: list salary batches and status
    res.status(200).json({ batches: [] });
  } catch (e) {
    next(e);
  }
}

export async function postSalarySchedule(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // TODO: schedule recurring salary batch
    res.status(501).json({
      error: "NOT_IMPLEMENTED",
      message: "Salary schedule endpoint not yet implemented.",
    });
  } catch (e) {
    next(e);
  }
}
