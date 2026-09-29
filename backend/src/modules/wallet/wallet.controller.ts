import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/response';
import { UnauthorizedError } from '../../utils/errors';
import { getClientIp, getUserAgent } from '../../utils/http';
import { walletService } from './wallet.service';

function ctx(req: Request) {
  return { ip: getClientIp(req), userAgent: getUserAgent(req) };
}
function requireActor(req: Request) {
  if (!req.actor) throw new UnauthorizedError();
  return req.actor;
}

/**
 * MyWallet admin endpoints — mounted at /api/v1/admin/wallet. Reads need
 * PAYMENT_VIEW; the "settle" actions need WALLET_SETTLE (see wallet.routes).
 */
export const walletController = {
  /** Per-clinic wallet list (most-owed first). */
  list: asyncHandler(async (_req: Request, res: Response) => {
    const wallets = await walletService.listWallets();
    sendSuccess(res, wallets, 'Wallets retrieved');
  }),

  /** One clinic's wallet + aggregated bill + its transactions. */
  getClinic: asyncHandler(async (req: Request, res: Response) => {
    const result = await walletService.getClinicWallet(req.params.clinicId);
    sendSuccess(res, result, 'Wallet retrieved');
  }),

  /** Clear a clinic's entire pending payable at once (audited). */
  settleClinic: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const result = await walletService.settleClinic(actor, req.params.clinicId, ctx(req));
    sendSuccess(res, result, 'Clinic settled');
  }),
};
