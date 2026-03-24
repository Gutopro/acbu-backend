/**
 * Machine automation: ingest docs, extract (AI/OCR), redact, confidence, route.
 * When KYC_MACHINE_PROVIDER=none, skips extraction and routes to human review.
 */
import { prisma } from "../../config/database";
import { config } from "../../config/env";
import { logger } from "../../config/logger";
import { afterMachineProcessing } from "./applicationService";
import type { MachineExtractedPayload, MachineRedactedPayload } from "./types";

const PROVIDER = config.kyc.machineProvider;

/**
 * Process a KYC application: extract, redact, score confidence, then auto-approve or route to human.
 */
export async function processApplication(applicationId: string): Promise<void> {
  const app = await prisma.kycApplication.findUnique({
    where: { id: applicationId },
    include: { documents: true },
  });
  if (!app || app.status !== "machine_processing") {
    logger.warn("processApplication: app not found or not machine_processing", {
      applicationId,
    });
    return;
  }
  let extracted: MachineExtractedPayload = {};
  let redacted: MachineRedactedPayload = { hints: [], unreadableRegions: [] };
  let confidence = 0;

  if (PROVIDER === "none") {
    redacted = {
      hints: ["machine_provider_disabled"],
      unreadableRegions: ["all"],
    };
    confidence = 0;
  } else if (PROVIDER === "openai" && config.kyc.openaiApiKey) {
    const out = await extractWithOpenAI(app.documents);
    extracted = out.extracted;
    redacted = out.redacted;
    confidence = out.confidence;
  } else {
    redacted = { hints: ["provider_unavailable"], unreadableRegions: ["all"] };
    confidence = 0;
  }

  await afterMachineProcessing(applicationId, confidence, redacted, extracted);
}

/**
 * OpenAI-based extraction (placeholder: real impl would call Vision API and redact).
 */
async function extractWithOpenAI(
  documents: { kind: string; storageRef: string }[],
): Promise<{
  extracted: MachineExtractedPayload;
  redacted: MachineRedactedPayload;
  confidence: number;
}> {
  // Placeholder: no doc bytes fetched here. Real impl would use storage.get() and call OpenAI.
  const extracted: MachineExtractedPayload = {};
  const redacted: MachineRedactedPayload = {
    hints: documents.length >= 2 ? ["documents_uploaded"] : [],
    unreadableRegions: [],
  };
  const confidence = 0.5; // Conservative when we don't actually call OpenAI yet
  return { extracted, redacted, confidence };
}
