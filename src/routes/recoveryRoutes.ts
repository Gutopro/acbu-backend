import { Router } from "express";
import { postUnlock } from "../controllers/recoveryController";
import { standardRateLimiter } from "../middleware/rateLimiter";

const router: ReturnType<typeof Router> = Router();

router.use(standardRateLimiter);

router.post("/unlock", postUnlock);

export default router;
