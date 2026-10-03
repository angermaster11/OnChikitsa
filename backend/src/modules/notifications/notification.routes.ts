import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { firebaseAuth } from '../../middleware/firebaseAuth';
import { adminAuth } from '../../middleware/adminAuth';
import { authorize } from '../../middleware/authorize';
import { PERMISSIONS } from '../../rbac/permissions';
import { notificationController } from './notification.controller';
import { listNotificationsQuerySchema, broadcastSchema } from './notification.validation';

/** Patient notification feed — mounted at /api/v1/user/notifications (Firebase USER). */
export const userNotificationRoutes = Router();
userNotificationRoutes.use(firebaseAuth('USER'));
userNotificationRoutes.get('/', validate({ query: listNotificationsQuerySchema }), notificationController.feed);

/** Admin broadcast send + history — mounted at /api/v1/admin/notifications (JWT staff). */
export const adminNotificationRoutes = Router();
adminNotificationRoutes.use(adminAuth);
adminNotificationRoutes.post(
  '/',
  authorize(PERMISSIONS.NOTIFICATION_SEND),
  validate({ body: broadcastSchema }),
  notificationController.send,
);
adminNotificationRoutes.get(
  '/',
  authorize(PERMISSIONS.NOTIFICATION_VIEW),
  validate({ query: listNotificationsQuerySchema }),
  notificationController.history,
);
