import { Router } from 'express';
import { adminAuth } from '../../middleware/adminAuth';
import { authorize } from '../../middleware/authorize';
import { PERMISSIONS } from '../../rbac/permissions';
import { dashboardController } from './dashboard.controller';

/** Read-only aggregated dashboard stats — mounted at /api/v1/admin/dashboard. */
export const dashboardRoutes = Router();
dashboardRoutes.use(adminAuth, authorize(PERMISSIONS.DASHBOARD_VIEW));

dashboardRoutes.get('/stats', dashboardController.getStats);
