import { Request, Response, NextFunction } from "express";
import { reserveTracker } from "../services/reserve/ReserveTracker";

/**
 * @swagger
 * /v1/reserves:
 *   get:
 *     summary: Get current reserve status
 *     tags: [Reserves]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Reserve status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalAcbuSupply:
 *                   type: number
 *                 totalReserveValueUsd:
 *                   type: number
 *                 overcollateralizationRatio:
 *                   type: number
 *                 reserveHealth:
 *                   type: string
 *                 currencies:
 *                   type: array
 */
export const getReserveStatus = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const status = await reserveTracker.getReserveStatus();
    res.json(status);
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /v1/reserves/track:
 *   post:
 *     summary: Manually trigger reserve tracking
 *     tags: [Reserves]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Reserve tracking initiated
 */
export const trackReserves = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await reserveTracker.trackReserves();
    res.json({ message: "Reserve tracking completed" });
  } catch (error) {
    next(error);
  }
};
