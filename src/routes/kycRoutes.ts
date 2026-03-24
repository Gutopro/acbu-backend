import { Router } from "express";
import {
  postApplications,
  getApplicationById,
  getApplications,
  getUploadUrls,
  patchApplicationDocuments,
  postValidatorRegister,
  getValidatorTasks,
  postValidatorTaskResult,
  getValidatorMe,
} from "../controllers/kycController";
import { validateApiKey } from "../middleware/auth";
import { apiKeyRateLimiter } from "../middleware/rateLimiter";

const router: ReturnType<typeof Router> = Router();

router.use(validateApiKey);
router.use(apiKeyRateLimiter);

// Applicant: create and manage KYC applications (upload-urls before :id)
router.post("/applications", postApplications);
router.get("/applications", getApplications);
router.get("/applications/upload-urls", getUploadUrls);
router.get("/applications/:id", getApplicationById);
router.patch("/applications/:id/documents", patchApplicationDocuments);

// Validator: register, tasks, submit result, profile
router.post("/validator/register", postValidatorRegister);
router.get("/validator/tasks", getValidatorTasks);
router.post("/validator/tasks/:id", postValidatorTaskResult);
router.get("/validator/me", getValidatorMe);

export default router;
