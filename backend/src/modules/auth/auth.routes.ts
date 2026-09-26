import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { adminAuth } from '../../middleware/adminAuth';
import { loginRateLimiter } from '../../middleware/rateLimiter';
import { authController } from './auth.controller';
import { loginSchema, refreshSchema, logoutSchema } from './auth.validation';

const router = Router();

// Admin/Super Admin/Support authentication (backend email+password → JWT).
router.post('/admin/login', loginRateLimiter, validate({ body: loginSchema }), authController.login);
router.post('/admin/refresh', validate({ body: refreshSchema }), authController.refresh);
router.post('/admin/logout', adminAuth, validate({ body: logoutSchema }), authController.logout);
router.get('/admin/me', adminAuth, authController.me);

export const authRoutes = router;
