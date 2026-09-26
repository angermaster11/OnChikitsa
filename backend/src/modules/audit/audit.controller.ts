import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { auditService } from './audit.service';
import type { ListAuditLogsQuery } from './audit.validation';

/**
 * Read-only audit-log endpoints. There is deliberately NO create/update/delete
 * controller — audit logs are written internally by services and are immutable.
 */
export const auditController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const q = req.query as unknown as ListAuditLogsQuery;
    const { items, pagination } = await auditService.list(
      {
        actorId: q.actorId,
        actorRole: q.actorRole,
        action: q.action,
        targetType: q.targetType,
        targetId: q.targetId,
        from: q.from,
        to: q.to,
      },
      q.page,
      q.limit,
    );
    sendPaginated(res, items, pagination);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await auditService.getById(req.params.id), 'Audit log retrieved');
  }),
};
