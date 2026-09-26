import { z } from 'zod';
import { ROLES, TARGET_TYPE } from '../../utils/constants';
import { AUDIT_ACTIONS } from '../../utils/auditActions';
import { paginationQuerySchema, dateRangeQuerySchema, objectIdSchema } from '../../utils/validators';

export const listAuditLogsQuerySchema = paginationQuerySchema.merge(dateRangeQuerySchema).extend({
  actorId: objectIdSchema.optional(),
  actorRole: z.nativeEnum(ROLES).optional(),
  action: z.nativeEnum(AUDIT_ACTIONS).optional(),
  targetType: z.nativeEnum(TARGET_TYPE).optional(),
  targetId: objectIdSchema.optional(),
});

export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;
