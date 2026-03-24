import { Router, type IRouter } from "express";
import { getTransactionById } from "../controllers/transactionController";
import { validateApiKey } from "../middleware/auth";
import { apiKeyRateLimiter } from "../middleware/rateLimiter";

const router: IRouter = Router();
router.use(validateApiKey);
router.use(apiKeyRateLimiter);
router.get("/:id", getTransactionById);
export default router;
