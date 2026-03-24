import { Router, type IRouter } from "express";
import {
  postTransfers,
  getTransfers,
  getTransferById,
} from "../controllers/transferController";
import { validateApiKey } from "../middleware/auth";
import { apiKeyRateLimiter } from "../middleware/rateLimiter";

const router: IRouter = Router();

router.use(validateApiKey);
router.use(apiKeyRateLimiter);

router.post("/", postTransfers);
router.get("/", getTransfers);
router.get("/:id", getTransferById);

export default router;
