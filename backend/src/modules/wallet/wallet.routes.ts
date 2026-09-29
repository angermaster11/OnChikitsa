import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { adminAuth } from '../../middleware/adminAuth';
import { authorize } from '../../middleware/authorize';
import { PERMISSIONS } from '../../rbac/permissions';
import { walletController } from './wallet.controller';
import { clinicIdParamSchema } from './wallet.validation';

/**
 * MyWallet — per-clinic settlement ledger. Mounted at /api/v1/admin/wallet.
 * Reads need PAYMENT_VIEW; settling a clinic's pending payable needs WALLET_SETTLE.
 */
export const adminWalletRoutes = Router();
adminWalletRoutes.use(adminAuth);

adminWalletRoutes.get('/', authorize(PERMISSIONS.PAYMENT_VIEW), walletController.list);
adminWalletRoutes.get(
  '/:clinicId',
  authorize(PERMISSIONS.PAYMENT_VIEW),
  validate({ params: clinicIdParamSchema }),
  walletController.getClinic,
);
adminWalletRoutes.post(
  '/:clinicId/settle',
  authorize(PERMISSIONS.WALLET_SETTLE),
  validate({ params: clinicIdParamSchema }),
  walletController.settleClinic,
);
