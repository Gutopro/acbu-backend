import { Router, type IRouter } from "express";
import { validateApiKey } from "../middleware/auth";
import { requireSegmentScope } from "../middleware/segmentGuard";
import { apiKeyRateLimiter } from "../middleware/rateLimiter";
import {
  postSalaryDisburse,
  getSalaryBatches,
  postSalarySchedule,
} from "../controllers/salaryController";

const router: IRouter = Router();

router.use(validateApiKey);
router.use(requireSegmentScope("salary:read", "salary:write"));
router.use(apiKeyRateLimiter);

router.post("/disburse", postSalaryDisburse);
router.post("/schedule", postSalarySchedule);
router.get("/batches", getSalaryBatches);

export default router;
