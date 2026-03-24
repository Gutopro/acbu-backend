/**
 * JWT helpers for 2FA challenge tokens.
 * Reuses JWT_SECRET from config; challenge tokens are short-lived (e.g. 5m).
 */
import jwt from "jsonwebtoken";
import { config } from "../config/env";

const CHALLENGE_EXPIRY = "5m";
const PURPOSE = "signin_2fa";

export interface ChallengePayload {
  userId: string;
  purpose: typeof PURPOSE;
  iat?: number;
  exp?: number;
}

/**
 * Sign a 2FA challenge token for the given user (short-lived JWT).
 */
export function signChallengeToken(userId: string): string {
  if (!config.jwtSecret) {
    throw new Error("JWT_SECRET is required for challenge tokens");
  }
  return jwt.sign(
    { userId, purpose: PURPOSE } as ChallengePayload,
    config.jwtSecret,
    { expiresIn: CHALLENGE_EXPIRY },
  );
}

/**
 * Verify and decode a 2FA challenge token. Throws if invalid or expired.
 */
export function verifyChallengeToken(token: string): ChallengePayload {
  if (!config.jwtSecret) {
    throw new Error("JWT_SECRET is required for challenge tokens");
  }
  const decoded = jwt.verify(token, config.jwtSecret) as ChallengePayload;
  if (decoded.purpose !== PURPOSE) {
    throw new Error("Invalid challenge token purpose");
  }
  return decoded;
}
