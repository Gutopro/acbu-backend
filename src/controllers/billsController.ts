import { Request, Response, NextFunction } from "express";

export async function getBillsCatalog(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // TODO: biller catalog from partner APIs
    res.status(200).json({
      billers: [],
      message:
        "Bills catalog not yet implemented. Partner integration required.",
    });
  } catch (e) {
    next(e);
  }
}

export async function postBillsPay(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // TODO: initiate bill payment via transfer + partner webhook
    res.status(501).json({
      error: "NOT_IMPLEMENTED",
      message:
        "Bills pay endpoint not yet implemented. Partner integration required.",
    });
  } catch (e) {
    next(e);
  }
}
