import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { adminAuth } from '../../middleware/adminAuth';
import { authorize } from '../../middleware/authorize';
import { PERMISSIONS } from '../../rbac/permissions';
import { idParamSchema } from '../../utils/validators';
import { auditController } from './audit.controller';
import { listAuditLogsQuerySchema } from './audit.validation';

/** Read-only audit logs — mounted at /api/v1/admin/audit-logs. */
export const auditRoutes = Router();
auditRoutes.use(adminAuth, authorize(PERMISSIONS.AUDIT_LOG_VIEW));

auditRoutes.get('/', validate({ query: listAuditLogsQuerySchema }), auditController.list);
auditRoutes.get('/:id', validate({ params: idParamSchema }), auditController.getById);
