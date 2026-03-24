import { Router } from "express";
import {
  postSignup,
  postSignin,
  postSignout,
  postVerify2fa,
} from "../controllers/authController";
import { validateApiKey } from "../middleware/auth";
import {
  standardRateLimiter,
  apiKeyRateLimiter,
} from "../middleware/rateLimiter";

const router: ReturnType<typeof Router> = Router();

router.use(standardRateLimiter);

router.post("/signup", postSignup);
router.post("/signin", postSignin);
router.post("/signin/verify-2fa", postVerify2fa);

// Signout requires API key
router.post("/signout", validateApiKey, apiKeyRateLimiter, postSignout);

export default router;
