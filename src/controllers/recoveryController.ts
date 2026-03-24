import { Response, NextFunction } from "express";
import { z } from "zod";
import { Request } from "express";
import { unlockApp } from "../services/recovery/recoveryService";
import { AppError } from "../middleware/errorHandler";

const unlockAppSchema = z.object({
  identifier: z.string().min(1, "identifier is required"), // email or E.164 phone
  passcode: z.string().min(1, "passcode is required"),
});

/**
 * POST /recovery/unlock
 * Body: { identifier: string (email or E.164 phone), passcode: string }
 * On success returns { api_key, user_id }. No auth header required (user is recovering access).
 */
export async function postUnlock(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = unlockAppSchema.parse(req.body);
    const result = await unlockApp({
      identifier: body.identifier.trim(),
      passcode: body.passcode,
    });
    res.status(200).json({
      api_key: result.api_key,
      user_id: result.user_id,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      const msg = e.errors.map((x) => x.message).join("; ");
      return next(new AppError(msg, 400));
    }
    if (e instanceof Error) {
      if (e.message === "User not found or recovery not enabled")
        return next(new AppError(e.message, 404));
      if (e.message === "Invalid passcode")
        return next(new AppError(e.message, 401));
      if (e.message.includes("identifier"))
        return next(new AppError(e.message, 400));
    }
    next(e);
  }
}
