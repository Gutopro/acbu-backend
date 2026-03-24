export type KycApplicationStatus =
  | "pending"
  | "machine_processing"
  | "awaiting_review"
  | "approved"
  | "rejected";

export type KycDocumentKind = "id_front" | "id_back" | "selfie";

export type KycValidatorStatus = "active" | "suspended" | "removed";

export type KycValidationResult = "approve" | "reject";

export interface CreateKycApplicationInput {
  userId: string;
  countryCode: string;
  /** Stellar tx hash that paid ACBU to fee collector. Use when fee is paid by direct transfer. */
  feeTxHash?: string;
  /** Mint transaction id — user deposited local currency, we minted ACBU; that mint covers the fee. */
  feeMintTransactionId?: string;
  documents: {
    kind: KycDocumentKind;
    storageRef: string;
    checksum?: string;
    mimeType?: string;
  }[]; // may be empty; add via addDocumentsAndEnqueue later
}

export interface MachineExtractedPayload {
  documentType?: string;
  name?: string;
  dateOfBirth?: string;
  documentNumber?: string;
  nationality?: string;
  rawFields?: Record<string, string>;
}

export interface MachineRedactedPayload {
  hints?: string[]; // e.g. ["name_present", "photo_matches"]
  unreadableRegions?: string[];
  redactedDocumentRefs?: string[]; // keys for presigned download, not raw docs
}
