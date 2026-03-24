import { Router, type IRouter } from "express";
import { getRecipient } from "../controllers/recipientController";
import { validateApiKey } from "../middleware/auth";
import { apiKeyRateLimiter } from "../middleware/rateLimiter";

const router: IRouter = Router();

router.use(validateApiKey);
router.use(apiKeyRateLimiter);

router.get("/", getRecipient);

export default router;
