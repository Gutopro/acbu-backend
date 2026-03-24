/**
 * Recipient resolver types.
 * Resolves alias (@username, E.164, email) to a displayable recipient result.
 * Never exposes stellarAddress in the response.
 */

export interface ResolveResult {
  userId: string;
  displayName: string;
  username?: string;
  maskedPhone?: string;
  maskedEmail?: string;
  canReceive: true;
}

/** Normalized form of a recipient query (q) for lookup. */
export type RecipientQueryKind = "username" | "phone" | "email";

export interface RecipientQuery {
  kind: RecipientQueryKind;
  value: string; // normalized: lowercase username, E.164 phone, lowercased email
}
