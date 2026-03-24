import { Router, type IRouter } from "express";
import { getRates, getRatesQuote } from "../controllers/ratesController";
import { validateApiKey } from "../middleware/auth";
import { apiKeyRateLimiter } from "../middleware/rateLimiter";

const router: IRouter = Router();
router.use(validateApiKey);
router.use(apiKeyRateLimiter);
router.get("/", getRates);
router.get("/quote", getRatesQuote);
export default router;
