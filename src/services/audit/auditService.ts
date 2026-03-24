/**
 * Audit logging for sensitive actions. Writes to AuditTrail for compliance and debugging.
 */
import { prisma } from "../../config/database";
import { logger } from "../../config/logger";

export interface AuditEntry {
  eventType: string;
  entityType?: string;
  entityId?: string;
  action: string;
  oldValue?: object;
  newValue?: object;
  performedBy?: string;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditTrail.create({
      data: {
        eventType: entry.eventType,
        entityType: entry.entityType ?? undefined,
        entityId: entry.entityId ?? undefined,
        action: entry.action,
        oldValue: entry.oldValue ?? undefined,
        newValue: entry.newValue ?? undefined,
        performedBy: entry.performedBy ?? undefined,
      },
    });
  } catch (e) {
    logger.error("Audit log failed", { entry: entry.eventType, error: e });
  }
}
