/**
 * Recovery Tier 1: unlock app via email/phone + passcode.
 * On success, issues a new API key and returns it. Does not touch Stellar keys.
 */
import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database';
import { generateApiKey } from '../../middleware/auth';
import { logger } from '../../config/logger';

export interface UnlockAppParams {
  identifier: string; // email or E.164 phone
  passcode: string;
}

export interface UnlockAppResult {
  api_key: string;
  user_id: string;
}

/**
 * Unlock app: verify identifier + passcode, then issue and return a new API key.
 * identifier is email or phone_e164 (E.164).
 */
export async function unlockApp(params: UnlockAppParams): Promise<UnlockAppResult> {
  const { identifier, passcode } = params;
  const trimmed = identifier.trim().toLowerCase();
  const isEmail = trimmed.includes('@') && trimmed.includes('.');
  const isPhone = /^\+[0-9]{10,15}$/.test(identifier.trim());

  const where = isEmail
    ? { email: trimmed }
    : isPhone
      ? { phoneE164: identifier.trim() }
      : null;
  if (!where) {
    throw new Error('identifier must be email or E.164 phone');
  }

  const user = await prisma.user.findFirst({
    where,
    select: { id: true, passcodeHash: true },
  });
  if (!user || !user.passcodeHash) {
    logger.warn('Recovery: user not found or no passcode set', {
      identifier: isEmail ? '***' : identifier.slice(0, 6) + '***',
    });
    throw new Error('User not found or recovery not enabled');
  }

  const match = await bcrypt.compare(passcode, user.passcodeHash);
  if (!match) {
    logger.warn('Recovery: invalid passcode', { userId: user.id });
    throw new Error('Invalid passcode');
  }

  const apiKey = await generateApiKey(user.id, []);
  logger.info('Recovery: app unlocked, new key issued', { userId: user.id });
  return {
    api_key: apiKey,
    user_id: user.id,
  };
}
