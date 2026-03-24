import { Router, type IRouter } from "express";
import {
  mintFromUsdc,
  depositFromBasketCurrency,
} from "../controllers/mintController";
import { validateApiKey } from "../middleware/auth";
import { apiKeyRateLimiter } from "../middleware/rateLimiter";

const router: IRouter = Router();
router.use(validateApiKey);
router.use(apiKeyRateLimiter);
router.post("/usdc", mintFromUsdc);
router.post("/deposit", depositFromBasketCurrency);
export default router;
