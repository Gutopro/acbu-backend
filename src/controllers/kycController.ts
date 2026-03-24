import { Response, NextFunction } from "express";
import { z } from "zod";
import { AuthRequest } from "../middleware/auth";
import { prisma } from "../config/database";
import {
  createApplication,
  addDocumentsAndEnqueue,
  getApplicationForUser,
  listApplicationsForUser,
} from "../services/kyc/applicationService";
import {
  getTasksForValidator,
  submitValidationResult,
} from "../services/kyc/validatorPool";
import { getPresignedUploadUrl, documentKey } from "../services/kyc/storage";
import { AppError } from "../middleware/errorHandler";
import type { KycDocumentKind } from "../services/kyc/types";

const createAppSchema = z
  .object({
    country_code: z.string().length(3),
    fee_tx_hash: z.string().min(1).optional(),
    mint_transaction_id: z.string().uuid().optional(),
    documents: z
      .array(
        z.object({
          kind: z.enum(["id_front", "id_back", "selfie"]),
          storage_ref: z.string().min(1),
          checksum: z.string().optional(),
          mime_type: z.string().optional(),
        }),
      )
      .default([]),
  })
  .refine((data) => data.fee_tx_hash ?? data.mint_transaction_id, {
    message:
      "Provide mint_transaction_id (user deposited local currency, we minted ACBU) or fee_tx_hash (Stellar payment).",
    path: ["fee_tx_hash"],
  });

const submitResultSchema = z.object({
  result: z.enum(["approve", "reject"]),
  notes: z.string().max(500).optional(),
});

export async function postApplications(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.apiKey?.userId;
    if (!userId) {
      throw new AppError("User-scoped API key required for KYC", 401);
    }
    const body = createAppSchema.parse(req.body);
    const applicationId = await createApplication({
      userId,
      countryCode: body.country_code,
      feeTxHash: body.fee_tx_hash,
      feeMintTransactionId: body.mint_transaction_id,
      documents: body.documents.map((d) => ({
        kind: d.kind as KycDocumentKind,
        storageRef: d.storage_ref,
        checksum: d.checksum,
        mimeType: d.mime_type,
      })),
    });
    res
      .status(201)
      .json({ application_id: applicationId, status: "machine_processing" });
  } catch (e) {
    next(e);
  }
}

export async function getApplicationById(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.apiKey?.userId;
    if (!userId) throw new AppError("User-scoped API key required", 401);
    const { id } = req.params;
    const app = await getApplicationForUser(id, userId);
    if (!app) {
      throw new AppError("Application not found", 404);
    }
    res.json({ id: app.id, status: app.status, created_at: app.createdAt });
  } catch (e) {
    next(e);
  }
}

export async function getApplications(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.apiKey?.userId;
    if (!userId) throw new AppError("User-scoped API key required", 401);
    const list = await listApplicationsForUser(userId);
    res.json({
      applications: list.map((a) => ({
        id: a.id,
        status: a.status,
        created_at: a.createdAt,
      })),
    });
  } catch (e) {
    next(e);
  }
}

export async function getUploadUrls(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.apiKey?.userId;
    if (!userId) throw new AppError("User-scoped API key required", 401);
    const { applicationId, kind } = req.query as {
      applicationId?: string;
      kind?: string;
    };
    if (
      !applicationId ||
      !kind ||
      !["id_front", "id_back", "selfie"].includes(kind)
    ) {
      throw new AppError(
        "applicationId and kind (id_front|id_back|selfie) required",
        400,
      );
    }
    const app = await prisma.kycApplication.findFirst({
      where: { id: applicationId, userId },
      select: { id: true },
    });
    if (!app) throw new AppError("Application not found", 404);
    const key = documentKey(applicationId, kind);
    const { url, key: k } = await getPresignedUploadUrl(
      key,
      "application/octet-stream",
    );
    res.json({ upload_url: url, storage_ref: k });
  } catch (e) {
    next(e);
  }
}

const addDocumentsSchema = z.object({
  documents: z
    .array(
      z.object({
        kind: z.enum(["id_front", "id_back", "selfie"]),
        storage_ref: z.string().min(1),
        checksum: z.string().optional(),
        mime_type: z.string().optional(),
      }),
    )
    .min(1),
});

export async function patchApplicationDocuments(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.apiKey?.userId;
    if (!userId) throw new AppError("User-scoped API key required", 401);
    const { id } = req.params;
    const body = addDocumentsSchema.parse(req.body);
    await addDocumentsAndEnqueue(
      id,
      userId,
      body.documents.map((d) => ({
        kind: d.kind,
        storageRef: d.storage_ref,
        checksum: d.checksum,
        mimeType: d.mime_type,
      })),
    );
    res.json({ success: true, status: "machine_processing" });
  } catch (e) {
    next(e);
  }
}

// --- Validator routes (require KYC-verified user) ---

export async function postValidatorRegister(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.apiKey?.userId;
    if (!userId) throw new AppError("User-scoped API key required", 401);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { kycStatus: true, countryCode: true },
    });
    if (!user || user.kycStatus !== "verified") {
      throw new AppError(
        "KYC verification required to register as validator",
        403,
      );
    }
    const countryCode = (req.body?.country_code as string) || user.countryCode;
    if (!countryCode || countryCode.length !== 3) {
      throw new AppError("country_code (3 chars) required", 400);
    }
    const validator = await prisma.kycValidator.upsert({
      where: {
        userId_countryCode: { userId, countryCode },
      },
      create: {
        userId,
        countryCode,
        status: "active",
        agreementAcceptedAt: new Date(),
        trainingCompletedAt: new Date(),
      },
      update: { status: "active" },
    });
    res.status(201).json({
      validator_id: validator.id,
      country_code: validator.countryCode,
      status: validator.status,
    });
  } catch (e) {
    next(e);
  }
}

export async function getValidatorTasks(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.apiKey?.userId;
    if (!userId) throw new AppError("User-scoped API key required", 401);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { kycStatus: true },
    });
    if (!user || user.kycStatus !== "verified") {
      throw new AppError(
        "KYC verification required to fetch validator tasks",
        403,
      );
    }
    const tasks = await getTasksForValidator(userId);
    res.json({ tasks });
  } catch (e) {
    next(e);
  }
}

export async function postValidatorTaskResult(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.apiKey?.userId;
    if (!userId) throw new AppError("User-scoped API key required", 401);
    const { id: validationId } = req.params;
    const body = submitResultSchema.parse(req.body);
    await submitValidationResult(validationId, userId, body.result, body.notes);
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
}

export async function getValidatorMe(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.apiKey?.userId;
    if (!userId) throw new AppError("User-scoped API key required", 401);
    const validator = await prisma.kycValidator.findFirst({
      where: { userId },
      select: {
        id: true,
        countryCode: true,
        status: true,
        accuracyScore: true,
        completedCount: true,
      },
    });
    if (!validator) {
      res.json({ validator: null });
      return;
    }
    res.json({ validator });
  } catch (e) {
    next(e);
  }
}
