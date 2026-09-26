import { NotFoundError, ERROR_CODES } from '../../utils/errors';
import { logger } from '../../config/logger';
import { resolvePagination } from '../../utils/pagination';
import { buildPaginationMeta, type PaginationMeta } from '../../utils/response';
import { auditRepository } from './audit.repository';
import type { AuditLogDoc } from './auditLog.model';
import type { AuditLogFilters, RecordAuditInput, RecordForActorInput } from './audit.types';

/**
 * Audit service — the single entry point every module uses to record sensitive
 * actions. Kept separate from the Pino application logger by design: this is the
 * "who did what to whom" ledger, persisted immutably in MongoDB.
 */
export const auditService = {
  /** Write an audit record with explicit actor fields. */
  async record(input: RecordAuditInput): Promise<AuditLogDoc> {
    return auditRepository.create(input);
  },

  /** Write an audit record for an authenticated principal (the common case). */
  async recordForActor(input: RecordForActorInput): Promise<AuditLogDoc> {
    const { actor, ...rest } = input;
    return auditRepository.create({
      ...rest,
      actorId: actor.id,
      actorRole: actor.role,
      actorName: actor.name,
      actorEmail: actor.email,
    });
  },

  /**
   * Best-effort variant that never throws — used for auth events (e.g. failed
   * login) where the surrounding request must succeed even if the audit write
   * momentarily fails. Failures are surfaced to the application log.
   */
  async recordSafe(input: RecordAuditInput): Promise<void> {
    try {
      await auditRepository.create(input);
    } catch (err) {
      logger.error({ err, action: input.action }, 'Failed to write audit log');
    }
  },

  async list(
    filters: AuditLogFilters,
    page?: number,
    limit?: number,
  ): Promise<{ items: AuditLogDoc[]; pagination: PaginationMeta }> {
    const { page: p, limit: l, skip } = resolvePagination(page, limit);
    const filter = auditRepository.buildFilter(filters);
    const { items, total } = await auditRepository.list(filter, skip, l);
    return { items, pagination: buildPaginationMeta(p, l, total) };
  },

  async getById(id: string): Promise<AuditLogDoc> {
    const log = await auditRepository.findById(id);
    if (!log) throw new NotFoundError(ERROR_CODES.AUDIT_LOG_NOT_FOUND, 'Audit log not found');
    return log;
  },
};
